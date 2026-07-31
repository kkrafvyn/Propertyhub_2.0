import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import {
  revenueManagementService,
  type RevenueRule,
} from "../../../../lib/revenue-management.service";
import { LISTING_TYPES } from "./revenue-nav";

type RevenueRuleEditorProps = {
  category: string;
  title: string;
  description: string;
  showListingTypes?: boolean;
  showSecondaryFee?: boolean;
  secondaryLabel?: string;
};

function RuleCard({
  rule,
  showListingTypes,
  showSecondaryFee,
  secondaryLabel,
  onSaved,
}: {
  rule: RevenueRule;
  showListingTypes?: boolean;
  showSecondaryFee?: boolean;
  secondaryLabel?: string;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(rule);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(rule);
  }, [rule]);

  const listingTypes = Array.isArray(draft.applies_to?.listing_types)
    ? (draft.applies_to.listing_types as string[])
    : [];

  const toggleListingType = (type: string) => {
    const next = listingTypes.includes(type)
      ? listingTypes.filter((item) => item !== type)
      : [...listingTypes, type];
    setDraft({
      ...draft,
      applies_to: { ...draft.applies_to, listing_types: next },
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      await revenueManagementService.upsertRule({
        ...draft,
        fee_value: draft.fee_value == null ? null : Number(draft.fee_value),
        fee_value_secondary:
          draft.fee_value_secondary == null ? null : Number(draft.fee_value_secondary),
        min_fee: draft.min_fee == null ? null : Number(draft.min_fee),
        max_fee: draft.max_fee == null ? null : Number(draft.max_fee),
      });
      toast.success(`${draft.label} saved.`);
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save revenue rule.");
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

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Fee type</label>
          <select
            className="w-full rounded-lg border border-border px-3 py-2"
            value={draft.fee_type}
            onChange={(event) =>
              setDraft({ ...draft, fee_type: event.target.value as RevenueRule["fee_type"] })
            }
          >
            <option value="fixed">Fixed</option>
            <option value="percentage">Percentage</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Currency</label>
          <Input
            value={draft.currency}
            onChange={(event) => setDraft({ ...draft, currency: event.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">
            {draft.fee_type === "percentage" ? "Percentage value" : "Amount"}
          </label>
          <Input
            type="number"
            value={draft.fee_value ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, fee_value: event.target.value ? Number(event.target.value) : null })
            }
          />
        </div>
        {showSecondaryFee ? (
          <div>
            <label className="text-sm text-muted-foreground block mb-1">{secondaryLabel || "Secondary value"}</label>
            <Input
              type="number"
              value={draft.fee_value_secondary ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  fee_value_secondary: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </div>
        ) : null}
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Minimum fee</label>
          <Input
            type="number"
            value={draft.min_fee ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, min_fee: event.target.value ? Number(event.target.value) : null })
            }
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Maximum fee</label>
          <Input
            type="number"
            value={draft.max_fee ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, max_fee: event.target.value ? Number(event.target.value) : null })
            }
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Effective from</label>
          <Input
            type="datetime-local"
            value={draft.effective_from ? draft.effective_from.slice(0, 16) : ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                effective_from: event.target.value ? new Date(event.target.value).toISOString() : null,
              })
            }
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Effective until</label>
          <Input
            type="datetime-local"
            value={draft.effective_until ? draft.effective_until.slice(0, 16) : ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                effective_until: event.target.value ? new Date(event.target.value).toISOString() : null,
              })
            }
          />
        </div>
      </div>

      {showListingTypes ? (
        <div>
          <p className="text-sm font-medium mb-2">Apply to</p>
          <div className="flex flex-wrap gap-2">
            {LISTING_TYPES.map((type) => (
              <label key={type.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={listingTypes.includes(type.id)}
                  onChange={() => toggleListingType(type.id)}
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="capitalize">
          {draft.fee_type}
        </Badge>
        {!draft.enabled ? (
          <Badge variant="secondary">Disabled — no fee charged</Badge>
        ) : null}
      </div>

      <Button onClick={() => void save()} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </Card>
  );
}

export function RevenueRuleEditor({
  category,
  title,
  description,
  showListingTypes = false,
  showSecondaryFee = false,
  secondaryLabel,
}: RevenueRuleEditorProps) {
  const [rules, setRules] = useState<RevenueRule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const rows = await revenueManagementService.listRules(category);
      setRules(rows);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load revenue rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [category]);

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading revenue rules…</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {rules.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No rules configured for this category.</Card>
      ) : (
        rules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            showListingTypes={showListingTypes}
            showSecondaryFee={showSecondaryFee}
            secondaryLabel={secondaryLabel}
            onSaved={load}
          />
        ))
      )}
    </div>
  );
}
