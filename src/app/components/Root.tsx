import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { MobileAppShell } from "../mobile/MobileAppShell";

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

export function Root() {
  const location = useLocation();
  const prefersMobileShell = usePrefersMobileShell();

  if (prefersMobileShell && location.pathname === "/") {
    return <MobileAppShell />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}
