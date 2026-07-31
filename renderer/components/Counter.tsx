'use client';

import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { increment, decrement, incrementAsync, reset } from '@/lib/features/counterSlice';
import { useTranslation } from '@/hooks/useTranslation';

export default function Counter() {
  const count = useAppSelector((state) => state.counter.value);
  const status = useAppSelector((state) => state.counter.status);
  const dispatch = useAppDispatch();
  const t = useTranslation();

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-lg">
      <h2 className="mb-4 text-lg font-semibold text-text">{t('counter.title')}</h2>
      <div className="mb-6 text-center" role="status" aria-live="polite" aria-atomic="true">
        <span className="text-5xl font-bold text-primary" aria-label={`Count: ${count}`}>{count}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => dispatch(decrement())}
          className="rounded-lg bg-surface-light px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-primary"
        >
          {t('counter.decrement')}
        </button>
        <button
          onClick={() => dispatch(increment())}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          {t('counter.increment')}
        </button>
        <button
          onClick={() => dispatch(incrementAsync(5))}
          disabled={status === 'loading'}
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {status === 'loading' ? t('counter.adding') : t('counter.async')}
        </button>
        <button
          onClick={() => dispatch(reset())}
          className="rounded-lg border border-surface-light px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-primary hover:text-text"
        >
          {t('counter.reset')}
        </button>
      </div>
    </div>
  );
}
