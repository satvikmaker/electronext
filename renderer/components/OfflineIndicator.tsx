'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Shows a banner when the device is offline.
 * Gated by NEXT_PUBLIC_ENABLE_OFFLINE_INDICATOR env var.
 */
export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  // Env-gated: only render if the feature flag is enabled
  if (process.env.NEXT_PUBLIC_ENABLE_OFFLINE_INDICATOR !== 'true') {
    return null;
  }

  if (isOnline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-medium text-white">
      <span className="inline-block h-2 w-2 rounded-full bg-white/80 animate-pulse" />
      You are offline — some features may be unavailable
    </div>
  );
}
