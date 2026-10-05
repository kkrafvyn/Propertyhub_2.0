import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { PlatformFeaturesProvider } from './context/PlatformFeaturesContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { MarketProvider } from './context/MarketContext';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider } from './i18n/LocaleContext';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AppUpdateBanner } from './components/ux/AppUpdateBanner';
import { validateClientEnv } from '../lib/env';

validateClientEnv();

export default function App() {
  return (
    <AppErrorBoundary>
      <LocaleProvider>
        <ThemeProvider>
          <CurrencyProvider>
            <AuthProvider>
              <PlatformFeaturesProvider>
              <MarketProvider>
                <RouterProvider router={router} />
                <AppUpdateBanner />
                <Toaster richColors closeButton position="top-right" visibleToasts={4} />
              </MarketProvider>
              </PlatformFeaturesProvider>
            </AuthProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </LocaleProvider>
    </AppErrorBoundary>
  );
}
