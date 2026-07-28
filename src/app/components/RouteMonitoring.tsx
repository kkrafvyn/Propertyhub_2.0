import { useEffect } from "react";
import { useLocation } from "react-router";
import { monitoring } from "../../lib/monitoring";

export function RouteMonitoring() {
  const location = useLocation();

  useEffect(() => {
    monitoring.trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      monitoring.captureError(event.error || event.message, "window.error");
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      monitoring.captureError(event.reason, "window.unhandledrejection");
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
