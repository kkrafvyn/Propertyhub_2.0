import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { NativeSelect } from "../../../components/ui/NativeSelect";
import {
  revenueManagementService,
  type RevenueRule,
} from "../../../../lib/revenue-management.service";

const PURPOSE_OPTIONS = [
  { id: "sale", label: "sale" },
  { id: "purchase", label: "purchase" },
  { id: "purchase_installment", label: "purchase_installment" },
  { id: "land_sale", label: "land_sale" },
  { id: "rent", label: "rent" },
  { id: "lease_fee", label: "lease_fee" },
  { id: "deposit", label: "deposit" },
  { id: "booking_fee", label: "booking_fee" },
];

const CHARGED_TO_OPTIONS = [
  { id: "seller", label: "Seller" },
  { id: "landlord", label: "Landlord" },
  { id: "buyer", label: "Buyer" },
  { id: "guest", label: "Guest" },
  { id: "host", label: "Host" },
  { id: "lister", label: "Lister" },
];

function PlatformFeeRuleCard({ rule, onSaved }: { rule: RevenueRule; onSaved: () => void }) {
  const [draft, setDraft] = useState(rule);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(rule);
  }, [rule]);

  const purposes = Array.isArray(draft.applies_to?.purposes)
    ? (draft.applies_to.purposes as string[])
    : [];
  const chargedTo = String(draft.applies_to?.charged_to || "seller");
  const tier = String(draft.metadata?.tier || "");

  const togglePurpose = (purpose: string) => {
    const next = purposes.includes(purpose)
      ? purposes.filter((item) => item !== purpose)
      : [...purposes, purpose];
    setDraft({
      ...draft,
      applies_to: { ...draft.applies_to, purposes: next },
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      await revenueManagementService.upsertRule({
        ...draft,
        fee_value: draft.fee_value == null ? null : Number(draft.fee_value),
        min_fee: draft.min_fee == null ? null : Number(draft.min_fee),
        max_fee: draft.max_fee == null ? null : Number(draft.max_fee),
        applies_to: {
          ...draft.applies_to,
          purposes,
          charged_to: chargedTo,
        },
        metadata: {
          ...draft.metadata,
          fee_name: "BaytMiftah platform fee",
          tier: tier || undefined,
        },
      });
      toast.success(`${draft.label} saved.`);
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save platform fee rule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{draft.label}</h3>
          <p className="text-sm text-muted-foreground">{draft.rule_key}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
          />
          {draft.enabled ? "ON" : "OFF"}
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <NativeSelect
            label="Fee type"
            value={draft.fee_type}
            onChange={(event) =>
              setDraft({ ...draft, fee_type: event.target.value as RevenueRule["fee_type"] })
            }
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </NativeSelect>
        </div>
        <div>
          <Input
            label={draft.fee_type === "percentage" ? "Rate %" : "Amount"}
            type="number"
            step="0.1"
            value={draft.fee_value ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                fee_value: event.target.value ? Number(event.target.value) : null,
              })
            }
          />
        </div>
        <div>
          <NativeSelect
            label="Charged to"
            value={chargedTo}
            onChange={(event) =>
              setDraft({
                ...draft,
                applies_to: { ...draft.applies_to, charged_to: event.target.value },
              })
            }
          >
            {CHARGED_TO_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <NativeSelect
            label="Pricing tier tag"
            value={tier}
            onChange={(event) =>
              setDraft({
                ...draft,
                metadata: { ...draft.metadata, tier: event.target.value || undefined },
              })
            }
          >
            <option value="">Any / untiered</option>
            <option value="founding">Founding</option>
            <option value="standard">Standard</option>
          </NativeSelect>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Applies to checkout purposes</p>
        <div className="flex flex-wrap gap-2">
          {PURPOSE_OPTIONS.map((purpose) => (
            <label key={purpose.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={purposes.includes(purpose.id)}
                onChange={() => togglePurpose(purpose.id)}
              />
              {purpose.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{draft.fee_type}</Badge>
        <Badge variant="outline" className="capitalize">
          charged to {chargedTo}
        </Badge>
        {tier ? (
          <Badge variant="secondary" className="capitalize">
            {tier}
          </Badge>
        ) : null}
      </div>

      <Button onClick={() => void save()} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </Card>
  );
}

export function PlatformPricingEditor() {
  const [rules, setRules] = useState<RevenueRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTier, setSavingTier] = useState(false);
  const [activeTier, setActiveTier] = useState<"founding" | "standard">("founding");
  const [displayName, setDisplayName] = useState("BaytMiftah platform fee");
  const [feesEnabled, setFeesEnabled] = useState(true);
  const [taxesEnabled, setTaxesEnabled] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [platformRules, settings] = await Promise.all([
        revenueManagementService.listRules("platform_fees"),
        revenueManagementService.getSettings(),
      ]);
      setRules(platformRules);
      const tier = String(settings.active_pricing_tier || "founding").replace(/"/g, "");
      setActiveTier(tier === "standard" ? "standard" : "founding");
      setDisplayName(
        String(settings.platform_fee_display_name || "BaytMiftah platform fee")
          .replace(/^"/, "")
          .replace(/"$/, ""),
      );
      const feeOn = settings.platform_fees_enabled;
      setFeesEnabled(
        !(feeOn === false || feeOn === "false" || String(feeOn).replace(/"/g, "") === "false"),
      );
      const taxOn = settings.checkout_taxes_enabled;
      setTaxesEnabled(
        !(taxOn === false || taxOn === "false" || String(taxOn).replace(/"/g, "") === "false"),
      );
    } catch (error) {
      console.error(error);
      toast.error("Unable to load platform pricing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveTier = async () => {
    try {
      setSavingTier(true);
      await Promise.all([
        revenueManagementService.setSetting(
          "active_pricing_tier",
          activeTier,
          "Active commercial tier: founding | standard",
        ),
        revenueManagementService.setSetting(
          "platform_fee_display_name",
          displayName,
          "Checkout label for marketplace platform fee",
        ),
        revenueManagementService.setSetting(
          "platform_fees_enabled",
          feesEnabled,
          "Master switch: when false, BaytMiftah platform/service fees are not charged or withheld",
        ),
        revenueManagementService.setSetting(
          "checkout_taxes_enabled",
          taxesEnabled,
          "Master switch: when false, checkout does not add/show statutory tax estimates",
        ),
      ]);
      toast.success("Pricing settings saved.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to save pricing tier.");
    } finally {
      setSavingTier(false);
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading platform pricing…</Card>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Platform Pricing</h2>
        <p className="text-muted-foreground mt-1">
          BaytMiftah marketplace/service fees — not a property tax. PayAngels processing fees are
          configured under Payment Settings. VAT/NHIL/GETFund estimates apply to this platform fee
          only.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Master switches</h3>
        <p className="text-sm text-muted-foreground">
          Turn fees and taxes off globally when operators are not authorized to add them to payments.
          Individual companies and landlord workspaces can further disable under International Rules.
        </p>
        <label className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
          <div>
            <p className="font-medium text-sm">BaytMiftah platform fees</p>
            <p className="text-xs text-muted-foreground">
              When off, no marketplace fee is charged to buyers or withheld from sellers/landlords.
            </p>
          </div>
          <input
            type="checkbox"
            className="h-5 w-9 accent-emerald-600"
            role="switch"
            checked={feesEnabled}
            onChange={(event) => setFeesEnabled(event.target.checked)}
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
          <div>
            <p className="font-medium text-sm">Checkout taxes &amp; levies</p>
            <p className="text-xs text-muted-foreground">
              When off, VAT/NHIL/GETFund and similar estimates are not shown or applied on checkout.
            </p>
          </div>
          <input
            type="checkbox"
            className="h-5 w-9 accent-emerald-600"
            role="switch"
            checked={taxesEnabled}
            onChange={(event) => setTaxesEnabled(event.target.checked)}
          />
        </label>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Active commercial tier</h3>
        <p className="text-sm text-muted-foreground">
          Founding selects lower-rate rules tagged founding (e.g. 1% sale). Standard selects 1.5%
          sale rules. Change rates below anytime — no redeploy required.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <NativeSelect
              label="Active tier"
              value={activeTier}
              onChange={(event) =>
                setActiveTier(event.target.value === "standard" ? "standard" : "founding")
              }
            >
              <option value="founding">Founding</option>
              <option value="standard">Standard</option>
            </NativeSelect>
          </div>
          <div>
            <Input label="Checkout display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </div>
        </div>
        <Button onClick={() => void saveTier()} disabled={savingTier}>
          {savingTier ? "Saving…" : "Save tier settings"}
        </Button>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Purpose schedule</h3>
        {rules.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            No platform fee rules yet. Apply migration `2026091313_platform_service_fee_schedule`.
          </Card>
        ) : (
          rules.map((rule) => (
            <PlatformFeeRuleCard key={rule.id} rule={rule} onSaved={load} />
          ))
        )}
      </div>

      <Card className="p-5 space-y-2">
        <h3 className="font-semibold">Short-stay & legacy</h3>
        <p className="text-sm text-muted-foreground">
          Guest/host short-stay fees stay disabled until launch. Legacy catch-all lives under
          Transaction Fees (fallback only).
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/revenue/booking-fees">
            <Button variant="outline">Booking Fees</Button>
          </Link>
          <Link to="/admin/revenue/transaction-fees">
            <Button variant="outline">Legacy Transaction Fees</Button>
          </Link>
          <Link to="/admin/revenue/payment-settings">
            <Button variant="outline">PayAngels processing</Button>
          </Link>
          <Link to="/admin/revenue/agency-plans">
            <Button variant="outline">Agent / developer plans</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
