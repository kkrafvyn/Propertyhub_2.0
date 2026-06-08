import React, { Suspense, lazy, useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { normalizeSupabaseUser } from './lib/auth'
import { getRoleHomePath, PLATFORM_ADMIN_ROLES } from './lib/roles'
import authService from './services/auth-service'

// Components
import ProtectedRoute from './components/ProtectedRoute'

const Login = lazy(() => import('./pages/Login'))
const SignUp = lazy(() => import('./pages/SignUp'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ExploreProperties = lazy(() => import('./pages/ExploreProperties'))
const PropertyDetails = lazy(() => import('./pages/PropertyDetails'))
const Messages = lazy(() => import('./pages/Messages'))
const Profile = lazy(() => import('./pages/Profile'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const Favorites = lazy(() => import('./pages/Favorites'))
const MyListings = lazy(() => import('./pages/MyListings'))
const CreateListing = lazy(() => import('./pages/CreateListing'))
const CompareProperties = lazy(() => import('./pages/CompareProperties'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Support = lazy(() => import('./pages/Support'))
const Bookings = lazy(() => import('./pages/Bookings'))
const Notifications = lazy(() => import('./pages/Notifications'))
const AccountSecurity = lazy(() => import('./pages/AccountSecurity'))
const BookingCalendar = lazy(() => import('./pages/BookingCalendar'))
const Billing = lazy(() => import('./pages/Billing'))
const TransactionCenter = lazy(() => import('./pages/TransactionCenter'))
const OfferRoom = lazy(() => import('./pages/OfferRoom'))
const DocumentVault = lazy(() => import('./pages/DocumentVault'))
const SmartMatchAlerts = lazy(() => import('./pages/SmartMatchAlerts'))
const ListingCoach = lazy(() => import('./pages/ListingCoach'))
const Integrations = lazy(() => import('./pages/Integrations'))
const AIConcierge = lazy(() => import('./pages/AIConcierge'))
const OwnerPortal = lazy(() => import('./pages/OwnerPortal'))
const NeighborhoodIntelligence = lazy(() => import('./pages/NeighborhoodIntelligence'))
const DeveloperLaunchRoom = lazy(() => import('./pages/DeveloperLaunchRoom'))
const InspectionApp = lazy(() => import('./pages/InspectionApp'))
const RevenueOps = lazy(() => import('./pages/RevenueOps'))
const PartnerPortal = lazy(() => import('./pages/PartnerPortal'))
const VerificationPassport = lazy(() => import('./pages/VerificationPassport'))
const PropertyGraph = lazy(() => import('./pages/PropertyGraph'))
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'))
const PropertyPortfolio = lazy(() => import('./pages/PropertyPortfolio'))
const AgentProfileShowcase = lazy(() => import('./pages/AgentProfileShowcase'))
const EcosystemHub = lazy(() => import('./pages/ecosystem/EcosystemHub'))
const EcosystemCategory = lazy(() => import('./pages/ecosystem/EcosystemCategory'))
const GlobalReadiness = lazy(() => import('./pages/global/GlobalReadiness'))
const GlobalReadinessDetail = lazy(() => import('./pages/global/GlobalReadinessDetail'))
const InfrastructureHub = lazy(() => import('./pages/infrastructure/InfrastructureHub'))
const InfrastructureDetail = lazy(() => import('./pages/infrastructure/InfrastructureDetail'))
const MvpPhaseHub = lazy(() => import('./pages/mvp/MvpPhaseHub'))
const MvpPhaseDetail = lazy(() => import('./pages/mvp/MvpPhaseDetail'))
const MobileDashboard = lazy(() => import('./pages/mobile/MobileDashboard'))
const MobileExplore = lazy(() => import('./pages/mobile/MobileExplore'))
const MobilePropertyDetails = lazy(() => import('./pages/mobile/MobilePropertyDetails'))
const MobileMessages = lazy(() => import('./pages/mobile/MobileMessages'))
const MobileAgentApp = lazy(() => import('./pages/mobile/MobileAgentApp'))
const AgencyOnboarding = lazy(() => import('./pages/agency/AgencyOnboarding'))
const AgencyProfile = lazy(() => import('./pages/agency/AgencyProfile'))
const AgencyDashboard = lazy(() => import('./pages/agency/AgencyDashboard'))
const AgencyOverview = lazy(() => import('./pages/agency/AgencyOverview'))
const TeamManagement = lazy(() => import('./pages/agency/TeamManagement'))
const PropertyManagement = lazy(() => import('./pages/agency/PropertyManagement'))
const LeadManagement = lazy(() => import('./pages/agency/LeadManagement'))
const Analytics = lazy(() => import('./pages/agency/Analytics'))
const AgencyTrustScore = lazy(() => import('./pages/agency/AgencyTrustScore'))
const DevicesDashboard = lazy(() => import('./pages/smart-property/DevicesDashboard'))
const AddDevice = lazy(() => import('./pages/smart-property/AddDevice'))
const DeviceDetails = lazy(() => import('./pages/smart-property/DeviceDetails'))
const Automation = lazy(() => import('./pages/smart-property/Automation'))
const Alerts = lazy(() => import('./pages/smart-property/Alerts'))
const EventLogs = lazy(() => import('./pages/smart-property/EventLogs'))
const AgencyVerification = lazy(() => import('./pages/admin/AgencyVerification'))
const TrustDashboard = lazy(() => import('./pages/admin/TrustDashboard'))
const AuditLog = lazy(() => import('./pages/admin/AuditLog'))
const ModerationQueue = lazy(() => import('./pages/admin/ModerationQueue'))

function AppLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface text-on-surface">
      <div className="text-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-secondary">
          progress_activity
        </span>
        <p className="mt-3 text-sm font-semibold text-on-surface-variant">
          Loading workspace
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('baytmiftah_user')
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const edgeProfile = await authService.getCurrentUser().catch(() => null)
          const normalizedUser = normalizeSupabaseUser(edgeProfile?.user || user)
          setUser(normalizedUser)
          localStorage.setItem('baytmiftah_user', JSON.stringify(normalizedUser))
          window.dispatchEvent(new Event('baytmiftah:user'))
          return
        }

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

        if (normalizedUser) {
          setUser(normalizedUser)
          localStorage.setItem('baytmiftah_user', JSON.stringify(normalizedUser))
          window.dispatchEvent(new Event('baytmiftah:user'))
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          localStorage.removeItem('baytmiftah_user')
          localStorage.removeItem('baytmiftah_token')
          window.dispatchEvent(new Event('baytmiftah:user'))
        } else {
          const storedUser = localStorage.getItem('baytmiftah_user')
          setUser(storedUser ? JSON.parse(storedUser) : null)
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
      <Suspense fallback={<AppLoader />}>
      <Routes>
        {/* ========== PUBLIC ROUTES ========== */}
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/signup" element={<SignUp setUser={setUser} />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ========== CORE FEATURES - PROTECTED ========== */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/properties" element={<Navigate to="/explore" replace />} />
        <Route path="/listings" element={<Navigate to="/my-listings" replace />} />
        <Route path="/agent" element={<Navigate to="/agent/dashboard" replace />} />
        <Route
          path="/"
          element={
            <Dashboard user={user} />
          }
        />
        <Route
          path="/workspace"
          element={<Navigate to={user ? getRoleHomePath(user.role) : '/'} replace />}
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
          path="/compare"
          element={
            <ProtectedRoute user={user}>
              <CompareProperties />
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
          path="/account/security"
          element={
            <ProtectedRoute user={user}>
              <AccountSecurity />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute user={user}>
              <BookingCalendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute user={user}>
              <Billing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute user={user}>
              <TransactionCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/offer-room"
          element={
            <ProtectedRoute user={user}>
              <OfferRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/document-vault"
          element={
            <ProtectedRoute user={user}>
              <DocumentVault />
            </ProtectedRoute>
          }
        />
        <Route
          path="/smart-match"
          element={
            <ProtectedRoute user={user}>
              <SmartMatchAlerts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/listing-coach"
          element={
            <ProtectedRoute user={user}>
              <ListingCoach />
            </ProtectedRoute>
          }
        />
        <Route
          path="/integrations"
          element={
            <ProtectedRoute user={user}>
              <Integrations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/concierge"
          element={
            <ProtectedRoute user={user}>
              <AIConcierge />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner"
          element={
            <ProtectedRoute user={user}>
              <OwnerPortal />
            </ProtectedRoute>
          }
        />
        <Route path="/neighborhoods" element={<NeighborhoodIntelligence />} />
        <Route
          path="/developer-launch"
          element={
            <ProtectedRoute user={user}>
              <DeveloperLaunchRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inspection"
          element={
            <ProtectedRoute user={user}>
              <InspectionApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/revenue-ops"
          element={
            <ProtectedRoute user={user}>
              <RevenueOps />
            </ProtectedRoute>
          }
        />
        <Route
          path="/partners"
          element={
            <ProtectedRoute user={user}>
              <PartnerPortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passport"
          element={
            <ProtectedRoute user={user}>
              <VerificationPassport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/property-graph"
          element={
            <ProtectedRoute user={user}>
              <PropertyGraph />
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
        <Route path="/mobile/agent" element={<MobileAgentApp />} />

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

        <Route
          path="/agency/trust-score"
          element={
            <ProtectedRoute user={user} requiresAgency>
              <AgencyTrustScore />
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

        <Route
          path="/admin/trust"
          element={
            <ProtectedRoute user={user} role={PLATFORM_ADMIN_ROLES}>
              <TrustDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute user={user} role={PLATFORM_ADMIN_ROLES}>
              <AuditLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/moderation"
          element={
            <ProtectedRoute user={user} role={PLATFORM_ADMIN_ROLES}>
              <ModerationQueue />
            </ProtectedRoute>
          }
        />

        {/* ========== CATCH ALL ========== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </Router>
  )
}
