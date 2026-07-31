import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import { LegacyRouteRedirect } from "./components/LegacyRouteRedirect";
import { NotFound } from "./pages/NotFound";

const LEGACY_REDIRECT_SEGMENTS = [
  "neighborhoods",
  "agencies",
  "agents",
  "services",
  "host",
  "tenant",
  "my-home",
  "resident",
  "investment",
  "finance",
  "intelligence",
  "agent",
  "agency",
  "manage",
  "developer",
  "enterprise",
  "smart",
  "vendors",
  "renter",
  "buyer",
] as const;

const legacyRedirectRoutes = LEGACY_REDIRECT_SEGMENTS.flatMap((segment) => [
  { path: segment, element: <LegacyRouteRedirect /> },
  { path: `${segment}/*`, element: <LegacyRouteRedirect /> },
]);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      {
        index: true,
        lazy: async () => {
          const { Home } = await import("./pages/Home");
          return { Component: Home };
        },
      },
      {
        path: "search",
        lazy: async () => {
          const { PropertySearch } = await import("./pages/PropertySearch");
          return { Component: PropertySearch };
        },
      },
      {
        path: "compare",
        lazy: async () => {
          const { Compare } = await import("./pages/Compare");
          return { Component: Compare };
        },
      },
      {
        path: "property/:id",
        lazy: async () => {
          const { PropertyDetail } = await import("./pages/PropertyDetail");
          return { Component: PropertyDetail };
        },
      },
      {
        path: "login",
        lazy: async () => {
          const { Login } = await import("./pages/auth/Login");
          return { Component: Login };
        },
      },
      {
        path: "forgot-password",
        lazy: async () => {
          const { ResetPassword } = await import("./pages/auth/ResetPassword");
          return { Component: ResetPassword };
        },
      },
      {
        path: "signup",
        lazy: async () => {
          const { Signup } = await import("./pages/auth/Signup");
          return { Component: Signup };
        },
      },
      {
        path: "privacy",
        lazy: async () => {
          const { PrivacyPolicy } = await import("./pages/legal/PrivacyPolicy");
          return { Component: PrivacyPolicy };
        },
      },
      {
        path: "terms",
        lazy: async () => {
          const { TermsOfService } = await import("./pages/legal/TermsOfService");
          return { Component: TermsOfService };
        },
      },
      {
        path: "legal",
        lazy: async () => {
          const { LegalHub } = await import("./pages/legal/LegalHub");
          return { Component: LegalHub };
        },
      },
      {
        path: "legal/:slug",
        lazy: async () => {
          const { LegalDocumentPage } = await import("./pages/legal/LegalHub");
          return { Component: LegalDocumentPage };
        },
      },
      {
        path: "complaint",
        lazy: async () => {
          const { ComplaintForm } = await import("./pages/legal/ComplaintForm");
          return { Component: ComplaintForm };
        },
      },
      ...["help", "safety", "cancellation", "about", "careers", "contact"].map((slug) => ({
        path: slug,
        lazy: async () => {
          const { StaticContentPage } = await import("./pages/legal/StaticContentPage");
          return { Component: StaticContentPage };
        },
      })),
      { path: "explore", element: <LegacyRouteRedirect /> },
      { path: "saved", element: <LegacyRouteRedirect /> },
      { path: "messages", element: <LegacyRouteRedirect /> },
      { path: "messages/:id", element: <LegacyRouteRedirect /> },
      { path: "profile", element: <LegacyRouteRedirect /> },
      { path: "profile/kyc", element: <LegacyRouteRedirect /> },
      { path: "trips", element: <LegacyRouteRedirect /> },
      { path: "wallet", element: <LegacyRouteRedirect /> },
      { path: "offers", element: <LegacyRouteRedirect /> },
      { path: "transactions", element: <LegacyRouteRedirect /> },
      { path: "documents", element: <LegacyRouteRedirect /> },
      { path: "consumer", element: <LegacyRouteRedirect /> },
      { path: "consumer/*", element: <LegacyRouteRedirect /> },
      {
        path: "checkout",
        lazy: async () => {
          const { InAppCheckoutPage } = await import("./pages/checkout/InAppCheckoutPage");
          return {
            Component: function ProtectedCheckoutRoute() {
              return (
                <ProtectedRoute>
                  <InAppCheckoutPage />
                </ProtectedRoute>
              );
            },
          };
        },
      },
      {
        path: "app/*",
        lazy: async () => {
          const { UserDashboard } = await import("./pages/user/Dashboard");

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
      {
        path: "workspace",
        lazy: async () => {
          const { WorkspaceEntry } = await import("./pages/workspace/WorkspaceEntry");

          return {
            Component: function ProtectedWorkspaceEntryRoute() {
              return (
                <ProtectedRoute>
                  <WorkspaceEntry />
                </ProtectedRoute>
              );
            },
          };
        },
      },
      {
        path: "workspace/accept",
        lazy: async () => {
          const { WorkspaceInviteAccept } = await import(
            "./pages/workspace/WorkspaceInviteAccept"
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
      {
        path: "workspace/:organizationSlug",
        lazy: async () => {
          const { WorkspaceLayout } = await import("./pages/workspace/WorkspaceLayout");

          return {
            Component: function ProtectedWorkspaceRoute() {
              return (
                <ProtectedRoute>
                  <WorkspaceLayout />
                </ProtectedRoute>
              );
            },
          };
        },
      },
      {
        path: "workspace/:organizationSlug/:page",
        lazy: async () => {
          const { WorkspaceLayout } = await import("./pages/workspace/WorkspaceLayout");

          return {
            Component: function ProtectedWorkspacePageRoute() {
              return (
                <ProtectedRoute>
                  <WorkspaceLayout />
                </ProtectedRoute>
              );
            },
          };
        },
      },
      {
        path: "admin/*",
        lazy: async () => {
          const { AdminLayout } = await import("./pages/admin/AdminLayout");

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
      ...legacyRedirectRoutes,
      { path: "*", Component: NotFound },
    ],
  },
]);
