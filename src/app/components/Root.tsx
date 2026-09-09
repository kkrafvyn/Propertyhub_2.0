import { Capacitor } from "@capacitor/core";
import { useAuth } from "../context/AuthContext";
import { isWorkspaceRole } from "../lib/baytmiftah/roles";
import { useIdleSessionTimeout } from "../hooks/useIdleSessionTimeout";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { RouteMonitoring } from "./RouteMonitoring";
import { MobileAppShell } from "../mobile/MobileAppShell";
import { MobileBiometricGate } from "../mobile/MobileBiometricGate";
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
import { isDesktopWorkspaceApp } from "../../lib/desktop-app";
import {
  isDesktopConsumerOnlyRoute,
  resolveDesktopProfessionalHome,
} from "../../lib/desktop-routing";
import { AdminDesktopShell } from "../shells/AdminDesktopShell";
import { DesktopNavigationBridge } from "./DesktopNavigationBridge";
import { DesktopProfessionalGateway } from "./DesktopProfessionalGateway";
import { GettingStartedChecklist, NewUserTutorial } from "./onboarding/NewUserTutorial";
import { isMarketingSite, isMarketingPublicPath } from "../../lib/site-mode";
import { MarketingSiteFrame } from "../components/marketing/MarketingSiteFrame";
import { MarketingHome } from "../pages/marketing/MarketingHome";

function useViewportFlags() {
  const [flags, setFlags] = useState(() => {
    if (typeof window === "undefined") {
      return { isPhone: false, isTablet: false };
    }
    return {
      isPhone: window.matchMedia(PHONE_MEDIA).matches,
      isTablet: window.matchMedia(TABLET_MEDIA).matches,
    };
  });

  useEffect(() => {
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
    pathname.startsWith("/compare") ||
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
    pathname.startsWith("/enrollment") ||
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
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/property/") ||
    pathname.startsWith("/compare")
  );
}

export function Root() {
  const location = useLocation();
  const { isPhone, isTablet } = useViewportFlags();
  const isMobileLayout = isPhone || isTablet;
  const { role, profile, user } = useAuth();
  const { ready: marketReady, onboardingComplete } = useUserMarket();
  useIdleSessionTimeout(Boolean(user));

  const showAdminDesktopShell = isElectron() && location.pathname.startsWith("/admin");
  const isDesktopApp = isDesktopWorkspaceApp();

  if (isDesktopApp && isDesktopConsumerOnlyRoute(location.pathname)) {
    const target = user ? resolveDesktopProfessionalHome(user, profile) : "/login";
    const current = `${location.pathname}${location.search}`;
    if (target !== current) {
      return (
        <>
          <DesktopNavigationBridge />
          <DesktopProfessionalGateway>
            <Navigate to={target} replace />
          </DesktopProfessionalGateway>
        </>
      );
    }
  }

  if (marketReady && !onboardingComplete && !shouldSkipOnboarding(location.pathname)) {
    return (
      <>
        {isElectron() ? <DesktopNavigationBridge /> : null}
        <LocationOnboarding />
      </>
    );
  }

  if (Capacitor.isNativePlatform() && isBusinessMobileApp() && location.pathname === "/") {
    return <Navigate to="/workspace" replace />;
  }

  if (
    location.pathname === "/marketing" ||
    (isMarketingSite() && isMarketingPublicPath(location.pathname))
  ) {
    return (
      <MarketingSiteFrame
        home={
          location.pathname === "/" || location.pathname === "/marketing" ? (
            <MarketingHome />
          ) : undefined
        }
      />
    );
  }

  if (isMobileLayout && location.pathname === "/" && !isBusinessMobileApp()) {
    return (
      <SurfaceProvider>
        <CallProvider>
          <MobileBiometricGate>
            <div className="mobile-bolt min-h-[100dvh] bg-bolt-bg has-mobile-tab-bar">
              {isElectron() ? <DesktopNavigationBridge /> : null}
              <RouteMonitoring />
              <PolicyUpdateBanner />
              <MobileAppShell />
              <BaytMiftahAIPanel />
              <CookieConsentBanner />
              <CallModal />
              <IncomingCallBanner />
              <ActiveCallBar />
              <NewUserTutorial />
            </div>
          </MobileBiometricGate>
        </CallProvider>
      </SurfaceProvider>
    );
  }

  const onConsumerRoute = isConsumerRoute(location.pathname);
  const showBottomNav = onConsumerRoute && isMobileLayout && !isBusinessMobileApp();
  const showWorkspaceDock = showBottomNav && Boolean(user) && isWorkspaceRole(role);

  const shellClass = [
    "mobile-bolt min-h-[100dvh] bg-bolt-bg",
    showBottomNav ? "has-mobile-tab-bar" : "",
    showWorkspaceDock ? "has-workspace-dock" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SurfaceProvider>
      <CallProvider>
        <MobileBiometricGate>
          <div className={shellClass}>
            {isElectron() ? <DesktopNavigationBridge /> : null}
            <RouteMonitoring />
            <PolicyUpdateBanner />
            {showAdminDesktopShell ? (
              <AdminDesktopShell>
                <Outlet />
              </AdminDesktopShell>
            ) : (
              <DesktopProfessionalGateway>
                <Outlet />
              </DesktopProfessionalGateway>
            )}
            {!isDesktopApp && showWorkspaceDock ? <MobileWorkspaceDock /> : null}
            {!isDesktopApp && showBottomNav ? <MobileBottomNav variant="phone" /> : null}
            {!isDesktopApp ? <BaytMiftahAIPanel /> : null}
            {!isDesktopApp ? <CookieConsentBanner /> : null}
            <CallModal />
            <IncomingCallBanner />
            <ActiveCallBar />
            {!isDesktopApp ? <NewUserTutorial /> : null}
            {!isDesktopApp ? <GettingStartedChecklist /> : null}
          </div>
        </MobileBiometricGate>
      </CallProvider>
    </SurfaceProvider>
  );
}
