import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building, Plus, AlertTriangle, DollarSign, Users } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";
import { hoaManagementService, type HoaAssociation, type HoaViolation, type HoaAssessment } from "../../../lib/hoa-management.service";

const money = (minor = 0, currency = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(minor / 100);

export function HoaManagement({ organizationId }: { organizationId: string }) {
  const [tab, setTab] = useState<"associations" | "violations" | "assessments">("associations");
  const [associations, setAssociations] = useState<HoaAssociation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [violations, setViolations] = useState<HoaViolation[]>([]);
  const [assessments, setAssessments] = useState<HoaAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [violationType, setViolationType] = useState("");
  const [violationDesc, setViolationDesc] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const rows = await hoaManagementService.listAssociations(organizationId);
      setAssociations(rows);
      const activeId = selectedId || rows[0]?.id || "";
      setSelectedId(activeId);
      if (activeId) {
        const [v, a] = await Promise.all([
          hoaManagementService.listViolations(activeId),
          hoaManagementService.listAssessments(activeId),
        ]);
        setViolations(v);
        setAssessments(a);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load HOA data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [organizationId]);

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      const [v, a] = await Promise.all([
        hoaManagementService.listViolations(selectedId),
        hoaManagementService.listAssessments(selectedId),
      ]);
      setViolations(v);
      setAssessments(a);
    })();
  }, [selectedId]);

  const handleCreateAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hoaManagementService.createAssociation({ organizationId, name });
      setName("");
      toast.success("Association created");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      await hoaManagementService.createViolation({
        associationId: selectedId,
        violationType,
        description: violationDesc,
      });
      setViolationType("");
      setViolationDesc("");
      toast.success("Violation logged");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selected = associations.find((a) => a.id === selectedId);

  const queryPhase = loading ? "loading" : "ready";

  return (
    <WorkspacePageShell
      tone="finance"
      title="HOA & Association Management"
      description="Violations, assessments, dues, and board operations."
      actions={
        <div className="flex flex-wrap gap-2">
          {(["associations", "violations", "assessments"] as const).map((t) => (
            <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
          {associations.length > 0 && (
            <NativeSelectControl className="ml-auto rounded-lg border px-3 py-2" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {associations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </NativeSelectControl>
          )}
        </div>
      }
    >
      <OperationalQueryState phase={queryPhase}>

      {tab === "associations" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Building className="h-4 w-4" /> Associations</h2>
            {associations.map((a) => (
              <div key={a.id} className="rounded-lg border p-3 flex justify-between">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">Monthly dues: {money(a.monthly_dues_minor, a.currency)}</p>
                </div>
                <Badge variant="outline">{a.status}</Badge>
              </div>
            ))}
          </Card>
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Create association</h2>
            <form onSubmit={handleCreateAssociation} className="space-y-3">
              <Input placeholder="Association name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Button type="submit"><Plus className="h-4 w-4 mr-1" /> Add</Button>
            </form>
          </Card>
        </div>
      )}

      {tab === "violations" && selected && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Violations — {selected.name}</h2>
            {violations.length === 0 ? <p className="text-sm text-muted-foreground">No violations recorded.</p> : violations.map((v) => (
              <div key={v.id} className="rounded-lg border p-3">
                <div className="flex justify-between"><p className="font-medium">{v.violation_type}</p><Badge variant="outline">{v.status}</Badge></div>
                <p className="text-sm text-muted-foreground mt-1">{v.description}</p>
                {v.fine_minor > 0 && <p className="text-xs mt-1">Fine: {money(v.fine_minor, v.currency)}</p>}
              </div>
            ))}
          </Card>
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Log violation</h2>
            <form onSubmit={handleCreateViolation} className="space-y-3">
              <Input placeholder="Violation type (e.g. noise, parking)" value={violationType} onChange={(e) => setViolationType(e.target.value)} required />
              <Input placeholder="Description" value={violationDesc} onChange={(e) => setViolationDesc(e.target.value)} required />
              <Button type="submit">Log violation</Button>
            </form>
          </Card>
        </div>
      )}

      {tab === "assessments" && selected && (
        <Card className="p-6 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> Assessments & dues — {selected.name}</h2>
          {assessments.length === 0 ? <p className="text-sm text-muted-foreground">No assessments issued yet.</p> : assessments.map((a) => (
            <div key={a.id} className="rounded-lg border p-3 flex justify-between">
              <div>
                <p className="font-medium">{a.period_label}</p>
                <p className="text-xs text-muted-foreground">{a.period_start} → {a.period_end}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{money(a.total_amount_minor, a.currency)}</p>
                <Badge variant="outline">{a.status}</Badge>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Board portal links available under Stakeholder Portals.</p>
        </Card>
      )}
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
