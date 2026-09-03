import { useState } from "react";
import { useLocation, useParams } from "react-router";
import { Search, ShieldCheck, Clock, FileText } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { MarketingSubpage } from "../components/marketing/MarketingSubpage";
import { StandalonePageShell } from "../components/ux/StandalonePageShell";
import { isMarketingSite } from "../../lib/site-mode";
import {
  publicEventLedgerService,
  type PublicLedgerKind,
  type PublicLedgerRecord,
} from "../../lib/public-event-ledger.service";

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

  const body = (
    <div className="space-y-7">
      {/* Page Header */}
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface/80 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-ink-secondary backdrop-blur-sm shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Blockchain-anchored transparency
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Public Event Ledger
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-secondary">
          Pseudonymous verification of units, listings, and payment references.
          Occupant and owner identities are <strong className="text-ink">never shown</strong>.
        </p>
      </div>

      {/* Search card */}
      <div
        className="rounded-2xl border border-surface-border p-6 shadow-md"
        style={{ background: "var(--surface)" }}
      >
        <p className="mb-4 text-sm font-semibold text-ink">Verify a record</p>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={lookup}
        >
          <select
            className="h-11 rounded-xl border border-surface-border bg-surface-subtle px-3 text-sm font-medium text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-36"
            value={kind}
            onChange={(e) => setKind(e.target.value as PublicLedgerKind)}
          >
            <option value="transaction">Transaction</option>
            <option value="unit">Unit</option>
            <option value="property">Property</option>
          </select>
          <Input
            className="h-11 flex-1 rounded-xl border-surface-border bg-surface-subtle text-sm"
            placeholder={kind === "transaction" ? "Provider reference" : "Public identifier"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-11 rounded-xl font-semibold px-5"
            style={{
              background: "linear-gradient(135deg, #e07a5f, #c45d44)",
              border: "none",
              color: "#fff",
              boxShadow: "0 4px 14px rgba(224,122,95,0.28)",
              minWidth: "7rem",
            }}
          >
            <Search className="h-4 w-4" />
            {loading ? "Looking…" : "Verify"}
          </Button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-400">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
            {error}
          </div>
        )}
      </div>

      {/* Result card */}
      {record && (
        <div
          className="rounded-2xl border border-surface-border shadow-md overflow-hidden"
          style={{ background: "var(--surface)" }}
        >
          {/* Result header */}
          <div
            className="flex items-start justify-between gap-4 border-b border-surface-border px-6 py-5"
            style={{ background: "var(--surface-subtle)" }}
          >
            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-widest text-ink-secondary">
                Verified record
              </div>
              <h2 className="text-lg font-bold text-ink">{record.title}</h2>
              <p className="mt-1 text-sm text-ink-secondary">{record.summary}</p>
            </div>
            <span
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#059669",
              }}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          </div>

          {/* Events timeline */}
          <div className="px-6 py-5">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-ink-secondary">
              Event history
            </p>
            <ol className="relative border-l-2 border-surface-border pl-6 space-y-5">
              {record.events.map((ev, idx) => (
                <li key={idx} className="relative">
                  <span className="absolute -left-[1.85rem] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-surface-border bg-surface shadow-sm">
                    {idx === 0 ? (
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-ink-secondary" />
                    )}
                  </span>
                  <div className="rounded-xl border border-surface-border bg-surface-subtle px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 text-xs text-ink-secondary mb-1">
                      <Clock className="h-3 w-3" />
                      <span className="font-mono">
                        {ev.at ? new Date(ev.at).toLocaleString() : "—"}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-ink">{ev.label}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Empty state hint */}
      {!record && !loading && !error && (
        <div
          className="rounded-2xl border border-dashed border-surface-border p-8 text-center"
          style={{ background: "var(--surface-subtle)" }}
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-border bg-surface shadow-sm">
            <ShieldCheck className="h-6 w-6 text-ink-secondary" />
          </div>
          <p className="text-sm font-medium text-ink">Enter an identifier above to verify a record</p>
          <p className="mt-1 text-xs text-ink-secondary">
            Supports transaction references, unit IDs, and property IDs.
          </p>
        </div>
      )}
    </div>
  );

  if (isMarketingSite()) {
    return <MarketingSubpage>{body}</MarketingSubpage>;
  }

  return <StandalonePageShell maxWidthClassName="max-w-2xl">{body}</StandalonePageShell>;
}
