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

interface Input {
  iterations?: number;
}

const { data } = workerData as { data: Input };
const iterations = data.iterations ?? 10;

async function run() {
  let result = 0;

  for (let i = 1; i <= iterations; i++) {
    // Simulate CPU work
    await new Promise((r) => setTimeout(r, 200));
    result += i;

    parentPort!.postMessage({
      type: 'progress',
      percent: Math.round((i / iterations) * 100),
      message: `Processing step ${i}/${iterations}`,
    });
  }

  parentPort!.postMessage({
    type: 'complete',
    data: { result, iterations },
  });
}

run();
