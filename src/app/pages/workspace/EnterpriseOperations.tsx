import { useEffect, useMemo, useState } from "react";
import { Box, FileText, Gauge, Loader2, PackagePlus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { estateOperationsService, type EstateUnit, type ManagedEstate } from "../../../lib/estate-operations.service";
import { enterpriseOperationsService } from "../../../lib/enterprise-operations.service";
import { procurementWorkflowService } from "../../../lib/procurement-workflow.service";

const money = (amount = 0, currency = "GHS") => new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(amount / 100);
const utilityTypes = ["water", "electricity", "generator", "solar", "gas", "other"];

export function EnterpriseOperations({ organizationId, currentUserId }: { organizationId: string; currentUserId: string }) {
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [estates, setEstates] = useState<ManagedEstate[]>([]), [units, setUnits] = useState<EstateUnit[]>([]), [estateId, setEstateId] = useState("");
  const [data, setData] = useState<any>({ assets: [], meters: [], readings: [], tariffs: [], budgets: [], procurement: [], contracts: [] });
  const [asset, setAsset] = useState({ name: "", type: "", cost: "" });
  const [meter, setMeter] = useState({ id: "", type: "water", unit: "" });
  const [reading, setReading] = useState({ meterId: "", value: "" });
  const [tariff, setTariff] = useState({ type: "water", rate: "", effective: new Date().toISOString().slice(0, 10) });
  const [budget, setBudget] = useState({ category: "", amount: "", period: new Date().toISOString().slice(0, 7) });
  const [request, setRequest] = useState({ title: "", amount: "" });
  const [contract, setContract] = useState({ title: "", type: "", start: new Date().toISOString().slice(0, 10), end: "", value: "" });

  const load = async () => {
    try {
      setLoading(true);
      const es = await estateOperationsService.getEstates(organizationId);
      setEstates(es); setUnits(await estateOperationsService.getUnits(es.map((x) => x.id)));
      setEstateId((current) => current || es[0]?.id || "");
      setData(await enterpriseOperationsService.load(es.map((x) => x.id)));
    } catch (error) { console.error(error); toast.error("Unable to load enterprise operations. Apply the latest migration first."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [organizationId]);
  const estate = estates.find((x) => x.id === estateId);
  const scoped = useMemo(() => {
    const meters = data.meters.filter((x: any) => x.estate_id === estateId);
    return {
      assets: data.assets.filter((x: any) => x.estate_id === estateId), meters,
      readings: data.readings.filter((x: any) => meters.some((m: any) => m.id === x.meter_id)),
      tariffs: data.tariffs.filter((x: any) => x.estate_id === estateId),
      budgets: data.budgets.filter((x: any) => x.estate_id === estateId),
      procurement: data.procurement.filter((x: any) => x.estate_id === estateId),
      contracts: data.contracts.filter((x: any) => x.estate_id === estateId),
    };
  }, [data, estateId]);
  const submit = async (work: () => Promise<any>, success: string) => {
    try { setSaving(true); await work(); toast.success(success); await load(); }
    catch (error: any) { console.error(error); toast.error(error?.message || "Unable to save this record."); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading enterprise operations...</div>;

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold">Enterprise Operations</h1><p className="mt-2 text-muted-foreground">Run assets, utilities, budgets, purchasing, and supplier contracts from one estate record.</p></div>
    <select className="rounded-lg border border-border bg-input-background px-3 py-2" value={estateId} onChange={(e) => setEstateId(e.target.value)}>{estates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
    {estate && <>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6"><div className="flex items-center gap-2"><Box className="h-5 w-5 text-primary" /><h2 className="font-semibold">Assets</h2></div>
          <form className="mt-4 grid gap-2 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); if (!asset.name || !asset.type) return; void submit(() => enterpriseOperationsService.createAsset({ estateId, name: asset.name, assetType: asset.type, replacementCostMinor: Math.round(Number(asset.cost) * 100), currency: estate.currency }), "Asset added").then(() => setAsset({ name: "", type: "", cost: "" })); }}><Input placeholder="Asset name" value={asset.name} onChange={(e) => setAsset({ ...asset, name: e.target.value })} /><Input placeholder="Type (pump, CCTV...)" value={asset.type} onChange={(e) => setAsset({ ...asset, type: e.target.value })} /><Input placeholder="Replacement cost" value={asset.cost} onChange={(e) => setAsset({ ...asset, cost: e.target.value })} /><Button disabled={saving}>Add asset</Button></form>
          <div className="mt-4 space-y-2">{scoped.assets.slice(0, 6).map((x: any) => <div className="flex justify-between rounded-lg border border-border p-3" key={x.id}><span>{x.name} · {x.asset_type}</span><Badge variant="outline">{x.condition}</Badge></div>)}</div>
        </Card>
        <Card className="p-6"><div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /><h2 className="font-semibold">Meters</h2></div>
          <form className="mt-4 grid gap-2 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); if (!meter.id) return; void submit(() => enterpriseOperationsService.createMeter({ estateId, identifier: meter.id, utilityType: meter.type, unitId: meter.unit || null }), "Meter added").then(() => setMeter({ ...meter, id: "" })); }}><Input placeholder="Meter identifier" value={meter.id} onChange={(e) => setMeter({ ...meter, id: e.target.value })} /><select className="rounded-lg border border-border bg-input-background px-3 py-2" value={meter.type} onChange={(e) => setMeter({ ...meter, type: e.target.value })}>{utilityTypes.map((x) => <option key={x}>{x}</option>)}</select><select className="rounded-lg border border-border bg-input-background px-3 py-2" value={meter.unit} onChange={(e) => setMeter({ ...meter, unit: e.target.value })}><option value="">Estate meter</option>{units.filter((x) => x.estate_id === estateId).map((x) => <option key={x.id} value={x.id}>{x.identifier}</option>)}</select><Button disabled={saving}>Add meter</Button></form>
          <div className="mt-4 space-y-2">{scoped.meters.slice(0, 6).map((x: any) => <div key={x.id} className="rounded-lg border border-border p-3">{x.identifier} · {x.utility_type} · {x.unit_of_measure}{x.unit_id ? " · unit meter" : ""}</div>)}</div>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6"><div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /><h2 className="font-semibold">Meter readings & billing</h2></div><p className="mt-2 text-sm text-muted-foreground">Record a new reading, then bill it once a prior reading and active tariff exist.</p>
          <form className="mt-4 grid gap-2 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); if (!reading.meterId || !reading.value) return; void submit(() => enterpriseOperationsService.addReading({ meterId: reading.meterId, readingValue: Number(reading.value), recordedBy: currentUserId }), "Reading recorded").then(() => setReading({ meterId: "", value: "" })); }}><select className="rounded-lg border border-border bg-input-background px-3 py-2" value={reading.meterId} onChange={(e) => setReading({ ...reading, meterId: e.target.value })}><option value="">Select meter</option>{scoped.meters.map((x: any) => <option key={x.id} value={x.id}>{x.identifier} · {x.utility_type}</option>)}</select><Input type="number" step="0.001" placeholder="New meter reading" value={reading.value} onChange={(e) => setReading({ ...reading, value: e.target.value })} /><Button disabled={saving}>Record reading</Button></form>
          <div className="mt-4 space-y-2">{scoped.readings.slice(0, 5).map((x: any) => { const meterForReading = scoped.meters.find((m: any) => m.id === x.meter_id); return <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"><span>{meterForReading?.identifier || "Meter"}: {x.reading_value}</span><span className="text-muted-foreground">{new Date(x.read_at).toLocaleDateString()}</span><Button size="sm" variant="outline" disabled={saving || !meterForReading?.unit_id} onClick={() => void submit(() => enterpriseOperationsService.issueUtilityCharge(x.id), "Utility charge issued")}>Bill reading</Button></div>; })}</div>
        </Card>
        <Card className="p-6"><h2 className="font-semibold">Utility tariff controls</h2><p className="mt-2 text-sm text-muted-foreground">Effective dates protect historical pricing when a tariff changes.</p>
          <form className="mt-4 grid gap-2 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); if (!tariff.rate) return; void submit(() => enterpriseOperationsService.createTariff({ estateId, utilityType: tariff.type, rateMinorPerUnit: Math.round(Number(tariff.rate) * 100), currency: estate.currency, effectiveFrom: tariff.effective, createdBy: currentUserId }), "Tariff saved").then(() => setTariff({ ...tariff, rate: "" })); }}><select className="rounded-lg border border-border bg-input-background px-3 py-2" value={tariff.type} onChange={(e) => setTariff({ ...tariff, type: e.target.value })}>{utilityTypes.map((x) => <option key={x}>{x}</option>)}</select><Input type="number" step="0.01" placeholder="Rate per unit" value={tariff.rate} onChange={(e) => setTariff({ ...tariff, rate: e.target.value })} /><Input type="date" value={tariff.effective} onChange={(e) => setTariff({ ...tariff, effective: e.target.value })} /><Button disabled={saving}>Save tariff</Button></form>
          <div className="mt-4 space-y-2">{scoped.tariffs.slice(0, 5).map((x: any) => <div className="flex justify-between rounded-lg border border-border p-3 text-sm" key={x.id}><span>{x.utility_type}</span><span>{money(x.rate_minor_per_unit, x.currency)} / unit from {x.effective_from}</span></div>)}</div>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-6"><Wallet className="h-5 w-5 text-primary" /><h2 className="mt-2 font-semibold">Budgets</h2><form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); if (!budget.category || !budget.amount) return; void submit(() => enterpriseOperationsService.createBudget({ estateId, category: budget.category, period: budget.period, budgetMinor: Math.round(Number(budget.amount) * 100), currency: estate.currency, createdBy: currentUserId }), "Budget created"); }}><Input placeholder="Category" value={budget.category} onChange={(e) => setBudget({ ...budget, category: e.target.value })} /><Input type="month" value={budget.period} onChange={(e) => setBudget({ ...budget, period: e.target.value })} /><Input placeholder="Budget amount" value={budget.amount} onChange={(e) => setBudget({ ...budget, amount: e.target.value })} /><Button disabled={saving}>Save budget</Button></form>{scoped.budgets.slice(0, 4).map((x: any) => <p key={x.id} className="mt-3 text-sm">{x.category}: {money(x.budget_minor, x.currency)}</p>)}</Card>
        <Card className="p-6"><PackagePlus className="h-5 w-5 text-primary" /><h2 className="mt-2 font-semibold">Procurement</h2><form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); if (!request.title) return; void submit(() => procurementWorkflowService.createRequest({ estateId, title: request.title, amountMinor: Math.round(Number(request.amount) * 100), currency: estate.currency, requestedBy: currentUserId }), "Purchase request created"); }}><Input placeholder="Request title" value={request.title} onChange={(e) => setRequest({ ...request, title: e.target.value })} /><Input placeholder="Expected amount" value={request.amount} onChange={(e) => setRequest({ ...request, amount: e.target.value })} /><Button disabled={saving}>Request purchase</Button></form>{scoped.procurement.slice(0, 4).map((x: any) => <div key={x.id} className="mt-3 flex items-center justify-between gap-2 text-sm"><span>{x.title}</span><Badge variant="outline">{x.status}</Badge>{x.status === "requested" && <Button size="sm" variant="outline" disabled={saving} onClick={() => void submit(() => procurementWorkflowService.updateRequestStatus({ requestId: x.id, status: "approved", approvedBy: currentUserId }), "Request approved")}>Approve</Button>}{x.status === "approved" && <Button size="sm" variant="outline" disabled={saving} onClick={() => void submit(() => procurementWorkflowService.updateRequestStatus({ requestId: x.id, status: "ordered" }), "Purchase marked ordered")}>Order</Button>}</div>)}</Card>
        <Card className="p-6"><FileText className="h-5 w-5 text-primary" /><h2 className="mt-2 font-semibold">Contracts</h2><form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); if (!contract.title || !contract.type) return; void submit(() => enterpriseOperationsService.createContract({ estateId, title: contract.title, contractType: contract.type, startDate: contract.start, endDate: contract.end, valueMinor: Math.round(Number(contract.value) * 100), currency: estate.currency, ownerUserId: currentUserId }), "Contract recorded"); }}><Input placeholder="Contract title" value={contract.title} onChange={(e) => setContract({ ...contract, title: e.target.value })} /><Input placeholder="Type" value={contract.type} onChange={(e) => setContract({ ...contract, type: e.target.value })} /><Input type="date" value={contract.start} onChange={(e) => setContract({ ...contract, start: e.target.value })} /><Input type="date" value={contract.end} onChange={(e) => setContract({ ...contract, end: e.target.value })} /><Button disabled={saving}>Save contract</Button></form>{scoped.contracts.slice(0, 4).map((x: any) => <p key={x.id} className="mt-3 text-sm">{x.title} · {x.end_date || "No end date"}</p>)}</Card>
      </div>
    </>}
  </div>;
}
