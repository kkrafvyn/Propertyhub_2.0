import { useEffect } from "react";
import { useNavigate } from "react-router";
import { resolveDesktopRoute } from "../../lib/desktop-navigation";

type DesktopAPI = {
  onNavigate?: (callback: (route: string) => void) => () => void;
};

/**
 * Subscribes to Electron menu / tray navigation IPC and routes in-app.
 */
export function DesktopNavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    const api = (window as unknown as { desktopAPI?: DesktopAPI }).desktopAPI;
    if (!api?.onNavigate) return;

    const unsubscribe = api.onNavigate((route) => {
      const target = resolveDesktopRoute(route);
      navigate(target);
    });

    return unsubscribe;
  }, [navigate]);

  return null;
}
