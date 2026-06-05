import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'

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

// Pages - Agency Module (NEW)
import AgencyOnboarding from './pages/agency/AgencyOnboarding'
import AgencyProfile from './pages/agency/AgencyProfile'
import AgencyDashboard from './pages/agency/AgencyDashboard'
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
import AgencyNav from './components/Navigation/AgencyNav'
import SmartPropertyNav from './components/Navigation/SmartPropertyNav'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    checkAuth()

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null)
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
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* ========== CORE FEATURES - PROTECTED ========== */}
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
          element={
            <ProtectedRoute user={user}>
              <ExploreProperties />
            </ProtectedRoute>
          }
        />
        <Route
          path="/property/:id"
          element={
            <ProtectedRoute user={user}>
              <PropertyDetails />
            </ProtectedRoute>
          }
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

        {/* ========== AGENCY MODULE ROUTES ========== */}

        {/* Agency Onboarding */}
        <Route
          path="/agency/onboarding"
          element={
            <ProtectedRoute user={user}>
              <AgencyOnboarding />
            </ProtectedRoute>
          }
        />

        {/* Agency Public Profile */}
        <Route path="/agency/:agencyId" element={<AgencyProfile />} />

        {/* Agency Dashboard & Management */}
        <Route
          path="/agency/dashboard"
          element={
            <ProtectedRoute user={user} requiresAgency>
              <div className="flex">
                <AgencyNav />
                <main className="flex-1">
                  <AgencyDashboard />
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/agency/team"
          element={
            <ProtectedRoute user={user} requiresAgency>
              <div className="flex">
                <AgencyNav />
                <main className="flex-1 p-8">
                  <TeamManagement />
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/agency/properties"
          element={
            <ProtectedRoute user={user} requiresAgency>
              <div className="flex">
                <AgencyNav />
                <main className="flex-1 p-8">
                  <PropertyManagement />
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/agency/leads"
          element={
            <ProtectedRoute user={user} requiresAgency>
              <div className="flex">
                <AgencyNav />
                <main className="flex-1 p-8">
                  <LeadManagement />
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/agency/analytics"
          element={
            <ProtectedRoute user={user} requiresAgency>
              <div className="flex">
                <AgencyNav />
                <main className="flex-1 p-8">
                  <Analytics />
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        {/* ========== IOT / SMART PROPERTY ROUTES ========== */}

        <Route
          path="/smart-property/devices"
          element={
            <ProtectedRoute user={user}>
              <div className="flex">
                <SmartPropertyNav />
                <main className="flex-1 p-8">
                  <DevicesDashboard />
                </main>
              </div>
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
          path="/smart-property/device/:deviceId"
          element={
            <ProtectedRoute user={user}>
              <div className="flex">
                <SmartPropertyNav />
                <main className="flex-1 p-8">
                  <DeviceDetails />
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/smart-property/automation"
          element={
            <ProtectedRoute user={user}>
              <div className="flex">
                <SmartPropertyNav />
                <main className="flex-1 p-8">
                  <Automation />
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/smart-property/alerts"
          element={
            <ProtectedRoute user={user}>
              <div className="flex">
                <SmartPropertyNav />
                <main className="flex-1 p-8">
                  <Alerts />
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/smart-property/logs"
          element={
            <ProtectedRoute user={user}>
              <div className="flex">
                <SmartPropertyNav />
                <main className="flex-1 p-8">
                  <EventLogs />
                </main>
              </div>
            </ProtectedRoute>
          }
        />

        {/* ========== ADMIN ROUTES ========== */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute user={user} role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/agencies"
          element={
            <ProtectedRoute user={user} role="admin">
              <AgencyVerification />
            </ProtectedRoute>
          }
        />

        {/* ========== CATCH ALL ========== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
