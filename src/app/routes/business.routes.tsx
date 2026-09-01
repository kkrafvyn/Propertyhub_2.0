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

  // ── Desktop-Exclusive Business Routes ───────────────────────────
  // These pages are gated by SurfaceGate inside their components.
  // On non-desktop surfaces they render a "Use Desktop" prompt.
  {
    path: 'workspace/:organizationSlug/general-ledger',
    lazy: async () => {
      const { GeneralLedger } = await import('../pages/workspace/GeneralLedger');
      return {
        Component: function ProtectedGeneralLedgerRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <GeneralLedger />
            </ProtectedRoute>
          );
        },
      };
    },
  },
  {
    path: 'workspace/:organizationSlug/procurement',
    lazy: async () => {
      const { ProcurementCenter } = await import('../pages/workspace/ProcurementCenter');
      return {
        Component: function ProtectedProcurementRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <ProcurementCenter />
            </ProtectedRoute>
          );
        },
      };
    },
  },
  {
    path: 'workspace/:organizationSlug/bank-reconciliation',
    lazy: async () => {
      const { BankReconciliation } = await import('../pages/workspace/BankReconciliation');
      return {
        Component: function ProtectedBankReconciliationRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <BankReconciliation />
            </ProtectedRoute>
          );
        },
      };
    },
  },
  {
    path: 'workspace/:organizationSlug/portfolio-analytics',
    lazy: async () => {
      const { PortfolioAnalytics } = await import('../pages/workspace/PortfolioAnalytics');
      return {
        Component: function ProtectedPortfolioRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <PortfolioAnalytics />
            </ProtectedRoute>
          );
        },
      };
    },
  },
  {
    path: 'workspace/:organizationSlug/ai-command-center',
    lazy: async () => {
      const { AICommandCenter } = await import('../pages/workspace/AICommandCenter');
      return {
        Component: function ProtectedAICommandRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <AICommandCenter />
            </ProtectedRoute>
          );
        },
      };
    },
  },
  {
    path: 'workspace/:organizationSlug/automation-builder',
    lazy: async () => {
      const { AutomationBuilder } = await import('../pages/workspace/AutomationBuilder');
      return {
        Component: function ProtectedAutomationRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <AutomationBuilder />
            </ProtectedRoute>
          );
        },
      };
    },
  },
  {
    path: 'workspace/:organizationSlug/bulk-operations',
    lazy: async () => {
      const { BulkOperations } = await import('../pages/workspace/BulkOperations');
      return {
        Component: function ProtectedBulkOpsRoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <BulkOperations />
            </ProtectedRoute>
          );
        },
      };
    },
  },
  {
    path: 'workspace/:organizationSlug/data-import-export',
    lazy: async () => {
      const { DataImportExport } = await import('../pages/workspace/DataImportExport');
      return {
        Component: function ProtectedDataIORoute() {
          return (
            <ProtectedRoute requireVerifiedEmail>
              <DataImportExport />
            </ProtectedRoute>
          );
        },
      };
    },
  },
];
