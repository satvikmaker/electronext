'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};
const getSnapshot = () => typeof window !== 'undefined' && !!window.electron;
const getServerSnapshot = () => false;

/**
 * Whether the preload bridge is present — false when the renderer runs in a
 * plain browser (`npm run dev` opened in Chrome).
 *
 * Uses useSyncExternalStore rather than an effect so the server and first
 * client render agree, avoiding a hydration mismatch.
 */
export function useHasElectron(): boolean {
  return useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
}
