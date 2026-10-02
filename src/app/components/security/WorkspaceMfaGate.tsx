import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { PageLoadingSkeleton } from "../ux";
import { hasMfaAssurance, workspaceRoleRequiresMfa } from "../../../lib/security/mfa";

export function WorkspaceMfaGate({
  role,
  permissions,
  children,
}: {
  role?: string | null;
  permissions?: string[] | null;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!workspaceRoleRequiresMfa(role, permissions)) {
        if (!cancelled) {
          setAllowed(true);
          setReady(true);
        }
        return;
      }

      const ok = await hasMfaAssurance();
      if (!cancelled) {
        setAllowed(ok);
        setReady(true);
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [role, permissions]);

  if (!ready) {
    return <PageLoadingSkeleton />;
  }

  if (!allowed) {
    return (
      <Navigate
        to="/app/security?mfa=workspace-required"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <>{children}</>;
}
