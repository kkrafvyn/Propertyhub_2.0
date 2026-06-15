import { Routes, Route, Navigate } from 'react-router-dom'
import RoleProtectedRoute from '../components/RoleProtectedRoute'
import ConsumerGuard from '../components/ConsumerGuard'
import MobileHomePage, { MobileExplorePage, MobileSavedPage } from '../pages/mobile/MobilePages'
import { MobileMessagesPage, MobileProfilePage, MobilePropertyPage } from '../pages/mobile/MobileMessagesProfile'
import LoginPage from '../pages/LoginPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import SignUpPage from '../pages/SignUpPage'
import PaymentSuccessPage from '../pages/PaymentSuccessPage'
import PaymentCancelPage from '../pages/PaymentCancelPage'
import AuthCallbackPage from '../pages/AuthCallbackPage'
import DocumentVaultPage from '../pages/DocumentVaultPage'
import ComparePage from '../pages/ComparePage'
import {
  MobileRenterLeasesPage,
  MobileRenterPaymentsPage,
  MobileRenterUtilitiesPage,
  MobileRenterMaintenancePage,
  MobileRenterSignPage,
  MobileRenterCreditPage,
} from '../pages/mobile/MobileRenterPages'

import {
  MobileAgentHomePage,
  MobileAgentLeadsPage,
  MobileAgentCalendarPage,
  MobileAgentTasksPage,
  MobileAgentCoachPage,
} from '../pages/mobile/MobileAgentPages'

import {
  MobileSmartHomePage,
  MobileSmartAlertsPage,
} from '../pages/mobile/MobileSmartPages'

import MobileTripsPage from '../pages/mobile/MobileTripsPage'
import { MobileNeighborhoodsPage, MobileNeighborhoodDetailPage } from '../pages/mobile/MobileNeighborhoodPages'
import MobileHostListingPage from '../pages/mobile/MobileHostListingPage'
import {
  MobileAgencyPage,
  MobileManagePage,
  MobileFinancePage,
  MobileIntelligencePage,
  MobileDeveloperPage,
  MobileEnterprisePage,
} from '../pages/mobile/MobileWorkspacePages'

import {
  MobileConsumerBuyPage,
  MobileConsumerRentPage,
  MobileConsumerStayPage,
  MobileWalletHomePage,
  MobileWalletTransactionsPage,
  MobileHostHomePage,
  MobileHostReservationsPage,
  MobileInvestmentHomePage,
  MobileTenantHomePage,
  MobileResidentHomePage,
  MobileEnterpriseOrgsPage,
} from '../pages/mobile/MobileOsPages'

import AIAdvisorPage from '../pages/buyer/AIAdvisorPage'
import TransactionCenterPage from '../pages/buyer/TransactionCenterPage'
import OfferRoomPage from '../pages/buyer/OfferRoomPage'
import HostListingsPage from '../pages/HostListingsPage'
import HelpCentrePage from '../pages/HelpCentrePage'

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

export default function MobileRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MobileHomePage />} />
      <Route path="/explore" element={<MobileExplorePage />} />
      <Route path="/saved" element={<MobileSavedPage />} />
      <Route path="/favorites" element={<Navigate to="/saved" replace />} />
      <Route path="/messages" element={<MobileMessagesPage />} />
      <Route path="/messages/:id" element={<MobileMessagesPage />} />
      <Route path="/profile" element={<MobileProfilePage />} />
      <Route path="/settings" element={<Navigate to="/profile" replace />} />
      <Route path="/security" element={<Navigate to="/profile" replace />} />
      <Route path="/property/:id" element={<MobilePropertyPage />} />
      <Route path="/trips" element={<MobileTripsPage />} />
      <Route path="/bookings" element={<Navigate to="/trips" replace />} />
      <Route path="/booking" element={<Navigate to="/trips" replace />} />
      <Route path="/neighborhoods" element={<MobileNeighborhoodsPage />} />
      <Route path="/neighborhoods/:slug" element={<MobileNeighborhoodDetailPage />} />
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
      <Route path="/wallet/payouts" element={<Navigate to="/wallet" replace />} />
      <Route path="/wallet/escrow" element={<Navigate to="/wallet" replace />} />
      <Route path="/investment" element={<MobileInvestmentHomePage />} />
      <Route path="/investment/roi" element={<Navigate to="/investment" replace />} />
      <Route path="/tenant" element={<MobileTenantHomePage />} />
      <Route path="/tenant/visitors" element={<MobileTenantHomePage />} />
      <Route path="/resident" element={<MobileResidentHomePage />} />
      <Route path="/host" element={<MobileHostHomePage />} />
      <Route path="/host/list" element={<MobileHostListingPage />} />
      <Route path="/host/listings" element={<HostListingsPage />} />
      <Route path="/host/reservations" element={<MobileHostReservationsPage />} />
      <Route path="/host/calendar" element={<Navigate to="/host" replace />} />
      <Route path="/host/payouts" element={<Navigate to="/wallet/payouts" replace />} />
      <Route path="/buyer" element={<Navigate to="/consumer/buy" replace />} />
      <Route path="/buyer/advisor" element={<AIAdvisorPage />} />
      <Route path="/transactions" element={<TransactionCenterPage />} />
      <Route path="/offers" element={<OfferRoomPage />} />
      <Route path="/offer-room" element={<Navigate to="/offers" replace />} />
      <Route path="/renter" element={<Navigate to="/consumer/rent" replace />} />
      <Route path="/agent" element={<AgentRoute><MobileAgentHomePage /></AgentRoute>} />
      <Route path="/agent/leads" element={<AgentRoute><MobileAgentLeadsPage /></AgentRoute>} />
      <Route path="/agent/calendar" element={<AgentRoute><MobileAgentCalendarPage /></AgentRoute>} />
      <Route path="/agent/tasks" element={<AgentRoute><MobileAgentTasksPage /></AgentRoute>} />
      <Route path="/agent/coach" element={<AgentRoute><MobileAgentCoachPage /></AgentRoute>} />
      <Route path="/renter/leases" element={<MobileRenterLeasesPage />} />
      <Route path="/renter/payments" element={<MobileRenterPaymentsPage />} />
      <Route path="/renter/utilities" element={<MobileRenterUtilitiesPage />} />
      <Route path="/renter/credit" element={<MobileRenterCreditPage />} />
      <Route path="/renter/maintenance" element={<MobileRenterMaintenancePage />} />
      <Route path="/renter/sign" element={<MobileRenterSignPage />} />
      <Route path="/smart" element={<ProSmartRoute><MobileSmartHomePage /></ProSmartRoute>} />
      <Route path="/smart/alerts" element={<ProSmartRoute><MobileSmartAlertsPage /></ProSmartRoute>} />
      <Route path="/agency" element={<AgencyRoute><MobileAgencyPage /></AgencyRoute>} />
      <Route path="/manage" element={<ManageRoute><MobileManagePage /></ManageRoute>} />
      <Route path="/finance" element={<MobileFinancePage />} />
      <Route path="/mortgages" element={<Navigate to="/finance" replace />} />
      <Route path="/insurance" element={<Navigate to="/finance" replace />} />
      <Route path="/intelligence" element={<MobileIntelligencePage />} />
      <Route path="/developer" element={<DeveloperRoute><MobileDeveloperPage /></DeveloperRoute>} />
      <Route path="/enterprise" element={<EnterpriseRoute><MobileEnterprisePage /></EnterpriseRoute>} />
      <Route path="/enterprise/organizations" element={<EnterpriseRoute><MobileEnterpriseOrgsPage /></EnterpriseRoute>} />
      <Route path="/help" element={<HelpCentrePage />} />
      <Route path="/payments/success" element={<PaymentSuccessPage />} />
      <Route path="/payments/cancel" element={<PaymentCancelPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
