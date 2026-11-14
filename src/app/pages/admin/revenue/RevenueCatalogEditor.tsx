import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { NativeSelectControl } from "../../../components/ui/NativeSelect";
import {
  revenueManagementService,
  type FeeType,
  type RevenueRule,
} from "../../../../lib/revenue-management.service";

const GROUP_LABELS: Record<string, string> = {
  bundles: "Offer bundles",
  payments: "Payments & platform fees",
  saas: "Software subscriptions",
  listings: "Listings & marketing",
  trust: "Trust & verification",
  marketplace: "Marketplace commissions",
  partners: "Partner referrals",
  services: "Professional services",
  vertical: "Estates & vertical OS",
  enterprise: "Enterprise",
  ai: "AI & automation",
  messaging: "Messaging credits",
  ecosystem: "Ecosystem & data",
  other: "Other",
};

const GROUP_ORDER = [
  "bundles",
  "payments",
  "saas",
  "listings",
  "trust",
  "marketplace",
  "partners",
  "services",
  "vertical",
  "enterprise",
  "ai",
  "messaging",
  "ecosystem",
  "other",
];

const STAGE_ORDER = ["now", "next", "later", "not_now"] as const;

type QuickFilter = "all" | "payments" | "saas" | "bundles";

function stageOf(rule: RevenueRule) {
  return String(rule.metadata?.stage || "later").toLowerCase();
}

function groupOf(rule: RevenueRule) {
  return String(rule.metadata?.group || "other").toLowerCase();
}

function architectureLabel(rule: RevenueRule) {
  const id = rule.metadata?.architecture_id ?? rule.metadata?.stream_id;
  if (id == null) return null;
  const raw = String(id);
  if (raw.startsWith("bundle-")) return raw.replace("bundle-", "B");
  const num = Number(raw);
  if (Number.isFinite(num)) return String(num).padStart(2, "0");
  return raw;
}

function StageBadge({ stage }: { stage: string }) {
  const variant =
    stage === "now" ? "success" : stage === "next" ? "warning" : "secondary";
  return (
    <Badge variant={variant as "success" | "warning" | "secondary"} className="uppercase text-[10px]">
      {stage.replace("_", " ")}
    </Badge>
  );
}

type DraftRule = RevenueRule & { dirty?: boolean };

function CatalogRow({
  rule,
  onChange,
  onSave,
  onToggle,
  saving,
}: {
  rule: DraftRule;
  onChange: (next: DraftRule) => void;
  onSave: () => void;
  onToggle: (enabled: boolean) => void;
  saving: boolean;
}) {
  const description = String(rule.metadata?.description || "");
  const priceHint = String(rule.metadata?.price_hint || "");
  const planKey = String(rule.metadata?.plan_key || rule.applies_to?.plan_key || "");
  const arch = architectureLabel(rule);

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {arch ? <span className="text-xs font-mono text-muted-foreground">#{arch}</span> : null}
            <h3 className="font-semibold text-sm sm:text-base">{rule.label}</h3>
            <StageBadge stage={stageOf(rule)} />
            <Badge variant={rule.enabled ? "success" : "secondary"}>{rule.enabled ? "ON" : "OFF"}</Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{rule.rule_key}</p>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {priceHint ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">Suggested range: {priceHint}</p>
          ) : null}
          {planKey ? (
            <Link
              to="/admin/revenue/agency-plans"
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Edit matching plan ({planKey})
            </Link>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm font-medium shrink-0">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={rule.enabled}
            onChange={(event) => onToggle(event.target.checked)}
            disabled={saving}
          />
          Charge this stream
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Fee type</label>
          <NativeSelectControl
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            value={rule.fee_type}
            onChange={(event) =>
              onChange({ ...rule, fee_type: event.target.value as FeeType, dirty: true })
            }
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
            <option value="tiered">Tiered</option>
            <option value="custom">Custom / quote</option>
          </NativeSelectControl>
        </div>
        <div>
          <Input
            label={rule.fee_type === "percentage" ? "Rate %" : "Price"}
            type="number"
            step="0.01"
            value={rule.fee_value ?? ""}
            onChange={(event) =>
              onChange({
                ...rule,
                fee_value: event.target.value === "" ? null : Number(event.target.value),
                dirty: true,
              })
            }
          />
        </div>
        <div>
          <Input
            label="Secondary (optional)"
            type="number"
            step="0.01"
            value={rule.fee_value_secondary ?? ""}
            onChange={(event) =>
              onChange({
                ...rule,
                fee_value_secondary: event.target.value === "" ? null : Number(event.target.value),
                dirty: true,
              })
            }
          />
        </div>
        <div>
          <Input
            label="Min fee"
            type="number"
            step="0.01"
            value={rule.min_fee ?? ""}
            onChange={(event) =>
              onChange({
                ...rule,
                min_fee: event.target.value === "" ? null : Number(event.target.value),
                dirty: true,
              })
            }
          />
        </div>
        <div>
          <Input
            label="Max fee"
            type="number"
            step="0.01"
            value={rule.max_fee ?? ""}
            onChange={(event) =>
              onChange({
                ...rule,
                max_fee: event.target.value === "" ? null : Number(event.target.value),
                dirty: true,
              })
            }
          />
        </div>
        <div>
          <Input
            label="Currency"
            value={rule.currency}
            onChange={(event) =>
              onChange({ ...rule, currency: event.target.value.toUpperCase(), dirty: true })
            }
          />
        </div>
        <div className="flex items-end">
          <Button
            variant={rule.dirty ? "gradient" : "outline"}
            size="sm"
            className="w-full"
            disabled={saving || !rule.dirty}
            onClick={() => void onSave()}
          >
            {saving ? "Saving…" : rule.dirty ? "Save price" : "Saved"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RevenueCatalogEditor() {
  const [rules, setRules] = useState<DraftRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await revenueManagementService.listRules();
      setRules(data.map((rule) => ({ ...rule, dirty: false })));
    } catch (error) {
      console.error(error);
      toast.error("Unable to load revenue catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return rules.filter((rule) => {
      if (quickFilter === "payments" && groupOf(rule) !== "payments") return false;
      if (quickFilter === "saas" && groupOf(rule) !== "saas") return false;
      if (quickFilter === "bundles" && groupOf(rule) !== "bundles") return false;
      if (filterStage !== "all" && stageOf(rule) !== filterStage) return false;
      if (filterGroup !== "all" && groupOf(rule) !== filterGroup) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${rule.label} ${rule.rule_key} ${rule.category} ${String(rule.metadata?.description || "")} ${String(rule.metadata?.price_hint || "")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rules, filterStage, filterGroup, quickFilter, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, DraftRule[]>();
    for (const rule of filtered) {
      const key = groupOf(rule);
      const list = map.get(key) || [];
      list.push(rule);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
    }
    return [...map.entries()].sort((a, b) => {
      const ai = GROUP_ORDER.indexOf(a[0]);
      const bi = GROUP_ORDER.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a[0].localeCompare(b[0]);
    });
  }, [filtered]);

  const patchLocal = (ruleKey: string, next: DraftRule) => {
    setRules((prev) => prev.map((rule) => (rule.rule_key === ruleKey ? next : rule)));
  };

  const saveRule = async (rule: DraftRule) => {
    try {
      setSavingKey(rule.rule_key);
      await revenueManagementService.upsertRule({
        rule_key: rule.rule_key,
        label: rule.label,
        category: rule.category,
        enabled: rule.enabled,
        fee_type: rule.fee_type,
        fee_value: rule.fee_value,
        fee_value_secondary: rule.fee_value_secondary,
        currency: rule.currency || "GHS",
        min_fee: rule.min_fee,
        max_fee: rule.max_fee,
        applies_to: rule.applies_to,
        metadata: rule.metadata,
        sort_order: rule.sort_order,
        id: rule.id,
      });
      toast.success(`${rule.label} saved.`);
      patchLocal(rule.rule_key, { ...rule, dirty: false });
    } catch (error) {
      console.error(error);
      toast.error("Unable to save stream.");
    } finally {
      setSavingKey(null);
    }
  };

  const toggleRule = async (rule: DraftRule, enabled: boolean) => {
    try {
      setSavingKey(rule.rule_key);
      await revenueManagementService.setRuleEnabled(rule.rule_key, enabled);
      toast.success(`${rule.label} ${enabled ? "enabled" : "disabled"}.`);
      patchLocal(rule.rule_key, { ...rule, enabled, dirty: false });
    } catch (error) {
      console.error(error);
      toast.error("Unable to update toggle.");
    } finally {
      setSavingKey(null);
    }
  };

  const bulkSetStage = async (stage: string, enabled: boolean) => {
    const targets = rules.filter((rule) => stageOf(rule) === stage && rule.enabled !== enabled);
    if (targets.length === 0) {
      toast.message(`No ${stage} streams to ${enabled ? "enable" : "disable"}.`);
      return;
    }
    const ok = window.confirm(
      `${enabled ? "Enable" : "Disable"} ${targets.length} “${stage}” stream(s)? Checkout only charges enabled fees.`,
    );
    if (!ok) return;
    try {
      setBulkBusy(true);
      for (const rule of targets) {
        await revenueManagementService.setRuleEnabled(rule.rule_key, enabled);
      }
      toast.success(`${enabled ? "Enabled" : "Disabled"} ${targets.length} ${stage} stream(s).`);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Bulk update failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revenue catalog</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Decide which payment streams and offer packages BaytMiftah charges. Toggle each on or off and set
          the price. Checkout only applies enabled fees. Agency &amp; Developer Plans still edit subscription
          package details.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="success">{enabledCount} ON</Badge>
          <Badge variant="secondary">{rules.length - enabledCount} OFF</Badge>
          <span className="text-muted-foreground">{rules.length} streams in catalog</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["payments", "Payments only"],
              ["saas", "SaaS"],
              ["bundles", "Bundles"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={quickFilter === id ? "gradient" : "outline"}
              onClick={() => {
                setQuickFilter(id);
                if (id !== "all") setFilterGroup("all");
              }}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={bulkBusy || loading}
            onClick={() => void bulkSetStage("now", true)}
          >
            Enable all Now-stage
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkBusy || loading}
            onClick={() => void bulkSetStage("later", false)}
          >
            Disable all Later
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkBusy || loading}
            onClick={() => void bulkSetStage("not_now", false)}
          >
            Disable all Not now
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Search"
            placeholder="Sale fee, estate, WhatsApp…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Stage</label>
            <NativeSelectControl
              className="w-full rounded-lg border border-border px-3 py-2"
              value={filterStage}
              onChange={(event) => setFilterStage(event.target.value)}
            >
              <option value="all">All stages</option>
              {STAGE_ORDER.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </NativeSelectControl>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Group</label>
            <NativeSelectControl
              className="w-full rounded-lg border border-border px-3 py-2"
              value={filterGroup}
              onChange={(event) => {
                setFilterGroup(event.target.value);
                if (event.target.value !== "all") setQuickFilter("all");
              }}
            >
              <option value="all">All groups</option>
              {Object.entries(GROUP_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </NativeSelectControl>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-sm text-muted-foreground">Loading revenue catalog…</Card>
      ) : grouped.length === 0 ? (
        <Card className="p-8 text-sm text-muted-foreground">
          No streams match. Apply migrations{" "}
          <code>20261114120000_revenue_architecture_catalog</code> and{" "}
          <code>20261114140000_revenue_architecture_gaps_and_bundles</code> if the catalog is empty.
        </Card>
      ) : (
        grouped.map(([group, list]) => (
          <section key={group} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{GROUP_LABELS[group] || group}</h2>
              <span className="text-xs text-muted-foreground">
                {list.filter((r) => r.enabled).length}/{list.length} on
              </span>
            </div>
            <div className="space-y-3">
              {list.map((rule) => (
                <CatalogRow
                  key={rule.rule_key}
                  rule={rule}
                  saving={savingKey === rule.rule_key}
                  onChange={(next) => patchLocal(rule.rule_key, next)}
                  onSave={() => {
                    const latest = rules.find((r) => r.rule_key === rule.rule_key) || rule;
                    void saveRule(latest);
                  }}
                  onToggle={(enabled) => {
                    const latest = rules.find((r) => r.rule_key === rule.rule_key) || rule;
                    void toggleRule(latest, enabled);
                  }}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
