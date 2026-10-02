import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Box,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Droplets,
  FileText,
  Filter,
  Flame,
  Gauge,
  Loader2,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { MetricCard } from "../../components/ui/MetricCard";
import {
  estateOperationsService,
  type EstateUnit,
  type ManagedEstate,
} from "../../../lib/estate-operations.service";
import { enterpriseOperationsService } from "../../../lib/enterprise-operations.service";
import { procurementWorkflowService } from "../../../lib/procurement-workflow.service";

const money = (amount = 0, currency = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount / 100,
  );

const UTILITY_CONFIGS: Record<
  string,
  { label: string; icon: typeof Gauge; color: string; badgeClass: string }
> = {
  water: {
    label: "Water",
    icon: Droplets,
    color: "text-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  electricity: {
    label: "Electricity",
    icon: Zap,
    color: "text-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  generator: {
    label: "Generator",
    icon: Activity,
    color: "text-purple-500",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  solar: {
    label: "Solar Power",
    icon: Sun,
    color: "text-yellow-500",
    badgeClass: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  gas: {
    label: "Gas",
    icon: Flame,
    color: "text-rose-500",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  other: {
    label: "Other",
    icon: Gauge,
    color: "text-slate-500",
    badgeClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },
};

const ASSET_CATEGORIES = [
  "Plumbing & Water",
  "Electrical & Power",
  "Security & Access",
  "HVAC & Cooling",
  "Elevators & Lifts",
  "Fixtures & Lighting",
  "Landscape & Exterior",
  "General Equipment",
];

const BUDGET_CATEGORIES = [
  "Maintenance & Repairs",
  "Security Services",
  "Cleaning & Sanitation",
  "Utilities & Fuel",
  "Landscaping & Grounds",
  "Insurance & Compliance",
  "Administrative",
  "General Operations",
];

const CONTRACT_TYPES = [
  "Maintenance SLA",
  "Security Guarding",
  "Waste Management",
  "Elevator Service",
  "Facility Management",
  "Landscaping",
  "Pest Control",
  "Other Service",
];

export function EnterpriseOperations({
  organizationId,
  currentUserId,
}: {
  organizationId: string;
  currentUserId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [units, setUnits] = useState<EstateUnit[]>([]);
  const [estateId, setEstateId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const [data, setData] = useState<any>({
    assets: [],
    meters: [],
    readings: [],
    tariffs: [],
    budgets: [],
    procurement: [],
    contracts: [],
  });

  // Modal open states
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showMeterModal, setShowMeterModal] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showProcurementModal, setShowProcurementModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

  // Form states
  const [assetForm, setAssetForm] = useState({ name: "", type: "Plumbing & Water", cost: "", location: "" });
  const [meterForm, setMeterForm] = useState({ id: "", type: "water", unit: "" });
  const [readingForm, setReadingForm] = useState({ meterId: "", value: "" });
  const [tariffForm, setTariffForm] = useState({
    type: "water",
    rate: "",
    effective: new Date().toISOString().slice(0, 10),
  });
  const [budgetForm, setBudgetForm] = useState({
    category: "Maintenance & Repairs",
    amount: "",
    period: new Date().toISOString().slice(0, 7),
  });
  const [procurementForm, setProcurementForm] = useState({ title: "", amount: "", description: "" });
  const [contractForm, setContractForm] = useState({
    title: "",
    type: "Maintenance SLA",
    start: new Date().toISOString().slice(0, 10),
    end: "",
    value: "",
  });

  // Search & filter
  const [assetSearch, setAssetSearch] = useState("");
  const [procurementFilter, setProcurementFilter] = useState("all");

  const load = async () => {
    try {
      setLoading(true);
      const es = await estateOperationsService.getEstates(organizationId);
      setEstates(es);
      setUnits(await estateOperationsService.getUnits(es.map((x) => x.id)));
      setEstateId((current) => current || es[0]?.id || "");
      setData(await enterpriseOperationsService.load(es.map((x) => x.id)));
    } catch (error) {
      console.error(error);
      toast.error("Unable to load operations data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const estate = estates.find((x) => x.id === estateId) || estates[0];
  const currency = estate?.currency || "GHS";

  const scoped = useMemo(() => {
    if (!estateId) {
      return {
        assets: [],
        meters: [],
        readings: [],
        tariffs: [],
        budgets: [],
        procurement: [],
        contracts: [],
      };
    }
    const meters = (data.meters || []).filter((x: any) => x.estate_id === estateId);
    return {
      assets: (data.assets || []).filter((x: any) => x.estate_id === estateId),
      meters,
      readings: (data.readings || []).filter((x: any) => meters.some((m: any) => m.id === x.meter_id)),
      tariffs: (data.tariffs || []).filter((x: any) => x.estate_id === estateId),
      budgets: (data.budgets || []).filter((x: any) => x.estate_id === estateId),
      procurement: (data.procurement || []).filter((x: any) => x.estate_id === estateId),
      contracts: (data.contracts || []).filter((x: any) => x.estate_id === estateId),
    };
  }, [data, estateId]);

  const estateUnits = useMemo(
    () => units.filter((x) => x.estate_id === estateId),
    [units, estateId],
  );

  // Summary KPIs
  const totalAssetCostMinor = useMemo(
    () => scoped.assets.reduce((sum: number, a: any) => sum + (Number(a.replacement_cost_minor) || 0), 0),
    [scoped.assets],
  );

  const totalMonthlyBudgetMinor = useMemo(
    () => scoped.budgets.reduce((sum: number, b: any) => sum + (Number(b.budget_minor) || 0), 0),
    [scoped.budgets],
  );

  const pendingPurchases = useMemo(
    () => scoped.procurement.filter((x: any) => x.status === "requested"),
    [scoped.procurement],
  );

  const filteredAssets = useMemo(() => {
    if (!assetSearch.trim()) return scoped.assets;
    const q = assetSearch.toLowerCase();
    return scoped.assets.filter(
      (a: any) =>
        a.name?.toLowerCase().includes(q) ||
        a.asset_type?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q),
    );
  }, [scoped.assets, assetSearch]);

  const filteredProcurement = useMemo(() => {
    if (procurementFilter === "all") return scoped.procurement;
    return scoped.procurement.filter((p: any) => p.status === procurementFilter);
  }, [scoped.procurement, procurementFilter]);

  const submit = async (work: () => Promise<any>, successMsg: string) => {
    try {
      setSaving(true);
      await work();
      toast.success(successMsg);
      await load();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Operation failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading operations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Enterprise Operations
            </h1>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
              Multi-Unit
            </Badge>
          </div>
        </div>

        {/* Estate Switcher & Refresh */}
        <div className="flex items-center gap-2">
          {estates.length > 0 && (
            <div className="relative flex items-center">
              <Building2 className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
              <NativeSelectControl
                aria-label="Select property or estate"
                className="h-10 rounded-xl border border-border bg-card pl-9 pr-8 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-primary/50 focus:border-primary focus:outline-hidden"
                value={estateId}
                onChange={(e) => setEstateId(e.target.value)}
              >
                {estates.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} ({x.currency || "GHS"})
                  </option>
                ))}
              </NativeSelectControl>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={saving}
            className="h-10 px-3"
            title="Refresh operations data"
          >
            <RefreshCw className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {estate && (
        <>
          {/* ── KPI Metric Strip ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard
              title="Equipment & Assets"
              value={scoped.assets.length}
              subtitle={
                totalAssetCostMinor > 0
                  ? `Est. value ${money(totalAssetCostMinor, currency)}`
                  : "Tracked inventory"
              }
              icon={Box}
              iconColor="primary"
              onClick={() => setActiveTab("assets")}
              className="cursor-pointer transition-transform hover:-translate-y-0.5"
            />
            <MetricCard
              title="Utility Meters"
              value={scoped.meters.length}
              subtitle={`${scoped.readings.length} readings on file`}
              icon={Gauge}
              iconColor="emerald"
              onClick={() => setActiveTab("utilities")}
              className="cursor-pointer transition-transform hover:-translate-y-0.5"
            />
            <MetricCard
              title="Monthly Budget"
              value={money(totalMonthlyBudgetMinor, currency)}
              subtitle={`${scoped.budgets.length} categories planned`}
              icon={Wallet}
              iconColor="terracotta"
              onClick={() => setActiveTab("budgets")}
              className="cursor-pointer transition-transform hover:-translate-y-0.5"
            />
            <MetricCard
              title="Purchase Requests"
              value={pendingPurchases.length}
              subtitle={
                pendingPurchases.length === 1
                  ? "1 request pending"
                  : `${pendingPurchases.length} pending review`
              }
              icon={PackagePlus}
              iconColor="amber"
              onClick={() => setActiveTab("procurement")}
              className="cursor-pointer transition-transform hover:-translate-y-0.5"
            />
            <MetricCard
              title="Active Contracts"
              value={scoped.contracts.length}
              subtitle="Supplier agreements"
              icon={FileText}
              iconColor="purple"
              onClick={() => setActiveTab("contracts")}
              className="col-span-2 cursor-pointer transition-transform hover:-translate-y-0.5 lg:col-span-1"
            />
          </div>

          {/* ── Main Tabbed Sections ───────────────────────────────── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="border-b border-border pb-1">
              <TabsList className="bg-transparent p-0 flex-wrap h-auto gap-1">
                <TabsTrigger
                  value="overview"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="assets"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Equipment & Assets ({scoped.assets.length})
                </TabsTrigger>
                <TabsTrigger
                  value="utilities"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Utilities & Meters ({scoped.meters.length})
                </TabsTrigger>
                <TabsTrigger
                  value="budgets"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Budgets ({scoped.budgets.length})
                </TabsTrigger>
                <TabsTrigger
                  value="procurement"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Purchases {pendingPurchases.length > 0 && `(${pendingPurchases.length})`}
                </TabsTrigger>
                <TabsTrigger
                  value="contracts"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Contracts ({scoped.contracts.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-6">
              {/* Quick Actions Strip */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(true)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left shadow-xs transition-all hover:border-primary/50 hover:bg-muted/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Box className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Add Equipment</p>
                    <p className="text-xs text-muted-foreground">Pumps, generators, lifts</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowReadingModal(true)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left shadow-xs transition-all hover:border-emerald-500/50 hover:bg-muted/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Gauge className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Record Reading</p>
                    <p className="text-xs text-muted-foreground">Water & power consumption</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowProcurementModal(true)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left shadow-xs transition-all hover:border-amber-500/50 hover:bg-muted/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <PackagePlus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">New Purchase</p>
                    <p className="text-xs text-muted-foreground">Parts & supplies</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowContractModal(true)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left shadow-xs transition-all hover:border-purple-500/50 hover:bg-muted/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Add Contract</p>
                    <p className="text-xs text-muted-foreground">Vendor & service agreements</p>
                  </div>
                </button>
              </div>

              {/* 2-Column Overview Cards */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Equipment Highlights */}
                <Card className="p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Box className="h-5 w-5 text-primary" />
                      <h2 className="font-semibold text-foreground">Key Equipment</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("assets")}
                      className="text-xs text-primary"
                    >
                      View all ({scoped.assets.length})
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {scoped.assets.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        <Box className="mx-auto mb-2 h-8 w-8 opacity-40" />
                        No equipment recorded yet.
                      </div>
                    ) : (
                      scoped.assets.slice(0, 5).map((x: any) => (
                        <div
                          key={x.id}
                          className="flex items-center justify-between rounded-lg border border-border/70 bg-card p-3 transition-colors hover:border-border"
                        >
                          <div>
                            <p className="font-medium text-foreground text-sm">{x.name}</p>
                            <p className="text-xs text-muted-foreground">{x.asset_type}</p>
                          </div>
                          <div className="text-right">
                            {x.replacement_cost_minor > 0 && (
                              <p className="text-xs font-medium text-foreground">
                                {money(x.replacement_cost_minor, currency)}
                              </p>
                            )}
                            <Badge variant="outline" className="text-xs capitalize">
                              {x.condition || "Operational"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* Pending Purchases */}
                <Card className="p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <PackagePlus className="h-5 w-5 text-amber-500" />
                      <h2 className="font-semibold text-foreground">Purchasing Requests</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("procurement")}
                      className="text-xs text-primary"
                    >
                      View all ({scoped.procurement.length})
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {scoped.procurement.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500/50" />
                        All purchase requests are up to date.
                      </div>
                    ) : (
                      scoped.procurement.slice(0, 5).map((x: any) => (
                        <div
                          key={x.id}
                          className="flex items-center justify-between rounded-lg border border-border/70 bg-card p-3 transition-colors hover:border-border"
                        >
                          <div>
                            <p className="font-medium text-foreground text-sm">{x.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {money(x.amount_minor, x.currency || currency)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs capitalize ${
                                x.status === "approved"
                                  ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                  : x.status === "ordered"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              }`}
                            >
                              {x.status}
                            </Badge>
                            {x.status === "requested" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() =>
                                  void submit(
                                    () =>
                                      procurementWorkflowService.updateRequestStatus({
                                        requestId: x.id,
                                        status: "approved",
                                        approvedBy: currentUserId,
                                      }),
                                    "Request approved",
                                  )
                                }
                                className="h-7 text-xs"
                              >
                                Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* ── EQUIPMENT & ASSETS TAB ────────────────────────────── */}
            <TabsContent value="assets" className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search equipment..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => setShowAssetModal(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Equipment
                </Button>
              </div>

              {filteredAssets.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                  <Box className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <h3 className="font-semibold text-foreground">No Equipment Found</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Keep track of machinery, pumps, generators, elevators, and critical property fixtures.
                  </p>
                  <Button className="mt-4" onClick={() => setShowAssetModal(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add First Equipment
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAssets.map((x: any) => (
                    <Card key={x.id} className="p-4 transition-all hover:border-primary/40 shadow-xs">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Box className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground text-sm">{x.name}</h4>
                            <p className="text-xs text-muted-foreground">{x.asset_type}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {x.condition || "Operational"}
                        </Badge>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <span>Est. Value</span>
                        <span className="font-medium text-foreground">
                          {x.replacement_cost_minor > 0
                            ? money(x.replacement_cost_minor, x.currency || currency)
                            : "Not recorded"}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── UTILITIES & METERS TAB ────────────────────────────── */}
            <TabsContent value="utilities" className="space-y-6">
              {/* Header Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-semibold text-foreground">Sub-Meters & Billing</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowTariffModal(true)}>
                    Set Rates
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowReadingModal(true)}>
                    Record Reading
                  </Button>
                  <Button size="sm" onClick={() => setShowMeterModal(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Meter
                  </Button>
                </div>
              </div>

              {/* Utility Rate Badges */}
              {scoped.tariffs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {scoped.tariffs.map((t: any) => {
                    const cfg = UTILITY_CONFIGS[t.utility_type] || UTILITY_CONFIGS.other;
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={t.id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${cfg.badgeClass}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{cfg.label}:</span>
                        <span>
                          {money(t.rate_minor_per_unit, t.currency || currency)} / unit
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Meters Grid */}
              {scoped.meters.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                  <Gauge className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <h3 className="font-semibold text-foreground">No Meters Added</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Add sub-meters for electricity, water, generator, or solar to log readings and bill consumption.
                  </p>
                  <Button className="mt-4" onClick={() => setShowMeterModal(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add First Meter
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {scoped.meters.map((m: any) => {
                    const cfg = UTILITY_CONFIGS[m.utility_type] || UTILITY_CONFIGS.other;
                    const Icon = cfg.icon;
                    const latestReading = scoped.readings
                      .filter((r: any) => r.meter_id === m.id)
                      .sort(
                        (a: any, b: any) =>
                          new Date(b.read_at).getTime() - new Date(a.read_at).getTime(),
                      )[0];
                    const unitObj = estateUnits.find((u) => u.id === m.unit_id);

                    return (
                      <Card key={m.id} className="p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-lg ${cfg.badgeClass}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground text-sm">{m.identifier}</h4>
                              <p className="text-xs text-muted-foreground">{cfg.label}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {unitObj ? unitObj.identifier : "Estate-wide"}
                          </Badge>
                        </div>

                        <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Latest Reading:</span>
                            <span className="font-semibold text-foreground">
                              {latestReading ? latestReading.reading_value : "No reading yet"}
                            </span>
                          </div>
                          {latestReading && (
                            <div className="mt-1 flex justify-between text-muted-foreground">
                              <span>Recorded:</span>
                              <span>{new Date(latestReading.read_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReadingForm({ meterId: m.id, value: "" });
                              setShowReadingModal(true);
                            }}
                            className="h-8 text-xs text-primary"
                          >
                            New Reading
                          </Button>

                          {latestReading && m.unit_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={saving}
                              onClick={() =>
                                void submit(
                                  () => enterpriseOperationsService.issueUtilityCharge(latestReading.id),
                                  "Utility charge issued",
                                )
                              }
                              className="h-8 text-xs"
                            >
                              Bill Reading
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── BUDGETS TAB ───────────────────────────────────────── */}
            <TabsContent value="budgets" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Operational Budgets</h3>
                  <p className="text-xs text-muted-foreground">
                    Total: {money(totalMonthlyBudgetMinor, currency)}
                  </p>
                </div>
                <Button onClick={() => setShowBudgetModal(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Set Budget
                </Button>
              </div>

              {scoped.budgets.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                  <Wallet className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <h3 className="font-semibold text-foreground">No Budgets Defined</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Allocate monthly spending limits for maintenance, security, cleaning, and facilities.
                  </p>
                  <Button className="mt-4" onClick={() => setShowBudgetModal(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Set First Budget
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {scoped.budgets.map((b: any) => (
                    <Card key={b.id} className="p-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-foreground">{b.category}</span>
                        <Badge variant="outline" className="text-xs">
                          {b.period}
                        </Badge>
                      </div>
                      <p className="mt-3 text-2xl font-bold text-foreground">
                        {money(b.budget_minor, b.currency || currency)}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── PURCHASING TAB ────────────────────────────────────── */}
            <TabsContent value="procurement" className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1.5">
                  {["all", "requested", "approved", "ordered"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setProcurementFilter(st)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        procurementFilter === st
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {st === "all" ? "All Requests" : st}
                    </button>
                  ))}
                </div>
                <Button onClick={() => setShowProcurementModal(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  New Purchase Request
                </Button>
              </div>

              {filteredProcurement.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                  <PackagePlus className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <h3 className="font-semibold text-foreground">No Purchase Requests</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Create purchase requests for maintenance supplies, parts, and facility equipment.
                  </p>
                  <Button className="mt-4" onClick={() => setShowProcurementModal(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create Request
                  </Button>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {filteredProcurement.map((p: any) => (
                    <Card
                      key={p.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground text-sm">{p.title}</h4>
                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${
                              p.status === "approved"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : p.status === "ordered"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </div>
                        {p.amount_minor > 0 && (
                          <p className="text-xs font-medium text-muted-foreground mt-1">
                            Est. Amount: {money(p.amount_minor, p.currency || currency)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {p.status === "requested" && (
                          <Button
                            size="sm"
                            disabled={saving}
                            onClick={() =>
                              void submit(
                                () =>
                                  procurementWorkflowService.updateRequestStatus({
                                    requestId: p.id,
                                    status: "approved",
                                    approvedBy: currentUserId,
                                  }),
                                "Request approved",
                              )
                            }
                            className="h-8 text-xs"
                          >
                            Approve
                          </Button>
                        )}
                        {p.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() =>
                              void submit(
                                () =>
                                  procurementWorkflowService.updateRequestStatus({
                                    requestId: p.id,
                                    status: "ordered",
                                  }),
                                "Purchase marked as ordered",
                              )
                            }
                            className="h-8 text-xs"
                          >
                            Mark Ordered
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── CONTRACTS TAB ─────────────────────────────────────── */}
            <TabsContent value="contracts" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Supplier & Service Contracts</h3>
                  <p className="text-xs text-muted-foreground">
                    {scoped.contracts.length} active service agreements
                  </p>
                </div>
                <Button onClick={() => setShowContractModal(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Contract
                </Button>
              </div>

              {scoped.contracts.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <h3 className="font-semibold text-foreground">No Contracts on File</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Store vendor agreements, maintenance SLAs, security contracts, and waste disposal services.
                  </p>
                  <Button className="mt-4" onClick={() => setShowContractModal(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Record Contract
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {scoped.contracts.map((c: any) => (
                    <Card key={c.id} className="p-4 shadow-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">{c.title}</h4>
                          <p className="text-xs text-muted-foreground">{c.contract_type}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {c.end_date ? `Ends ${c.end_date}` : "Ongoing"}
                        </Badge>
                      </div>

                      {c.value_minor > 0 && (
                        <div className="mt-4 pt-3 border-t border-border flex justify-between text-xs">
                          <span className="text-muted-foreground">Contract Value:</span>
                          <span className="font-semibold text-foreground">
                            {money(c.value_minor, c.currency || currency)}
                          </span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* ── MODALS ─────────────────────────────────────────────── */}

          {/* 1. Add Asset Modal */}
          <Dialog open={showAssetModal} onOpenChange={setShowAssetModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Building Equipment</DialogTitle>
                <DialogDescription>
                  Record equipment to monitor conditions, replacements, and maintenance history.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!assetForm.name || !assetForm.type) return;
                  void submit(
                    () =>
                      enterpriseOperationsService.createAsset({
                        estateId,
                        name: assetForm.name,
                        assetType: assetForm.type,
                        replacementCostMinor: Math.round(Number(assetForm.cost || 0) * 100),
                        currency: estate.currency,
                        location: assetForm.location,
                      }),
                    "Equipment added successfully",
                  ).then(() => {
                    setAssetForm({ name: "", type: "Plumbing & Water", cost: "", location: "" });
                    setShowAssetModal(false);
                  });
                }}
                className="space-y-3 py-2"
              >
                <div>
                  <label className="text-xs font-medium text-foreground">Equipment Name</label>
                  <Input
                    placeholder="e.g. Main Water Pump"
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Category</label>
                  <NativeSelectControl
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                    value={assetForm.type}
                    onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}
                  >
                    {ASSET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </NativeSelectControl>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Location / Room (Optional)</label>
                  <Input
                    placeholder="e.g. Ground Floor Plant Room"
                    value={assetForm.location}
                    onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">
                    Estimated Replacement Value ({currency})
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={assetForm.cost}
                    onChange={(e) => setAssetForm({ ...assetForm, cost: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowAssetModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    Add Equipment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* 2. Add Meter Modal */}
          <Dialog open={showMeterModal} onOpenChange={setShowMeterModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Utility Sub-Meter</DialogTitle>
                <DialogDescription>
                  Register a meter to track consumption and generate billing.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!meterForm.id) return;
                  void submit(
                    () =>
                      enterpriseOperationsService.createMeter({
                        estateId,
                        identifier: meterForm.id,
                        utilityType: meterForm.type,
                        unitId: meterForm.unit || null,
                      }),
                    "Meter added successfully",
                  ).then(() => {
                    setMeterForm({ ...meterForm, id: "" });
                    setShowMeterModal(false);
                  });
                }}
                className="space-y-3 py-2"
              >
                <div>
                  <label className="text-xs font-medium text-foreground">Meter Number / Name</label>
                  <Input
                    placeholder="e.g. WTR-102 or ELEC-MAIN"
                    value={meterForm.id}
                    onChange={(e) => setMeterForm({ ...meterForm, id: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Utility Type</label>
                  <NativeSelectControl
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                    value={meterForm.type}
                    onChange={(e) => setMeterForm({ ...meterForm, type: e.target.value })}
                  >
                    {Object.entries(UTILITY_CONFIGS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </NativeSelectControl>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Assigned Location</label>
                  <NativeSelectControl
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                    value={meterForm.unit}
                    onChange={(e) => setMeterForm({ ...meterForm, unit: e.target.value })}
                  >
                    <option value="">Estate-wide (Common Area)</option>
                    {estateUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        Unit: {u.identifier}
                      </option>
                    ))}
                  </NativeSelectControl>
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowMeterModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    Add Meter
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* 3. Record Reading Modal */}
          <Dialog open={showReadingModal} onOpenChange={setShowReadingModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Meter Reading</DialogTitle>
                <DialogDescription>
                  Enter the current meter display value to update usage.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!readingForm.meterId || !readingForm.value) return;
                  void submit(
                    () =>
                      enterpriseOperationsService.addReading({
                        meterId: readingForm.meterId,
                        readingValue: Number(readingForm.value),
                        recordedBy: currentUserId,
                      }),
                    "Reading recorded successfully",
                  ).then(() => {
                    setReadingForm({ meterId: "", value: "" });
                    setShowReadingModal(false);
                  });
                }}
                className="space-y-3 py-2"
              >
                <div>
                  <label className="text-xs font-medium text-foreground">Select Meter</label>
                  <NativeSelectControl
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                    value={readingForm.meterId}
                    onChange={(e) => setReadingForm({ ...readingForm, meterId: e.target.value })}
                    required
                  >
                    <option value="">Choose a meter...</option>
                    {scoped.meters.map((m: any) => {
                      const cfg = UTILITY_CONFIGS[m.utility_type] || UTILITY_CONFIGS.other;
                      return (
                        <option key={m.id} value={m.id}>
                          {m.identifier} ({cfg.label})
                        </option>
                      );
                    })}
                  </NativeSelectControl>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Current Meter Reading</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 1420.5"
                    value={readingForm.value}
                    onChange={(e) => setReadingForm({ ...readingForm, value: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowReadingModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    Save Reading
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* 4. Set Tariff Modal */}
          <Dialog open={showTariffModal} onOpenChange={setShowTariffModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Utility Rate</DialogTitle>
                <DialogDescription>
                  Configure billing rate per unit for utility sub-meter charges.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!tariffForm.rate) return;
                  void submit(
                    () =>
                      enterpriseOperationsService.createTariff({
                        estateId,
                        utilityType: tariffForm.type,
                        rateMinorPerUnit: Math.round(Number(tariffForm.rate) * 100),
                        currency: estate.currency,
                        effectiveFrom: tariffForm.effective,
                        createdBy: currentUserId,
                      }),
                    "Utility rate saved",
                  ).then(() => {
                    setTariffForm({ ...tariffForm, rate: "" });
                    setShowTariffModal(false);
                  });
                }}
                className="space-y-3 py-2"
              >
                <div>
                  <label className="text-xs font-medium text-foreground">Utility Type</label>
                  <NativeSelectControl
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                    value={tariffForm.type}
                    onChange={(e) => setTariffForm({ ...tariffForm, type: e.target.value })}
                  >
                    {Object.entries(UTILITY_CONFIGS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </NativeSelectControl>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">
                    Rate per Unit ({currency})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1.85"
                    value={tariffForm.rate}
                    onChange={(e) => setTariffForm({ ...tariffForm, rate: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Effective Date</label>
                  <Input
                    type="date"
                    value={tariffForm.effective}
                    onChange={(e) => setTariffForm({ ...tariffForm, effective: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowTariffModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    Save Rate
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* 5. Set Budget Modal */}
          <Dialog open={showBudgetModal} onOpenChange={setShowBudgetModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Monthly Budget</DialogTitle>
                <DialogDescription>
                  Define expenditure allocations for the estate operations.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!budgetForm.category || !budgetForm.amount) return;
                  void submit(
                    () =>
                      enterpriseOperationsService.createBudget({
                        estateId,
                        category: budgetForm.category,
                        period: budgetForm.period,
                        budgetMinor: Math.round(Number(budgetForm.amount) * 100),
                        currency: estate.currency,
                        createdBy: currentUserId,
                      }),
                    "Budget saved successfully",
                  ).then(() => {
                    setBudgetForm({ ...budgetForm, amount: "" });
                    setShowBudgetModal(false);
                  });
                }}
                className="space-y-3 py-2"
              >
                <div>
                  <label className="text-xs font-medium text-foreground">Expense Category</label>
                  <NativeSelectControl
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                    value={budgetForm.category}
                    onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                  >
                    {BUDGET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </NativeSelectControl>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Target Month</label>
                  <Input
                    type="month"
                    value={budgetForm.period}
                    onChange={(e) => setBudgetForm({ ...budgetForm, period: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">
                    Allocated Amount ({currency})
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={budgetForm.amount}
                    onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowBudgetModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    Save Budget
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* 6. New Purchase Request Modal */}
          <Dialog open={showProcurementModal} onOpenChange={setShowProcurementModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Purchase Request</DialogTitle>
                <DialogDescription>
                  Request authorization to order equipment, maintenance supplies, or services.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!procurementForm.title) return;
                  void submit(
                    () =>
                      procurementWorkflowService.createRequest({
                        estateId,
                        title: procurementForm.title,
                        description: procurementForm.description,
                        amountMinor: Math.round(Number(procurementForm.amount || 0) * 100),
                        currency: estate.currency,
                        requestedBy: currentUserId,
                      }),
                    "Purchase request submitted",
                  ).then(() => {
                    setProcurementForm({ title: "", amount: "", description: "" });
                    setShowProcurementModal(false);
                  });
                }}
                className="space-y-3 py-2"
              >
                <div>
                  <label className="text-xs font-medium text-foreground">Item / Service Title</label>
                  <Input
                    placeholder="e.g. Replacement water filter cartridges"
                    value={procurementForm.title}
                    onChange={(e) =>
                      setProcurementForm({ ...procurementForm, title: e.target.value })
                    }
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">
                    Estimated Cost ({currency})
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={procurementForm.amount}
                    onChange={(e) =>
                      setProcurementForm({ ...procurementForm, amount: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Notes (Optional)</label>
                  <Input
                    placeholder="Supplier or urgent notes..."
                    value={procurementForm.description}
                    onChange={(e) =>
                      setProcurementForm({ ...procurementForm, description: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProcurementModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    Submit Request
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* 7. Add Contract Modal */}
          <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Vendor Contract</DialogTitle>
                <DialogDescription>
                  Keep vendor agreements, service terms, and contract expiration dates organized.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!contractForm.title || !contractForm.type) return;
                  void submit(
                    () =>
                      enterpriseOperationsService.createContract({
                        estateId,
                        title: contractForm.title,
                        contractType: contractForm.type,
                        startDate: contractForm.start,
                        endDate: contractForm.end || null,
                        valueMinor: Math.round(Number(contractForm.value || 0) * 100),
                        currency: estate.currency,
                        ownerUserId: currentUserId,
                      }),
                    "Contract recorded successfully",
                  ).then(() => {
                    setContractForm({
                      title: "",
                      type: "Maintenance SLA",
                      start: new Date().toISOString().slice(0, 10),
                      end: "",
                      value: "",
                    });
                    setShowContractModal(false);
                  });
                }}
                className="space-y-3 py-2"
              >
                <div>
                  <label className="text-xs font-medium text-foreground">Contract Title</label>
                  <Input
                    placeholder="e.g. Schindler Elevator Annual SLA"
                    value={contractForm.title}
                    onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Service Type</label>
                  <NativeSelectControl
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                    value={contractForm.type}
                    onChange={(e) => setContractForm({ ...contractForm, type: e.target.value })}
                  >
                    {CONTRACT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </NativeSelectControl>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-foreground">Start Date</label>
                    <Input
                      type="date"
                      value={contractForm.start}
                      onChange={(e) => setContractForm({ ...contractForm, start: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">End Date (Optional)</label>
                    <Input
                      type="date"
                      value={contractForm.end}
                      onChange={(e) => setContractForm({ ...contractForm, end: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">
                    Contract Value ({currency})
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={contractForm.value}
                    onChange={(e) => setContractForm({ ...contractForm, value: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowContractModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    Save Contract
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
