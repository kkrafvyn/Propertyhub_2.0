import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import RoleProtectedRoute from '../components/RoleProtectedRoute'
import ProtectedRoute from '../components/ProtectedRoute'
import ConsumerGuard from '../components/ConsumerGuard'
import RouteErrorBoundary from '../components/RouteErrorBoundary'
import MobileHomePage from '../pages/mobile/MobileHomePage'
import MobileExplorePage from '../pages/mobile/MobileExplorePage'
import MobileSavedPage from '../pages/mobile/MobileSavedPage'
import {
  MobileMessagesPage,
  MobileProfilePage,
  MobilePropertyPage,
} from '../pages/mobile/MobileMessagesProfile'

const LoginPage = lazy(() => import('../pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'))
const SignUpPage = lazy(() => import('../pages/SignUpPage'))
const PaymentSuccessPage = lazy(() => import('../pages/PaymentSuccessPage'))
const PaymentCancelPage = lazy(() => import('../pages/PaymentCancelPage'))
const AuthCallbackPage = lazy(() => import('../pages/AuthCallbackPage'))
const DocumentVaultPage = lazy(() => import('../pages/DocumentVaultPage'))
const ComparePage = lazy(() => import('../pages/ComparePage'))
const KycPage = lazy(() => import('../pages/profile/KycPage'))
const HelpCentrePage = lazy(() => import('../pages/HelpCentrePage'))
const ReferralPage = lazy(() => import('../pages/ReferralPage'))
const PrivacyPage = lazy(() => import('../pages/PrivacyPage'))
const TermsPage = lazy(() => import('../pages/TermsPage'))
const MortgageCalculatorPage = lazy(() => import('../pages/tools/MortgageCalculatorPage'))

const MobileTripsPage = lazy(() => import('../pages/mobile/MobileTripsPage'))
const MobileNeighborhoodsPage = lazy(() =>
  import('../pages/mobile/MobileNeighborhoodPages').then((m) => ({ default: m.MobileNeighborhoodsPage })),
)
const MobileNeighborhoodDetailPage = lazy(() =>
  import('../pages/mobile/MobileNeighborhoodPages').then((m) => ({ default: m.MobileNeighborhoodDetailPage })),
)
const ServicesMarketplacePage = lazy(() =>
  import('../pages/marketplace/MarketplaceDiscoveryPages').then((m) => ({ default: m.ServicesMarketplacePage })),
)
const AgenciesIndexPage = lazy(() =>
  import('../pages/marketplace/MarketplaceDiscoveryPages').then((m) => ({ default: m.AgenciesIndexPage })),
)
const AgencyProfilePage = lazy(() =>
  import('../pages/marketplace/MarketplaceDiscoveryPages').then((m) => ({ default: m.AgencyProfilePage })),
)
const AgentsIndexPage = lazy(() =>
  import('../pages/marketplace/MarketplaceDiscoveryPages').then((m) => ({ default: m.AgentsIndexPage })),
)
const AgentProfilePage = lazy(() =>
  import('../pages/marketplace/MarketplaceDiscoveryPages').then((m) => ({ default: m.AgentProfilePage })),
)
const MobileHostListingPage = lazy(() => import('../pages/mobile/MobileHostListingPage'))

const MobileRenterLeasesPage = lazy(() =>
  import('../pages/mobile/MobileRenterPages').then((m) => ({ default: m.MobileRenterLeasesPage })),
)
const MobileRenterPaymentsPage = lazy(() =>
  import('../pages/mobile/MobileRenterPages').then((m) => ({ default: m.MobileRenterPaymentsPage })),
)
const MobileRenterUtilitiesPage = lazy(() =>
  import('../pages/mobile/MobileRenterPages').then((m) => ({ default: m.MobileRenterUtilitiesPage })),
)
const MobileRenterMaintenancePage = lazy(() =>
  import('../pages/mobile/MobileRenterPages').then((m) => ({ default: m.MobileRenterMaintenancePage })),
)
const MobileRenterSignPage = lazy(() =>
  import('../pages/mobile/MobileRenterPages').then((m) => ({ default: m.MobileRenterSignPage })),
)
const MobileRenterCreditPage = lazy(() =>
  import('../pages/mobile/MobileRenterPages').then((m) => ({ default: m.MobileRenterCreditPage })),
)

const MobileAgentHomePage = lazy(() =>
  import('../pages/mobile/MobileAgentPages').then((m) => ({ default: m.MobileAgentHomePage })),
)
const MobileAgentLeadsPage = lazy(() =>
  import('../pages/mobile/MobileAgentPages').then((m) => ({ default: m.MobileAgentLeadsPage })),
)
const MobileAgentCalendarPage = lazy(() =>
  import('../pages/mobile/MobileAgentPages').then((m) => ({ default: m.MobileAgentCalendarPage })),
)

const MobileSmartHomePage = lazy(() =>
  import('../pages/mobile/MobileSmartPages').then((m) => ({ default: m.MobileSmartHomePage })),
)
const MobileSmartAlertsPage = lazy(() =>
  import('../pages/mobile/MobileSmartPages').then((m) => ({ default: m.MobileSmartAlertsPage })),
)

const MobileAgencyPage = lazy(() =>
  import('../pages/mobile/MobileWorkspacePages').then((m) => ({ default: m.MobileAgencyPage })),
)
const MobileManagePage = lazy(() =>
  import('../pages/mobile/MobileWorkspacePages').then((m) => ({ default: m.MobileManagePage })),
)
const MobileFinancePage = lazy(() =>
  import('../pages/mobile/MobileWorkspacePages').then((m) => ({ default: m.MobileFinancePage })),
)
const MobileIntelligencePage = lazy(() =>
  import('../pages/mobile/MobileWorkspacePages').then((m) => ({ default: m.MobileIntelligencePage })),
)
const MobileDeveloperPage = lazy(() =>
  import('../pages/mobile/MobileWorkspacePages').then((m) => ({ default: m.MobileDeveloperPage })),
)
const MobileEnterprisePage = lazy(() =>
  import('../pages/mobile/MobileWorkspacePages').then((m) => ({ default: m.MobileEnterprisePage })),
)

const MobileConsumerBuyPage = lazy(() =>
  import('../pages/mobile/MobileOsPages').then((m) => ({ default: m.MobileConsumerBuyPage })),
)
const MobileConsumerRentPage = lazy(() =>
  import('../pages/mobile/MobileOsPages').then((m) => ({ default: m.MobileConsumerRentPage })),
)
const MobileConsumerStayPage = lazy(() =>
  import('../pages/mobile/MobileOsPages').then((m) => ({ default: m.MobileConsumerStayPage })),
)
const MobileWalletHomePage = lazy(() =>
  import('../pages/mobile/MobileOsPages').then((m) => ({ default: m.MobileWalletHomePage })),
)
const MobileWalletTransactionsPage = lazy(() =>
  import('../pages/mobile/MobileOsPages').then((m) => ({ default: m.MobileWalletTransactionsPage })),
)
const MobileHostHomePage = lazy(() =>
  import('../pages/mobile/MobileOsPages').then((m) => ({ default: m.MobileHostHomePage })),
)
const MobileHostReservationsPage = lazy(() =>
  import('../pages/mobile/MobileOsPages').then((m) => ({ default: m.MobileHostReservationsPage })),
)
const MobileInvestmentHomePage = lazy(() =>
  import('../pages/mobile/MobileOsPages').then((m) => ({ default: m.MobileInvestmentHomePage })),
)
const MobileTenantHomePage = lazy(() =>
  import('../pages/mobile/MobileOsPages').then((m) => ({ default: m.MobileTenantHomePage })),
)
const MobileResidentHomePage = lazy(() =>
  import('../pages/mobile/MobileOsPages').then((m) => ({ default: m.MobileResidentHomePage })),
)
const MobileEnterpriseOrgsPage = lazy(() =>
  import('../pages/mobile/MobileOsPages').then((m) => ({ default: m.MobileEnterpriseOrgsPage })),
)

const AIAdvisorPage = lazy(() => import('../pages/buyer/AIAdvisorPage'))
const FinancingCenterPage = lazy(() => import('../pages/buyer/FinancingCenterPage'))
const TransactionCenterPage = lazy(() => import('../pages/buyer/TransactionCenterPage'))
const OfferRoomPage = lazy(() => import('../pages/buyer/OfferRoomPage'))
const RentalApplicationPage = lazy(() => import('../pages/renter/RentalApplicationPage'))
const LeaseRenewalPage = lazy(() => import('../pages/renter/LeaseRenewalPage'))
const ManageApplicationsPage = lazy(() => import('../pages/manage/ManageApplicationsPage'))
const ManageTenantsPage = lazy(() => import('../pages/manage/ManageTenantsPage'))
const ManageWorkOrdersPage = lazy(() => import('../pages/manage/ManageWorkOrdersPage'))
const ManageFinancePage = lazy(() => import('../pages/manage/ManageFinancePage'))
const ManageUtilitiesPage = lazy(() => import('../pages/manage/ManageUtilitiesPage'))
const ManageInspectionsPage = lazy(() => import('../pages/manage/ManageInspectionsPage'))
const HostListingsPage = lazy(() => import('../pages/HostListingsPage'))
const BillingPage = lazy(() => import('../pages/billing/BillingPage'))
const EscrowPage = lazy(() => import('../pages/finance/EscrowPage'))
const MortgageMarketplacePage = lazy(() => import('../pages/finance/MortgageMarketplacePage'))
const RentCollectionPage = lazy(() => import('../pages/finance/RentCollectionPage'))
const CommissionSettlementPage = lazy(() => import('../pages/finance/CommissionSettlementPage'))
const InsurancePage = lazy(() => import('../pages/finance/InsurancePage'))
const AgencyTeamPage = lazy(() => import('../pages/agency/AgencyTeamPage'))
const AgencyBranchesPage = lazy(() => import('../pages/agency/AgencyBranchesPage'))
const AgencyCompliancePage = lazy(() => import('../pages/agency/AgencyCompliancePage'))
const AgencyAnalyticsPage = lazy(() => import('../pages/agency/AgencyAnalyticsPage'))
const AgentListingsPage = lazy(() => import('../pages/agent/AgentListingsPage'))
const AgentCommissionsPage = lazy(() => import('../pages/agent/AgentCommissionsPage'))
const AgentAnalyticsPage = lazy(() => import('../pages/agent/AgentAnalyticsPage'))
const AgentTasksPage = lazy(() => import('../pages/agent/AgentTasksPage'))
const AgentCoachPage = lazy(() => import('../pages/agent/AgentCoachPage'))
const SmartDevicesPage = lazy(() => import('../pages/smart/SmartDevicesPage'))
const SmartAutomationsPage = lazy(() => import('../pages/smart/SmartAutomationsPage'))
const MarketIntelligencePage = lazy(() => import('../pages/intelligence/MarketIntelligencePage'))
const HeatmapPage = lazy(() => import('../pages/intelligence/HeatmapPage'))
const ValuationEnginePage = lazy(() => import('../pages/intelligence/ValuationEnginePage'))
const DeveloperProjectsPage = lazy(() => import('../pages/developer/DeveloperProjectsPage'))
const DeveloperConstructionPage = lazy(() => import('../pages/developer/DeveloperConstructionPage'))
const DeveloperBuyersPage = lazy(() => import('../pages/developer/DeveloperBuyersPage'))
const EnterprisePortfoliosPage = lazy(() => import('../pages/enterprise/EnterprisePortfoliosPage'))
const EnterpriseEsgPage = lazy(() => import('../pages/enterprise/EnterpriseEsgPage'))
const EnterpriseForecastPage = lazy(() => import('../pages/enterprise/EnterpriseForecastPage'))
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'))
const AdminAgenciesPage = lazy(() => import('../pages/admin/AdminAgenciesPage'))
const AdminModerationPage = lazy(() => import('../pages/admin/AdminModerationPage'))
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'))
const AdminAuditPage = lazy(() => import('../pages/admin/AdminAuditPage'))
const AdminIntegrationsPage = lazy(() => import('../pages/admin/AdminIntegrationsPage'))

const VendorHubPage = lazy(() =>
  import('../pages/vendors/VendorPages').then((m) => ({ default: m.VendorHubPage })),
)
const VendorDirectoryPage = lazy(() =>
  import('../pages/vendors/VendorPages').then((m) => ({ default: m.VendorDirectoryPage })),
)
const VendorJobsPage = lazy(() =>
  import('../pages/vendors/VendorPages').then((m) => ({ default: m.VendorJobsPage })),
)
const VendorDispatchPage = lazy(() =>
  import('../pages/vendors/VendorPages').then((m) => ({ default: m.VendorDispatchPage })),
)
const WalletPayoutsPageExport = lazy(() =>
  import('../pages/wallet/WalletPages').then((m) => ({ default: m.WalletPayoutsPageExport })),
)
const WalletEscrowPageExport = lazy(() =>
  import('../pages/wallet/WalletPages').then((m) => ({ default: m.WalletEscrowPageExport })),
)
const InvestmentRoiPage = lazy(() =>
  import('../pages/investment/InvestmentPages').then((m) => ({ default: m.InvestmentRoiPage })),
)
const InvestmentPortfolioPage = lazy(() =>
  import('../pages/investment/InvestmentPages').then((m) => ({ default: m.InvestmentPortfolioPage })),
)
const InvestmentDealsPage = lazy(() =>
  import('../pages/investment/InvestmentPages').then((m) => ({ default: m.InvestmentDealsPage })),
)
const InvestmentForecastPage = lazy(() =>
  import('../pages/investment/InvestmentPages').then((m) => ({ default: m.InvestmentForecastPage })),
)
const HostCalendarWorkspacePage = lazy(() =>
  import('../pages/host/HostWorkspacePages').then((m) => ({ default: m.HostCalendarWorkspacePage })),
)
const HostPricingPage = lazy(() =>
  import('../pages/host/HostWorkspacePages').then((m) => ({ default: m.HostPricingPage })),
)
const HostCleaningPage = lazy(() =>
  import('../pages/host/HostWorkspacePages').then((m) => ({ default: m.HostCleaningPage })),
)
const HostGuestsPage = lazy(() =>
  import('../pages/host/HostWorkspacePages').then((m) => ({ default: m.HostGuestsPage })),
)

function RouteFallback() {
  return (
    <div className="mobile-bolt flex min-h-[50vh] items-center justify-center bg-bolt-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
    </div>
  )
}

function AgentRoute({ children }) {
  return (
    <ConsumerGuard>
      <RoleProtectedRoute require="agent">{children}</RoleProtectedRoute>
    </ConsumerGuard>
  )
}

function AgencyRoute({ children }) {
  return (
    <ConsumerGuard>
      <RoleProtectedRoute require="agency">{children}</RoleProtectedRoute>
    </ConsumerGuard>
  )
}

function ManageRoute({ children }) {
  return (
    <ConsumerGuard>
      <RoleProtectedRoute require="manage">{children}</RoleProtectedRoute>
    </ConsumerGuard>
  )
}

function DeveloperRoute({ children }) {
  return (
    <ConsumerGuard>
      <RoleProtectedRoute require="developer">{children}</RoleProtectedRoute>
    </ConsumerGuard>
  )
}

function EnterpriseRoute({ children }) {
  return (
    <ConsumerGuard>
      <RoleProtectedRoute require="enterprise">{children}</RoleProtectedRoute>
    </ConsumerGuard>
  )
}

function ProSmartRoute({ children }) {
  return (
    <ConsumerGuard>
      <RoleProtectedRoute require="manage">{children}</RoleProtectedRoute>
    </ConsumerGuard>
  )
}

function StaffRoute({ children }) {
  return (
    <ConsumerGuard>
      <RoleProtectedRoute require="staff">{children}</RoleProtectedRoute>
    </ConsumerGuard>
  )
}

export default function MobileRoutes() {
  const location = useLocation()

  return (
    <RouteErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        <Route path="/" element={<MobileHomePage />} />
        <Route path="/explore" element={<MobileExplorePage />} />
        <Route path="/saved" element={<MobileSavedPage />} />
        <Route path="/favorites" element={<Navigate to="/saved" replace />} />
        <Route path="/messages" element={<MobileMessagesPage />} />
        <Route path="/messages/:id" element={<MobileMessagesPage />} />
        <Route path="/profile" element={<MobileProfilePage />} />
        <Route path="/profile/kyc" element={<KycPage />} />
        <Route path="/settings" element={<Navigate to="/profile" replace />} />
        <Route path="/security" element={<Navigate to="/profile" replace />} />
        <Route path="/property/:id" element={<MobilePropertyPage />} />
        <Route path="/trips" element={<MobileTripsPage />} />
        <Route path="/bookings" element={<Navigate to="/trips" replace />} />
        <Route path="/booking" element={<Navigate to="/trips" replace />} />
        <Route path="/neighborhoods" element={<MobileNeighborhoodsPage />} />
        <Route path="/neighborhoods/:slug" element={<MobileNeighborhoodDetailPage />} />
        <Route path="/services" element={<ServicesMarketplacePage />} />
        <Route path="/agencies" element={<AgenciesIndexPage />} />
        <Route path="/agencies/:id" element={<AgencyProfilePage />} />
        <Route path="/agents" element={<AgentsIndexPage />} />
        <Route path="/agents/:id" element={<AgentProfilePage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/documents" element={<DocumentVaultPage />} />
        <Route path="/document-vault" element={<Navigate to="/documents" replace />} />
        <Route path="/my-home" element={<MobileResidentHomePage />} />
        <Route path="/consumer" element={<Navigate to="/" replace />} />
        <Route path="/consumer/buy" element={<MobileConsumerBuyPage />} />
        <Route path="/consumer/rent" element={<MobileConsumerRentPage />} />
        <Route path="/consumer/stay" element={<MobileConsumerStayPage />} />
        <Route path="/consumer/invest" element={<Navigate to="/investment" replace />} />
        <Route path="/wallet" element={<MobileWalletHomePage />} />
        <Route path="/wallet/transactions" element={<MobileWalletTransactionsPage />} />
        <Route path="/wallet/history" element={<Navigate to="/wallet/transactions" replace />} />
        <Route path="/wallet/payouts" element={<WalletPayoutsPageExport />} />
        <Route path="/wallet/escrow" element={<WalletEscrowPageExport />} />
        <Route path="/investment" element={<MobileInvestmentHomePage />} />
        <Route path="/investment/roi" element={<ProtectedRoute><InvestmentRoiPage /></ProtectedRoute>} />
        <Route path="/investment/portfolio" element={<ProtectedRoute><InvestmentPortfolioPage /></ProtectedRoute>} />
        <Route path="/investment/deals" element={<ProtectedRoute><InvestmentDealsPage /></ProtectedRoute>} />
        <Route path="/investment/forecast" element={<ProtectedRoute><InvestmentForecastPage /></ProtectedRoute>} />
        <Route path="/tenant" element={<MobileTenantHomePage />} />
        <Route path="/tenant/visitors" element={<MobileTenantHomePage />} />
        <Route path="/resident" element={<MobileResidentHomePage />} />
        <Route path="/host" element={<MobileHostHomePage />} />
        <Route path="/host/list" element={<MobileHostListingPage />} />
        <Route path="/host/listings" element={<HostListingsPage />} />
        <Route path="/host/reservations" element={<MobileHostReservationsPage />} />
        <Route path="/host/calendar" element={<ProtectedRoute><HostCalendarWorkspacePage /></ProtectedRoute>} />
        <Route path="/host/pricing" element={<ProtectedRoute><HostPricingPage /></ProtectedRoute>} />
        <Route path="/host/cleaning" element={<ProtectedRoute><HostCleaningPage /></ProtectedRoute>} />
        <Route path="/host/guests" element={<ProtectedRoute><HostGuestsPage /></ProtectedRoute>} />
        <Route path="/host/payouts" element={<Navigate to="/wallet/payouts" replace />} />
        <Route path="/buyer" element={<Navigate to="/consumer/buy" replace />} />
        <Route path="/buyer/advisor" element={<AIAdvisorPage />} />
        <Route path="/buyer/finance" element={<FinancingCenterPage />} />
        <Route path="/transactions" element={<TransactionCenterPage />} />
        <Route path="/offers" element={<OfferRoomPage />} />
        <Route path="/offer-room" element={<Navigate to="/offers" replace />} />
        <Route path="/renter" element={<Navigate to="/consumer/rent" replace />} />
        <Route path="/agent" element={<AgentRoute><MobileAgentHomePage /></AgentRoute>} />
        <Route path="/agent/leads" element={<AgentRoute><MobileAgentLeadsPage /></AgentRoute>} />
        <Route path="/agent/calendar" element={<AgentRoute><MobileAgentCalendarPage /></AgentRoute>} />
        <Route path="/agent/tasks" element={<AgentRoute><AgentTasksPage /></AgentRoute>} />
        <Route path="/agent/coach" element={<AgentRoute><AgentCoachPage /></AgentRoute>} />
        <Route path="/agent/listings" element={<AgentRoute><AgentListingsPage /></AgentRoute>} />
        <Route path="/agent/commissions" element={<AgentRoute><AgentCommissionsPage /></AgentRoute>} />
        <Route path="/agent/analytics" element={<AgentRoute><AgentAnalyticsPage /></AgentRoute>} />
        <Route path="/renter/apply" element={<RentalApplicationPage />} />
        <Route path="/renter/leases" element={<MobileRenterLeasesPage />} />
        <Route path="/renter/payments" element={<MobileRenterPaymentsPage />} />
        <Route path="/renter/utilities" element={<MobileRenterUtilitiesPage />} />
        <Route path="/renter/credit" element={<MobileRenterCreditPage />} />
        <Route path="/renter/maintenance" element={<MobileRenterMaintenancePage />} />
        <Route path="/renter/sign" element={<MobileRenterSignPage />} />
        <Route path="/renter/renewal" element={<LeaseRenewalPage />} />
        <Route path="/smart" element={<ProSmartRoute><MobileSmartHomePage /></ProSmartRoute>} />
        <Route path="/smart/alerts" element={<ProSmartRoute><MobileSmartAlertsPage /></ProSmartRoute>} />
        <Route path="/smart/devices" element={<ProSmartRoute><SmartDevicesPage /></ProSmartRoute>} />
        <Route path="/smart/automations" element={<ProSmartRoute><SmartAutomationsPage /></ProSmartRoute>} />
        <Route path="/agency" element={<AgencyRoute><MobileAgencyPage /></AgencyRoute>} />
        <Route path="/agency/team" element={<AgencyRoute><AgencyTeamPage /></AgencyRoute>} />
        <Route path="/agency/branches" element={<AgencyRoute><AgencyBranchesPage /></AgencyRoute>} />
        <Route path="/agency/compliance" element={<AgencyRoute><AgencyCompliancePage /></AgencyRoute>} />
        <Route path="/agency/analytics" element={<AgencyRoute><AgencyAnalyticsPage /></AgencyRoute>} />
        <Route path="/manage" element={<ManageRoute><MobileManagePage /></ManageRoute>} />
        <Route path="/manage/tenants" element={<ManageRoute><ManageTenantsPage /></ManageRoute>} />
        <Route path="/manage/work-orders" element={<ManageRoute><ManageWorkOrdersPage /></ManageRoute>} />
        <Route path="/manage/finance" element={<ManageRoute><ManageFinancePage /></ManageRoute>} />
        <Route path="/manage/utilities" element={<ManageRoute><ManageUtilitiesPage /></ManageRoute>} />
        <Route path="/manage/inspections" element={<ManageRoute><ManageInspectionsPage /></ManageRoute>} />
        <Route path="/manage/applications" element={<ManageRoute><ManageApplicationsPage /></ManageRoute>} />
        <Route path="/vendors" element={<ManageRoute><VendorHubPage /></ManageRoute>} />
        <Route path="/vendors/directory" element={<ManageRoute><VendorDirectoryPage /></ManageRoute>} />
        <Route path="/vendors/jobs" element={<ProtectedRoute><VendorJobsPage /></ProtectedRoute>} />
        <Route path="/vendors/dispatch" element={<ManageRoute><VendorDispatchPage /></ManageRoute>} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/admin" element={<StaffRoute><AdminDashboardPage /></StaffRoute>} />
        <Route path="/admin/agencies" element={<StaffRoute><AdminAgenciesPage /></StaffRoute>} />
        <Route path="/admin/moderation" element={<StaffRoute><AdminModerationPage /></StaffRoute>} />
        <Route path="/admin/users" element={<StaffRoute><AdminUsersPage /></StaffRoute>} />
        <Route path="/admin/audit" element={<StaffRoute><AdminAuditPage /></StaffRoute>} />
        <Route path="/admin/integrations" element={<StaffRoute><AdminIntegrationsPage /></StaffRoute>} />
        <Route path="/finance" element={<MobileFinancePage />} />
        <Route path="/finance/mortgages" element={<MortgageMarketplacePage />} />
        <Route path="/finance/escrow" element={<EscrowPage />} />
        <Route path="/finance/rent-collection" element={<RentCollectionPage />} />
        <Route path="/finance/commissions" element={<CommissionSettlementPage />} />
        <Route path="/finance/insurance" element={<InsurancePage />} />
        <Route path="/mortgages" element={<Navigate to="/finance/mortgages" replace />} />
        <Route path="/insurance" element={<Navigate to="/finance/insurance" replace />} />
        <Route path="/intelligence" element={<MobileIntelligencePage />} />
        <Route path="/intelligence/market" element={<MarketIntelligencePage />} />
        <Route path="/intelligence/heatmap" element={<HeatmapPage />} />
        <Route path="/intelligence/valuation" element={<ValuationEnginePage />} />
        <Route path="/developer" element={<DeveloperRoute><MobileDeveloperPage /></DeveloperRoute>} />
        <Route path="/developer/projects" element={<DeveloperRoute><DeveloperProjectsPage /></DeveloperRoute>} />
        <Route path="/developer/construction" element={<DeveloperRoute><DeveloperConstructionPage /></DeveloperRoute>} />
        <Route path="/developer/buyers" element={<DeveloperRoute><DeveloperBuyersPage /></DeveloperRoute>} />
        <Route path="/enterprise" element={<EnterpriseRoute><MobileEnterprisePage /></EnterpriseRoute>} />
        <Route path="/enterprise/portfolios" element={<EnterpriseRoute><EnterprisePortfoliosPage /></EnterpriseRoute>} />
        <Route path="/enterprise/esg" element={<EnterpriseRoute><EnterpriseEsgPage /></EnterpriseRoute>} />
        <Route path="/enterprise/forecast" element={<EnterpriseRoute><EnterpriseForecastPage /></EnterpriseRoute>} />
        <Route path="/enterprise/organizations" element={<EnterpriseRoute><MobileEnterpriseOrgsPage /></EnterpriseRoute>} />
        <Route path="/tools/mortgage" element={<MortgageCalculatorPage />} />
        <Route path="/referral" element={<ReferralPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/help" element={<HelpCentrePage />} />
        <Route path="/payments/success" element={<PaymentSuccessPage />} />
        <Route path="/payments/cancel" element={<PaymentCancelPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  )
}
