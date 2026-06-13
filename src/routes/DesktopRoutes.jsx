import { Routes, Route, Navigate } from 'react-router-dom'
import RoleProtectedRoute from '../components/RoleProtectedRoute'
import HomePage from '../pages/HomePage'
import ListingDetailPage from '../pages/ListingDetailPage'
import LoginPage from '../pages/LoginPage'
import SignUpPage from '../pages/SignUpPage'
import SavedPage from '../pages/SavedPage'
import TripsPage from '../pages/TripsPage'
import HostListingsPage from '../pages/HostListingsPage'
import ListPropertyPage from '../pages/ListPropertyPage'
import NotFoundPage from '../pages/NotFoundPage'
import MessagesPage from '../pages/MessagesPage'
import ProfilePage from '../pages/ProfilePage'
import DocumentVaultPage from '../pages/DocumentVaultPage'
import ComparePage from '../pages/ComparePage'
import { NeighborhoodsIndexPage, NeighborhoodDetailPage } from '../pages/NeighborhoodPage'
import MortgageCalculatorPage from '../pages/tools/MortgageCalculatorPage'
import InvestmentCalculatorPage from '../pages/tools/InvestmentCalculatorPage'
import BuyerHubPage from '../pages/buyer/BuyerHubPage'
import OfferRoomPage from '../pages/buyer/OfferRoomPage'
import TransactionCenterPage from '../pages/buyer/TransactionCenterPage'
import AIAdvisorPage from '../pages/buyer/AIAdvisorPage'
import FinancingCenterPage from '../pages/buyer/FinancingCenterPage'
import FeaturedBoostPage from '../pages/host/FeaturedBoostPage'
import AgencyDashboardPage from '../pages/agency/AgencyDashboardPage'
import AgencyTeamPage from '../pages/agency/AgencyTeamPage'
import AgencyLeadsPage from '../pages/agency/AgencyLeadsPage'
import AgencyPropertiesPage from '../pages/agency/AgencyPropertiesPage'
import AgencyOnboardingPage from '../pages/agency/AgencyOnboardingPage'
import AgencyBranchesPage from '../pages/agency/AgencyBranchesPage'
import AgencyPayrollPage from '../pages/agency/AgencyPayrollPage'
import AgencyAnalyticsPage from '../pages/agency/AgencyAnalyticsPage'
import AgencyTrustPage from '../pages/agency/AgencyTrustPage'
import AgencyCompliancePage from '../pages/agency/AgencyCompliancePage'
import RenterHubPage from '../pages/renter/RenterHubPage'
import RenterLeasesPage from '../pages/renter/RenterLeasesPage'
import RenterPaymentsPage from '../pages/renter/RenterPaymentsPage'
import RenterMaintenancePage from '../pages/renter/RenterMaintenancePage'
import RenterLeaseSigningPage from '../pages/renter/RenterLeaseSigningPage'
import ManageHubPage from '../pages/manage/ManageHubPage'
import ManageTenantsPage from '../pages/manage/ManageTenantsPage'
import ManageWorkOrdersPage from '../pages/manage/ManageWorkOrdersPage'
import ManageFinancePage from '../pages/manage/ManageFinancePage'
import ManageInspectionsPage from '../pages/manage/ManageInspectionsPage'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import AdminAgenciesPage from '../pages/admin/AdminAgenciesPage'
import AdminModerationPage from '../pages/admin/AdminModerationPage'
import AdminAuditPage from '../pages/admin/AdminAuditPage'
import AgentDashboardPage from '../pages/agent/AgentDashboardPage'
import AgentLeadsPage from '../pages/agent/AgentLeadsPage'
import AgentListingsPage from '../pages/agent/AgentListingsPage'
import AgentCalendarPage from '../pages/agent/AgentCalendarPage'
import AgentCoachPage from '../pages/agent/AgentCoachPage'
import AgentCommissionsPage from '../pages/agent/AgentCommissionsPage'
import AgentAnalyticsPage from '../pages/agent/AgentAnalyticsPage'
import AgentTasksPage from '../pages/agent/AgentTasksPage'
import FinanceHubPage from '../pages/finance/FinanceHubPage'
import MortgageMarketplacePage from '../pages/finance/MortgageMarketplacePage'
import EscrowPage from '../pages/finance/EscrowPage'
import RentCollectionPage from '../pages/finance/RentCollectionPage'
import InsurancePage from '../pages/finance/InsurancePage'
import CommissionSettlementPage from '../pages/finance/CommissionSettlementPage'
import SmartHubPage from '../pages/smart/SmartHubPage'
import SmartDevicesPage from '../pages/smart/SmartDevicesPage'
import SmartAutomationsPage from '../pages/smart/SmartAutomationsPage'
import SmartAlertsPage from '../pages/smart/SmartAlertsPage'
import IntelligenceHubPage from '../pages/intelligence/IntelligenceHubPage'
import MarketIntelligencePage from '../pages/intelligence/MarketIntelligencePage'
import HeatmapPage from '../pages/intelligence/HeatmapPage'
import ValuationEnginePage from '../pages/intelligence/ValuationEnginePage'
import DeveloperHubPage from '../pages/developer/DeveloperHubPage'
import DeveloperProjectsPage from '../pages/developer/DeveloperProjectsPage'
import DeveloperConstructionPage from '../pages/developer/DeveloperConstructionPage'
import DeveloperBuyersPage from '../pages/developer/DeveloperBuyersPage'
import EnterpriseHubPage from '../pages/enterprise/EnterpriseHubPage'
import EnterprisePortfoliosPage from '../pages/enterprise/EnterprisePortfoliosPage'
import EnterpriseEsgPage from '../pages/enterprise/EnterpriseEsgPage'
import EnterpriseForecastPage from '../pages/enterprise/EnterpriseForecastPage'
import AdminKycPage from '../pages/admin/AdminKycPage'
import AdminFraudPage from '../pages/admin/AdminFraudPage'
import AdminAiPage from '../pages/admin/AdminAiPage'
import AdminValuationApiPage from '../pages/admin/AdminValuationApiPage'
import AdminGlobalPage from '../pages/admin/AdminGlobalPage'
import PaymentSuccessPage from '../pages/PaymentSuccessPage'
import PaymentCancelPage from '../pages/PaymentCancelPage'

function AdminRoute({ children }) {
  return <RoleProtectedRoute require="admin">{children}</RoleProtectedRoute>
}

function ModerationRoute({ children }) {
  return <RoleProtectedRoute require={['admin', 'agency']}>{children}</RoleProtectedRoute>
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
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/property/:id" element={<ListingDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/saved" element={<SavedPage />} />
      <Route path="/trips" element={<TripsPage />} />
      <Route path="/host" element={<HostPage />} />
      <Route path="/host/list" element={<ListPropertyPage />} />
      <Route path="/host/listings" element={<HostListingsPage />} />
      <Route path="/host/boost" element={<FeaturedBoostPage />} />
      <Route path="/payments/success" element={<PaymentSuccessPage />} />
      <Route path="/payments/cancel" element={<PaymentCancelPage />} />
      <Route path="/compare" element={<ComparePage />} />
      <Route path="/neighborhoods" element={<NeighborhoodsIndexPage />} />
      <Route path="/neighborhoods/:slug" element={<NeighborhoodDetailPage />} />
      <Route path="/tools/mortgage" element={<MortgageCalculatorPage />} />
      <Route path="/tools/investment" element={<InvestmentCalculatorPage />} />
      <Route path="/buyer" element={<BuyerHubPage />} />
      <Route path="/buyer/advisor" element={<AIAdvisorPage />} />
      <Route path="/buyer/finance" element={<FinancingCenterPage />} />
      <Route path="/transactions" element={<TransactionCenterPage />} />
      <Route path="/offers" element={<OfferRoomPage />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/messages/:id" element={<MessagesPage />} />
      <Route path="/profile" element={<ProfilePage />} />
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
      <Route path="/renter" element={<RenterHubPage />} />
      <Route path="/renter/leases" element={<RenterLeasesPage />} />
      <Route path="/renter/payments" element={<RenterPaymentsPage />} />
      <Route path="/renter/maintenance" element={<RenterMaintenancePage />} />
      <Route path="/renter/sign" element={<RenterLeaseSigningPage />} />
      <Route path="/manage" element={<ManageRoute><ManageHubPage /></ManageRoute>} />
      <Route path="/manage/tenants" element={<ManageRoute><ManageTenantsPage /></ManageRoute>} />
      <Route path="/manage/work-orders" element={<ManageRoute><ManageWorkOrdersPage /></ManageRoute>} />
      <Route path="/manage/finance" element={<ManageRoute><ManageFinancePage /></ManageRoute>} />
      <Route path="/manage/inspections" element={<ManageRoute><ManageInspectionsPage /></ManageRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/agencies" element={<AdminRoute><AdminAgenciesPage /></AdminRoute>} />
      <Route path="/admin/moderation" element={<ModerationRoute><AdminModerationPage /></ModerationRoute>} />
      <Route path="/admin/kyc" element={<AdminRoute><AdminKycPage /></AdminRoute>} />
      <Route path="/admin/fraud" element={<AdminRoute><AdminFraudPage /></AdminRoute>} />
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
      <Route path="/enterprise" element={<EnterpriseRoute><EnterpriseHubPage /></EnterpriseRoute>} />
      <Route path="/enterprise/portfolios" element={<EnterpriseRoute><EnterprisePortfoliosPage /></EnterpriseRoute>} />
      <Route path="/enterprise/esg" element={<EnterpriseRoute><EnterpriseEsgPage /></EnterpriseRoute>} />
      <Route path="/enterprise/forecast" element={<EnterpriseRoute><EnterpriseForecastPage /></EnterpriseRoute>} />
      <Route path="/m/*" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
