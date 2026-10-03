import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onFailure: () => void;
};

type State = { failed: boolean };

/** Prevents HDR / WebGL failures from crashing the marketing route. */
export class Marketing3DErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.warn("[Marketing3D]", error.message, info.componentStack);
    }
    this.props.onFailure();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
