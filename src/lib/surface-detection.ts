/**
 * BaytMiftah Surface Detection Service
 * ─────────────────────────────────────
 * Determines which application surface the user is currently on.
 *
 * Architecture:
 *   Two products plus a role-aware internal admin compatibility family.
 *
 *   Consumer  → Web, Mobile
 *   Business  → Web, Desktop, Mobile
 *   Admin     → compatibility routes only; native admin access uses one of the
 *               two product apps rather than a third mobile app.
 *
 * Detection heuristics (in priority order):
 *   1. Electron preload flag  → Desktop
 *   2. Capacitor native flag  → Mobile
 *   3. CSS/viewport heuristic → Web (fallback)
 *   4. Route + role context   → Consumer / Business / Admin
 */

// ─── Types ──────────────────────────────────────────────────────────────

export type ProductFamily = 'consumer' | 'business' | 'admin';
export type Platform = 'web' | 'desktop' | 'mobile';

export type SurfaceId =
  | 'consumer-web'
  | 'consumer-mobile'
  | 'business-web'
  | 'business-desktop'
  | 'business-mobile'
  | 'admin-web'
  | 'admin-desktop'
  /** @deprecated Compatibility alias; admins use Consumer or Business Mobile. */
  | 'admin-mobile';

export interface Surface {
  id: SurfaceId;
  family: ProductFamily;
  platform: Platform;
}

// ─── Electron Detection ─────────────────────────────────────────────────

declare global {
  interface Window {
    __ELECTRON__?: boolean;
    __BAYTMIFTAH_DESKTOP__?: {
      platform: string;
      versions: Record<string, string>;
      surface?: string;
    };
  }
}

export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    !!window.__ELECTRON__ ||
    !!window.__BAYTMIFTAH_DESKTOP__ ||
    (typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent))
  );
}

// ─── Capacitor / Native Detection ───────────────────────────────────────

export function isNativeMobile(): boolean {
  if (typeof window === 'undefined') return false;

  // Capacitor detection
  const cap = (window as unknown as Record<string, unknown>).Capacitor as
    | { isNativePlatform?: () => boolean }
    | undefined;
  if (cap?.isNativePlatform?.()) return true;

  // Cordova fallback
  if ((window as unknown as Record<string, unknown>).cordova) return true;

  return false;
}

// ─── Mobile Web Detection (viewport/touch heuristic) ────────────────────

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  return width < 768;
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ─── Platform Detection ─────────────────────────────────────────────────

export function detectPlatform(): Platform {
  if (isElectron()) return 'desktop';
  if (isNativeMobile()) return 'mobile';
  return 'web';
}

// ─── Family Detection ───────────────────────────────────────────────────

/**
 * Determine the product family from the user's role and current route.
 *
 * Priority:
 *   1. URL-based admin routes → admin
 *   2. URL-based workspace/business routes → business
 *   3. Role-based detection (platform_admin, platform_moderator → admin;
 *      org member roles → business)
 *   4. Fallback → consumer
 */
export function detectFamily(
  pathname: string,
  userRole?: string | null,
  hasOrganization?: boolean,
): ProductFamily {
  // Route-based detection (highest priority)
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/workspace')) return 'business';

  // Role-based detection
  if (userRole) {
    const adminRoles = ['platform_admin', 'platform_moderator', 'developer'];
    if (adminRoles.includes(userRole)) return 'admin';

    const businessRoles = [
      'enterprise_operator',
      'property_manager',
      'property_owner',
      'agency_owner',
      'agency_manager',
      'agency_agent',
      'independent_agent',
    ];
    if (businessRoles.includes(userRole)) return 'business';
  }

  // Organization membership indicates business context
  if (hasOrganization) return 'business';

  // Default: consumer
  return 'consumer';
}

// ─── Surface Resolution ─────────────────────────────────────────────────

export function resolveSurface(
  pathname: string,
  userRole?: string | null,
  hasOrganization?: boolean,
): Surface {
  const platform = detectPlatform();
  const family = detectFamily(pathname, userRole, hasOrganization);

  // Consumer has no desktop surface → fall back to web
  const effectivePlatform =
    family === 'consumer' && platform === 'desktop' ? 'web' : platform;

  const id = `${family}-${effectivePlatform}` as SurfaceId;

  return { id, family, platform: effectivePlatform };
}

// ─── URL Surface Override (for Electron) ────────────────────────────────

/**
 * Parse `?surface=admin-desktop` from the Electron loading URL to force
 * a specific surface. Only honored when running in Electron.
 */
export function getUrlSurfaceOverride(): SurfaceId | null {
  if (!isElectron()) return null;
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const surfaceParam = params.get('surface');

  const validSurfaces: SurfaceId[] = [
    'consumer-web',
    'consumer-mobile',
    'business-web',
    'business-desktop',
    'business-mobile',
    'admin-web',
    'admin-desktop',
    'admin-mobile',
  ];

  if (surfaceParam && validSurfaces.includes(surfaceParam as SurfaceId)) {
    return surfaceParam as SurfaceId;
  }

  return null;
}

// ─── Convenience Checks ─────────────────────────────────────────────────

export function isDesktopSurface(surface: Surface): boolean {
  return surface.platform === 'desktop';
}

export function isMobileSurface(surface: Surface): boolean {
  return surface.platform === 'mobile';
}

export function isWebSurface(surface: Surface): boolean {
  return surface.platform === 'web';
}

export function isBusinessFamily(surface: Surface): boolean {
  return surface.family === 'business';
}

export function isAdminFamily(surface: Surface): boolean {
  return surface.family === 'admin';
}

export function isConsumerFamily(surface: Surface): boolean {
  return surface.family === 'consumer';
}
