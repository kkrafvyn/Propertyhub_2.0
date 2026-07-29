import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { RouteMonitoring } from "./RouteMonitoring";
import { MobileAppShell } from "../mobile/MobileAppShell";
import { MobileBottomNav } from "../mobile/MobileBottomNav";
import { SplashScreen } from "./baytmiftah/splash/SplashScreen";
import { LocationOnboarding } from "./onboarding/LocationOnboarding";
import { useUserMarket } from "../context/MarketContext";
import { shouldShowLaunchSplash } from "../lib/baytmiftah/platform";
import { PHONE_MEDIA, TABLET_MEDIA } from "../lib/viewports";

function useViewportFlags() {
  const [flags, setFlags] = useState(() => {
    if (typeof window === "undefined") {
      return { isPhone: false, isTablet: false };
    }
    if (Capacitor.isNativePlatform()) {
      return { isPhone: true, isTablet: false };
    }
    return {
      isPhone: window.matchMedia(PHONE_MEDIA).matches,
      isTablet: window.matchMedia(TABLET_MEDIA).matches,
    };
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setFlags({ isPhone: true, isTablet: false });
      return;
    }

    const phoneQuery = window.matchMedia(PHONE_MEDIA);
    const tabletQuery = window.matchMedia(TABLET_MEDIA);

    const update = () => {
      setFlags({
        isPhone: phoneQuery.matches,
        isTablet: tabletQuery.matches,
      });
    };

    update();
    phoneQuery.addEventListener("change", update);
    tabletQuery.addEventListener("change", update);

    return () => {
      phoneQuery.removeEventListener("change", update);
      tabletQuery.removeEventListener("change", update);
    };
  }, []);

  return flags;
}

function isConsumerRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/property/") ||
    pathname.startsWith("/app")
  );
}

function shouldSkipOnboarding(pathname: string) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/property/") ||
    pathname.startsWith("/compare")
  );
}

export function Root() {
  const location = useLocation();
  const { isPhone } = useViewportFlags();
  const { ready: marketReady, onboardingComplete } = useUserMarket();
  const showSplash = shouldShowLaunchSplash();
  const [splashDone, setSplashDone] = useState(() => !showSplash);

  useEffect(() => {
    if (!showSplash) {
      setSplashDone(true);
    }
  }, [showSplash]);

  if (showSplash && !splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  if (marketReady && !onboardingComplete && !shouldSkipOnboarding(location.pathname)) {
    return <LocationOnboarding />;
  }

  if (isPhone && location.pathname === "/") {
    return <MobileAppShell />;
  }

  const onConsumerRoute = isConsumerRoute(location.pathname);
  const showBottomNav = onConsumerRoute && isPhone;

  const shellClass = [
    "mobile-bolt min-h-screen min-h-[100dvh] bg-bolt-bg",
    showBottomNav ? "has-mobile-tab-bar" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <RouteMonitoring />
      <Outlet />
      {showBottomNav ? <MobileBottomNav variant="phone" /> : null}
    </div>
  );
}
