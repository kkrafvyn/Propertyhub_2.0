import { Navigate, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { adminService } from "../../lib/admin.service";
import { isEmailVerified, isUserBanned } from "../../lib/security/password-policy";
import { supabase } from "../../lib/supabase";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireVerifiedEmail?: boolean;
};

export function ProtectedRoute({
  children,
  requireVerifiedEmail = false,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (isUserBanned(profile)) {
    return <Navigate to="/login" replace state={{ banned: true }} />;
  }

  if (requireVerifiedEmail && !isEmailVerified(user)) {
    return <Navigate to="/verify-email" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <>{children}</>;
}

export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mfaReady, setMfaReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setCheckingAdmin(false);
        }
        return;
      }

      if (isUserBanned(profile)) {
        if (!cancelled) {
          setIsAdmin(false);
          setCheckingAdmin(false);
        }
        return;
      }

      try {
        const allowed =
          Boolean(profile?.is_platform_admin) || (await adminService.isPlatformAdmin(user.id));

        if (!allowed) {
          if (!cancelled) {
            setIsAdmin(false);
            setCheckingAdmin(false);
          }
          return;
        }

        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        const needsMfa = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";

        if (!cancelled) {
          setIsAdmin(true);
          setMfaReady(!needsMfa);
          setCheckingAdmin(false);
        }
      } catch (error) {
        console.error("Failed to verify platform admin access:", error);
        if (!cancelled) {
          setIsAdmin(false);
          setCheckingAdmin(false);
        }
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [user, profile]);

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

  if (!mfaReady) {
    return <Navigate to="/app/security?mfa=required" replace />;
  }

  return <>{children}</>;
}
