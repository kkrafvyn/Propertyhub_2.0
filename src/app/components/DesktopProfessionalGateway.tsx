import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { isElectron } from "../../lib/surface-detection";
import {
  isDesktopAuthRoute,
  isDesktopConsumerOnlyRoute,
  resolveDesktopProfessionalHome,
} from "../../lib/desktop-routing";

/**
 * Electron loads the same SPA as the website. This gateway keeps the desktop app
 * focused on professional workstation routes (workspace + platform admin).
 */
export function DesktopProfessionalGateway({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, profile } = useAuth();

  if (!isElectron()) {
    return children;
  }

  if (isDesktopAuthRoute(location.pathname)) {
    return children;
  }

  if (location.pathname.startsWith("/workspace") || location.pathname.startsWith("/admin")) {
    return children;
  }

  if (isDesktopConsumerOnlyRoute(location.pathname)) {
    const target = resolveDesktopProfessionalHome(user, profile);
    const current = `${location.pathname}${location.search}`;
    if (target !== current) {
      return <Navigate to={target} replace />;
    }
  }

  return children;
}
