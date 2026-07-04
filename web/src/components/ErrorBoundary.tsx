import { Component, ErrorInfo, ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state = { error: undefined as Error | undefined };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('UI crash:', error, info); }

  render() {
    if (this.state.error) {
      return (
        <div className="h-full grid place-items-center bg-bg text-fg p-8">
          <div className="max-w-md text-center">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted mt-2">{this.state.error.message}</p>
            <button onClick={() => location.reload()} className="mt-5 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium">Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
