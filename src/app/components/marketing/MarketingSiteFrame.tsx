import { useEffect, type ReactNode } from "react";
import { Outlet } from "react-router";
import { setMarketingThemeLocked } from "../../../lib/marketing-theme-lock";
import { RouteMonitoring } from "../RouteMonitoring";
import { CookieConsentBanner } from "../legal/CookieConsentBanner";
import { PolicyUpdateBanner } from "../legal/PolicyUpdateBanner";
import { SurfaceProvider } from "../../context/SurfaceContext";
import { MarketingShell } from "./MarketingShell";

export function MarketingSiteFrame({ home }: { home?: ReactNode }) {
  useEffect(() => {
    setMarketingThemeLocked(true);
    return () => setMarketingThemeLocked(false);
  }, []);

  return (
    <SurfaceProvider>
      <RouteMonitoring />
      <PolicyUpdateBanner />
      <MarketingShell>
        {home ?? (
          <div className="mk-subpage">
            <Outlet />
          </div>
        )}
      </MarketingShell>
      <CookieConsentBanner />
    </SurfaceProvider>
  );
}
