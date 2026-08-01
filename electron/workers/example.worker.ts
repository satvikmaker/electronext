/**
 * Example background worker.
 *
 * Workers run in a separate thread and communicate via messages.
 * Post { type: 'progress', percent, message? } for progress updates.
 * Post { type: 'complete', data } when done.
 *
 * Start from renderer:
 *   const id = await window.electron.ipc.invoke('worker:start', 'example', { iterations: 10 });
 *   window.electron.ipc.on('worker:progress', (p) => console.log(p.percent));
 *   window.electron.ipc.on('worker:complete', (r) => console.log(r.data));
 */

import { parentPort, workerData } from 'node:worker_threads';
import type { WorkerMessage } from '../services/worker-manager.js';

// `workerData` is typed `any` by @types/node and its `data` field originates in
// the renderer, so nothing about it is guaranteed.
if (!parentPort) throw new Error('example.worker must be run as a worker thread');
// Capture after the guard so the narrowed type survives into the closures below.
const port = parentPort;

const MAX_ITERATIONS = 1_000;

function readIterations(raw: unknown): number {
  const value = (raw as { data?: { iterations?: unknown } } | null)?.data?.iterations;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) return 10;
  return Math.min(value, MAX_ITERATIONS);
}

const iterations = readIterations(workerData);

function post(message: WorkerMessage): void {
  port.postMessage(message);
}

async function run(): Promise<void> {
  let result = 0;

  for (let i = 1; i <= iterations; i++) {
    // Simulate CPU work
    await new Promise((r) => setTimeout(r, 200));
    result += i;

    post({
      type: 'progress',
      percent: Math.round((i / iterations) * 100),
      message: `Processing step ${i}/${iterations}`,
    });
  }

  post({ type: 'complete', data: { result, iterations } });
}

// Surface a rejection as a worker 'error' event rather than an unhandled
// rejection that would terminate the thread with no diagnostic.
run().catch((err: unknown) => {
  throw err instanceof Error ? err : new Error(String(err));
});
