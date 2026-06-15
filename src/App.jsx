import { useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { ThemeProvider } from './context/ThemeContext'
import { LocaleProvider } from './i18n/LocaleContext'
import LegacyMobileRedirect from './components/LegacyMobileRedirect'
import MarketBootstrap from './components/MarketBootstrap'
import { SplashScreen } from './components/splash'
import DesktopRoutes from './routes/DesktopRoutes'
import MobileRoutes from './routes/MobileRoutes'
import { useIsMobileViewport } from './hooks/useMediaQuery'
import { useCapacitorBackButton } from './hooks/useCapacitorBackButton'
import { isNativeApp } from './lib/platform'

function ResponsiveRoutes() {
  const isMobileViewport = useIsMobileViewport()
  const isMobile = isNativeApp() || isMobileViewport
  useCapacitorBackButton()
  return isMobile ? <MobileRoutes /> : <DesktopRoutes />
}

export default function App() {
  const nativeApp = isNativeApp()
  const [splashDone, setSplashDone] = useState(() => {
    if (!nativeApp) return true
    try {
      return sessionStorage.getItem('baytmiftah.splash.seen') === '1'
    } catch {
      return false
    }
  })

  return (
    <ThemeProvider>
      <LocaleProvider>
        <CurrencyProvider>
          <AuthProvider>
            <BrowserRouter>
              {nativeApp && !splashDone && (
                <SplashScreen
                  native
                  skipIfSeen
                  onComplete={() => setSplashDone(true)}
                />
              )}
              {splashDone && (
                <LegacyMobileRedirect>
                  <MarketBootstrap>
                    <ResponsiveRoutes />
                  </MarketBootstrap>
                </LegacyMobileRedirect>
              )}
            </BrowserRouter>
          </AuthProvider>
        </CurrencyProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}
