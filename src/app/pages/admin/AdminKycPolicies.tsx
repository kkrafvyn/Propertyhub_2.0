import { useEffect, useState } from "react";
import { Globe, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { platformKycService } from "../../../lib/platform-kyc.service";
import type { PlatformKycPolicy } from "../../../lib/kyc-gate.service";

export function AdminKycPolicies() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PlatformKycPolicy[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      setPolicies(await platformKycService.listPolicies());
    } catch (error) {
      console.error(error);
      toast.error("Unable to load platform KYC policies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updatePolicy = (jurisdictionId: string, patch: Partial<PlatformKycPolicy>) => {
    setPolicies((current) =>
      current.map((policy) =>
        policy.jurisdiction_id === jurisdictionId ? { ...policy, ...patch } : policy,
      ),
    );
  };

  const savePolicy = async (policy: PlatformKycPolicy) => {
    try {
      setSavingId(policy.jurisdiction_id);
      await platformKycService.updatePolicy(policy.jurisdiction_id, {
        consumer_booking_required: policy.consumer_booking_required,
        workspace_enrollment_required: policy.workspace_enrollment_required,
        provider_engine: policy.provider_engine,
        enabled: policy.enabled,
      });
      toast.success(`${policy.label} KYC policy updated.`);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save KYC policy.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="flex min-h-[200px] items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold">Country KYC policies</h3>
          <p className="text-sm text-muted-foreground">
            Configure which markets require identity verification for bookings and workspace enrollment, and
            which verification engine applies.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4">Market</th>
              <th className="py-2 pr-4">Consumer booking</th>
              <th className="py-2 pr-4">Workspace enrollment</th>
              <th className="py-2 pr-4">KYC engine</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.jurisdiction_id} className="border-b border-border/60">
                <td className="py-3 pr-4">
                  <div className="font-medium">{policy.label}</div>
                  <div className="text-xs text-muted-foreground">{policy.jurisdiction_id}</div>
                </td>
                <td className="py-3 pr-4">
                  <input
                    type="checkbox"
                    checked={policy.consumer_booking_required}
                    onChange={(event) =>
                      updatePolicy(policy.jurisdiction_id, {
                        consumer_booking_required: event.target.checked,
                      })
                    }
                  />
                </td>
                <td className="py-3 pr-4">
                  <input
                    type="checkbox"
                    checked={policy.workspace_enrollment_required}
                    onChange={(event) =>
                      updatePolicy(policy.jurisdiction_id, {
                        workspace_enrollment_required: event.target.checked,
                      })
                    }
                  />
                </td>
                <td className="py-3 pr-4">
                  <input
                    className="app-input w-full min-w-[160px]"
                    value={policy.provider_engine}
                    onChange={(event) =>
                      updatePolicy(policy.jurisdiction_id, { provider_engine: event.target.value })
                    }
                  />
                </td>
                <td className="py-3 pr-4">
                  <Badge variant={policy.enabled ? "default" : "outline"}>
                    {policy.enabled ? "Active" : "Disabled"}
                  </Badge>
                </td>
                <td className="py-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingId === policy.jurisdiction_id}
                    onClick={() => void savePolicy(policy)}
                  >
                    {savingId === policy.jurisdiction_id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
