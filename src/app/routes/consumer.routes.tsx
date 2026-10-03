/**
 * BaytMiftah Consumer Routes
 * ──────────────────────────
 * Routes for the Consumer product family (Web + Mobile).
 *
 * Includes: Marketplace, Search, Property Detail, Compare, Auth,
 * User Dashboard (saved, messages, viewings, offers, bookings,
 * payments, installments, lease, maintenance, documents, my-home),
 * Checkout, Legal, and static content pages.
 */

import { Navigate, type RouteObject } from 'react-router';
import { LegacyRouteRedirect } from '../components/LegacyRouteRedirect';
import { ProtectedRoute } from '../components/ProtectedRoute';

const LEGACY_REDIRECT_SEGMENTS = [
  'neighborhoods', 'agencies', 'agents', 'services', 'host', 'tenant',
  'my-home', 'resident', 'investment', 'finance', 'intelligence', 'agent',
  'agency', 'manage', 'developer', 'enterprise', 'smart', 'vendors',
  'renter', 'buyer',
] as const;

const legacyRedirectRoutes: RouteObject[] = LEGACY_REDIRECT_SEGMENTS.flatMap(
  (segment) => [
    { path: segment, element: <LegacyRouteRedirect /> },
    { path: `${segment}/*`, element: <LegacyRouteRedirect /> },
  ],
);

export const consumerRoutes: RouteObject[] = [
  // ── Marketplace & Discovery ─────────────────────────────────────
  {
    index: true,
    lazy: async () => {
      const { ConsumerIndex } = await import('../pages/ConsumerIndex');
      return { Component: ConsumerIndex };
    },
  },
  {
    path: 'marketing',
    lazy: async () => {
      const { MarketingHome } = await import('../pages/marketing/MarketingHome');
      return { Component: MarketingHome };
    },
  },
  {
    path: 'marketing/classic',
    lazy: async () => {
      const { MarketingHomeLegacy } = await import('../pages/marketing/MarketingHomeLegacy');
      return { Component: MarketingHomeLegacy };
    },
  },
  {
    path: 'search',
    lazy: async () => {
      const { PropertySearch } = await import('../pages/PropertySearch');
      return { Component: PropertySearch };
    },
  },
  {
    path: 'compare',
    lazy: async () => {
      const { Compare } = await import('../pages/Compare');
      return { Component: Compare };
    },
  },
  {
    path: 'property/:id',
    lazy: async () => {
      const { PropertyDetail } = await import('../pages/PropertyDetail');
      return { Component: PropertyDetail };
    },
  },
  {
    path: 'explorer/unit/:id',
    lazy: async () => {
      const { PublicEventLedger } = await import('../pages/PublicEventLedger');
      return { Component: PublicEventLedger };
    },
  },
  {
    path: 'explorer/property/:id',
    lazy: async () => {
      const { PublicEventLedger } = await import('../pages/PublicEventLedger');
      return { Component: PublicEventLedger };
    },
  },
  {
    path: 'explorer/transaction/:id',
    lazy: async () => {
      const { PublicEventLedger } = await import('../pages/PublicEventLedger');
      return { Component: PublicEventLedger };
    },
  },
  {
    path: 'explorer',
    lazy: async () => {
      const { PublicEventLedger } = await import('../pages/PublicEventLedger');
      return { Component: PublicEventLedger };
    },
  },
  {
    path: 'apply/:estateId',
    lazy: async () => {
      const { PublicLeaseApplication } = await import('../pages/PublicLeaseApplication');
      return { Component: PublicLeaseApplication };
    },
  },
  {
    path: 'sign/:token',
    lazy: async () => {
      const { PublicSignDocument } = await import('../pages/PublicSignDocument');
      return { Component: PublicSignDocument };
    },
  },
  {
    path: 'portal/owner/:token',
    lazy: async () => {
      const { OwnerPortal } = await import('../pages/OwnerPortal');
      return { Component: OwnerPortal };
    },
  },
  {
    path: 'portal/board/:token',
    lazy: async () => {
      const { OwnerPortal } = await import('../pages/OwnerPortal');
      return { Component: OwnerPortal };
    },
  },

  // ── Auth ────────────────────────────────────────────────────────
  {
    path: 'login',
    lazy: async () => {
      const { Login } = await import('../pages/auth/Login');
      return { Component: Login };
    },
  },
  {
    path: 'forgot-password',
    lazy: async () => {
      const { ResetPassword } = await import('../pages/auth/ResetPassword');
      return { Component: ResetPassword };
    },
  },
  {
    path: 'signup',
    lazy: async () => {
      const { Signup } = await import('../pages/auth/Signup');
      return { Component: Signup };
    },
  },
  {
    path: 'verify-email',
    lazy: async () => {
      const { VerifyEmailPage } = await import('../pages/auth/VerifyEmail');
      return { Component: VerifyEmailPage };
    },
  },

  // ── Legal ───────────────────────────────────────────────────────
  {
    path: 'privacy',
    lazy: async () => {
      const { PrivacyPolicy } = await import('../pages/legal/PrivacyPolicy');
      return { Component: PrivacyPolicy };
    },
  },
  {
    path: 'terms',
    lazy: async () => {
      const { TermsOfService } = await import('../pages/legal/TermsOfService');
      return { Component: TermsOfService };
    },
  },
  {
    path: 'legal',
    lazy: async () => {
      const { LegalHub } = await import('../pages/legal/LegalHub');
      return { Component: LegalHub };
    },
  },
  {
    path: 'legal/:slug',
    lazy: async () => {
      const { LegalDocumentPage } = await import('../pages/legal/LegalHub');
      return { Component: LegalDocumentPage };
    },
  },
  {
    path: 'complaint',
    lazy: async () => {
      const { ComplaintForm } = await import('../pages/legal/ComplaintForm');
      return { Component: ComplaintForm };
    },
  },
  {
    path: 'docs',
    element: <Navigate to="/legal" replace />,
  },
  {
    path: 'status',
    lazy: async () => {
      const { PublicStatusPage } = await import('../pages/marketing/PublicStatusPage');
      return { Component: PublicStatusPage };
    },
  },
  {
    path: 'safety',
    element: <Navigate to="/legal/safety" replace />,
  },
  ...['help', 'cancellation', 'host-resources', 'workspace-roles', 'about', 'careers', 'contact'].map((slug) => ({
    path: slug,
    lazy: async () => {
      const { StaticContentPage } = await import('../pages/legal/StaticContentPage');
      return { Component: StaticContentPage };
    },
  })),
  {
    path: 'sitemap',
    lazy: async () => {
      const { SiteMapPage } = await import('../pages/legal/SiteMapPage');
      return { Component: SiteMapPage };
    },
  },
  {
    path: 'contractor/access/:token',
    lazy: async () => {
      const { PublicContractorAccess } = await import('../pages/public/PublicContractorAccess');
      return { Component: PublicContractorAccess };
    },
  },
  {
    path: 'referral',
    lazy: async () => {
      const { ReferralPage } = await import('../pages/user/ReferralPage');
      return { Component: ReferralPage };
    },
  },

  // ── Checkout ────────────────────────────────────────────────────
  {
    path: 'checkout',
    lazy: async () => {
      const { InAppCheckoutPage } = await import('../pages/checkout/InAppCheckoutPage');
      return {
        Component: function ProtectedCheckoutRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <InAppCheckoutPage />
            </ProtectedRoute>
          );
        },
      };
    },
  },

  // ── User Dashboard ──────────────────────────────────────────────
  {
    path: 'app/security',
    lazy: async () => {
      const { SecuritySettingsPage } = await import('../pages/user/SecuritySettings');
      return {
        Component: function ProtectedSecurityRoute() {
          return (
            <ProtectedRoute>
              <SecuritySettingsPage />
            </ProtectedRoute>
          );
        },
      };
    },
  },
  {
    path: 'app/messages-portal',
    lazy: async () => {
      const { ContextualMessagesPortal } = await import('../pages/user/ContextualMessagesPortal');
      return {
        Component: function ProtectedMessagesPortalRoute() {
          return (
            <ProtectedRoute>
              <ContextualMessagesPortal />
            </ProtectedRoute>
          );
        },
      };
    },
  },
  {
    path: 'app/workspace-access',
    lazy: async () => {
      const { ConsumerWorkspaceAccessPage } = await import('../pages/user/ConsumerWorkspaceAccessPage');
      return {
        Component: function ProtectedWorkspaceAccessRoute() {
          return (
            <ProtectedRoute>
              <ConsumerWorkspaceAccessPage />
            </ProtectedRoute>
          );
        },
      };
    },
  },
  {
    path: 'app/applications',
    lazy: async () => {
      const { UserDashboard } = await import('../pages/user/Dashboard');
      return {
        Component: function ProtectedApplicationsRoute() {
          return (
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          );
        },
      };
    },
  },
  {
    path: 'app/*',
    lazy: async () => {
      const { UserDashboard } = await import('../pages/user/Dashboard');
      return {
        Component: function ProtectedUserDashboardRoute() {
          return (
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          );
        },
      };
    },
  },

  // ── Consumer Legacy Redirects ───────────────────────────────────
  { path: 'saved', element: <LegacyRouteRedirect /> },
  { path: 'messages', element: <LegacyRouteRedirect /> },
  { path: 'messages/:id', element: <LegacyRouteRedirect /> },
  { path: 'profile', element: <LegacyRouteRedirect /> },
  { path: 'profile/kyc', element: <LegacyRouteRedirect /> },
  { path: 'trips', element: <LegacyRouteRedirect /> },
  { path: 'wallet', element: <LegacyRouteRedirect /> },
  { path: 'offers', element: <LegacyRouteRedirect /> },
  { path: 'transactions', element: <LegacyRouteRedirect /> },
  { path: 'documents', element: <LegacyRouteRedirect /> },
  { path: 'consumer', element: <LegacyRouteRedirect /> },
  { path: 'consumer/*', element: <LegacyRouteRedirect /> },

  ...legacyRedirectRoutes,
];
