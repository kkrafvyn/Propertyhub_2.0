import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Badge } from "../../../components/ui/badge";
import { NativeSelect } from "../../../components/ui/NativeSelect";
import { TextareaField } from "../../../components/ui/TextareaField";
import { EmptyState, ErrorState } from "../../../components/ux";
import {
  revenueManagementService,
  type SubscriptionPlan,
} from "../../../../lib/revenue-management.service";

/** Eight Revenue Architecture offer packages (admin Active + monthly price). */
const OFFER_PACKAGE_KEYS = [
  "property_operations_core",
  "agency_growth_suite",
  "estate_os_integrated",
  "developer_sales_trust",
  "enterprise_reos",
  "diaspora_concierge",
  "campus_hostel",
  "transaction_partner_marketplace",
] as const;

const OFFER_PACKAGE_INDEX = new Map(
  OFFER_PACKAGE_KEYS.map((key, index) => [key, index + 1]),
);

export function SubscriptionPlansEditor() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      setPlans(await revenueManagementService.listPlans());
    } catch (error) {
      console.error(error);
      setLoadError(true);
      toast.error("Unable to load subscription plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const orderedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      const ai = OFFER_PACKAGE_INDEX.get(a.plan_key as (typeof OFFER_PACKAGE_KEYS)[number]);
      const bi = OFFER_PACKAGE_INDEX.get(b.plan_key as (typeof OFFER_PACKAGE_KEYS)[number]);
      if (ai != null && bi != null) return ai - bi;
      if (ai != null) return -1;
      if (bi != null) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name);
    });
  }, [plans]);

  const savePlan = async (plan: SubscriptionPlan) => {
    try {
      setSavingId(plan.id);
      await revenueManagementService.upsertPlan(plan);
      toast.success(`${plan.name} saved.`);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save plan.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading agency plans…</Card>;
  }

  if (loadError) {
    return (
      <ErrorState
        title="Subscription plans unavailable"
        message="Plan settings could not be loaded. No pricing was changed."
        onRetry={() => void load()}
      />
    );
  }

  if (plans.length === 0) {
    return (
      <EmptyState
        title="No subscription plans configured"
        description="Add a plan before inviting agencies or developers to subscribe."
        onAction={() => void load()}
        actionLabel="Refresh plans"
      />
    );
  }

  const packageCount = orderedPlans.filter((plan) => OFFER_PACKAGE_INDEX.has(plan.plan_key as (typeof OFFER_PACKAGE_KEYS)[number])).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Agency &amp; developer plans</h2>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          Eight offer packages from the revenue architecture. Toggle Active for pilot availability, set monthly
          price, and edit the customer-facing features list. Catalog stream toggles live in{" "}
          <Link to="/admin/revenue/catalog" className="text-primary underline-offset-2 hover:underline">
            Revenue Catalog
          </Link>
          .
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {packageCount}/8 architecture packages loaded · inactive packages show as Pilot / OFF
        </p>
      </div>

      {orderedPlans.map((plan) => {
        const packageNum = OFFER_PACKAGE_INDEX.get(plan.plan_key as (typeof OFFER_PACKAGE_KEYS)[number]);
        const isOfferPackage = packageNum != null;

        return (
          <Card key={plan.id} className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {isOfferPackage ? (
                    <span className="text-xs font-mono text-muted-foreground">B{String(packageNum).padStart(2, "0")}</span>
                  ) : null}
                  <h3 className="font-semibold">{plan.name}</h3>
                  {plan.is_active ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Pilot / OFF</Badge>
                  )}
                  {isOfferPackage ? <Badge variant="outline">Offer package</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">{plan.plan_key}</p>
                {plan.description ? (
                  <p className="text-sm text-muted-foreground max-w-2xl">{plan.description}</p>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-sm font-medium shrink-0">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={plan.is_active}
                  onChange={(event) =>
                    setPlans((current) =>
                      current.map((item) =>
                        item.id === plan.id ? { ...item, is_active: event.target.checked } : item,
                      ),
                    )
                  }
                />
                Active
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Plan description"
                value={plan.description || ""}
                onChange={(event) =>
                  setPlans((current) =>
                    current.map((item) =>
                      item.id === plan.id ? { ...item, description: event.target.value } : item,
                    ),
                  )
                }
                placeholder="Description"
              />
              <NativeSelect
                label="Billing cycle"
                value={plan.billing_cycle}
                onChange={(event) =>
                  setPlans((current) =>
                    current.map((item) =>
                      item.id === plan.id
                        ? { ...item, billing_cycle: event.target.value as SubscriptionPlan["billing_cycle"] }
                        : item,
                    ),
                  )
                }
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </NativeSelect>
              <Input
                label={plan.billing_cycle === "monthly" ? "Monthly price" : "Price"}
                type="number"
                value={plan.price_amount ?? ""}
                disabled={plan.is_custom_pricing}
                onChange={(event) =>
                  setPlans((current) =>
                    current.map((item) =>
                      item.id === plan.id
                        ? { ...item, price_amount: event.target.value ? Number(event.target.value) : null }
                        : item,
                    ),
                  )
                }
                placeholder={plan.is_custom_pricing ? "Custom pricing" : "Price"}
              />
              <Input
                label="Currency"
                value={plan.currency}
                onChange={(event) =>
                  setPlans((current) =>
                    current.map((item) =>
                      item.id === plan.id ? { ...item, currency: event.target.value } : item,
                    ),
                  )
                }
                placeholder="Currency"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={plan.is_custom_pricing}
                onChange={(event) =>
                  setPlans((current) =>
                    current.map((item) =>
                      item.id === plan.id
                        ? {
                            ...item,
                            is_custom_pricing: event.target.checked,
                            price_amount: event.target.checked ? null : item.price_amount,
                          }
                        : item,
                    ),
                  )
                }
              />
              Custom / contact-sales pricing
            </label>

            <TextareaField
              label="Plan features"
              description="Enter one customer-facing feature per line."
              className="min-h-24"
              value={(plan.features || []).join("\n")}
              onChange={(event) =>
                setPlans((current) =>
                  current.map((item) =>
                    item.id === plan.id
                      ? { ...item, features: event.target.value.split("\n").filter(Boolean) }
                      : item,
                  ),
                )
              }
              placeholder="One feature per line"
            />

            <div className="flex flex-wrap items-center gap-2">
              {plan.is_custom_pricing ? (
                <Badge variant="secondary">Custom pricing</Badge>
              ) : (
                <Badge variant="outline">
                  {plan.currency} {plan.price_amount ?? "—"}/{plan.billing_cycle}
                </Badge>
              )}
              {!plan.is_active ? <Badge variant="secondary">Pilot / OFF — not sold yet</Badge> : null}
            </div>

            <Button onClick={() => void savePlan(plan)} disabled={savingId === plan.id}>
              {savingId === plan.id ? "Saving…" : "Save plan"}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
