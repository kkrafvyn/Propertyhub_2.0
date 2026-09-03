/**
 * BaytMiftah Admin Routes
 * ───────────────────────
 * Routes for the Admin product family (Web + Desktop + Mobile).
 *
 * Web: Everyday platform administration (users, orgs, listings, trust, fraud, complaints, audit, analytics)
 * Desktop: Deep platform operations (investigations, bulk moderation, AI oversight)
 * Mobile: Urgent action & alerts (alerts, moderation approvals, fraud alerts, trust cases)
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
