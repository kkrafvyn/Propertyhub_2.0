import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NotFound } from "./pages/NotFound";

function RouteHydrateFallback() {
  return (
    <div className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-lg font-black text-primary-foreground shadow-[0_18px_42px_rgba(242,200,75,0.18)]">
          B
        </div>
        <p className="text-sm font-semibold text-muted-foreground">Preparing BaytMiftah</p>
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
          const { BaytMiftahInnovationLab } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahInnovationLab };
        },
      },
      {
        path: "feature-completion",
        lazy: async () => {
          const { InnovationLab } = await import("./pages/InnovationLab");
          return { Component: InnovationLab };
        },
      },
      {
        path: "baytmiftah",
        lazy: async () => {
          const { BaytMiftahScreensHome } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahScreensHome };
        },
      },
      {
        path: "baytmiftah/innovation",
        lazy: async () => {
          const { BaytMiftahInnovationLab } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahInnovationLab };
        },
      },
      {
        path: "baytmiftah/listings",
        lazy: async () => {
          const { BaytMiftahListingOversight } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahListingOversight };
        },
      },
      {
        path: "baytmiftah/areas",
        lazy: async () => {
          const { BaytMiftahAreaGuides } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahAreaGuides };
        },
      },
      {
        path: "baytmiftah/messages",
        lazy: async () => {
          const { BaytMiftahMessages } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahMessages };
        },
      },
      {
        path: "baytmiftah/mobile-messages",
        lazy: async () => {
          const { BaytMiftahMobileMessages } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahMobileMessages };
        },
      },
      {
        path: "baytmiftah/aureus-district",
        lazy: async () => {
          const { AureusDistrictDetail } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: AureusDistrictDetail };
        },
      },
      {
        path: "baytmiftah/aureus-analytics",
        lazy: async () => {
          const { AureusAnalyticsDashboard } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: AureusAnalyticsDashboard };
        },
      },
      {
        path: "baytmiftah/aureus-financials",
        lazy: async () => {
          const { AureusFinancialLedger } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: AureusFinancialLedger };
        },
      },
      {
        path: "baytmiftah/aureus-settings",
        lazy: async () => {
          const { AureusAgencySettings } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: AureusAgencySettings };
        },
      },
      {
        path: "baytmiftah/aureus-security",
        lazy: async () => {
          const { AureusSystemSecurity } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: AureusSystemSecurity };
        },
      },
      {
        path: "baytmiftah/aureus-compliance",
        lazy: async () => {
          const { AureusTrustCompliance } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: AureusTrustCompliance };
        },
      },
      {
        path: "baytmiftah/aureus-listings",
        lazy: async () => {
          const { AureusListingOversight } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: AureusListingOversight };
        },
      },
      {
        path: "baytmiftah/secure-login",
        lazy: async () => {
          const { BaytMiftahSecureLogin } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahSecureLogin };
        },
      },
      {
        path: "baytmiftah/advisor-viewings",
        lazy: async () => {
          const { BaytMiftahAdvisorViewings } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahAdvisorViewings };
        },
      },
      {
        path: "baytmiftah/deal-room",
        lazy: async () => {
          const { BaytMiftahDealRoom } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahDealRoom };
        },
      },
      {
        path: "baytmiftah/payments-escrow",
        lazy: async () => {
          const { BaytMiftahPaymentsEscrow } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahPaymentsEscrow };
        },
      },
      {
        path: "baytmiftah/mobile-landing",
        lazy: async () => {
          const { BaytMiftahMobileLanding } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahMobileLanding };
        },
      },
      {
        path: "baytmiftah/mobile-trust",
        lazy: async () => {
          const { BaytMiftahMobileTrust } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahMobileTrust };
        },
      },
      {
        path: "baytmiftah/mobile-workspace",
        lazy: async () => {
          const { BaytMiftahMobileWorkspace } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahMobileWorkspace };
        },
      },
      {
        path: "baytmiftah/mobile-viewing",
        lazy: async () => {
          const { BaytMiftahMobileViewing } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahMobileViewing };
        },
      },
      {
        path: "baytmiftah/mobile-portfolio",
        lazy: async () => {
          const { BaytMiftahMobilePortfolio } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahMobilePortfolio };
        },
      },
      {
        path: "baytmiftah/mobile-performance",
        lazy: async () => {
          const { BaytMiftahMobilePerformance } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahMobilePerformance };
        },
      },
      {
        path: "baytmiftah/security-email",
        lazy: async () => {
          const { BaytMiftahSecurityEmail } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahSecurityEmail };
        },
      },
      {
        path: "baytmiftah/admin-platform",
        lazy: async () => {
          const { BaytMiftahAdminPlatform } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahAdminPlatform };
        },
      },
      {
        path: "baytmiftah/mobile-security",
        lazy: async () => {
          const { BaytMiftahMobileSecurity } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahMobileSecurity };
        },
      },
      {
        path: "baytmiftah/admin-governance",
        lazy: async () => {
          const { BaytMiftahAdminGovernance } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahAdminGovernance };
        },
      },
      {
        path: "baytmiftah/agency",
        lazy: async () => {
          const { BaytMiftahAgencyWorkspace } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahAgencyWorkspace };
        },
      },
      {
        path: "baytmiftah/users",
        lazy: async () => {
          const { BaytMiftahUserManagement } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahUserManagement };
        },
      },
      {
        path: "baytmiftah/property",
        lazy: async () => {
          const { BaytMiftahPropertyDetail } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahPropertyDetail };
        },
      },
      {
        path: "baytmiftah/marketplace",
        lazy: async () => {
          const { BaytMiftahMarketplace } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahMarketplace };
        },
      },
      {
        path: "baytmiftah/offer",
        lazy: async () => {
          const { BaytMiftahOfferDetails } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahOfferDetails };
        },
      },
      {
        path: "baytmiftah/proof",
        lazy: async () => {
          const { BaytMiftahProofOfFunds } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahProofOfFunds };
        },
      },
      {
        path: "baytmiftah/review",
        lazy: async () => {
          const { BaytMiftahReviewSign } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahReviewSign };
        },
      },
      {
        path: "baytmiftah/command",
        lazy: async () => {
          const { BaytMiftahCommandCenter } = await import(
            "./pages/baytmiftah/BaytMiftahScreens"
          );
          return { Component: BaytMiftahCommandCenter };
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
