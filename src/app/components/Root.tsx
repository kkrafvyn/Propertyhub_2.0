import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { mobileDeepLinkService } from "../../lib/mobile-deep-link.service";
import { mobileNativeService } from "../../lib/mobile-native.service";
import { MobileAppShell } from "../mobile/MobileAppShell";

const mobileShellPrefixes = [
  "/search",
  "/property/",
  "/agencies",
  "/guides",
  "/market-trends",
  "/reviews",
  "/buyer-requests",
  "/projects",
  "/valuation",
  "/get-the-app",
  "/app",
];

function usePrefersMobileShell() {
  const [prefersMobileShell, setPrefersMobileShell] = useState(() => {
    if (Capacitor.isNativePlatform()) return true;
    return false;
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setPrefersMobileShell(true);
    }
  }, []);

  return prefersMobileShell;
}

function shouldUseMobileShell(pathname: string) {
  if (pathname === "/") return true;

  return mobileShellPrefixes.some((prefix) => {
    if (prefix.endsWith("/")) {
      return pathname.startsWith(prefix);
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefersMobileShell = usePrefersMobileShell();

  useEffect(() => {
    let cleanupDeepLinks: (() => void) | undefined;
    let cleanupKeyboard: (() => void) | undefined;
    let mounted = true;

    void mobileNativeService.watchDeepLinks((url) => {
      navigate(mobileDeepLinkService.toAppPath(url));
    }).then((cleanup) => {
      if (mounted) cleanupDeepLinks = cleanup;
      else cleanup();
    });

    void mobileNativeService.watchKeyboardInset((height) => {
      document.documentElement.style.setProperty("--mobile-keyboard-inset", `${height}px`);
    }).then((cleanup) => {
      if (mounted) cleanupKeyboard = cleanup;
      else cleanup();
    });

    return () => {
      mounted = false;
      cleanupDeepLinks?.();
      cleanupKeyboard?.();
      document.documentElement.style.removeProperty("--mobile-keyboard-inset");
    };
  }, [navigate]);

  if (prefersMobileShell && shouldUseMobileShell(location.pathname)) {
    return (
      <MobileAppShell>
        <Outlet />
      </MobileAppShell>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}
