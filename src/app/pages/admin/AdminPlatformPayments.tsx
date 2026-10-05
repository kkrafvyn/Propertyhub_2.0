import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminSectionGate } from "./AdminSectionGate";
import { Card } from "../../components/ui/Card";
import { listPlatformPayments } from "../../../lib/platform-admin-dashboard.service";

export function AdminPlatformPayments() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listPlatformPayments>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void listPlatformPayments(100)
      .then(setRows)
      .catch((err) => setError(err.message || "Unable to load payments"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminSectionGate section="payments" label="Payments ledger">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Payments ledger</h1>
          <p className="text-muted-foreground mt-2">Cross-tenant payment transactions (read-only).</p>
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
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Reference</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-3">{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</td>
                    <td className="p-3">
                      {row.currency} {Number(row.amount).toFixed(2)}
                    </td>
                    <td className="p-3">{row.status}</td>
                    <td className="p-3">{row.payment_provider}</td>
                    <td className="p-3 font-mono text-xs">{row.external_transaction_id || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No payment transactions recorded.</p>
            ) : null}
          </Card>
        )}
      </div>
    </AdminSectionGate>
  );
}
