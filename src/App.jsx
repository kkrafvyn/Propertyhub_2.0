import { BrowserRouter, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import DesktopRoutes from './routes/DesktopRoutes'
import MobileRoutes from './routes/MobileRoutes'

function isMobileAppPath(pathname) {
  return pathname === '/m' || pathname.startsWith('/m/')
}

function ResponsiveRoutes() {
  const { pathname } = useLocation()

  // /m routes always use the mobile app (any screen size)
  if (isMobileAppPath(pathname)) {
    return <MobileRoutes />
  }

  return (
    <>
      <div className="hidden lg:contents">
        <DesktopRoutes />
      </div>
      <div className="contents lg:hidden">
        <MobileRoutes />
      </div>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ResponsiveRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
