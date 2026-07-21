import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { validateClientEnv } from '../lib/env';

validateClientEnv();

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
