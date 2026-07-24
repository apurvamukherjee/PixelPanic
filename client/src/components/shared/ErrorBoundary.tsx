import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// One boundary at the app root is enough at this scale — without it, an
// unexpected render error blanks the whole app silently with no feedback.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="glass flex max-w-sm flex-col items-center gap-3 rounded-3xl p-8">
          <h1 className="font-display text-xl font-bold text-error">Something went wrong</h1>
          <p className="text-sm text-on-surface-variant">
            Pixelpanic hit an unexpected error. Reloading usually fixes it — your room will still be
            there if the server's still up.
          </p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    );
  }
}
