import { Routes, Route, Navigate } from 'react-router-dom'
import MobileHomePage, { MobileExplorePage, MobileSavedPage } from '../pages/mobile/MobilePages'
import { MobileMessagesPage, MobileProfilePage, MobilePropertyPage } from '../pages/mobile/MobileMessagesProfile'
import LoginPage from '../pages/LoginPage'
import SignUpPage from '../pages/SignUpPage'
import PaymentSuccessPage from '../pages/PaymentSuccessPage'
import PaymentCancelPage from '../pages/PaymentCancelPage'
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
      <Route path="/m" element={<MobileHomePage />} />
      <Route path="/m/explore" element={<MobileExplorePage />} />
      <Route path="/m/saved" element={<MobileSavedPage />} />
      <Route path="/m/messages" element={<MobileMessagesPage />} />
      <Route path="/m/messages/:id" element={<MobileMessagesPage />} />
      <Route path="/m/profile" element={<MobileProfilePage />} />
      <Route path="/m/property/:id" element={<MobilePropertyPage />} />
      <Route path="/m/agent" element={<MobileAgentHomePage />} />
      <Route path="/m/agent/leads" element={<MobileAgentLeadsPage />} />
      <Route path="/m/agent/calendar" element={<MobileAgentCalendarPage />} />
      <Route path="/m/agent/tasks" element={<MobileAgentTasksPage />} />
      <Route path="/m/agent/coach" element={<MobileAgentCoachPage />} />
      <Route path="/m/renter" element={<MobileRenterHomePage />} />
      <Route path="/m/renter/leases" element={<MobileRenterLeasesPage />} />
      <Route path="/m/renter/payments" element={<MobileRenterPaymentsPage />} />
      <Route path="/m/renter/maintenance" element={<MobileRenterMaintenancePage />} />
      <Route path="/m/renter/sign" element={<MobileRenterSignPage />} />
      <Route path="/m/smart" element={<MobileSmartHomePage />} />
      <Route path="/m/smart/alerts" element={<MobileSmartAlertsPage />} />
      <Route path="/m/agency" element={<MobileAgencyPage />} />
      <Route path="/m/manage" element={<MobileManagePage />} />
      <Route path="/m/finance" element={<MobileFinancePage />} />
      <Route path="/m/intelligence" element={<MobileIntelligencePage />} />
      <Route path="/m/developer" element={<MobileDeveloperPage />} />
      <Route path="/m/enterprise" element={<MobileEnterprisePage />} />
      <Route path="/payments/success" element={<PaymentSuccessPage />} />
      <Route path="/payments/cancel" element={<PaymentCancelPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="*" element={<Navigate to="/m" replace />} />
    </Routes>
  )
}
