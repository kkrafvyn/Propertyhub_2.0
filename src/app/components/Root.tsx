import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { mobileDeepLinkService } from "../../lib/mobile-deep-link.service";
import { mobileNativeService } from "../../lib/mobile-native.service";

const newUiRouteMap = [
  { test: (path: string) => path === "/", to: "/baytmiftah/marketplace" },
  { test: (path: string) => path === "/search" || path.startsWith("/search/"), to: "/baytmiftah/aureus-listings" },
  { test: (path: string) => path.startsWith("/property/"), to: "/baytmiftah/property" },
  { test: (path: string) => path === "/verify" || path.startsWith("/verify/"), to: "/baytmiftah/aureus-compliance" },
  { test: (path: string) => path === "/agencies" || path.startsWith("/agencies/"), to: "/baytmiftah/agency" },
  { test: (path: string) => path === "/guides", to: "/baytmiftah/areas" },
  { test: (path: string) => path.startsWith("/guides/"), to: "/baytmiftah/aureus-district" },
  { test: (path: string) => path === "/market-trends", to: "/baytmiftah/aureus-analytics" },
  { test: (path: string) => path === "/sold-ledger", to: "/baytmiftah/payments-escrow" },
  { test: (path: string) => path === "/reviews", to: "/baytmiftah/messages" },
  { test: (path: string) => path === "/innovation-lab" || path === "/feature-completion", to: "/baytmiftah/innovation" },
  { test: (path: string) => path === "/buyer-requests", to: "/baytmiftah/users" },
  { test: (path: string) => path === "/projects" || path.startsWith("/projects/"), to: "/baytmiftah/developments" },
  { test: (path: string) => path === "/valuation", to: "/baytmiftah/innovation" },
  { test: (path: string) => path === "/get-the-app", to: "/baytmiftah/mobile-landing" },
  { test: (path: string) => path === "/legal" || path.startsWith("/legal/"), to: "/baytmiftah/aureus-compliance" },
  { test: (path: string) => path === "/login" || path === "/login/verify" || path === "/forgot-password" || path === "/signup", to: "/baytmiftah/secure-login" },
  { test: (path: string) => path === "/app" || path.startsWith("/app/"), to: "/baytmiftah/mobile-workspace" },
  { test: (path: string) => path === "/workspace" || path.startsWith("/workspace/"), to: "/baytmiftah/agency" },
  { test: (path: string) => path === "/admin" || path.startsWith("/admin/"), to: "/baytmiftah/admin-platform" },
] as const;

function getNewUiRedirect(pathname: string) {
  if (pathname.startsWith("/baytmiftah")) return null;
  return newUiRouteMap.find((route) => route.test(pathname))?.to ?? null;
}

export function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = getNewUiRedirect(location.pathname);

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

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}
