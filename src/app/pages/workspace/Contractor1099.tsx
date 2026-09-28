import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Plus, Download } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { contractor1099Service, type Contractor1099Profile, type Contractor1099Filing } from "../../../lib/contractor-1099.service";

const money = (minor = 0, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);

export function Contractor1099({ organizationId }: { organizationId: string }) {
  const [profiles, setProfiles] = useState<Contractor1099Profile[]>([]);
  const [filings, setFilings] = useState<Contractor1099Filing[]>([]);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear() - 1);
  const [form, setForm] = useState({ legalName: "", taxId: "", taxIdType: "ein", totalPaid: "" });
  const [loading, setLoading] = useState(true);
  const [filingToMark, setFilingToMark] = useState<{ id: string; ref: string } | null>(null);
  const [markingFiled, setMarkingFiled] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [p, f] = await Promise.all([
        contractor1099Service.listProfiles(organizationId),
        contractor1099Service.listFilings(organizationId, taxYear),
      ]);
      setProfiles(p);
      setFilings(f);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [organizationId, taxYear]);

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const profile = await contractor1099Service.upsertProfile({
        organizationId,
        legalName: form.legalName,
        taxId: form.taxId,
        taxIdType: form.taxIdType as Contractor1099Profile["tax_id_type"],
      });
      if (form.totalPaid) {
        await contractor1099Service.createOrUpdateFiling({
          organizationId,
          profileId: profile.id,
          taxYear,
          totalPaidMinor: Math.round(parseFloat(form.totalPaid) * 100),
        });
      }
      setForm({ legalName: "", taxId: "", taxIdType: "ein", totalPaid: "" });
      toast.success("1099 profile saved");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleExport = () => {
    const csv = contractor1099Service.exportFilingsCsv(filings, profiles);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `1099-filings-${taxYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmMarkFiled = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filingToMark) return;
    setMarkingFiled(true);
    try {
      await contractor1099Service.markFiled(filingToMark.id, filingToMark.ref.trim() || undefined);
      toast.success("1099 filing marked as filed");
      setFilingToMark(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark as filed");
    } finally {
      setMarkingFiled(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="h-6 w-6" /> 1099 Contractor Reporting</h1>
        <p className="text-sm text-muted-foreground">Track contractor payments and prepare IRS 1099-NEC filings.</p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm">Tax year</label>
        <Input type="number" className="w-28" value={taxYear} onChange={(e) => setTaxYear(parseInt(e.target.value))} />
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Filings ({taxYear})</h2>
          {loading ? <p className="text-muted-foreground">Loading...</p> : filings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No filings for this tax year.</p>
          ) : filings.map((f) => {
            const profile = profiles.find((p) => p.id === f.profile_id);
            return (
              <div key={f.id} className="rounded-lg border p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{profile?.legal_name || "Contractor"}</p>
                  <p className="text-xs text-muted-foreground">TIN: {profile?.tax_id}</p>
                  <p className="text-sm">{money(f.total_paid_minor, f.currency)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{f.status}</Badge>
                  {f.status === "ready" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFilingToMark({ id: f.id, ref: "" })}
                    >
                      Mark filed
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Add contractor</h2>
          <form onSubmit={handleAddProfile} className="space-y-3">
            <Input placeholder="Legal name" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} required />
            <Input placeholder="Tax ID (EIN/SSN)" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} required />
            <select className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm" value={form.taxIdType} onChange={(e) => setForm({ ...form, taxIdType: e.target.value })}>
              <option value="ein">EIN</option>
              <option value="ssn">SSN</option>
              <option value="tin">TIN</option>
            </select>
            <Input type="number" step="0.01" placeholder={`Total paid in ${taxYear}`} value={form.totalPaid} onChange={(e) => setForm({ ...form, totalPaid: e.target.value })} />
            <Button type="submit"><Plus className="h-4 w-4 mr-1" /> Save profile</Button>
          </form>
        </Card>
      </div>

      {/* Mark Filed Dialog */}
      <Dialog open={Boolean(filingToMark)} onOpenChange={(open) => !open && setFilingToMark(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark 1099 as Filed</DialogTitle>
            <DialogDescription>
              Record the submission of this contractor's 1099-NEC filing with the IRS or relevant tax authority.
            </DialogDescription>
          </DialogHeader>
          {filingToMark && (
            <form onSubmit={handleConfirmMarkFiled} className="space-y-4 pt-2">
              <div>
                <label htmlFor="filing-ref" className="block text-xs font-semibold text-foreground mb-1.5">
                  IRS Submission Reference / Receipt Number (Optional)
                </label>
                <Input
                  id="filing-ref"
                  value={filingToMark.ref}
                  onChange={(e) => setFilingToMark({ ...filingToMark, ref: e.target.value })}
                  placeholder="e.g. IRS-2025-NEC-889102"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFilingToMark(null)}
                  disabled={markingFiled}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={markingFiled}>
                  {markingFiled ? "Confirming..." : "Confirm Filed"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
