import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { ThemeProvider } from './context/ThemeContext'
import { LocaleProvider } from './i18n/LocaleContext'
import LegacyMobileRedirect from './components/LegacyMobileRedirect'
import DesktopRoutes from './routes/DesktopRoutes'
import MobileRoutes from './routes/MobileRoutes'
import { useIsMobileViewport } from './hooks/useMediaQuery'

function ResponsiveRoutes() {
  const isMobile = useIsMobileViewport()
  return isMobile ? <MobileRoutes /> : <DesktopRoutes />
}

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <CurrencyProvider>
          <AuthProvider>
            <BrowserRouter>
              <LegacyMobileRedirect>
                <ResponsiveRoutes />
              </LegacyMobileRedirect>
            </BrowserRouter>
          </AuthProvider>
        </CurrencyProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}
