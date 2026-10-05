import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminSectionGate } from "./AdminSectionGate";
import { Card } from "../../components/ui/Card";
import { listPlatformAiActions } from "../../../lib/platform-admin-dashboard.service";

export function AdminPlatformAi() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listPlatformAiActions>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void listPlatformAiActions(100)
      .then(setRows)
      .catch((err) => setError(err.message || "Unable to load AI action logs"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminSectionGate section="ai" label="Platform AI">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Platform AI governance</h1>
          <p className="text-muted-foreground mt-2">
            Cross-organization AI action audit trail for policy review (read-only).
          </p>
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        {loading ? (
          <Card className="p-10 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">When</th>
                  <th className="p-3">Agent</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Risk</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-3">{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td>
                    <td className="p-3">{row.agent_type}</td>
                    <td className="p-3">{row.trigger_type}</td>
                    <td className="p-3">{row.action_status}</td>
                    <td className="p-3">{row.risk_level || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No AI action logs yet.</p>
            ) : null}
          </Card>
        )}
      </div>
    </AdminSectionGate>
  );
}
