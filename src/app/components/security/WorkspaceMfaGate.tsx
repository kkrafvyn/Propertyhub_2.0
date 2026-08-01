import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { hasMfaAssurance, workspaceRoleRequiresMfa } from "../../../lib/security/mfa";

export function WorkspaceMfaGate({
  role,
  children,
}: {
  role?: string | null;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!workspaceRoleRequiresMfa(role)) {
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
  }, [role]);

  if (!ready) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/app/security?mfa=workspace-required" replace />;
  }

  return <>{children}</>;
}
