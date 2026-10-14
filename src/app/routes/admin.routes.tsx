/**
 * BaytMiftah Admin Routes
 * ───────────────────────
 * Routes for the Admin product family (Web + Desktop + Mobile).
 */

import type { ComponentType } from "react";
import type { RouteObject } from "react-router";
import { ProtectedRoute, ProtectedAdminRoute } from "../components/ProtectedRoute";

function adminProtected(Component: ComponentType) {
  return function ProtectedAdminRouteWrapper() {
    return (
      <ProtectedRoute>
        <ProtectedAdminRoute>
          <Component />
        </ProtectedAdminRoute>
      </ProtectedRoute>
    );
  };
}

export const adminRoutes: RouteObject[] = [
  {
    path: "admin",
    lazy: async () => {
      const { AdminShell } = await import("../pages/admin/AdminShell");
      return { Component: adminProtected(AdminShell) };
    },
    children: [
      { path: "marketing", lazy: async () => { const { AdminMarketingPage } = await import("../pages/admin/AdminMarketingPage"); return { Component: AdminMarketingPage }; } },
      { path: "roles", lazy: async () => { const { AdminAppRoles } = await import("../pages/admin/AdminAppRoles"); return { Component: AdminAppRoles }; } },
      {
        index: true,
        lazy: async () => {
          const { AdminHome } = await import("../pages/admin/AdminHome");
          return { Component: AdminHome };
        },
      },
      {
        path: "team",
        lazy: async () => {
          const { PlatformTeamRoster } = await import("../pages/admin/PlatformTeamRoster");
          return { Component: PlatformTeamRoster };
        },
      },
      {
        path: "integrations",
        lazy: async () => {
          const { AdminIntegrationsHub } = await import("../pages/admin/AdminIntegrationsHub");
          return { Component: AdminIntegrationsHub };
        },
      },
      {
        path: "operations",
        lazy: async () => {
          const { AdminOperations } = await import("../pages/admin/AdminOperations");
          const { AdminSectionGate } = await import("../pages/admin/AdminSectionGate");
          return {
            Component: function AdminOperationsPage() {
              return (
                <AdminSectionGate section="operations" label="App & API health">
                  <AdminOperations />
                </AdminSectionGate>
              );
            },
          };
        },
      },
      {
        path: "features",
        lazy: async () => {
          const { AdminPlatformFeatures } = await import("../pages/admin/AdminPlatformFeatures");
          const { AdminSectionGate } = await import("../pages/admin/AdminSectionGate");
          return {
            Component: function AdminFeaturesPage() {
              return (
                <AdminSectionGate section="features" label="Feature flags">
                  <AdminPlatformFeatures />
                </AdminSectionGate>
              );
            },
          };
        },
      },
      {
        path: "payments",
        lazy: async () => {
          const { AdminPlatformPayments } = await import("../pages/admin/AdminPlatformPayments");
          return { Component: AdminPlatformPayments };
        },
      },
      {
        path: "communications",
        lazy: async () => {
          const { AdminPlatformCommunications } = await import("../pages/admin/AdminPlatformCommunications");
          return { Component: AdminPlatformCommunications };
        },
      },
      {
        path: "ai",
        lazy: async () => {
          const { AdminPlatformAi } = await import("../pages/admin/AdminPlatformAi");
          return { Component: AdminPlatformAi };
        },
      },
      {
        path: "*",
        lazy: async () => {
          const { AdminLayout } = await import("../pages/admin/AdminLayout");
          return {
            Component: function AdminLegacySections() {
              return <AdminLayout contentOnly />;
            },
          };
        },
      },
    ],
  },
];
