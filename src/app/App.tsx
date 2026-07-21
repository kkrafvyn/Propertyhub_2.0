import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
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
              <RouterProvider router={router} />
              <Toaster richColors position="top-right" />
            </AuthProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </LocaleProvider>
    </AppErrorBoundary>
  );
}
