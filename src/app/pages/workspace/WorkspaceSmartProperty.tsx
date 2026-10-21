import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { leaseService } from "../../../lib/lease.service";
import { smartDeviceService, type SmartDeviceType } from "../../../lib/smart-device.service";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

const DEVICE_TYPES: SmartDeviceType[] = [
  "door_lock",
  "thermostat",
  "energy_meter",
  "water_meter",
  "camera",
  "other",
];

export function WorkspaceSmartProperty({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [leases, setLeases] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [accessByLease, setAccessByLease] = useState<Record<string, any>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deviceForm, setDeviceForm] = useState({
    listingId: "",
    leaseId: "",
    deviceType: "door_lock" as SmartDeviceType,
    label: "",
    room: "",
  });

  const activeLeases = useMemo(
    () => leases.filter((lease) => lease.status === "active" && lease.tenant_user_id),
    [leases]
  );

  const loadState = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [leaseRows, deviceRows] = await Promise.all([
        leaseService.getOrganizationLeases(organizationId),
        smartDeviceService.getOrganizationDevices(organizationId),
      ]);
      setLeases(leaseRows || []);
      setDevices(deviceRows || []);

      const profiles = await Promise.all(
        (leaseRows || []).map(async (lease: any) => {
          const profile = await smartDeviceService.getLeaseAccessProfile(lease.id).catch(() => null);
          return [lease.id, profile] as const;
        })
      );
      setAccessByLease(Object.fromEntries(profiles));
    } catch (error) {
      console.error(error);
      const message = "Unable to load smart property settings.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  useEffect(() => {
    void loadState();
  }, [organizationId]);

  const toggleAccess = async (lease: any, enable: boolean) => {
    if (!user?.id || !lease.tenant_user_id) return;

    try {
      setBusyId(`${lease.id}-${enable ? "grant" : "revoke"}`);
      if (enable) {
        await smartDeviceService.grantTenantAccess({
          leaseId: lease.id,
          grantedBy: user.id,
          tenantUserId: lease.tenant_user_id,
          organizationId,
        });
        toast.success("Smart property access granted to tenant.");
      } else {
        await smartDeviceService.revokeTenantAccess({
          leaseId: lease.id,
          revokedBy: user.id,
          tenantUserId: lease.tenant_user_id,
        });
        toast.success("Smart property access revoked.");
      }
      await loadState();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update tenant smart access.");
    } finally {
      setBusyId(null);
    }
  };

  const registerDevice = async () => {
    if (!deviceForm.label.trim()) {
      toast.error("Device label is required.");
      return;
    }

    try {
      setBusyId("register-device");
      await smartDeviceService.registerDevice({
        organizationId,
        listingId: deviceForm.listingId || null,
        leaseId: deviceForm.leaseId || null,
        deviceType: deviceForm.deviceType,
        label: deviceForm.label.trim(),
        room: deviceForm.room.trim() || undefined,
      });
      toast.success("Device registered.");
      setDeviceForm((current) => ({
        ...current,
        label: "",
        room: "",
      }));
      await loadState();
    } catch (error) {
      console.error(error);
      toast.error("Unable to register device.");
    } finally {
      setBusyId(null);
    }
  };

  const removeDevice = async (deviceId: string) => {
    try {
      setBusyId(deviceId);
      await smartDeviceService.removeDevice(deviceId);
      toast.success("Device removed.");
      await loadState();
    } catch (error) {
      console.error(error);
      toast.error("Unable to remove device.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <WorkspacePageShell
      title="Smart Property"
      description="Register IoT devices and control when tenants can access door codes, meters, and building controls."
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void loadState()}
      >
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Tenant access</h2>
        <p className="text-sm text-muted-foreground">
          Tenants only see smart devices after you explicitly grant access for their active lease.
        </p>
        {activeLeases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active leases with assigned tenants.</p>
        ) : (
          <div className="space-y-3">
            {activeLeases.map((lease) => {
              const profile = accessByLease[lease.id];
              const enabled = Boolean(profile?.smart_access_enabled);

              return (
                <div
                  key={lease.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {lease.tenant?.full_name || lease.tenant?.email || "Tenant"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {lease.listing?.property?.address || lease.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={enabled ? "default" : "outline"}>
                      {enabled ? "Access granted" : "Access pending"}
                    </Badge>
                    <Button
                      variant={enabled ? "outline" : "default"}
                      size="sm"
                      disabled={busyId === `${lease.id}-grant` || busyId === `${lease.id}-revoke`}
                      onClick={() => void toggleAccess(lease, !enabled)}
                    >
                      {enabled ? "Revoke access" : "Grant access"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Register device</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NativeSelectControl
            className="w-full rounded-lg border border-border px-3 py-2"
            value={deviceForm.leaseId}
            onChange={(event) => {
              const lease = leases.find((entry) => entry.id === event.target.value);
              setDeviceForm((current) => ({
                ...current,
                leaseId: event.target.value,
                listingId: lease?.listing_id || lease?.listing?.id || "",
              }));
            }}
          >
            <option value="">Link to lease (optional)</option>
            {leases.map((lease) => (
              <option key={lease.id} value={lease.id}>
                {lease.tenant?.full_name || lease.tenant?.email || "Tenant"} —{" "}
                {lease.listing?.property?.address || lease.id}
              </option>
            ))}
          </NativeSelectControl>
          <NativeSelectControl
            className="w-full rounded-lg border border-border px-3 py-2"
            value={deviceForm.deviceType}
            onChange={(event) =>
              setDeviceForm((current) => ({
                ...current,
                deviceType: event.target.value as SmartDeviceType,
              }))
            }
          >
            {DEVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </NativeSelectControl>
          <Input
            value={deviceForm.label}
            onChange={(event) => setDeviceForm((current) => ({ ...current, label: event.target.value }))}
            placeholder="Device label"
          />
          <Input
            value={deviceForm.room}
            onChange={(event) => setDeviceForm((current) => ({ ...current, room: event.target.value }))}
            placeholder="Room (optional)"
          />
        </div>
        <Button onClick={() => void registerDevice()} disabled={busyId === "register-device"}>
          {busyId === "register-device" ? "Saving..." : "Add device"}
        </Button>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Registered devices ({devices.length})</h2>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No devices registered yet.</p>
        ) : (
          devices.map((device) => (
            <div
              key={device.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{device.label}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {device.device_type.replace(/_/g, " ")}
                  {device.room ? ` · ${device.room}` : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {device.listing?.property?.address || "Unlinked listing"} · {device.status}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={busyId === device.id}
                onClick={() => void removeDevice(device.id)}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </Card>
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
