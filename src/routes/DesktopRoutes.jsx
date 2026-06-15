import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import RoleProtectedRoute from '../components/RoleProtectedRoute'

const HomePage = lazy(() => import('../pages/HomePage'))
const ListingDetailPage = lazy(() => import('../pages/ListingDetailPage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'))
const SignUpPage = lazy(() => import('../pages/SignUpPage'))
const SavedPage = lazy(() => import('../pages/SavedPage'))
const TripsPage = lazy(() => import('../pages/TripsPage'))
const HostPage = lazy(() => import('../pages/HostPage'))
const HostListingsPage = lazy(() => import('../pages/HostListingsPage'))
const ListPropertyPage = lazy(() => import('../pages/ListPropertyPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
const MessagesPage = lazy(() => import('../pages/MessagesPage'))
const ProfilePage = lazy(() => import('../pages/ProfilePage'))
const DocumentVaultPage = lazy(() => import('../pages/DocumentVaultPage'))
const ComparePage = lazy(() => import('../pages/ComparePage'))
const NeighborhoodPage = lazy(() => import('../pages/NeighborhoodPage'))
const MortgageCalculatorPage = lazy(() => import('../pages/tools/MortgageCalculatorPage'))
const InvestmentCalculatorPage = lazy(() => import('../pages/tools/InvestmentCalculatorPage'))
const BuyerHubPage = lazy(() => import('../pages/buyer/BuyerHubPage'))
const OfferRoomPage = lazy(() => import('../pages/buyer/OfferRoomPage'))
const TransactionCenterPage = lazy(() => import('../pages/buyer/TransactionCenterPage'))
const AIAdvisorPage = lazy(() => import('../pages/buyer/AIAdvisorPage'))
const FinancingCenterPage = lazy(() => import('../pages/buyer/FinancingCenterPage'))
const FeaturedBoostPage = lazy(() => import('../pages/host/FeaturedBoostPage'))
const AgencyDashboardPage = lazy(() => import('../pages/agency/AgencyDashboardPage'))
const AgencyTeamPage = lazy(() => import('../pages/agency/AgencyTeamPage'))
const AgencyLeadsPage = lazy(() => import('../pages/agency/AgencyLeadsPage'))
const AgencyPropertiesPage = lazy(() => import('../pages/agency/AgencyPropertiesPage'))
const AgencyOnboardingPage = lazy(() => import('../pages/agency/AgencyOnboardingPage'))
const AgencyBranchesPage = lazy(() => import('../pages/agency/AgencyBranchesPage'))
const AgencyPayrollPage = lazy(() => import('../pages/agency/AgencyPayrollPage'))
const AgencyAnalyticsPage = lazy(() => import('../pages/agency/AgencyAnalyticsPage'))
const AgencyTrustPage = lazy(() => import('../pages/agency/AgencyTrustPage'))
const AgencyCompliancePage = lazy(() => import('../pages/agency/AgencyCompliancePage'))
const RenterHubPage = lazy(() => import('../pages/renter/RenterHubPage'))
const RenterLeasesPage = lazy(() => import('../pages/renter/RenterLeasesPage'))
const RenterPaymentsPage = lazy(() => import('../pages/renter/RenterPaymentsPage'))
const RenterUtilitiesPage = lazy(() => import('../pages/renter/RenterUtilitiesPage'))
const RenterCreditPage = lazy(() => import('../pages/renter/RenterCreditPage'))
const RenterMaintenancePage = lazy(() => import('../pages/renter/RenterMaintenancePage'))
const RenterLeaseSigningPage = lazy(() => import('../pages/renter/RenterLeaseSigningPage'))
const ManageHubPage = lazy(() => import('../pages/manage/ManageHubPage'))
const ManageTenantsPage = lazy(() => import('../pages/manage/ManageTenantsPage'))
const ManageWorkOrdersPage = lazy(() => import('../pages/manage/ManageWorkOrdersPage'))
const ManageFinancePage = lazy(() => import('../pages/manage/ManageFinancePage'))
const ManageInspectionsPage = lazy(() => import('../pages/manage/ManageInspectionsPage'))
const ManageUtilitiesPage = lazy(() => import('../pages/manage/ManageUtilitiesPage'))
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'))
const AdminAgenciesPage = lazy(() => import('../pages/admin/AdminAgenciesPage'))
const AdminModerationPage = lazy(() => import('../pages/admin/AdminModerationPage'))
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'))
const AdminAuditPage = lazy(() => import('../pages/admin/AdminAuditPage'))
const AgentDashboardPage = lazy(() => import('../pages/agent/AgentDashboardPage'))
const AgentLeadsPage = lazy(() => import('../pages/agent/AgentLeadsPage'))
const AgentListingsPage = lazy(() => import('../pages/agent/AgentListingsPage'))
const AgentCalendarPage = lazy(() => import('../pages/agent/AgentCalendarPage'))
const AgentCoachPage = lazy(() => import('../pages/agent/AgentCoachPage'))
const AgentCommissionsPage = lazy(() => import('../pages/agent/AgentCommissionsPage'))
const AgentAnalyticsPage = lazy(() => import('../pages/agent/AgentAnalyticsPage'))
const AgentTasksPage = lazy(() => import('../pages/agent/AgentTasksPage'))
const FinanceHubPage = lazy(() => import('../pages/finance/FinanceHubPage'))
const MortgageMarketplacePage = lazy(() => import('../pages/finance/MortgageMarketplacePage'))
const EscrowPage = lazy(() => import('../pages/finance/EscrowPage'))
const RentCollectionPage = lazy(() => import('../pages/finance/RentCollectionPage'))
const InsurancePage = lazy(() => import('../pages/finance/InsurancePage'))
const CommissionSettlementPage = lazy(() => import('../pages/finance/CommissionSettlementPage'))
const SmartHubPage = lazy(() => import('../pages/smart/SmartHubPage'))
const SmartDevicesPage = lazy(() => import('../pages/smart/SmartDevicesPage'))
const SmartAutomationsPage = lazy(() => import('../pages/smart/SmartAutomationsPage'))
const SmartAlertsPage = lazy(() => import('../pages/smart/SmartAlertsPage'))
const IntelligenceHubPage = lazy(() => import('../pages/intelligence/IntelligenceHubPage'))
const MarketIntelligencePage = lazy(() => import('../pages/intelligence/MarketIntelligencePage'))
const HeatmapPage = lazy(() => import('../pages/intelligence/HeatmapPage'))
const ValuationEnginePage = lazy(() => import('../pages/intelligence/ValuationEnginePage'))
const DeveloperHubPage = lazy(() => import('../pages/developer/DeveloperHubPage'))
const DeveloperProjectsPage = lazy(() => import('../pages/developer/DeveloperProjectsPage'))
const DeveloperConstructionPage = lazy(() => import('../pages/developer/DeveloperConstructionPage'))
const DeveloperBuyersPage = lazy(() => import('../pages/developer/DeveloperBuyersPage'))
const DeveloperPlatformApiPage = lazy(() => import('../pages/developer/DeveloperPlatformApiPage'))
const EnterpriseHubPage = lazy(() => import('../pages/enterprise/EnterpriseHubPage'))
const EnterprisePortfoliosPage = lazy(() => import('../pages/enterprise/EnterprisePortfoliosPage'))
const EnterpriseEsgPage = lazy(() => import('../pages/enterprise/EnterpriseEsgPage'))
const EnterpriseForecastPage = lazy(() => import('../pages/enterprise/EnterpriseForecastPage'))
const AdminKycPage = lazy(() => import('../pages/admin/AdminKycPage'))
const AdminFraudPage = lazy(() => import('../pages/admin/AdminFraudPage'))
const AdminAiPage = lazy(() => import('../pages/admin/AdminAiPage'))
const AdminValuationApiPage = lazy(() => import('../pages/admin/AdminValuationApiPage'))
const AdminGlobalPage = lazy(() => import('../pages/admin/AdminGlobalPage'))
const PaymentSuccessPage = lazy(() => import('../pages/PaymentSuccessPage'))
const PaymentCancelPage = lazy(() => import('../pages/PaymentCancelPage'))
const AuthCallbackPage = lazy(() => import('../pages/AuthCallbackPage'))
const HelpCentrePage = lazy(() => import('../pages/HelpCentrePage'))
const ReferralPage = lazy(() => import('../pages/ReferralPage'))
const PrivacyPage = lazy(() => import('../pages/PrivacyPage'))
const TermsPage = lazy(() => import('../pages/TermsPage'))

const ConsumerHubPage = lazy(() => import('../pages/consumer/ConsumerPages').then((m) => ({ default: m.ConsumerHubPage })))
const ConsumerBuyPage = lazy(() => import('../pages/consumer/ConsumerPages').then((m) => ({ default: m.ConsumerBuyPage })))
const ConsumerRentPage = lazy(() => import('../pages/consumer/ConsumerPages').then((m) => ({ default: m.ConsumerRentPage })))
const ConsumerStayPage = lazy(() => import('../pages/consumer/ConsumerPages').then((m) => ({ default: m.ConsumerStayPage })))
const ConsumerInvestPage = lazy(() => import('../pages/consumer/ConsumerPages').then((m) => ({ default: m.ConsumerInvestPage })))

const HostDashboardPage = lazy(() => import('../pages/host/HostWorkspacePages').then((m) => ({ default: m.HostDashboardPage })))
const HostReservationsWorkspacePage = lazy(() => import('../pages/host/HostWorkspacePages').then((m) => ({ default: m.HostReservationsWorkspacePage })))
const HostCalendarWorkspacePage = lazy(() => import('../pages/host/HostWorkspacePages').then((m) => ({ default: m.HostCalendarWorkspacePage })))
const HostPricingPage = lazy(() => import('../pages/host/HostWorkspacePages').then((m) => ({ default: m.HostPricingPage })))
const HostCleaningPage = lazy(() => import('../pages/host/HostWorkspacePages').then((m) => ({ default: m.HostCleaningPage })))
const HostGuestsPage = lazy(() => import('../pages/host/HostWorkspacePages').then((m) => ({ default: m.HostGuestsPage })))
const HostPayoutsWorkspacePage = lazy(() => import('../pages/host/HostWorkspacePages').then((m) => ({ default: m.HostPayoutsWorkspacePage })))

const WalletHubPage = lazy(() => import('../pages/wallet/WalletPages').then((m) => ({ default: m.WalletHubPage })))
const WalletTransactionsPage = lazy(() => import('../pages/wallet/WalletPages').then((m) => ({ default: m.WalletTransactionsPageExport })))
const WalletPayoutsPage = lazy(() => import('../pages/wallet/WalletPages').then((m) => ({ default: m.WalletPayoutsPageExport })))
const WalletEscrowPage = lazy(() => import('../pages/wallet/WalletPages').then((m) => ({ default: m.WalletEscrowPageExport })))

const InvestmentHubPage = lazy(() => import('../pages/investment/InvestmentPages').then((m) => ({ default: m.InvestmentHubPage })))
const InvestmentRoiPage = lazy(() => import('../pages/investment/InvestmentPages').then((m) => ({ default: m.InvestmentRoiPage })))
const InvestmentPortfolioPage = lazy(() => import('../pages/investment/InvestmentPages').then((m) => ({ default: m.InvestmentPortfolioPage })))
const InvestmentDealsPage = lazy(() => import('../pages/investment/InvestmentPages').then((m) => ({ default: m.InvestmentDealsPage })))
const InvestmentForecastPage = lazy(() => import('../pages/investment/InvestmentPages').then((m) => ({ default: m.InvestmentForecastPage })))

const TenantPortalPage = lazy(() => import('../pages/tenant/TenantPages').then((m) => ({ default: m.TenantPortalPage })))
const TenantVisitorsPage = lazy(() => import('../pages/tenant/TenantPages').then((m) => ({ default: m.TenantVisitorsPage })))
const TenantAccessPage = lazy(() => import('../pages/tenant/TenantPages').then((m) => ({ default: m.TenantAccessPage })))
const TenantCommunityPage = lazy(() => import('../pages/tenant/TenantPages').then((m) => ({ default: m.TenantCommunityPage })))

const ResidentHubPage = lazy(() => import('../pages/resident/ResidentPages').then((m) => ({ default: m.ResidentHubPage })))
const ResidentAccessPage = lazy(() => import('../pages/resident/ResidentPages').then((m) => ({ default: m.ResidentAccessPage })))
const ResidentVisitorsPage = lazy(() => import('../pages/resident/ResidentPages').then((m) => ({ default: m.ResidentVisitorsPage })))
const ResidentEnergyPage = lazy(() => import('../pages/resident/ResidentPages').then((m) => ({ default: m.ResidentEnergyPage })))
const ResidentAnnouncementsPage = lazy(() => import('../pages/resident/ResidentPages').then((m) => ({ default: m.ResidentAnnouncementsPage })))

const EnterpriseOrganizationsPage = lazy(() => import('../pages/enterprise/EnterpriseOrgPages').then((m) => ({ default: m.EnterpriseOrganizationsPage })))
const EnterpriseOrgUsersPage = lazy(() => import('../pages/enterprise/EnterpriseOrgPages').then((m) => ({ default: m.EnterpriseOrgUsersPage })))
const EnterpriseOrgPermissionsPage = lazy(() => import('../pages/enterprise/EnterpriseOrgPages').then((m) => ({ default: m.EnterpriseOrgPermissionsPage })))

const NeighborhoodsIndexPage = lazy(() =>
  import('../pages/NeighborhoodPage').then((m) => ({ default: m.NeighborhoodsIndexPage })),
)
const NeighborhoodDetailPage = lazy(() =>
  import('../pages/NeighborhoodPage').then((m) => ({ default: m.NeighborhoodDetailPage })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-pulse rounded-full bg-surface-hover" />
    </div>
  )
}

function AdminRoute({ children }) {
  return <RoleProtectedRoute require="admin">{children}</RoleProtectedRoute>
}

function StaffRoute({ children }) {
  return <RoleProtectedRoute require="staff">{children}</RoleProtectedRoute>
}

function ModerationRoute({ children }) {
  return <RoleProtectedRoute require={['moderation', 'agency']}>{children}</RoleProtectedRoute>
}

function AgentRoute({ children }) {
  return <RoleProtectedRoute require="agent">{children}</RoleProtectedRoute>
}

function AgencyRoute({ children }) {
  return <RoleProtectedRoute require="agency">{children}</RoleProtectedRoute>
}

function ManageRoute({ children }) {
  return <RoleProtectedRoute require="manage">{children}</RoleProtectedRoute>
}

function DeveloperRoute({ children }) {
  return <RoleProtectedRoute require="developer">{children}</RoleProtectedRoute>
}

function EnterpriseRoute({ children }) {
  return <RoleProtectedRoute require="enterprise">{children}</RoleProtectedRoute>
}

export default function DesktopRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/explore" element={<Navigate to="/" replace />} />
      <Route path="/property/:id" element={<ListingDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/saved" element={<SavedPage />} />
      <Route path="/trips" element={<TripsPage />} />
      <Route path="/host" element={<HostDashboardPage />} />
      <Route path="/host/list" element={<ListPropertyPage />} />
      <Route path="/host/listings" element={<HostListingsPage />} />
      <Route path="/host/calendar" element={<HostCalendarWorkspacePage />} />
      <Route path="/host/reservations" element={<HostReservationsWorkspacePage />} />
      <Route path="/host/pricing" element={<HostPricingPage />} />
      <Route path="/host/cleaning" element={<HostCleaningPage />} />
      <Route path="/host/guests" element={<HostGuestsPage />} />
      <Route path="/host/payouts" element={<HostPayoutsWorkspacePage />} />
      <Route path="/host/boost" element={<FeaturedBoostPage />} />
      <Route path="/consumer" element={<ConsumerHubPage />} />
      <Route path="/consumer/buy" element={<ConsumerBuyPage />} />
      <Route path="/consumer/rent" element={<ConsumerRentPage />} />
      <Route path="/consumer/stay" element={<ConsumerStayPage />} />
      <Route path="/consumer/invest" element={<ConsumerInvestPage />} />
      <Route path="/wallet" element={<WalletHubPage />} />
      <Route path="/wallet/transactions" element={<WalletTransactionsPage />} />
      <Route path="/wallet/payouts" element={<WalletPayoutsPage />} />
      <Route path="/wallet/escrow" element={<WalletEscrowPage />} />
      <Route path="/investment" element={<InvestmentHubPage />} />
      <Route path="/investment/roi" element={<InvestmentRoiPage />} />
      <Route path="/investment/portfolio" element={<InvestmentPortfolioPage />} />
      <Route path="/investment/deals" element={<InvestmentDealsPage />} />
      <Route path="/investment/forecast" element={<InvestmentForecastPage />} />
      <Route path="/tenant" element={<TenantPortalPage />} />
      <Route path="/tenant/visitors" element={<TenantVisitorsPage />} />
      <Route path="/tenant/access" element={<TenantAccessPage />} />
      <Route path="/tenant/community" element={<TenantCommunityPage />} />
      <Route path="/resident" element={<ResidentHubPage />} />
      <Route path="/resident/access" element={<ResidentAccessPage />} />
      <Route path="/resident/visitors" element={<ResidentVisitorsPage />} />
      <Route path="/resident/energy" element={<ResidentEnergyPage />} />
      <Route path="/resident/announcements" element={<ResidentAnnouncementsPage />} />
      <Route path="/buyer" element={<Navigate to="/consumer/buy" replace />} />
      <Route path="/buyer/advisor" element={<AIAdvisorPage />} />
      <Route path="/buyer/finance" element={<FinancingCenterPage />} />
      <Route path="/renter" element={<Navigate to="/consumer/rent" replace />} />
      <Route path="/tools/investment" element={<Navigate to="/investment/roi" replace />} />
      <Route path="/payments/success" element={<PaymentSuccessPage />} />
      <Route path="/payments/cancel" element={<PaymentCancelPage />} />
      <Route path="/compare" element={<ComparePage />} />
      <Route path="/neighborhoods" element={<NeighborhoodsIndexPage />} />
      <Route path="/neighborhoods/:slug" element={<NeighborhoodDetailPage />} />
      <Route path="/tools/mortgage" element={<MortgageCalculatorPage />} />
      <Route path="/transactions" element={<TransactionCenterPage />} />
      <Route path="/offers" element={<OfferRoomPage />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/messages/:id" element={<MessagesPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/help" element={<HelpCentrePage />} />
      <Route path="/referral" element={<ReferralPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/documents" element={<DocumentVaultPage />} />
      <Route path="/agent" element={<AgentRoute><AgentDashboardPage /></AgentRoute>} />
      <Route path="/agent/leads" element={<AgentRoute><AgentLeadsPage /></AgentRoute>} />
      <Route path="/agent/listings" element={<AgentRoute><AgentListingsPage /></AgentRoute>} />
      <Route path="/agent/calendar" element={<AgentRoute><AgentCalendarPage /></AgentRoute>} />
      <Route path="/agent/tasks" element={<AgentRoute><AgentTasksPage /></AgentRoute>} />
      <Route path="/agent/commissions" element={<AgentRoute><AgentCommissionsPage /></AgentRoute>} />
      <Route path="/agent/analytics" element={<AgentRoute><AgentAnalyticsPage /></AgentRoute>} />
      <Route path="/agent/coach" element={<AgentRoute><AgentCoachPage /></AgentRoute>} />
      <Route path="/agency" element={<AgencyRoute><AgencyDashboardPage /></AgencyRoute>} />
      <Route path="/agency/branches" element={<AgencyRoute><AgencyBranchesPage /></AgencyRoute>} />
      <Route path="/agency/team" element={<AgencyRoute><AgencyTeamPage /></AgencyRoute>} />
      <Route path="/agency/leads" element={<AgencyRoute><AgencyLeadsPage /></AgencyRoute>} />
      <Route path="/agency/properties" element={<AgencyRoute><AgencyPropertiesPage /></AgencyRoute>} />
      <Route path="/agency/payroll" element={<AgencyRoute><AgencyPayrollPage /></AgencyRoute>} />
      <Route path="/agency/analytics" element={<AgencyRoute><AgencyAnalyticsPage /></AgencyRoute>} />
      <Route path="/agency/trust" element={<AgencyRoute><AgencyTrustPage /></AgencyRoute>} />
      <Route path="/agency/compliance" element={<AgencyRoute><AgencyCompliancePage /></AgencyRoute>} />
      <Route path="/agency/onboarding" element={<AgencyRoute><AgencyOnboardingPage /></AgencyRoute>} />
      <Route path="/renter/leases" element={<RenterLeasesPage />} />
      <Route path="/renter/payments" element={<RenterPaymentsPage />} />
      <Route path="/renter/utilities" element={<RenterUtilitiesPage />} />
      <Route path="/renter/credit" element={<RenterCreditPage />} />
      <Route path="/renter/maintenance" element={<RenterMaintenancePage />} />
      <Route path="/renter/sign" element={<RenterLeaseSigningPage />} />
      <Route path="/manage" element={<ManageRoute><ManageHubPage /></ManageRoute>} />
      <Route path="/manage/tenants" element={<ManageRoute><ManageTenantsPage /></ManageRoute>} />
      <Route path="/manage/work-orders" element={<ManageRoute><ManageWorkOrdersPage /></ManageRoute>} />
      <Route path="/manage/finance" element={<ManageRoute><ManageFinancePage /></ManageRoute>} />
      <Route path="/manage/inspections" element={<ManageRoute><ManageInspectionsPage /></ManageRoute>} />
      <Route path="/manage/utilities" element={<ManageRoute><ManageUtilitiesPage /></ManageRoute>} />
      <Route path="/admin" element={<StaffRoute><AdminDashboardPage /></StaffRoute>} />
      <Route path="/admin/agencies" element={<AdminRoute><AdminAgenciesPage /></AdminRoute>} />
      <Route path="/admin/moderation" element={<ModerationRoute><AdminModerationPage /></ModerationRoute>} />
      <Route path="/admin/kyc" element={<StaffRoute><AdminKycPage /></StaffRoute>} />
      <Route path="/admin/fraud" element={<StaffRoute><AdminFraudPage /></StaffRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="/admin/ai" element={<AdminRoute><AdminAiPage /></AdminRoute>} />
      <Route path="/admin/valuation-api" element={<AdminRoute><AdminValuationApiPage /></AdminRoute>} />
      <Route path="/admin/global" element={<AdminRoute><AdminGlobalPage /></AdminRoute>} />
      <Route path="/admin/audit" element={<AdminRoute><AdminAuditPage /></AdminRoute>} />
      <Route path="/finance" element={<FinanceHubPage />} />
      <Route path="/finance/mortgages" element={<MortgageMarketplacePage />} />
      <Route path="/finance/escrow" element={<EscrowPage />} />
      <Route path="/finance/rent-collection" element={<RentCollectionPage />} />
      <Route path="/finance/insurance" element={<InsurancePage />} />
      <Route path="/finance/commissions" element={<CommissionSettlementPage />} />
      <Route path="/smart" element={<SmartHubPage />} />
      <Route path="/smart/devices" element={<SmartDevicesPage />} />
      <Route path="/smart/automations" element={<SmartAutomationsPage />} />
      <Route path="/smart/alerts" element={<SmartAlertsPage />} />
      <Route path="/intelligence" element={<IntelligenceHubPage />} />
      <Route path="/intelligence/market" element={<MarketIntelligencePage />} />
      <Route path="/intelligence/heatmap" element={<HeatmapPage />} />
      <Route path="/intelligence/valuation" element={<ValuationEnginePage />} />
      <Route path="/developer" element={<DeveloperRoute><DeveloperHubPage /></DeveloperRoute>} />
      <Route path="/developer/projects" element={<DeveloperRoute><DeveloperProjectsPage /></DeveloperRoute>} />
      <Route path="/developer/construction" element={<DeveloperRoute><DeveloperConstructionPage /></DeveloperRoute>} />
      <Route path="/developer/buyers" element={<DeveloperRoute><DeveloperBuyersPage /></DeveloperRoute>} />
      <Route path="/developer/platform-api" element={<DeveloperRoute><DeveloperPlatformApiPage /></DeveloperRoute>} />
      <Route path="/enterprise" element={<EnterpriseRoute><EnterpriseHubPage /></EnterpriseRoute>} />
      <Route path="/enterprise/organizations" element={<EnterpriseRoute><EnterpriseOrganizationsPage /></EnterpriseRoute>} />
      <Route path="/enterprise/users" element={<EnterpriseRoute><EnterpriseOrgUsersPage /></EnterpriseRoute>} />
      <Route path="/enterprise/permissions" element={<EnterpriseRoute><EnterpriseOrgPermissionsPage /></EnterpriseRoute>} />
      <Route path="/enterprise/portfolios" element={<EnterpriseRoute><EnterprisePortfoliosPage /></EnterpriseRoute>} />
      <Route path="/enterprise/esg" element={<EnterpriseRoute><EnterpriseEsgPage /></EnterpriseRoute>} />
      <Route path="/enterprise/forecast" element={<EnterpriseRoute><EnterpriseForecastPage /></EnterpriseRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  )
}
