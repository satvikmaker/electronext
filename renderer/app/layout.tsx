import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import ErrorBoundary from '@/components/ErrorBoundary';
import TitleBar from '@/components/TitleBar';
import OfflineIndicator from '@/components/OfflineIndicator';
import UpdateNotification from '@/components/UpdateNotification';
import CommandPalette from '@/components/CommandPalette';
import './globals.css';

export const metadata: Metadata = {
  title: 'ElectroNext',
  description: 'Electron + Next.js boilerplate',
};

/**
 * Inline script that runs synchronously before React hydration to prevent
 * flash-of-wrong-theme (FOWT). Reads the synchronous `initialTheme` value
 * from the preload bridge — no async IPC needed.
 */
const themeScript = `
(function() {
  try {
    var e = window.electron;
    if (!e) return;
    var t = e.initialTheme;
    if (t === 'dark') document.documentElement.classList.add('dark');
    else if (t === 'system' || !t) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    }
  } catch(x) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background text-text antialiased">
        <ErrorBoundary>
          <Providers>
            <TitleBar />
            <UpdateNotification />
            <OfflineIndicator />
            <CommandPalette />
            <div className="flex-1">{children}</div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
