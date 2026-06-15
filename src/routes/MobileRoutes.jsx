import { Routes, Route, Navigate } from 'react-router-dom'
import MobileHomePage, { MobileExplorePage, MobileSavedPage } from '../pages/mobile/MobilePages'
import { MobileMessagesPage, MobileProfilePage, MobilePropertyPage } from '../pages/mobile/MobileMessagesProfile'
import LoginPage from '../pages/LoginPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import SignUpPage from '../pages/SignUpPage'
import PaymentSuccessPage from '../pages/PaymentSuccessPage'
import PaymentCancelPage from '../pages/PaymentCancelPage'
import AuthCallbackPage from '../pages/AuthCallbackPage'
import RenterCreditPage from '../pages/renter/RenterCreditPage'
import {
  MobileAgentHomePage,
  MobileAgentLeadsPage,
  MobileAgentCalendarPage,
  MobileAgentTasksPage,
  MobileAgentCoachPage,
} from '../pages/mobile/MobileAgentPages'

import {
  MobileRenterHomePage,
  MobileRenterLeasesPage,
  MobileRenterPaymentsPage,
  MobileRenterUtilitiesPage,
  MobileRenterMaintenancePage,
  MobileRenterSignPage,
} from '../pages/mobile/MobileRenterPages'

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
  MobileConsumerHomePage,
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

export default function MobileRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MobileHomePage />} />
      <Route path="/explore" element={<MobileExplorePage />} />
      <Route path="/saved" element={<MobileSavedPage />} />
      <Route path="/messages" element={<MobileMessagesPage />} />
      <Route path="/messages/:id" element={<MobileMessagesPage />} />
      <Route path="/profile" element={<MobileProfilePage />} />
      <Route path="/property/:id" element={<MobilePropertyPage />} />
      <Route path="/trips" element={<MobileTripsPage />} />
      <Route path="/neighborhoods" element={<MobileNeighborhoodsPage />} />
      <Route path="/neighborhoods/:slug" element={<MobileNeighborhoodDetailPage />} />
      <Route path="/consumer" element={<MobileConsumerHomePage />} />
      <Route path="/consumer/buy" element={<MobileConsumerBuyPage />} />
      <Route path="/consumer/rent" element={<MobileConsumerRentPage />} />
      <Route path="/consumer/stay" element={<MobileConsumerStayPage />} />
      <Route path="/consumer/invest" element={<Navigate to="/investment" replace />} />
      <Route path="/wallet" element={<MobileWalletHomePage />} />
      <Route path="/wallet/transactions" element={<MobileWalletTransactionsPage />} />
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
      <Route path="/renter" element={<Navigate to="/consumer/rent" replace />} />
      <Route path="/agent" element={<MobileAgentHomePage />} />
      <Route path="/agent/leads" element={<MobileAgentLeadsPage />} />
      <Route path="/agent/calendar" element={<MobileAgentCalendarPage />} />
      <Route path="/agent/tasks" element={<MobileAgentTasksPage />} />
      <Route path="/agent/coach" element={<MobileAgentCoachPage />} />
      <Route path="/renter/leases" element={<MobileRenterLeasesPage />} />
      <Route path="/renter/payments" element={<MobileRenterPaymentsPage />} />
      <Route path="/renter/utilities" element={<MobileRenterUtilitiesPage />} />
      <Route path="/renter/credit" element={<RenterCreditPage />} />
      <Route path="/renter/maintenance" element={<MobileRenterMaintenancePage />} />
      <Route path="/renter/sign" element={<MobileRenterSignPage />} />
      <Route path="/smart" element={<MobileSmartHomePage />} />
      <Route path="/smart/alerts" element={<MobileSmartAlertsPage />} />
      <Route path="/agency" element={<MobileAgencyPage />} />
      <Route path="/manage" element={<MobileManagePage />} />
      <Route path="/finance" element={<MobileFinancePage />} />
      <Route path="/intelligence" element={<MobileIntelligencePage />} />
      <Route path="/developer" element={<MobileDeveloperPage />} />
      <Route path="/enterprise" element={<MobileEnterprisePage />} />
      <Route path="/enterprise/organizations" element={<MobileEnterpriseOrgsPage />} />
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
