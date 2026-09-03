import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router";
import { monitoring } from "../../lib/monitoring";
import { Button } from "./ui/Button";
import { ErrorState } from "./ux/ErrorState";
import { StandalonePageShell } from "./ux/StandalonePageShell";

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
        <StandalonePageShell maxWidthClassName="max-w-xl">
          <div className="py-16">
            <ErrorState
              title="Something went wrong"
              message="Refresh the page or return to the home screen."
              retryLabel="Go home"
              onRetry={() => {
                window.location.href = "/";
              }}
            />
            <div className="mt-4 text-center">
              <Link to="/search">
                <Button variant="outline" size="sm">
                  Browse properties
                </Button>
              </Link>
            </div>
          </div>
        </StandalonePageShell>
      );
    }

    return this.props.children;
  }
}
