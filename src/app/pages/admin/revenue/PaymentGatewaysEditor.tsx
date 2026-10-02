import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { NativeSelect } from "../../../components/ui/NativeSelect";
import { EmptyState, ErrorState } from "../../../components/ux";
import { Badge } from "../../../components/ui/badge";
import {
  revenueManagementService,
  type PaymentGateway,
} from "../../../../lib/revenue-management.service";

export function PaymentGatewaysEditor() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      setGateways(await revenueManagementService.listPaymentGatewaysAdmin());
    } catch (error) {
      console.error(error);
      setLoadError(true);
      toast.error("Unable to load payment gateways.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveGateway = async (gateway: PaymentGateway) => {
    try {
      setSavingId(gateway.id);
      await revenueManagementService.upsertPaymentGateway({
        ...gateway,
        supported_currencies: gateway.supported_currencies || [],
        supported_regions: gateway.supported_regions || [],
      });
      toast.success(`${gateway.display_name} saved.`);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save gateway.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading payment gateways…</Card>;
  }

  if (loadError) {
    return <ErrorState title="Payment gateways unavailable" message="Gateway settings could not be loaded. Existing payment configuration remains unchanged." onRetry={() => void load()} />;
  }

  if (gateways.length === 0) {
    return <EmptyState title="No payment gateways configured" description="Configure at least one payment provider before accepting live payments." onAction={() => void load()} actionLabel="Refresh gateways" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Payment Gateway Configuration</h2>
        <p className="text-muted-foreground mt-1">
          Enable providers and configure platform fee percentages dynamically.
        </p>
      </div>

      {gateways.map((gateway) => (
        <Card key={gateway.id} className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">{gateway.display_name}</h3>
              <p className="text-sm text-muted-foreground">{gateway.gateway_key}</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={gateway.enabled}
                onChange={(event) =>
                  setGateways((current) =>
                    current.map((item) =>
                      item.id === gateway.id ? { ...item, enabled: event.target.checked } : item,
                    ),
                  )
                }
              />
              {gateway.enabled ? "ON" : "OFF"}
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <NativeSelect
              label="Fee type"
              value={gateway.fee_type}
              onChange={(event) =>
                setGateways((current) =>
                  current.map((item) =>
                    item.id === gateway.id
                      ? { ...item, fee_type: event.target.value as PaymentGateway["fee_type"] }
                      : item,
                  ),
                )
              }
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </NativeSelect>
            <Input
              label="Fee value"
              type="number"
              value={gateway.fee_value ?? ""}
              onChange={(event) =>
                setGateways((current) =>
                  current.map((item) =>
                    item.id === gateway.id
                      ? { ...item, fee_value: event.target.value ? Number(event.target.value) : null }
                      : item,
                  ),
                )
              }
              placeholder="Enter fee value"
            />
            <Input
              label="Supported currencies"
              value={(gateway.supported_currencies || []).join(", ")}
              onChange={(event) =>
                setGateways((current) =>
                  current.map((item) =>
                    item.id === gateway.id
                      ? {
                          ...item,
                          supported_currencies: event.target.value
                            .split(",")
                            .map((part) => part.trim())
                            .filter(Boolean),
                        }
                      : item,
                  ),
                )
              }
              placeholder="Currencies (comma-separated)"
            />
            <Input
              label="Supported regions"
              value={(gateway.supported_regions || []).join(", ")}
              onChange={(event) =>
                setGateways((current) =>
                  current.map((item) =>
                    item.id === gateway.id
                      ? {
                          ...item,
                          supported_regions: event.target.value
                            .split(",")
                            .map((part) => part.trim())
                            .filter(Boolean),
                        }
                      : item,
                  ),
                )
              }
              placeholder="Regions (comma-separated)"
            />
            <NativeSelect
              label="Connection status"
              value={gateway.api_status}
              onChange={(event) =>
                setGateways((current) =>
                  current.map((item) =>
                    item.id === gateway.id
                      ? { ...item, api_status: event.target.value as PaymentGateway["api_status"] }
                      : item,
                  ),
                )
              }
            >
              <option value="connected">Connected</option>
              <option value="disconnected">Disconnected</option>
              <option value="unknown">Unknown</option>
              <option value="error">Error</option>
            </NativeSelect>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{gateway.api_status}</Badge>
            <Badge variant="secondary">
              {gateway.fee_type === "percentage" ? `${gateway.fee_value}%` : `${gateway.fee_value}`}
            </Badge>
          </div>

          <Button onClick={() => void saveGateway(gateway)} disabled={savingId === gateway.id}>
            {savingId === gateway.id ? "Saving…" : "Save gateway"}
          </Button>
        </Card>
      ))}
    </div>
  );
}
