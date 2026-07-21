import { useEffect } from "react";
import { useLocation } from "react-router";
import { monitoring } from "../../lib/monitoring";

export function RouteMonitoring() {
  const location = useLocation();

  useEffect(() => {
    monitoring.trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}
