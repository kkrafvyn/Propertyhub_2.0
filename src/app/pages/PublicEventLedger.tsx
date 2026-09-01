import { useState } from "react";
import { useLocation, useParams } from "react-router";
import { Search, ShieldCheck } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { publicEventLedgerService, type PublicLedgerKind, type PublicLedgerRecord } from "../../lib/public-event-ledger.service";

export function PublicEventLedger() {
  const { id } = useParams();
  const location = useLocation();
  const pathKind: PublicLedgerKind = location.pathname.includes("/explorer/property")
    ? "property"
    : location.pathname.includes("/explorer/unit")
      ? "unit"
      : "transaction";
  const [kind, setKind] = useState<PublicLedgerKind>(pathKind);
  const [identifier, setIdentifier] = useState(id || "");
  const [record, setRecord] = useState<PublicLedgerRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!identifier.trim()) return;
    try {
      setLoading(true);
      setError("");
      const result = await publicEventLedgerService.lookup(kind, identifier.trim());
      setRecord(result);
      if (!result) setError("No public record matched that identifier.");
    } catch (failure: any) {
      setError(failure?.message || "Lookup failed.");
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          Public Event Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pseudonymous verification of units, listings, and payment references. Occupant and owner identities are never shown.
        </p>
      </div>
      <Card className="p-6">
        <form className="grid gap-3 sm:grid-cols-[140px_1fr_auto]" onSubmit={lookup}>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as PublicLedgerKind)}
          >
            <option value="transaction">Transaction</option>
            <option value="unit">Unit</option>
            <option value="property">Property</option>
          </select>
          <Input
            placeholder={kind === "transaction" ? "Provider reference" : "Public identifier"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <Button disabled={loading}>
            <Search className="h-4 w-4" />
            {loading ? "Looking up…" : "Verify"}
          </Button>
        </form>
        {error ? <p className="text-sm text-rose-600 mt-3">{error}</p> : null}
      </Card>
      {record ? (
        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">{record.title}</h2>
          <p className="text-sm text-muted-foreground">{record.summary}</p>
          <ul className="text-xs space-y-2">
            {record.events.map((ev, idx) => (
              <li key={idx} className="border-t border-border pt-2">
                <span className="font-mono text-muted-foreground">{ev.at ? new Date(ev.at).toLocaleString() : ""}</span>
                <div>{ev.label}</div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
