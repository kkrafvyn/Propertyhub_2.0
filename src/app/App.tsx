import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { MarketProvider } from './context/MarketContext';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider } from './i18n/LocaleContext';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { validateClientEnv } from '../lib/env';

validateClientEnv();

export default function App() {
  return (
    <AppErrorBoundary>
      <LocaleProvider>
        <ThemeProvider>
          <CurrencyProvider>
            <AuthProvider>
              <MarketProvider>
                <RouterProvider router={router} />
                <Toaster richColors position="top-right" />
              </MarketProvider>
            </AuthProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </LocaleProvider>
    </AppErrorBoundary>
  );
}
