import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import StartupToggle from '@/components/StartupToggle';
import SpellCheckToggle from '@/components/SpellCheckToggle';

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
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text">Theme</span>
            <ThemeToggle />
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-lg">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
            Language
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text">Display language</span>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-lg">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
            Editor
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-text">Spell check</span>
              <p className="text-xs text-text-muted">Check spelling as you type</p>
            </div>
            <SpellCheckToggle />
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-lg">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
            System
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-text">Open at login</span>
              <p className="text-xs text-text-muted">Launch the app when you sign in</p>
            </div>
            <StartupToggle />
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-lg">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
            Keyboard
          </h2>
          <div className="space-y-2 text-sm text-text-muted">
            <div className="flex items-center justify-between">
              <span>Command Palette</span>
              <kbd className="rounded border border-surface-light px-2 py-0.5 text-xs">Cmd+K</kbd>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-lg">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
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
