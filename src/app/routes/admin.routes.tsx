/**
 * BaytMiftah Admin Routes
 * ───────────────────────
 * Compatibility routes for internal admin workflows.
 *
 * Web: Everyday platform administration (users, orgs, listings, trust, fraud, complaints, audit, analytics)
 * Desktop: Deep platform operations (investigations, bulk moderation, AI oversight)
 * Native access is available from both mobile products; there is no separate
 * Admin Mobile application.
 */

import type { RouteObject } from 'react-router';
import { ProtectedRoute, ProtectedAdminRoute } from '../components/ProtectedRoute';

export const adminRoutes: RouteObject[] = [
  {
    path: 'admin/*',
    lazy: async () => {
      const { AdminLayout } = await import('../pages/admin/AdminLayout');

      return {
        Component: function ProtectedAdminRouteWrapper() {
          return (
            <ProtectedRoute>
              <ProtectedAdminRoute>
                <AdminLayout />
              </ProtectedAdminRoute>
            </ProtectedRoute>
          );
        },
      };
    },
  },
];
