/**
 * BaytMiftah Surface Feature Flags
 * ─────────────────────────────────
 * Defines which features/modules are available on each supported surface.
 *
 * Used by:
 *   - SurfaceContext to expose `features` to the component tree
 *   - Route guards to block/allow routes per surface
 *   - Shell components to show/hide navigation items
 *   - Lazy-loaded pages to determine available tabs/panels
 */

import type { SurfaceId } from './surface-detection';

// ─── Feature Identifiers ────────────────────────────────────────────────

export type SurfaceFeature =
  // Consumer features
  | 'marketplace'
  | 'search'
  | 'property-detail'
  | 'compare'
  | 'saved-properties'
  | 'search-alerts'
  | 'consumer-messages'
  | 'viewings'
  | 'applications'
  | 'offers'
  | 'bookings'
  | 'consumer-payments'
  | 'consumer-installments'
  | 'consumer-lease'
  | 'consumer-maintenance'
  | 'consumer-documents'
  | 'consumer-notifications'
  | 'my-home'
  | 'trips'
  // Business features (shared web + desktop)
  | 'property-management'
  | 'estate-operations'
  | 'units'
  | 'occupancies'
  | 'residents'
  | 'leases'
  | 'vacancies'
  | 'maintenance'
  | 'inspections'
  | 'vendors'
  | 'assets'
  | 'utilities'
  | 'notices'
  | 'crm'
  | 'leads'
  | 'contacts'
  | 'listings'
  | 'deals'
  | 'commissions'
  | 'finance'
  | 'charges'
  | 'payments'
  | 'installments'
  | 'arrears'
  | 'statements'
  | 'payables'
  | 'reconciliation'
  | 'owner-statements'
  | 'marketing'
  | 'campaigns'
  | 'communication'
  | 'service-desk'
  | 'operations'
  | 'tasks'
  | 'calendar'
  | 'approvals'
  | 'workflows'
  | 'contractor-management'
  | 'team'
  | 'documents'
  | 'reporting'
  | 'ai-assistant'
  | 'whitelabel'
  | 'integrations'
  | 'settings'
  // Business Desktop-exclusive features
  | 'general-ledger'
  | 'chart-of-accounts'
  | 'journal-entries'
  | 'bank-reconciliation'
  | 'procurement'
  | 'portfolio-analytics'
  | 'budget-vs-actual'
  | 'ai-command-center'
  | 'ai-night-watch'
  | 'automation-builder'
  | 'bulk-operations'
  | 'data-import'
  | 'data-export'
  | 'contract-management'
  | 'enterprise-administration'
  // Business Mobile role features
  | 'mobile-property-manager'
  | 'mobile-finance'
  | 'mobile-sales'
  | 'mobile-estate-officer'
  | 'mobile-technician'
  | 'mobile-facilities'
  // Admin features (shared web + desktop)
  | 'admin-users'
  | 'admin-organizations'
  | 'admin-listings'
  | 'admin-trust'
  | 'admin-fraud'
  | 'admin-complaints'
  | 'admin-support'
  | 'admin-audit'
  | 'admin-analytics'
  | 'admin-configuration'
  | 'admin-notifications'
  // Admin Desktop-exclusive features
  | 'admin-fraud-investigation'
  | 'admin-bulk-moderation'
  | 'admin-platform-analytics'
  | 'admin-ai-oversight'
  | 'admin-system-health'
  | 'admin-provider-monitoring'
  | 'admin-payment-monitoring'
  // Legacy admin mobile feature names are retained for compatibility, but there
  // is no separate admin mobile product surface.
  | 'admin-alerts'
  | 'admin-approvals'
  | 'admin-incidents';

// ─── Feature Sets per Surface ───────────────────────────────────────────

const CONSUMER_BASE: SurfaceFeature[] = [
  'marketplace',
  'search',
  'property-detail',
  'compare',
  'saved-properties',
  'search-alerts',
  'consumer-messages',
  'viewings',
  'applications',
  'offers',
  'bookings',
  'consumer-payments',
  'consumer-installments',
  'consumer-lease',
  'consumer-maintenance',
  'consumer-documents',
  'consumer-notifications',
  'my-home',
];

const CONSUMER_WEB: SurfaceFeature[] = [...CONSUMER_BASE];

const CONSUMER_MOBILE: SurfaceFeature[] = [
  ...CONSUMER_BASE,
  'trips',
];

// ─── Business ───────────────────────────────────────────────────────────

const BUSINESS_BASE: SurfaceFeature[] = [
  'property-management',
  'estate-operations',
  'units',
  'occupancies',
  'residents',
  'leases',
  'vacancies',
  'maintenance',
  'inspections',
  'vendors',
  'assets',
  'utilities',
  'notices',
  'crm',
  'leads',
  'contacts',
  'listings',
  'deals',
  'commissions',
  'finance',
  'charges',
  'payments',
  'installments',
  'arrears',
  'statements',
  'payables',
  'reconciliation',
  'owner-statements',
  'marketing',
  'campaigns',
  'communication',
  'service-desk',
  'operations',
  'tasks',
  'calendar',
  'approvals',
  'workflows',
  'contractor-management',
  'team',
  'documents',
  'reporting',
  'ai-assistant',
  'whitelabel',
  'integrations',
  'settings',
];

const BUSINESS_WEB: SurfaceFeature[] = [...BUSINESS_BASE];

const BUSINESS_DESKTOP: SurfaceFeature[] = [
  ...BUSINESS_BASE,
  // Desktop-exclusive heavy-duty modules
  'general-ledger',
  'chart-of-accounts',
  'journal-entries',
  'bank-reconciliation',
  'procurement',
  'portfolio-analytics',
  'budget-vs-actual',
  'ai-command-center',
  'ai-night-watch',
  'automation-builder',
  'bulk-operations',
  'data-import',
  'data-export',
  'contract-management',
  'enterprise-administration',
];

const BUSINESS_MOBILE: SurfaceFeature[] = [
  // Shared subset for fast operational work
  'property-management',
  'units',
  'residents',
  'leases',
  'maintenance',
  'inspections',
  'vendors',
  'leads',
  'contacts',
  'deals',
  'payments',
  'installments',
  'arrears',
  'approvals',
  'tasks',
  'communication',
  'documents',
  'ai-assistant',
  // Role-specific mobile modules
  'mobile-property-manager',
  'mobile-finance',
  'mobile-sales',
  'mobile-estate-officer',
  'mobile-technician',
  'mobile-facilities',
];

// ─── Admin ──────────────────────────────────────────────────────────────

const ADMIN_BASE: SurfaceFeature[] = [
  'admin-users',
  'admin-organizations',
  'admin-listings',
  'admin-trust',
  'admin-fraud',
  'admin-complaints',
  'admin-support',
  'admin-audit',
  'admin-analytics',
  'admin-configuration',
  'admin-notifications',
];

const ADMIN_WEB: SurfaceFeature[] = [...ADMIN_BASE];

const ADMIN_DESKTOP: SurfaceFeature[] = [
  ...ADMIN_BASE,
  'admin-fraud-investigation',
  'admin-bulk-moderation',
  'admin-platform-analytics',
  'admin-ai-oversight',
  'admin-system-health',
  'admin-provider-monitoring',
  'admin-payment-monitoring',
];

// ─── Feature Map ────────────────────────────────────────────────────────

const SURFACE_FEATURES: Record<SurfaceId, SurfaceFeature[]> = {
  'consumer-web': CONSUMER_WEB,
  'consumer-mobile': CONSUMER_MOBILE,
  'business-web': BUSINESS_WEB,
  'business-desktop': BUSINESS_DESKTOP,
  'business-mobile': BUSINESS_MOBILE,
  'admin-web': ADMIN_WEB,
  'admin-desktop': ADMIN_DESKTOP,
  // Compatibility alias: the native admin dashboard runs inside Business Mobile.
  'admin-mobile': BUSINESS_MOBILE,
};

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Get the full feature set available for a surface.
 */
export function getSurfaceFeatures(surfaceId: SurfaceId): SurfaceFeature[] {
  return SURFACE_FEATURES[surfaceId] ?? [];
}

/**
 * Check whether a specific feature is enabled on a surface.
 */
export function hasFeature(surfaceId: SurfaceId, feature: SurfaceFeature): boolean {
  return SURFACE_FEATURES[surfaceId]?.includes(feature) ?? false;
}

/**
 * Check whether any of the given features are enabled on a surface.
 */
export function hasAnyFeature(surfaceId: SurfaceId, features: SurfaceFeature[]): boolean {
  const surfaceFeatures = SURFACE_FEATURES[surfaceId] ?? [];
  return features.some((f) => surfaceFeatures.includes(f));
}

/**
 * Check whether all of the given features are enabled on a surface.
 */
export function hasAllFeatures(surfaceId: SurfaceId, features: SurfaceFeature[]): boolean {
  const surfaceFeatures = SURFACE_FEATURES[surfaceId] ?? [];
  return features.every((f) => surfaceFeatures.includes(f));
}

/**
 * Returns true if the feature is a desktop-exclusive feature.
 */
export function isDesktopExclusive(feature: SurfaceFeature): boolean {
  const desktopOnly: SurfaceFeature[] = [
    'general-ledger',
    'chart-of-accounts',
    'journal-entries',
    'bank-reconciliation',
    'procurement',
    'portfolio-analytics',
    'budget-vs-actual',
    'ai-command-center',
    'ai-night-watch',
    'automation-builder',
    'bulk-operations',
    'data-import',
    'data-export',
    'contract-management',
    'enterprise-administration',
    'admin-fraud-investigation',
    'admin-bulk-moderation',
    'admin-platform-analytics',
    'admin-ai-oversight',
    'admin-system-health',
    'admin-provider-monitoring',
    'admin-payment-monitoring',
  ];
  return desktopOnly.includes(feature);
}
