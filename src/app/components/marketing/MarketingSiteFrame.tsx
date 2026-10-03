import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Outlet } from "react-router";
import { setMarketingThemeLocked } from "../../../lib/marketing-theme-lock";
import { RouteMonitoring } from "../RouteMonitoring";
import { SurfaceProvider } from "../../context/SurfaceContext";
import { MarketingShell } from "./MarketingShell";
import { CINEMATIC_NAV_LINKS } from "./cinematic/cinematic-nav";
import "./cinematic/marketing-cinematic.css";

const CookieConsentBanner = lazy(() => import("../legal/CookieConsentBanner").then((module) => ({ default: module.CookieConsentBanner })));
const PolicyUpdateBanner = lazy(() => import("../legal/PolicyUpdateBanner").then((module) => ({ default: module.PolicyUpdateBanner })));

export function MarketingSiteFrame({ home }: { home?: ReactNode }) {
  useEffect(() => {
    setMarketingThemeLocked(true);
    return () => setMarketingThemeLocked(false);
  }, []);

  return (
    <SurfaceProvider>
      <RouteMonitoring />
      <Suspense fallback={null}><PolicyUpdateBanner /></Suspense>
      <MarketingShell cinematic={Boolean(home)} navLinks={home ? CINEMATIC_NAV_LINKS : undefined}>
        {home ?? (
          <div className="mk-subpage">
            <Outlet />
          </div>
        )}
      </MarketingShell>
      <Suspense fallback={null}><CookieConsentBanner /></Suspense>
    </SurfaceProvider>
  );
}
