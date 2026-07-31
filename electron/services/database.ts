import { app } from 'electron';
import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import Database from 'better-sqlite3';
import log from './logger.js';

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
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await runMigrations();
  log.info(`Database initialized at ${dbPath}`);
}

/**
 * Run pending migrations from the migrations directory.
 * Migrations are SQL files named with a numeric prefix: 001_init.sql, 002_add_index.sql
 * Applied in alphabetical order. Skips already-applied migrations.
 */
async function runMigrations(): Promise<void> {
  if (!db) return;

  const migrationsDir = path.join(app.getAppPath(), 'electron', 'migrations');

  let files: string[];
  try {
    files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  } catch {
    // No migrations directory — that's fine
    return;
  }

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((row) => (row as { name: string }).name)
  );

  const insert = db.prepare('INSERT INTO _migrations (name) VALUES (?)');

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await readFile(path.join(migrationsDir, file), 'utf-8');
    log.info(`Running migration: ${file}`);

    const runMigration = db.transaction(() => {
      db!.exec(sql);
      insert.run(file);
    });

    runMigration();
  }
}

/**
 * Execute a read query. Returns rows as an array of objects.
 */
export function dbQuery(sql: string, params: unknown[] = []): { rows: Record<string, unknown>[] } {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as Record<string, unknown>[];
  return { rows };
}

/**
 * Execute a write statement. Returns change count and last insert rowid.
 */
export function dbRun(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return {
    changes: result.changes,
    lastInsertRowid: Number(result.lastInsertRowid),
  };
}

/**
 * Close the database connection. Call on app quit.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
