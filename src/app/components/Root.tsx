import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { mobileDeepLinkService } from "../../lib/mobile-deep-link.service";
import { mobileNativeService } from "../../lib/mobile-native.service";
import { MobileAppShell } from "../mobile/MobileAppShell";

const mobileShellPrefixes = [
  "/search",
  "/property/",
  "/agencies",
  "/guides",
  "/verify/",
  "/market-trends",
  "/sold-ledger",
  "/reviews",
  "/buyer-requests",
  "/projects",
  "/valuation",
  "/get-the-app",
  "/legal",
  "/app",
  "/workspace",
];

const legacyBaytMiftahRouteMap = [
  { test: (path: string) => path === "/baytmiftah" || path === "/baytmiftah/marketplace", to: "/" },
  { test: (path: string) => path === "/baytmiftah/aureus-listings", to: "/search" },
  { test: (path: string) => path === "/baytmiftah/property", to: "/property/demo-airport-residential" },
  { test: (path: string) => path === "/baytmiftah/aureus-compliance", to: "/verify/demo-receipt" },
  { test: (path: string) => path === "/baytmiftah/payments-escrow", to: "/app/payments" },
  { test: (path: string) => path === "/baytmiftah/mobile-workspace", to: "/app" },
  { test: (path: string) => path === "/baytmiftah/secure-login", to: "/login" },
] as const;

function getLegacyBaytMiftahRedirect(pathname: string) {
  return legacyBaytMiftahRouteMap.find((route) => route.test(pathname))?.to ?? null;
}

function shouldUseMobileShell(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/baytmiftah")) return false;
  if (pathname.startsWith("/admin")) return false;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password")
  ) {
    return false;
  }

  return mobileShellPrefixes.some((prefix) => {
    if (prefix.endsWith("/")) return pathname.startsWith(prefix);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export function Root() {
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = getLegacyBaytMiftahRedirect(location.pathname);

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

  if (shouldUseMobileShell(location.pathname)) {
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
