import Link from 'next/link';

export default function About() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-text-muted transition-colors hover:text-primary"
        >
          &larr; Back to Home
        </Link>
        <h1 className="mb-4 text-3xl font-bold text-text">About</h1>
        <p className="text-text-muted">
          This is an example second page demonstrating client-side navigation
          with Next.js App Router inside Electron.
        </p>
      </div>

      <div className="rounded-2xl bg-surface p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-text">Tech Stack</h2>
        <div className="space-y-3 text-sm text-text-muted">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded bg-primary px-2 py-0.5 text-xs font-medium text-white">
              Framework
            </span>
            <span>Next.js 16 with App Router and static export</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-white">
              Desktop
            </span>
            <span>Electron 43 with typed IPC and context isolation</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded bg-primary px-2 py-0.5 text-xs font-medium text-white">
              Styling
            </span>
            <span>Tailwind CSS v4 with CSS-first configuration</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-white">
              State
            </span>
            <span>Redux Toolkit with typed hooks</span>
          </div>
        </div>
      </div>
    </main>
  );
}
