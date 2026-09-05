/**
 * BaytMiftah Business Routes
 * ──────────────────────────
 * Routes for the Business product family (Web + Desktop + Mobile).
 *
 * Web routes: all workspace pages (properties, finance, CRM, etc.)
 * Desktop-exclusive routes: General Ledger, Procurement, Portfolio Analytics,
 *   AI Command Center, Automation Builder, Bulk Operations, Data Import/Export
 * Mobile: role-aware subset selected by BusinessMobileShell
 */

import type { RouteObject } from 'react-router';
import { ProtectedRoute } from '../components/ProtectedRoute';

export const businessRoutes: RouteObject[] = [
  // ── Workspace Entry ─────────────────────────────────────────────
  {
    path: 'workspace',
    lazy: async () => {
      const { WorkspaceEntry } = await import('../pages/workspace/WorkspaceEntry');
      return {
        Component: function ProtectedWorkspaceEntryRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <WorkspaceEntry />
            </ProtectedRoute>
          );
        },
      };
    },
  },

  // ── Desktop Gateway (web login → business users) ───────────────
  {
    path: 'workspace/desktop',
    lazy: async () => {
      const { DesktopGateway } = await import('../pages/workspace/DesktopGateway');
      return {
        Component: function ProtectedDesktopGatewayRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <DesktopGateway />
            </ProtectedRoute>
          );
        },
      };
    },
  },

  // ── Company enrollment status (standalone page) ─────────────────
  {
    path: 'enrollment',
    lazy: async () => {
      const { EnrollmentStatusPage } = await import('../pages/workspace/EnrollmentStatusPage');
      return {
        Component: function ProtectedEnrollmentStatusRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <EnrollmentStatusPage />
            </ProtectedRoute>
          );
        },
      };
    },
  },

  // ── Workspace Invite ────────────────────────────────────────────
  {
    path: 'workspace/accept',
    lazy: async () => {
      const { WorkspaceInviteAccept } = await import(
        '../pages/workspace/WorkspaceInviteAccept'
      );
      return {
        Component: function ProtectedWorkspaceInviteRoute() {
          return (
            <ProtectedRoute>
              <WorkspaceInviteAccept />
            </ProtectedRoute>
          );
        },
      };
    },
  },

  // ── Organization Workspace (parameterized) ──────────────────────
  {
    path: 'workspace/:organizationSlug',
    lazy: async () => {
      const { WorkspaceLayout } = await import('../pages/workspace/WorkspaceLayout');
      return {
        Component: function ProtectedWorkspaceRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <WorkspaceLayout />
            </ProtectedRoute>
          );
        },
      };
    },
  },
  {
    path: 'workspace/:organizationSlug/:page',
    lazy: async () => {
      const { WorkspaceLayout } = await import('../pages/workspace/WorkspaceLayout');
      return {
        Component: function ProtectedWorkspacePageRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <WorkspaceLayout />
            </ProtectedRoute>
          );
        },
      };
    },
  },

];
