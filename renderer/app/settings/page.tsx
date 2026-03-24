import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function Settings() {
  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-text-muted transition-colors hover:text-primary"
      >
        &larr; Back to Home
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-text">Settings</h1>

      <div className="space-y-6">
        <div className="rounded-2xl bg-surface p-6 shadow-lg">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text">Theme</span>
            <ThemeToggle />
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-lg">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
            About
          </h2>
          <div className="space-y-2 text-sm text-text-muted">
            <p>ElectroNext — Electron + Next.js Boilerplate</p>
          </div>
        </div>
      </div>
    </main>
  );
}
