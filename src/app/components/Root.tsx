import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { mobileDeepLinkService } from "../../lib/mobile-deep-link.service";
import { mobileNativeService } from "../../lib/mobile-native.service";
import { useAuth } from "../context/AuthContext";
import { MobileAppShell } from "../mobile/MobileAppShell";

const mobileShellPrefixes = [
  "/search",
  "/property/",
  "/agencies",
  "/guides",
  "/market-trends",
  "/sold-ledger",
  "/reviews",
  "/buyer-requests",
  "/projects",
  "/valuation",
  "/get-the-app",
  "/app",
  "/workspace",
];

const mobileWebMediaQuery = "(max-width: 767px), (pointer: coarse) and (max-width: 900px)";

function isMobileWebViewport() {
  if (typeof window === "undefined" || !("matchMedia" in window)) return false;
  return window.matchMedia(mobileWebMediaQuery).matches;
}

function usePrefersMobileShell(isSignedIn: boolean) {
  const [prefersMobileShell, setPrefersMobileShell] = useState(() => {
    if (Capacitor.isNativePlatform()) return true;
    return isSignedIn && isMobileWebViewport();
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setPrefersMobileShell(true);
      return;
    }

    if (typeof window === "undefined" || !("matchMedia" in window)) {
      setPrefersMobileShell(false);
      return;
    }

    const media = window.matchMedia(mobileWebMediaQuery);
    const updatePreference = () => {
      setPrefersMobileShell(isSignedIn && media.matches);
    };

    updatePreference();
    if (media.addEventListener) {
      media.addEventListener("change", updatePreference);

      return () => {
        media.removeEventListener("change", updatePreference);
      };
    }

    media.addListener?.(updatePreference);

    return () => {
      media.removeListener?.(updatePreference);
    };
  }, [isSignedIn]);

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
  const { user } = useAuth();
  const prefersMobileShell = usePrefersMobileShell(Boolean(user));

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
