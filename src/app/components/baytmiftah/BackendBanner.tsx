import { useEffect, useState } from "react";
import { probeBackendConnection, type BackendStatus } from "../../../lib/backend-probe";

export function BackendBanner() {
  const [status, setStatus] = useState<BackendStatus | null>(null);

  useEffect(() => {
    probeBackendConnection().then(setStatus);
  }, []);

  if (!status || status.mode === "live") return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      {status.mode === "offline" && (
        <p>
          <strong>Offline mode.</strong> Add <code className="text-xs">VITE_SUPABASE_URL</code> and{" "}
          <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to your environment, then redeploy.
        </p>
      )}
      {status.mode === "empty" && (
        <p>
          <strong>Database connected.</strong> No public listings yet — publish listings from workspace.
        </p>
      )}
      {status.mode === "error" && (
        <p>
          <strong>Backend error:</strong> {status.message}
        </p>
      )}
    </div>
  );
}
