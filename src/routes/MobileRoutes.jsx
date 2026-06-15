import { Routes, Route, Navigate } from 'react-router-dom'
import MobileHomePage, { MobileExplorePage, MobileSavedPage } from '../pages/mobile/MobilePages'
import { MobileMessagesPage, MobileProfilePage, MobilePropertyPage } from '../pages/mobile/MobileMessagesProfile'
import LoginPage from '../pages/LoginPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import SignUpPage from '../pages/SignUpPage'
import PaymentSuccessPage from '../pages/PaymentSuccessPage'
import PaymentCancelPage from '../pages/PaymentCancelPage'
import AuthCallbackPage from '../pages/AuthCallbackPage'
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
      <Route path="/host/list" element={<MobileHostListingPage />} />
      <Route path="/agent" element={<MobileAgentHomePage />} />
      <Route path="/agent/leads" element={<MobileAgentLeadsPage />} />
      <Route path="/agent/calendar" element={<MobileAgentCalendarPage />} />
      <Route path="/agent/tasks" element={<MobileAgentTasksPage />} />
      <Route path="/agent/coach" element={<MobileAgentCoachPage />} />
      <Route path="/renter" element={<MobileRenterHomePage />} />
      <Route path="/renter/leases" element={<MobileRenterLeasesPage />} />
      <Route path="/renter/payments" element={<MobileRenterPaymentsPage />} />
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
