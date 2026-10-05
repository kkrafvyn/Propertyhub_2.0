import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminSectionGate } from "./AdminSectionGate";
import { Card } from "../../components/ui/Card";
import { listCommunicationDeliveries } from "../../../lib/platform-admin-dashboard.service";

export function AdminPlatformCommunications() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listCommunicationDeliveries>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void listCommunicationDeliveries(100)
      .then(setRows)
      .catch((err) => setError(err.message || "Unable to load delivery attempts"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminSectionGate section="communications" label="Communications">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Communications delivery</h1>
          <p className="text-muted-foreground mt-2">Recent delivery attempts across the platform.</p>
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
                  <th className="p-3">Channel</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-3">
                      {row.attempted_at ? new Date(row.attempted_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-3">{row.channel}</td>
                    <td className="p-3">{row.status}</td>
                    <td className="p-3 text-muted-foreground">{row.error_message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No delivery attempts recorded.</p>
            ) : null}
          </Card>
        )}
      </div>
    </AdminSectionGate>
  );
}
