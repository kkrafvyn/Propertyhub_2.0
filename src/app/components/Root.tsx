import { Capacitor } from "@capacitor/core";
import { useAuth } from "../context/AuthContext";
import { isWorkspaceRole } from "../lib/baytmiftah/roles";
import { useIdleSessionTimeout } from "../hooks/useIdleSessionTimeout";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { RouteMonitoring } from "./RouteMonitoring";
import { MobileAppShell } from "../mobile/MobileAppShell";
import { MobileBottomNav } from "../mobile/MobileBottomNav";
import { MobileWorkspaceDock } from "../mobile/MobileWorkspaceDock";
import { LocationOnboarding } from "./onboarding/LocationOnboarding";
import { CookieConsentBanner } from "./legal/CookieConsentBanner";
import { BaytMiftahAIPanel } from "./ux/BaytMiftahAIPanel";
import { PolicyUpdateBanner } from "./legal/PolicyUpdateBanner";
import { useUserMarket } from "../context/MarketContext";
import { SurfaceProvider } from "../context/SurfaceContext";
import { CallProvider } from "../context/CallContext";
import { CallModal } from "./communication/CallModal";
import { IncomingCallBanner } from "./communication/IncomingCallBanner";
import { ActiveCallBar } from "./communication/ActiveCallBar";
import { PHONE_MEDIA, TABLET_MEDIA } from "../lib/viewports";
import { isBusinessMobileApp } from "../../lib/mobile-app";
import { isElectron } from "../../lib/surface-detection";
import { AdminDesktopShell } from "../shells/AdminDesktopShell";
import { GettingStartedChecklist, NewUserTutorial } from "./onboarding/NewUserTutorial";

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
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/safety") ||
    pathname.startsWith("/cancellation") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/careers") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/complaint") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/property/") ||
    pathname.startsWith("/compare")
  );
}

export function Root() {
  const location = useLocation();
  const { isPhone } = useViewportFlags();
  const { role, profile, user } = useAuth();
  const { ready: marketReady, onboardingComplete } = useUserMarket();
  useIdleSessionTimeout(Boolean(user));

  const isPlatformAdmin = Boolean(profile?.is_platform_admin) || role === "admin" || role === "platform_admin";
  const showAdminDesktopShell = isElectron() && location.pathname.startsWith("/admin");

  if (marketReady && !onboardingComplete && !shouldSkipOnboarding(location.pathname)) {
    return <LocationOnboarding />;
  }

  // Both native apps expose the same protected admin dashboard to admins.
  // The app variant changes the mobile experience, not authorization.
  if (Capacitor.isNativePlatform() && isPlatformAdmin && location.pathname === "/") {
    return <Navigate to="/admin" replace />;
  }

  if (Capacitor.isNativePlatform() && isBusinessMobileApp() && location.pathname === "/") {
    return <Navigate to="/workspace" replace />;
  }

  if (isPhone && location.pathname === "/") {
    return (
      <SurfaceProvider>
        <MobileAppShell />
        <NewUserTutorial />
      </SurfaceProvider>
    );
  }

  const onConsumerRoute = isConsumerRoute(location.pathname);
  const showBottomNav = onConsumerRoute && isPhone;
  const showWorkspaceDock = showBottomNav && Boolean(user) && isWorkspaceRole(role);

  const shellClass = [
    "mobile-bolt min-h-screen min-h-[100dvh] bg-bolt-bg",
    showBottomNav ? "has-mobile-tab-bar" : "",
    showWorkspaceDock ? "has-workspace-dock" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SurfaceProvider>
      <CallProvider>
        <div className={shellClass}>
          <RouteMonitoring />
          <PolicyUpdateBanner />
          {showAdminDesktopShell ? (
            <AdminDesktopShell>
              <Outlet />
            </AdminDesktopShell>
          ) : (
            <Outlet />
          )}
          {showBottomNav ? <MobileWorkspaceDock /> : null}
          {showBottomNav ? <MobileBottomNav variant="phone" /> : null}
          <BaytMiftahAIPanel />
          <CookieConsentBanner />
          <CallModal />
          <IncomingCallBanner />
          <ActiveCallBar />
          <NewUserTutorial />
          <GettingStartedChecklist />
        </div>
      </CallProvider>
    </SurfaceProvider>
  );
}
