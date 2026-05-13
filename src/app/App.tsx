import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { Web3Provider } from './context/Web3Context';

export default function App() {
  return (
    <Web3Provider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </Web3Provider>
  );
}
