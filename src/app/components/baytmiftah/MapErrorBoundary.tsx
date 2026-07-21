import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Map failed to load:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full min-h-[280px] items-center justify-center rounded-xl border border-surface-border bg-surface-subtle p-6 text-center text-sm text-ink-secondary">
            Map unavailable. Try list view or refresh the page.
          </div>
        )
      );
    }

    return this.props.children;
  }
}
