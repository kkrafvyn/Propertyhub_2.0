import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CreditCard, Loader2, ReceiptText, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import type { Database } from "../../../lib/database.types";
import {
  formatMinorCurrency,
  getWorkspaceAccessState,
  subscriptionService,
  type OrganizationBillingOverview,
  type SubscriptionTier,
} from "../../../lib/subscription.service";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type MemberRole = Database["public"]["Tables"]["organization_members"]["Row"]["role"];

interface WorkspaceBillingProps {
  organization: Organization;
  currentRole: MemberRole | null;
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusVariant(status?: string | null) {
  switch (status) {
    case "active":
      return "default";
    case "grace_period":
    case "cancelled":
      return "secondary";
    case "suspended":
    case "past_due":
      return "destructive";
    default:
      return "outline";
  }
}

export function WorkspaceBilling({ organization, currentRole }: WorkspaceBillingProps) {
  const canManageBilling = currentRole === "owner";
  const [loading, setLoading] = useState(true);
  const [workingAction, setWorkingAction] = useState<string | null>(null);
  const [billing, setBilling] = useState<OrganizationBillingOverview | null>(null);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);

  const loadBilling = async () => {
    try {
      setLoading(true);
      const [overview, tierRows] = await Promise.all([
        subscriptionService.getOrganizationBillingOverview(organization.id),
        subscriptionService.getSubscriptionTiers(),
      ]);
      setBilling(overview);
      setTiers(tierRows);
    } catch (error) {
      console.error("Failed to load billing:", error);
      toast.error("Unable to load billing details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBilling();
  }, [organization.id]);

  const accessState = useMemo(
    () => getWorkspaceAccessState(billing?.subscription || null),
    [billing?.subscription]
  );

  const runAction = async (
    action: "cancel_at_period_end" | "resume" | "retry_payment" | "manage_payment_method",
    tierId?: string
  ) => {
    if (!canManageBilling) {
      toast.error("Only the organization owner can manage billing.");
      return;
    }

    try {
      setWorkingAction(action);
      const result = await subscriptionService.manageOrganizationSubscription({
        organizationId: organization.id,
        action,
        tierId,
      });

      if (result.authorizationUrl) {
        window.location.assign(result.authorizationUrl);
        return;
      }

      if (result.manageUrl) {
        window.location.assign(result.manageUrl);
        return;
      }

      toast.success("Billing updated.");
      await loadBilling();
    } catch (error) {
      console.error("Billing action failed:", error);
      toast.error("That billing action could not be completed.");
    } finally {
      setWorkingAction(null);
    }
  };

  const changeTier = async (tierId: string) => {
    if (!canManageBilling || tierId === billing?.tier?.id) return;

    try {
      setWorkingAction(`tier:${tierId}`);
      await subscriptionService.manageOrganizationSubscription({
        organizationId: organization.id,
        action: "change_tier",
        tierId,
      });
      toast.success("Tier change scheduled.");
      await loadBilling();
    } catch (error) {
      console.error("Tier change failed:", error);
      toast.error("We couldn't schedule that tier change.");
    } finally {
      setWorkingAction(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
        Loading billing...
      </Card>
    );
  }

  const subscription = billing?.subscription || null;
  const tier = billing?.tier || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Billing</h1>
          <p className="mt-2 text-muted-foreground">
            Manage the subscription that controls access for {organization.name}.
          </p>
        </div>
        {subscription ? (
          <Badge variant={getStatusVariant(subscription.status)} className="capitalize">
            {subscription.status.replaceAll("_", " ")}
          </Badge>
        ) : null}
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Current subscription</h2>
            </div>
            <p className="text-muted-foreground">{accessState.message}</p>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-sm text-muted-foreground">Tier</p>
                <p className="mt-1 text-lg font-semibold">{tier?.name || "Not active"}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="mt-1 text-lg font-semibold">
                  {tier ? `${formatMinorCurrency(tier.price_minor, tier.currency)}/mo` : "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-sm text-muted-foreground">Renewal / access ends</p>
                <p className="mt-1 text-lg font-semibold">
                  {formatDate(subscription?.current_period_end)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button
              onClick={() => void runAction("retry_payment")}
              disabled={!canManageBilling || workingAction === "retry_payment"}
            >
              <RotateCcw className="h-4 w-4" />
              {subscription?.status === "active" ? "Prepay / retry" : "Retry payment"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void runAction("manage_payment_method")}
              disabled={!canManageBilling || workingAction === "manage_payment_method"}
            >
              Update payment method
            </Button>
            {subscription?.cancel_at_period_end ? (
              <Button
                variant="outline"
                onClick={() => void runAction("resume")}
                disabled={!canManageBilling || workingAction === "resume"}
              >
                Resume renewal
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => void runAction("cancel_at_period_end")}
                disabled={!canManageBilling || workingAction === "cancel_at_period_end"}
              >
                Cancel renewal
              </Button>
            )}
          </div>
        </div>

        {!canManageBilling ? (
          <p className="mt-5 rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            Billing actions are owner-only. Your role can view status but cannot change the plan.
          </p>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {tiers.map((tierOption) => {
          const current = tierOption.id === tier?.id;
          const pending = tierOption.id === billing?.pendingTier?.id;

          return (
            <Card key={tierOption.id} className="p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{tierOption.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatMinorCurrency(tierOption.price_minor, tierOption.currency)}/month
                  </p>
                </div>
                {current ? <Badge>Current</Badge> : pending ? <Badge variant="secondary">Pending</Badge> : null}
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Seats:{" "}
                  {tierOption.agent_seat_limit == null ? "Unlimited" : tierOption.agent_seat_limit}
                </p>
                <p>
                  Active listings:{" "}
                  {tierOption.active_listing_limit == null
                    ? "Unlimited"
                    : tierOption.active_listing_limit}
                </p>
              </div>
              <Button
                className="mt-5 w-full"
                variant={current ? "outline" : "default"}
                disabled={!canManageBilling || current || workingAction === `tier:${tierOption.id}`}
                onClick={() => void changeTier(tierOption.id)}
              >
                {current ? "Current plan" : pending ? "Change scheduled" : "Switch plan"}
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Payment history</h2>
          </div>
          {billing?.payments.length ? (
            <div className="space-y-3">
              {billing.payments.map((payment) => (
                <div key={payment.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{payment.provider_reference}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMinorCurrency(payment.amount_minor, payment.currency)} -{" "}
                        {formatDate(payment.paid_at || payment.created_at)}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(payment.status)}>{payment.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No subscription payments recorded yet.
            </p>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Billing events</h2>
          </div>
          {billing?.events.length ? (
            <div className="space-y-3">
              {billing.events.map((event) => (
                <div key={event.id} className="rounded-xl border border-border p-4">
                  <p className="font-medium capitalize">{event.event_type.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{event.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(event.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Billing events will appear here as checkout, renewals, and admin actions occur.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
