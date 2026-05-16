import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NotFound } from "./pages/NotFound";

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
        path: "property/:id",
        lazy: async () => {
          const { PropertyDetail } = await import("./pages/PropertyDetail");
          return { Component: PropertyDetail };
        },
      },
      {
        path: "agencies",
        lazy: async () => {
          const { AgenciesDirectory } = await import("./pages/AgenciesDirectory");
          return { Component: AgenciesDirectory };
        },
      },
      {
        path: "agencies/:slug",
        lazy: async () => {
          const { AgencyProfile } = await import("./pages/AgencyProfile");
          return { Component: AgencyProfile };
        },
      },
      {
        path: "guides",
        lazy: async () => {
          const { AreaGuides } = await import("./pages/AreaGuides");
          return { Component: AreaGuides };
        },
      },
      {
        path: "guides/:slug",
        lazy: async () => {
          const { AreaGuideDetail } = await import("./pages/AreaGuideDetail");
          return { Component: AreaGuideDetail };
        },
      },
      {
        path: "market-trends",
        lazy: async () => {
          const { MarketTrends } = await import("./pages/MarketTrends");
          return { Component: MarketTrends };
        },
      },
      {
        path: "reviews",
        lazy: async () => {
          const { PublicReviews } = await import("./pages/PublicReviews");
          return { Component: PublicReviews };
        },
      },
      {
        path: "buyer-requests",
        lazy: async () => {
          const { BuyerRequests } = await import("./pages/BuyerRequests");
          return { Component: BuyerRequests };
        },
      },
      {
        path: "projects",
        lazy: async () => {
          const { Projects } = await import("./pages/Projects");
          return { Component: Projects };
        },
      },
      {
        path: "projects/:slug",
        lazy: async () => {
          const { ProjectDetail } = await import("./pages/ProjectDetail");
          return { Component: ProjectDetail };
        },
      },
      {
        path: "valuation",
        lazy: async () => {
          const { HomeValuation } = await import("./pages/HomeValuation");
          return { Component: HomeValuation };
        },
      },
      {
        path: "get-the-app",
        lazy: async () => {
          const { GetTheApp } = await import("./pages/GetTheApp");
          return { Component: GetTheApp };
        },
      },
      {
        path: "legal/terms",
        lazy: async () => {
          const { TermsOfUse } = await import("./pages/legal/LegalPage");
          return { Component: TermsOfUse };
        },
      },
      {
        path: "legal/privacy",
        lazy: async () => {
          const { PrivacyNotice } = await import("./pages/legal/LegalPage");
          return { Component: PrivacyNotice };
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
        path: "login/verify",
        lazy: async () => {
          const { VerifySecondFactor } = await import("./pages/auth/VerifySecondFactor");
          return { Component: VerifySecondFactor };
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
            Component: function ProtectedAdminRoute() {
              return (
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              );
            },
          };
        },
      },
      { path: "*", Component: NotFound },
    ],
  },
]);
