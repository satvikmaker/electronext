#!/usr/bin/env node

/**
 * Pre-flight check: ensures the dev server port is available before starting.
 * Prevents the dev workflow from hanging when another process occupies the port.
 */

import detectPort from 'detect-port';

const port = Number(process.env.PORT) || 3000;
const available = await detectPort(port);

if (port !== available) {
  console.error(
    `\n  Port ${port} is already in use (next available: ${available}).\n` +
    `  Free the port or set a different one: PORT=${available} npm run dev\n`
  );
  process.exit(1);
}
