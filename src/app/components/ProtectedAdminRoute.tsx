import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { adminService } from "../../lib/admin.service";

export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [checkingAdmin, setCheckingAdmin] = useState(() => !profile?.is_platform_admin);
  const [isAdmin, setIsAdmin] = useState(() => Boolean(profile?.is_platform_admin));

  useEffect(() => {
    if (profile?.is_platform_admin) {
      setIsAdmin(true);
      setCheckingAdmin(false);
      return;
    }

    let cancelled = false;

    const checkAdmin = async () => {
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setCheckingAdmin(false);
        }
        return;
      }

      try {
        const allowed = await adminService.isPlatformAdmin(user.id);
        if (!cancelled) {
          setIsAdmin(allowed);
        }
      } catch (error) {
        console.error("Failed to verify platform admin access:", error);
        if (!cancelled) {
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) {
          setCheckingAdmin(false);
        }
      }
    };

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [user, profile?.is_platform_admin]);

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
