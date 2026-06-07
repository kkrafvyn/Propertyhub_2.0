import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { normalizeSupabaseUser } from './lib/auth'
import { PLATFORM_ADMIN_ROLES } from './lib/roles'
import authService from './services/auth-service'

// Pages - Existing
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import ExploreProperties from './pages/ExploreProperties'
import PropertyDetails from './pages/PropertyDetails'
import Messages from './pages/Messages'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import Favorites from './pages/Favorites'
import MyListings from './pages/MyListings'
import CreateListing from './pages/CreateListing'
import NotFound from './pages/NotFound'
import Support from './pages/Support'
import Bookings from './pages/Bookings'
import Notifications from './pages/Notifications'
import AgentDashboard from './pages/AgentDashboard'
import PropertyPortfolio from './pages/PropertyPortfolio'
import AgentProfileShowcase from './pages/AgentProfileShowcase'
import EcosystemHub from './pages/ecosystem/EcosystemHub'
import EcosystemCategory from './pages/ecosystem/EcosystemCategory'
import GlobalReadiness from './pages/global/GlobalReadiness'
import GlobalReadinessDetail from './pages/global/GlobalReadinessDetail'
import InfrastructureHub from './pages/infrastructure/InfrastructureHub'
import InfrastructureDetail from './pages/infrastructure/InfrastructureDetail'
import MvpPhaseHub from './pages/mvp/MvpPhaseHub'
import MvpPhaseDetail from './pages/mvp/MvpPhaseDetail'
import MobileDashboard from './pages/mobile/MobileDashboard'
import MobileExplore from './pages/mobile/MobileExplore'
import MobilePropertyDetails from './pages/mobile/MobilePropertyDetails'
import MobileMessages from './pages/mobile/MobileMessages'

// Pages - Agency Module (NEW)
import AgencyOnboarding from './pages/agency/AgencyOnboarding'
import AgencyProfile from './pages/agency/AgencyProfile'
import AgencyDashboard from './pages/agency/AgencyDashboard'
import AgencyOverview from './pages/agency/AgencyOverview'
import TeamManagement from './pages/agency/TeamManagement'
import PropertyManagement from './pages/agency/PropertyManagement'
import LeadManagement from './pages/agency/LeadManagement'
import Analytics from './pages/agency/Analytics'

// Pages - IoT/Smart Property Module (NEW)
import DevicesDashboard from './pages/smart-property/DevicesDashboard'
import AddDevice from './pages/smart-property/AddDevice'
import DeviceDetails from './pages/smart-property/DeviceDetails'
import Automation from './pages/smart-property/Automation'
import Alerts from './pages/smart-property/Alerts'
import EventLogs from './pages/smart-property/EventLogs'

// Pages - Admin (NEW)
import AgencyVerification from './pages/admin/AgencyVerification'

// Components
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const edgeProfile = await authService.getCurrentUser().catch(() => null)
          const normalizedUser = normalizeSupabaseUser(edgeProfile?.user || user)
          setUser(normalizedUser)
          localStorage.setItem('baytmiftah_user', JSON.stringify(normalizedUser))
          return
        }

        const storedUser = localStorage.getItem('baytmiftah_user')
        setUser(storedUser ? JSON.parse(storedUser) : null)
      } catch (error) {
        const storedUser = localStorage.getItem('baytmiftah_user')
        setUser(storedUser ? JSON.parse(storedUser) : null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const normalizedUser = normalizeSupabaseUser(session?.user)
        setUser(normalizedUser)

        if (normalizedUser) {
          localStorage.setItem('baytmiftah_user', JSON.stringify(normalizedUser))
        } else {
          localStorage.removeItem('baytmiftah_user')
          localStorage.removeItem('baytmiftah_token')
        }
      }
    )

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="animate-spin">
          <span className="material-symbols-outlined text-4xl text-secondary">
            settings
          </span>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* ========== PUBLIC ROUTES ========== */}
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/signup" element={<SignUp setUser={setUser} />} />

        {/* ========== CORE FEATURES - PROTECTED ========== */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/properties" element={<Navigate to="/explore" replace />} />
        <Route path="/listings" element={<Navigate to="/my-listings" replace />} />
        <Route path="/agent" element={<Navigate to="/agent/dashboard" replace />} />
        <Route
          path="/"
          element={
            <ProtectedRoute user={user}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/explore"
          element={<ExploreProperties />}
        />
        <Route
          path="/property/:id"
          element={<PropertyDetails />}
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute user={user}>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user}>
              <Profile user={user} setUser={setUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute user={user}>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <ProtectedRoute user={user}>
              <Bookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent/dashboard"
          element={
            <ProtectedRoute user={user}>
              <AgentDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/agent/marcus-thorne" element={<AgentProfileShowcase />} />
        <Route
          path="/portfolio"
          element={
            <ProtectedRoute user={user}>
              <PropertyPortfolio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent/portfolio"
          element={<Navigate to="/portfolio" replace />}
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute user={user}>
              <Support />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute user={user}>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-listings"
          element={
            <ProtectedRoute user={user}>
              <MyListings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-listing"
          element={
            <ProtectedRoute user={user}>
              <CreateListing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ecosystem"
          element={
            <ProtectedRoute user={user}>
              <EcosystemHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ecosystem/:categoryId"
          element={
            <ProtectedRoute user={user}>
              <EcosystemCategory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/global"
          element={
            <ProtectedRoute user={user}>
              <GlobalReadiness />
            </ProtectedRoute>
          }
        />
        <Route
          path="/global/:moduleId"
          element={
            <ProtectedRoute user={user}>
              <GlobalReadinessDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/infrastructure"
          element={
            <ProtectedRoute user={user}>
              <InfrastructureHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/infrastructure/:moduleId"
          element={
            <ProtectedRoute user={user}>
              <InfrastructureDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mvp"
          element={
            <ProtectedRoute user={user}>
              <MvpPhaseHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mvp/:moduleId"
          element={
            <ProtectedRoute user={user}>
              <MvpPhaseDetail />
            </ProtectedRoute>
          }
        />

        {/* ========== MOBILE REFERENCE SCREENS ========== */}
        <Route path="/mobile/dashboard" element={<MobileDashboard />} />
        <Route path="/mobile/explore" element={<MobileExplore />} />
        <Route path="/mobile/property" element={<MobilePropertyDetails />} />
        <Route path="/mobile/messages" element={<MobileMessages />} />

        {/* ========== AGENCY MODULE ROUTES ========== */}

        <Route path="/agency" element={<Navigate to="/agency/dashboard" replace />} />

        {/* Agency Onboarding */}
        <Route
          path="/agency/onboarding"
          element={
            <ProtectedRoute user={user}>
              <AgencyOnboarding />
            </ProtectedRoute>
          }
        />

        {/* Agency Dashboard & Management */}
        <Route
          path="/agency/dashboard"
          element={
            <ProtectedRoute user={user} requiresAgency>
              <AgencyDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/agency/overview"
          element={
            <ProtectedRoute user={user} requiresAgency>
              <AgencyOverview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/agency/team"
          element={
            <ProtectedRoute user={user} requiresAgency>
              <TeamManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/agency/properties"
          element={
            <ProtectedRoute user={user} requiresAgency>
              <PropertyManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/agency/leads"
          element={
            <ProtectedRoute user={user} requiresAgency>
              <LeadManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/agency/analytics"
          element={
            <ProtectedRoute user={user} requiresAgency>
              <Analytics />
            </ProtectedRoute>
          }
        />

        {/* Agency Public Profile */}
        <Route path="/agency/:agencyId" element={<AgencyProfile />} />

        {/* ========== IOT / SMART PROPERTY ROUTES ========== */}

        <Route
          path="/smart-property"
          element={<Navigate to="/smart-property/devices" replace />}
        />

        <Route
          path="/smart-property/devices"
          element={
            <ProtectedRoute user={user}>
              <DevicesDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/smart-property/add-device"
          element={
            <ProtectedRoute user={user}>
              <AddDevice />
            </ProtectedRoute>
          }
        />

        <Route
          path="/smart-property/devices/:deviceId"
          element={
            <ProtectedRoute user={user}>
              <DeviceDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/smart-property/device/:deviceId"
          element={
            <ProtectedRoute user={user}>
              <DeviceDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/smart-property/automation"
          element={
            <ProtectedRoute user={user}>
              <Automation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/smart-property/alerts"
          element={
            <ProtectedRoute user={user}>
              <Alerts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/smart-property/logs"
          element={
            <ProtectedRoute user={user}>
              <EventLogs />
            </ProtectedRoute>
          }
        />

        {/* ========== ADMIN ROUTES ========== */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute user={user} role={PLATFORM_ADMIN_ROLES}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/agencies"
          element={
            <ProtectedRoute user={user} role={PLATFORM_ADMIN_ROLES}>
              <AgencyVerification />
            </ProtectedRoute>
          }
        />

        {/* ========== CATCH ALL ========== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}
