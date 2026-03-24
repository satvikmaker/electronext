'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reports an error to the main process via IPC for logging.
 */
function reportErrorToMain(error: Error, componentStack?: string): void {
  if (typeof window !== 'undefined' && window.electron) {
    window.electron.ipc.invoke('app:report-error', {
      message: error.message,
      stack: error.stack,
      componentStack: componentStack ?? undefined,
    });
  }
}

/**
 * Global error listeners — captures errors outside React's tree.
 * Installed once when the component mounts.
 */
let globalListenersInstalled = false;

function installGlobalErrorListeners(): void {
  if (globalListenersInstalled) return;
  globalListenersInstalled = true;

  window.addEventListener('error', (event) => {
    reportErrorToMain(
      event.error instanceof Error ? event.error : new Error(String(event.message))
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
    reportErrorToMain(error);
  });
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidMount(): void {
    installGlobalErrorListeners();
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportErrorToMain(error, info.componentStack ?? undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-8">
          <div className="max-w-md rounded-2xl bg-surface p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-xl text-red-400">
              !
            </div>
            <h2 className="mb-2 text-lg font-semibold text-text">Something went wrong</h2>
            <p className="mb-4 text-sm text-text-muted">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
