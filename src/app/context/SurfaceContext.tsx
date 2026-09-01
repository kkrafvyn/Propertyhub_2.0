/**
 * BaytMiftah Surface Context
 * ──────────────────────────
 * React context providing the current application surface to the entire
 * component tree. All shells, route guards, and feature-gated components
 * read from this context.
 *
 * Provides:
 *   - surface: { id, family, platform }
 *   - features: string[] (available modules on this surface)
 *   - hasFeature(name): boolean
 *   - isDesktop / isMobile / isWeb: boolean shortcuts
 */

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from './AuthContext';
import {
  resolveSurface,
  getUrlSurfaceOverride,
  isElectron,
  isNativeMobile,
  type Surface,
  type SurfaceId,
  type ProductFamily,
  type Platform,
} from '../../lib/surface-detection';
import {
  getSurfaceFeatures,
  hasFeature as checkFeature,
  hasAnyFeature as checkAnyFeature,
  isDesktopExclusive,
  type SurfaceFeature,
} from '../../lib/surface-features';

// ─── Context Type ───────────────────────────────────────────────────────

interface SurfaceContextType {
  /** The resolved surface descriptor */
  surface: Surface;
  /** Full list of features available on this surface */
  features: SurfaceFeature[];
  /** Check if a single feature is available */
  hasFeature: (feature: SurfaceFeature) => boolean;
  /** Check if any of the given features are available */
  hasAnyFeature: (features: SurfaceFeature[]) => boolean;
  /** True when running inside Electron */
  isDesktop: boolean;
  /** True when running inside Capacitor/Cordova native shell */
  isMobile: boolean;
  /** True when running in a browser (not Electron, not native) */
  isWeb: boolean;
  /** Current product family */
  family: ProductFamily;
  /** Current platform */
  platform: Platform;
  /** True if the feature is desktop-exclusive and current surface is not desktop */
  requiresDesktop: (feature: SurfaceFeature) => boolean;
}

const SurfaceContext = createContext<SurfaceContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────

interface SurfaceProviderProps {
  children: ReactNode;
  /** Override for testing or Storybook */
  forcedSurface?: SurfaceId;
}

export function SurfaceProvider({ children, forcedSurface }: SurfaceProviderProps) {
  const location = useLocation();
  const { role, profile } = useAuth();

  // Determine whether user belongs to an organization
  const hasOrganization = !!(profile as Record<string, unknown> | null)?.organization_id;

  const surface = useMemo<Surface>(() => {
    // 1. Forced surface (testing/storybook)
    if (forcedSurface) {
      const [family, platform] = forcedSurface.split('-') as [ProductFamily, Platform];
      return { id: forcedSurface, family, platform };
    }

    // 2. URL override from Electron loading URL
    const urlOverride = getUrlSurfaceOverride();
    if (urlOverride) {
      const [family, platform] = urlOverride.split('-') as [ProductFamily, Platform];
      return { id: urlOverride, family, platform };
    }

    // 3. Automatic detection
    return resolveSurface(location.pathname, role, hasOrganization);
  }, [forcedSurface, location.pathname, role, hasOrganization]);

  const features = useMemo(() => getSurfaceFeatures(surface.id), [surface.id]);

  const contextValue = useMemo<SurfaceContextType>(() => ({
    surface,
    features,
    hasFeature: (feature: SurfaceFeature) => checkFeature(surface.id, feature),
    hasAnyFeature: (featureList: SurfaceFeature[]) => checkAnyFeature(surface.id, featureList),
    isDesktop: surface.platform === 'desktop',
    isMobile: surface.platform === 'mobile',
    isWeb: surface.platform === 'web',
    family: surface.family,
    platform: surface.platform,
    requiresDesktop: (feature: SurfaceFeature) =>
      isDesktopExclusive(feature) && surface.platform !== 'desktop',
  }), [surface, features]);

  return (
    <SurfaceContext.Provider value={contextValue}>
      {children}
    </SurfaceContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useSurface(): SurfaceContextType {
  const ctx = useContext(SurfaceContext);
  if (!ctx) {
    throw new Error('useSurface must be used within a <SurfaceProvider>');
  }
  return ctx;
}

export const useSurfaceContext = useSurface;

/**
 * Convenience hook: returns true only when current surface has all listed features.
 *
 * Usage:
 *   const canShowGL = useSurfaceGate('general-ledger');
 */
export function useSurfaceGate(...features: SurfaceFeature[]): boolean {
  const { hasFeature } = useSurface();
  return features.every((f) => hasFeature(f));
}

/**
 * Guard component — renders children only if the current surface has the feature.
 *
 * Usage:
 *   <SurfaceGate feature="general-ledger" fallback={<DesktopRequired />}>
 *     <GeneralLedger />
 *   </SurfaceGate>
 */
export function SurfaceGate({
  feature,
  features,
  fallback = null,
  children,
}: {
  feature?: SurfaceFeature;
  features?: SurfaceFeature[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const ctx = useSurface();

  if (feature && !ctx.hasFeature(feature)) return <>{fallback}</>;
  if (features && !features.every((f) => ctx.hasFeature(f))) return <>{fallback}</>;

  return <>{children}</>;
}

export function DesktopOnlyGate({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isDesktop } = useSurface();
  return <>{isDesktop ? children : fallback}</>;
}
