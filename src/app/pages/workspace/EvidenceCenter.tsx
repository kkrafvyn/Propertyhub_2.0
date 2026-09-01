import { useState } from "react";
import { toast } from "sonner";
import { Download, Lock, Search } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { evidenceDossierService, type EvidenceDossier, type EvidenceEvent } from "../../../lib/evidence-dossier.service";

export function EvidenceCenter({ organizationId }: { organizationId?: string }) {
  const [searchTarget, setSearchTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [dossier, setDossier] = useState<EvidenceDossier | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !searchTarget.trim()) return;
    try {
      setLoading(true);
      const result = await evidenceDossierService.buildUnitDossier(organizationId, searchTarget.trim());
      setDossier(result);
      if (!result) toast.error("No unit matched that identifier in this organization.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to assemble dossier.");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!dossier) return;
    const headers = ["timestamp", "category", "title", "actor", "hash", "details"];
    const rows = dossier.events.map((ev) =>
      [ev.timestamp, ev.category, ev.title, ev.actor, ev.hash, ev.details]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    );
    const link = document.createElement("a");
    link.href = encodeURI(`data:text/csv;charset=utf-8,${[headers.join(","), ...rows].join("\n")}`);
    link.download = `evidence-${dossier.unitIdentifier}.csv`;
    link.click();
  };

  const badge = (cat: EvidenceEvent["category"]) => {
    const map: Record<string, string> = {
      LEGAL: "bg-purple-500/10 text-purple-600",
      PAYMENT: "bg-emerald-500/10 text-emerald-600",
      MAINTENANCE: "bg-amber-500/10 text-amber-600",
      COMMUNICATION: "bg-blue-500/10 text-blue-600",
      COLLECTIONS: "bg-rose-500/10 text-rose-600",
    };
    return <Badge className={`${map[cat] || ""} border-none`}>{cat}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Evidence Center & Litigation Dossier</h1>
          <p className="text-sm text-ink-muted">
            Read-only chronology assembled from immutable ledgers for a unit in this organization.
          </p>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" />
          Immutable Audit Trail
        </Badge>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              required
              placeholder="Search by unit identifier (e.g. Villa 14)"
              value={searchTarget}
              onChange={(e) => setSearchTarget(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Assembling…" : "Generate Dossier"}
          </Button>
        </form>
      </Card>

      {dossier ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-surface-subtle p-4 rounded-xl border border-surface-border">
            <div>
              <div className="text-xs text-ink-muted">{dossier.estateName}</div>
              <div className="font-bold text-ink text-base">Unit {dossier.unitIdentifier}</div>
              <div className="text-xs text-ink-muted">{dossier.events.length} events</div>
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
          {dossier.events.length === 0 ? (
            <p className="text-sm text-ink-muted">No ledger events recorded for this unit yet.</p>
          ) : (
            dossier.events.map((ev) => (
              <Card key={ev.id} className="p-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {badge(ev.category)}
                  <span className="text-[11px] font-mono text-ink-muted">{new Date(ev.timestamp).toLocaleString()}</span>
                </div>
                <div className="font-semibold text-sm">{ev.title}</div>
                <p className="text-xs text-ink-muted">{ev.details}</p>
                <p className="text-[10px] font-mono text-ink-muted">{ev.hash}</p>
              </Card>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
