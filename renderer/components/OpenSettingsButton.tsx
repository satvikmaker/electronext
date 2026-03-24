'use client';

import Link from 'next/link';

export default function OpenSettingsButton() {
  return (
    <Link
      href="/settings"
      className="inline-block rounded-lg bg-secondary px-6 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
    >
      Settings
    </Link>
  );
}
