import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import DesktopRoutes from './routes/DesktopRoutes'
import MobileRoutes from './routes/MobileRoutes'

function useIsMobileLayout() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 1023px)').matches
}

function ResponsiveRoutes() {
  // Simple CSS-based split: render both route trees, show one via CSS
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
