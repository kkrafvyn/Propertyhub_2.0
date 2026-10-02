import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useState } from "react";
import { useLocation, useParams } from "react-router";
import { Search, ShieldCheck, Clock, FileText, Sparkles, CheckCircle2, Shield, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/badge";
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
    <div className="space-y-8">
      {/* ── Editorial Header with Ambient Glowing Orbs ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-surface/80 border border-emerald-500/20 shadow-lg backdrop-blur-md">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              Cryptographic Transparency
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Immutable Ledger
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-ink font-display">
            Public Event Ledger
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-secondary">
            Pseudonymous verification of units, listings, and payment references. Occupant and owner identities are <strong className="text-ink font-semibold">strictly protected</strong>.
          </p>
        </div>
      </div>

      {/* ── Search Card ── */}
      <Card variant="glass" className="rounded-3xl border border-surface-border/80 p-6 sm:p-7 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-ink">Verify Public Record</p>
        </div>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={lookup}>
          <NativeSelectControl
            className="h-12 rounded-xl border border-surface-border bg-surface-subtle px-3.5 text-sm font-medium text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-40"
            value={kind}
            onChange={(e) => setKind(e.target.value as PublicLedgerKind)}
          >
            <option value="transaction">Transaction</option>
            <option value="unit">Unit</option>
            <option value="property">Property</option>
          </NativeSelectControl>
          <Input
            className="h-12 flex-1 rounded-xl border-surface-border bg-surface-subtle text-sm px-4"
            placeholder={kind === "transaction" ? "e.g. TXN-892348" : kind === "unit" ? "e.g. BM-UNIT-001" : "e.g. PROP-ACC-102"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-12 rounded-xl font-semibold px-6 shrink-0 shadow-md shadow-emerald-500/10"
          >
            <Search className="h-4 w-4 mr-2" />
            {loading ? "Verifying…" : "Verify Record"}
          </Button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
            {error}
          </div>
        )}
      </Card>

      {/* ── Verified Result Card ── */}
      {record && (
        <Card variant="glass" className="rounded-3xl border border-surface-border/80 shadow-lg overflow-hidden backdrop-blur-md">
          {/* Result header */}
          <div className="flex items-start justify-between gap-4 border-b border-surface-border/80 px-6 sm:px-8 py-5 bg-surface-subtle/60">
            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Immutable Record
              </div>
              <h2 className="text-xl font-bold text-ink font-display">{record.title}</h2>
              <p className="mt-1 text-sm text-ink-secondary">{record.summary}</p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Authenticity
            </span>
          </div>

          {/* Events timeline */}
          <div className="px-6 sm:px-8 py-6">
            <p className="mb-5 text-xs font-bold uppercase tracking-widest text-ink-secondary">
              Chronological Audit Trail
            </p>
            <ol className="relative border-l-2 border-emerald-500/30 pl-6 sm:pl-8 space-y-6">
              {record.events.map((ev, idx) => (
                <li key={idx} className="relative">
                  <span className="absolute -left-[1.95rem] sm:-left-[2.45rem] top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-surface shadow-xs">
                    {idx === 0 ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-ink-secondary" />
                    )}
                  </span>
                  <div className="rounded-2xl border border-surface-border/80 bg-surface-subtle/50 p-4 sm:p-5 shadow-xs transition-all hover:border-emerald-500/30">
                    <div className="flex items-center gap-2 text-xs text-ink-secondary mb-1.5">
                      <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-mono">
                        {ev.at ? new Date(ev.at).toLocaleString() : "—"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-ink">{ev.label}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      )}

      {/* ── Empty state hint ── */}
      {!record && !loading && !error && (
        <div className="rounded-3xl border border-dashed border-surface-border p-10 text-center bg-surface-subtle/40 backdrop-blur-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-border bg-surface shadow-xs">
            <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-base font-semibold text-ink font-display">Enter an identifier above to verify an event</p>
          <p className="mt-1 text-xs text-ink-secondary max-w-sm mx-auto">
            Supports PayAngels escrow transaction references, unit cryptographic IDs, and registered property records.
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

