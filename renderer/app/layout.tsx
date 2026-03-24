import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import ErrorBoundary from '@/components/ErrorBoundary';
import TitleBar from '@/components/TitleBar';
import OfflineIndicator from '@/components/OfflineIndicator';
import UpdateNotification from '@/components/UpdateNotification';
import './globals.css';

export const metadata: Metadata = {
  title: 'ElectroNext',
  description: 'Electron + Next.js boilerplate',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-text antialiased">
        <ErrorBoundary>
          <Providers>
            <TitleBar />
            <UpdateNotification />
            <OfflineIndicator />
            <div className="flex-1">{children}</div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
