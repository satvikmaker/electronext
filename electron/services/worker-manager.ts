import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import log from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WorkerCallbacks {
  onProgress(workerId: string, percent: number, message?: string): void;
  onComplete(workerId: string, data: unknown): void;
  onError(workerId: string, error: string): void;
}

/**
 * Worker message protocol.
 * Workers must post messages conforming to these types.
 */
export type WorkerMessage =
  | { type: 'progress'; percent: number; message?: string }
  | { type: 'complete'; data: unknown };

/**
 * Manages background worker threads.
 *
 * Workers are TypeScript files compiled to `dist/electron/workers/`.
 * Each worker receives `workerData: { taskName, data }` and posts
 * messages back using the WorkerMessage protocol.
 *
 * Usage from renderer:
 *   const workerId = await electron.ipc.invoke('worker:start', 'example', { input: 42 });
 *   electron.ipc.on('worker:complete', (result) => { ... });
 */
class WorkerManager {
  private workers = new Map<string, Worker>();

  start(taskName: string, data: unknown, callbacks: WorkerCallbacks): string {
    const workerId = randomUUID();
    const workerPath = path.join(__dirname, '..', 'workers', `${taskName}.worker.js`);

    try {
      const worker = new Worker(workerPath, {
        workerData: { taskName, data, workerId },
      });

      worker.on('message', (msg: WorkerMessage) => {
        if (msg.type === 'progress') {
          callbacks.onProgress(workerId, msg.percent, msg.message);
        } else if (msg.type === 'complete') {
          callbacks.onComplete(workerId, msg.data);
          this.cleanup(workerId);
        }
      });

      worker.on('error', (err: Error) => {
        log.error(`Worker ${taskName} error:`, err);
        callbacks.onError(workerId, err.message);
        this.cleanup(workerId);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          callbacks.onError(workerId, `Worker exited with code ${code}`);
        }
        this.cleanup(workerId);
      });

      this.workers.set(workerId, worker);
      return workerId;
    } catch (rawErr) {
      const message = rawErr instanceof Error ? rawErr.message : String(rawErr);
      log.error(`Failed to start worker ${taskName}:`, message);
      callbacks.onError(workerId, message);
      return workerId;
    }
  }

  cancel(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.terminate();
      this.cleanup(workerId);
    }
  }

  private cleanup(workerId: string): void {
    this.workers.delete(workerId);
  }

  terminateAll(): void {
    for (const worker of this.workers.values()) {
      worker.terminate();
    }
    this.workers.clear();
  }
}

export const workerManager = new WorkerManager();
