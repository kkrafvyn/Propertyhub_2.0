import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { RouteMonitoring } from "./RouteMonitoring";
import { MobileAppShell } from "../mobile/MobileAppShell";
import { MobileBottomNav } from "../mobile/MobileBottomNav";

function usePrefersMobileShell() {
  const [prefersMobileShell, setPrefersMobileShell] = useState(() => {
    if (Capacitor.isNativePlatform()) return true;
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setPrefersMobileShell(true);
      return;
    }

    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setPrefersMobileShell(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return prefersMobileShell;
}

const MOBILE_CONSUMER_PREFIXES = ["/search", "/property/", "/app"];

export function Root() {
  const location = useLocation();
  const prefersMobileShell = usePrefersMobileShell();

  if (prefersMobileShell && location.pathname === "/") {
    return <MobileAppShell />;
  }

  const showMobileBottomNav =
    prefersMobileShell &&
    (location.pathname.startsWith("/search") ||
      location.pathname.startsWith("/property/") ||
      location.pathname.startsWith("/app"));

  return (
    <div className={`min-h-screen bg-background ${showMobileBottomNav ? "pb-24" : ""}`}>
      <RouteMonitoring />
      <Outlet />
      {showMobileBottomNav ? <MobileBottomNav /> : null}
    </div>
  );
}
