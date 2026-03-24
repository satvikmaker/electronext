import Link from 'next/link';
import Counter from '@/components/Counter';
import IpcDemo from '@/components/IpcDemo';
import ThemeToggle from '@/components/ThemeToggle';
import DropZone from '@/components/DropZone';
import OpenSettingsButton from '@/components/OpenSettingsButton';

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-white">
          E
        </div>
        <h1 className="mb-2 text-3xl font-bold">ElectroNext</h1>
        <p className="mb-4 text-text-muted">
          Electron + Next.js + Tailwind CSS v4 + Redux Toolkit
        </p>
        <ThemeToggle />
      </div>

      <div className="flex flex-col gap-6">
        <Counter />
        <IpcDemo />
        <DropZone />

        <div className="rounded-2xl bg-surface p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-text">Features</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm text-text-muted">
            <li className="flex items-center gap-2">
              <span className="text-primary">&#10003;</span> Next.js App Router
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">&#10003;</span> Tailwind CSS v4
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">&#10003;</span> Redux Toolkit
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">&#10003;</span> Typed IPC
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">&#10003;</span> Auto Updates
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">&#10003;</span> Window State Persistence
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">&#10003;</span> System Tray
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">&#10003;</span> Custom Title Bar
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">&#10003;</span> File Drag &amp; Drop
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">&#10003;</span> Multi-Window
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/about"
            className="inline-block rounded-lg bg-surface-light px-6 py-2 text-sm font-medium text-text transition-colors hover:bg-primary hover:text-white"
          >
            About Page &rarr;
          </Link>
          <OpenSettingsButton />
        </div>
      </div>
    </main>
  );
}
