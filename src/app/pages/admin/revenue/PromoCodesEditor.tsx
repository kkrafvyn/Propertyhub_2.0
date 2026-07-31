import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Badge } from "../../../components/ui/badge";
import {
  revenueManagementService,
  type PromoCode,
} from "../../../../lib/revenue-management.service";

const EMPTY_PROMO: Partial<PromoCode> = {
  code: "",
  label: "",
  discount_type: "percentage",
  discount_value: 10,
  applies_to: "any",
  currency: "GHS",
  is_active: true,
};

export function PromoCodesEditor() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [draft, setDraft] = useState<Partial<PromoCode>>(EMPTY_PROMO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setPromos(await revenueManagementService.listPromoCodes());
    } catch (error) {
      console.error(error);
      toast.error("Unable to load promo codes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!draft.code?.trim()) {
      toast.error("Promo code is required.");
      return;
    }
    try {
      setSaving(true);
      await revenueManagementService.upsertPromoCode({
        ...draft,
        code: draft.code.trim().toUpperCase(),
        discount_value: Number(draft.discount_value || 0),
      } as PromoCode);
      toast.success("Promo code saved.");
      setDraft(EMPTY_PROMO);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save promo code.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading promo codes…</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Promo Codes</h2>
        <p className="text-muted-foreground mt-1">Create and manage platform promotions.</p>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Create / update promo</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={draft.code || ""}
            onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })}
            placeholder="NEWAGENCY50"
          />
          <Input
            value={draft.label || ""}
            onChange={(event) => setDraft({ ...draft, label: event.target.value })}
            placeholder="Label"
          />
          <select
            className="w-full rounded-lg border border-border px-3 py-2"
            value={draft.discount_type}
            onChange={(event) =>
              setDraft({ ...draft, discount_type: event.target.value as PromoCode["discount_type"] })
            }
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
          <Input
            type="number"
            value={draft.discount_value ?? ""}
            onChange={(event) => setDraft({ ...draft, discount_value: Number(event.target.value) })}
            placeholder="Discount value"
          />
          <Input
            value={draft.applies_to || ""}
            onChange={(event) => setDraft({ ...draft, applies_to: event.target.value })}
            placeholder="Applies to (e.g. agency_pro)"
          />
          <Input
            type="datetime-local"
            value={draft.expires_at ? draft.expires_at.slice(0, 16) : ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                expires_at: event.target.value ? new Date(event.target.value).toISOString() : null,
              })
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.is_active ?? true}
            onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })}
          />
          Active
        </label>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save promo code"}
        </Button>
      </Card>

      <div className="space-y-3">
        {promos.map((promo) => (
          <Card key={promo.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{promo.code}</p>
              <p className="text-sm text-muted-foreground">
                {promo.label || promo.applies_to} ·{" "}
                {promo.discount_type === "percentage"
                  ? `${promo.discount_value}% OFF`
                  : `${promo.currency} ${promo.discount_value} OFF`}
              </p>
              {promo.expires_at ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Expires {new Date(promo.expires_at).toLocaleDateString()}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={promo.is_active ? "default" : "outline"}>
                {promo.is_active ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="secondary">{promo.uses_count} uses</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
