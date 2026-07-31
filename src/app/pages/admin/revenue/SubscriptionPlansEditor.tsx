import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Badge } from "../../../components/ui/badge";
import {
  revenueManagementService,
  type SubscriptionPlan,
} from "../../../../lib/revenue-management.service";

export function SubscriptionPlansEditor() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setPlans(await revenueManagementService.listPlans());
    } catch (error) {
      console.error(error);
      toast.error("Unable to load subscription plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Agency Subscription Plans</h2>
        <p className="text-muted-foreground mt-1">
          Configure Starter, Professional, and Enterprise pricing without redeploying.
        </p>
      </div>

      {plans.map((plan) => (
        <Card key={plan.id} className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.plan_key}</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={plan.is_active}
                onChange={(event) =>
                  setPlans((current) =>
                    current.map((item) =>
                      item.id === plan.id ? { ...item, is_active: event.target.checked } : item,
                    ),
                  )
                }
              />
              {plan.is_active ? "ON" : "OFF"}
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
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
            <select
              className="w-full rounded-lg border border-border px-3 py-2"
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
            </select>
            <Input
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
                      ? { ...item, is_custom_pricing: event.target.checked, price_amount: event.target.checked ? null : item.price_amount }
                      : item,
                  ),
                )
              }
            />
            Custom / contact-sales pricing
          </label>

          <textarea
            className="w-full min-h-24 rounded-lg border border-border px-3 py-2 text-sm"
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

          <div className="flex items-center gap-2">
            {plan.is_custom_pricing ? (
              <Badge variant="secondary">Custom pricing</Badge>
            ) : (
              <Badge variant="outline">
                {plan.currency} {plan.price_amount}/{plan.billing_cycle}
              </Badge>
            )}
          </div>

          <Button onClick={() => void savePlan(plan)} disabled={savingId === plan.id}>
            {savingId === plan.id ? "Saving…" : "Save plan"}
          </Button>
        </Card>
      ))}
    </div>
  );
}
