import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Play, UserCheck } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { leaseScreeningService } from "../../../lib/lease-screening.service";
import { useAuth } from "../../context/AuthContext";

export function TenantScreeningCenter({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ applicantName: "", applicantEmail: "" });

  const load = async () => {
    try {
      setLoading(true);
      const rows = await leaseScreeningService.listScreeningChecks(organizationId);
      setChecks(rows);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [organizationId]);

  const handleRunPack = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await leaseScreeningService.runFullUsScreeningPack({
        organizationId,
        applicantName: form.applicantName,
        applicantEmail: form.applicantEmail,
        reviewedBy: user?.id,
      });
      toast.success("US screening pack completed (credit, criminal, eviction)");
      setForm({ applicantName: "", applicantEmail: "" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Tenant Screening</h1>
        <p className="text-sm text-muted-foreground">TransUnion credit, criminal, and eviction checks with Ghana Trust identity verification.</p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Play className="h-4 w-4" /> Run US screening pack</h2>
        <form onSubmit={handleRunPack} className="flex flex-wrap gap-3 items-end">
          <Input placeholder="Applicant name" value={form.applicantName} onChange={(e) => setForm({ ...form, applicantName: e.target.value })} required />
          <Input type="email" placeholder="Applicant email" value={form.applicantEmail} onChange={(e) => setForm({ ...form, applicantEmail: e.target.value })} required />
          <Button type="submit">Run credit + criminal + eviction</Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">Connect TransUnion SmartMove in Integration Marketplace for live bureau results.</p>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><UserCheck className="h-4 w-4" /> Screening history</h2>
        {loading ? <p className="text-muted-foreground">Loading...</p> : checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No screening checks yet.</p>
        ) : checks.map((c) => (
          <div key={c.id} className="rounded-lg border p-3 flex justify-between">
            <div>
              <p className="font-medium capitalize">{c.check_type} · {c.provider}</p>
              <p className="text-sm text-muted-foreground">{c.result_summary}</p>
            </div>
            <Badge variant={c.recommendation === "clear" ? "default" : c.recommendation === "decline" ? "destructive" : "outline"}>
              {c.recommendation || c.status}
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
