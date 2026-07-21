import { Component, type ErrorInfo, type ReactNode } from "react";
import { monitoring } from "../../lib/monitoring";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    monitoring.captureError(error, info.componentStack || "react-boundary");
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <div>
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-muted-foreground mt-2">
              Refresh the page or return to the home screen.
            </p>
            <a href="/" className="inline-block mt-4 text-primary underline">
              Go home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
