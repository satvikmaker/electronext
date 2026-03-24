'use client';

import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { increment, decrement, incrementAsync, reset } from '@/lib/features/counterSlice';

export default function Counter() {
  const count = useAppSelector((state) => state.counter.value);
  const status = useAppSelector((state) => state.counter.status);
  const dispatch = useAppDispatch();

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-lg">
      <h2 className="mb-4 text-lg font-semibold text-text">Redux Counter</h2>
      <div className="mb-6 text-center">
        <span className="text-5xl font-bold text-primary">{count}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => dispatch(decrement())}
          className="rounded-lg bg-surface-light px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-primary"
        >
          - Decrement
        </button>
        <button
          onClick={() => dispatch(increment())}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          + Increment
        </button>
        <button
          onClick={() => dispatch(incrementAsync(5))}
          disabled={status === 'loading'}
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {status === 'loading' ? 'Adding...' : '+ Async (5)'}
        </button>
        <button
          onClick={() => dispatch(reset())}
          className="rounded-lg border border-surface-light px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-primary hover:text-text"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
