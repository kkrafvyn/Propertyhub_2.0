import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NotFound } from "./pages/NotFound";

function RouteHydrateFallback() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-6 py-10 text-[var(--color-text)]">
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[24px] bg-[var(--color-accent)] text-lg font-black text-white shadow-[var(--shadow-pink)]">
          B
        </div>
        <p className="text-sm font-semibold text-[var(--color-muted)]">Preparing BaytMiftah</p>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    HydrateFallback: RouteHydrateFallback,
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
        path: "verify/:token",
        lazy: async () => {
          const { PublicVerificationReceipt } = await import("./pages/PublicVerificationReceipt");
          return { Component: PublicVerificationReceipt };
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
        path: "sold-ledger",
        lazy: async () => {
          const { SoldLedger } = await import("./pages/SoldLedger");
          return { Component: SoldLedger };
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
        path: "innovation-lab",
        lazy: async () => {
          const { InnovationLab } = await import("./pages/InnovationLab");
          return { Component: InnovationLab };
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
