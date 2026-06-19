import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import RouteErrorBoundary from './components/RouteErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { ThemeProvider } from './context/ThemeContext'
import { LocaleProvider } from './i18n/LocaleContext'
import LegacyMobileRedirect from './components/LegacyMobileRedirect'
import MarketBootstrap from './components/MarketBootstrap'
import { SplashScreen } from './components/splash'
import { useIsMobileViewport } from './hooks/useMediaQuery'
import { useCapacitorBackButton } from './hooks/useCapacitorBackButton'
import { isNativeApp, shouldShowLaunchSplash, isStandalonePwa } from './lib/platform'

const MobileRoutes = lazy(() => import('./routes/MobileRoutes'))
const DesktopRoutes = lazy(() => import('./routes/DesktopRoutes'))

function RouteTreeFallback() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-bolt-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
    </div>
  )
}

function ResponsiveRoutes() {
  const isMobileViewport = useIsMobileViewport()
  const isMobile = isNativeApp() || isMobileViewport
  useCapacitorBackButton()
  return (
    <Suspense fallback={<RouteTreeFallback />}>
      {isMobile ? <MobileRoutes /> : <DesktopRoutes />}
    </Suspense>
  )
}

function AppRoutes() {
  const location = useLocation()

  return (
    <LegacyMobileRedirect>
      <MarketBootstrap>
        <RouteErrorBoundary resetKey={location.pathname}>
          <ResponsiveRoutes />
        </RouteErrorBoundary>
      </MarketBootstrap>
    </LegacyMobileRedirect>
  )
}

export default function App() {
  const launchSplash = shouldShowLaunchSplash()
  const [splashDone, setSplashDone] = useState(() => {
    if (!launchSplash) return true
    try {
      return sessionStorage.getItem('baytmiftah.splash.seen') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (!launchSplash || splashDone) return undefined
    const timer = window.setTimeout(() => setSplashDone(true), 6500)
    return () => window.clearTimeout(timer)
  }, [launchSplash, splashDone])

  return (
    <ThemeProvider>
      <LocaleProvider>
        <CurrencyProvider>
          <AuthProvider>
            <BrowserRouter>
              {launchSplash && !splashDone && (
                <SplashScreen
                  native={isNativeApp() || isStandalonePwa()}
                  skipIfSeen
                  onComplete={() => setSplashDone(true)}
                />
              )}
              {splashDone && <AppRoutes />}
            </BrowserRouter>
          </AuthProvider>
        </CurrencyProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}
