import { app } from 'electron';
import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import Database from 'better-sqlite3';
import log from './logger.js';
import type { SqlValue, SqlRow, DbRunResult } from '../ipc/schema.js';

let db: Database.Database | null = null;

/**
 * Initialize the SQLite database.
 *
 * - Database file: `{userData}/data.db`
 * - Runs all pending migrations from `electron/migrations/` on startup
 * - WAL mode for concurrent read performance
 *
 * Must be called after app.whenReady().
 */
export async function initDatabase(): Promise<void> {
  const dbPath = path.join(app.getPath('userData'), 'data.db');
  const database = new Database(dbPath);
  db = database;

  // Enable WAL mode for better concurrent read performance
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await runMigrations(database);
  log.info(`Database initialized at ${dbPath}`);
}

/**
 * Run pending migrations from the migrations directory.
 * Migrations are SQL files named with a numeric prefix: 001_init.sql, 002_add_index.sql
 * Applied in alphabetical order. Skips already-applied migrations.
 */
async function runMigrations(database: Database.Database): Promise<void> {
  const migrationsDir = path.join(app.getAppPath(), 'electron', 'migrations');

  // The directory is a shipped asset (see `files` in electron-builder.yml). If it
  // is missing the package is broken, and booting with an empty schema would only
  // surface later as a confusing "no such table" from whichever feature queried first.
  let files: string[];
  try {
    files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  } catch (cause) {
    throw new Error(`Migrations directory missing at ${migrationsDir} — the build is broken`, { cause });
  }

  const applied = new Set(
    database.prepare<[], { name: string }>('SELECT name FROM _migrations').all().map((row) => row.name),
  );

  const insert = database.prepare<[string]>('INSERT INTO _migrations (name) VALUES (?)');

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await readFile(path.join(migrationsDir, file), 'utf-8');
    log.info(`Running migration: ${file}`);

    const runMigration = database.transaction(() => {
      database.exec(sql);
      insert.run(file);
    });

    runMigration();
  }
}

function requireDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

/**
 * Strip leading SQL comments and whitespace so the statement kind can be read.
 *
 * Testing the raw string is not enough: `/**\/DROP TABLE x` and `--x\nDROP TABLE x`
 * both begin with a comment, so a naive `^\s*` check waves them through.
 */
function leadingKeyword(sql: string): string {
  let rest = sql;
  for (;;) {
    const before = rest;
    rest = rest.trimStart();
    if (rest.startsWith('--')) {
      const nl = rest.indexOf('\n');
      rest = nl === -1 ? '' : rest.slice(nl + 1);
    } else if (rest.startsWith('/*')) {
      const end = rest.indexOf('*/');
      rest = end === -1 ? '' : rest.slice(end + 2);
    }
    if (rest === before) break;
  }
  return (/^[a-z]+/i.exec(rest)?.[0] ?? '').toUpperCase();
}

/**
 * Allow only the statement kinds a channel is meant to run.
 *
 * This is an allowlist rather than a denylist of dangerous keywords — a denylist
 * is only ever as good as its authors' imagination. better-sqlite3's `prepare`
 * additionally rejects strings containing more than one statement.
 */
function assertStatementKind(sql: string, allowed: readonly string[]): void {
  const keyword = leadingKeyword(sql);
  if (!allowed.includes(keyword)) {
    throw new Error(`Statement not permitted on this channel: expected ${allowed.join('/')}, got "${keyword || '(empty)'}"`);
  }
}

const READ_STATEMENTS = ['SELECT', 'WITH'] as const;
const WRITE_STATEMENTS = ['INSERT', 'UPDATE', 'DELETE'] as const;

/**
 * Execute a read query. Returns rows as an array of objects.
 *
 * Pass `Row` when the caller knows the shape: `dbQuery<{ id: number }>(...)`.
 */
export function dbQuery<Row extends SqlRow = SqlRow>(
  sql: string,
  params: SqlValue[] = [],
): { rows: Row[] } {
  assertStatementKind(sql, READ_STATEMENTS);
  return { rows: requireDb().prepare<SqlValue[], Row>(sql).all(...params) };
}

/** Execute a write statement. Returns change count and last insert rowid. */
export function dbRun(sql: string, params: SqlValue[] = []): DbRunResult {
  assertStatementKind(sql, WRITE_STATEMENTS);
  const result = requireDb().prepare<SqlValue[]>(sql).run(...params);
  return {
    changes: result.changes,
    // SQLite rowids exceed Number.MAX_SAFE_INTEGER only in pathological cases,
    // but truncating silently is worse than reporting it.
    lastInsertRowid:
      typeof result.lastInsertRowid === 'bigint' && result.lastInsertRowid > Number.MAX_SAFE_INTEGER
        ? Number.MAX_SAFE_INTEGER
        : Number(result.lastInsertRowid),
  };
}

/** Close the database connection. Call on app quit. */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
