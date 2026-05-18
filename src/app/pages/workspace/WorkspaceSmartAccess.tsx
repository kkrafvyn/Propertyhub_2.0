import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Lock, Plus, RefreshCcw, ShieldCheck, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { listingService } from "../../../lib/listing.service";
import { smartAccessService } from "../../../lib/smart-access.service";

interface WorkspaceSmartAccessProps {
  organization: any;
  currentUserId: string;
}

const PROVIDERS = [
  { value: "manual", label: "Manual / test device" },
  { value: "ttlock", label: "TTLock" },
  { value: "yale", label: "Yale" },
  { value: "tuya", label: "Tuya" },
];

const DEVICE_TYPES = [
  { value: "smart_lock", label: "Smart lock" },
  { value: "gate_access", label: "Gate access" },
  { value: "energy_monitor", label: "Energy monitor" },
  { value: "door_sensor", label: "Door sensor" },
  { value: "motion_sensor", label: "Motion sensor" },
  { value: "smart_meter", label: "Smart meter" },
];

export function WorkspaceSmartAccess({
  organization,
  currentUserId,
}: WorkspaceSmartAccessProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingAccessId, setWorkingAccessId] = useState<string | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [form, setForm] = useState({
    listingId: "",
    provider: "manual",
    deviceType: "smart_lock",
    displayName: "",
    roomLabel: "",
    providerDeviceId: "",
    status: "offline",
  });

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === form.listingId) || listings[0] || null,
    [form.listingId, listings]
  );

  const loadSmartAccess = async () => {
    try {
      setLoading(true);
      const [deviceRows, grantRows, listingRows] = await Promise.all([
        smartAccessService.getOrganizationDevices(organization.id),
        smartAccessService.getOrganizationAccessGrants(organization.id),
        listingService.getOrganizationListings(organization.id),
      ]);

      setDevices(deviceRows);
      setGrants(grantRows);
      setListings(listingRows || []);
      setForm((current) => ({
        ...current,
        listingId: current.listingId || listingRows?.[0]?.id || "",
      }));
    } catch (error) {
      console.error("Failed to load smart access:", error);
      toast.error("We couldn't load smart access controls right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSmartAccess();
  }, [organization.id]);

  const handleRegisterDevice = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedListing?.property_id) {
      toast.error("Choose a listing before adding a device.");
      return;
    }

    if (!form.displayName.trim()) {
      toast.error("Device name is required.");
      return;
    }

    try {
      setSaving(true);
      await smartAccessService.registerDevice({
        organizationId: organization.id,
        propertyId: selectedListing.property_id,
        listingId: selectedListing.id,
        provider: form.provider as any,
        deviceType: form.deviceType as any,
        displayName: form.displayName.trim(),
        roomLabel: form.roomLabel.trim() || null,
        providerDeviceId: form.providerDeviceId.trim() || null,
        status: form.status as any,
        createdBy: currentUserId,
      });
      toast.success("Smart property device registered.");
      setForm((current) => ({
        ...current,
        displayName: "",
        roomLabel: "",
        providerDeviceId: "",
      }));
      await loadSmartAccess();
    } catch (error) {
      console.error("Failed to register device:", error);
      toast.error("We couldn't register this smart device.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeGrant = async (grantId: string) => {
    try {
      setWorkingAccessId(grantId);
      await smartAccessService.revokeAccessGrant(grantId, currentUserId);
      toast.success("Access grant revoked.");
      await loadSmartAccess();
    } catch (error) {
      console.error("Failed to revoke access grant:", error);
      toast.error("We couldn't revoke that access grant.");
    } finally {
      setWorkingAccessId(null);
    }
  };

  const handleGenerateViewingCode = async (grantId: string) => {
    try {
      setWorkingAccessId(grantId);
      await smartAccessService.generateViewingCode(grantId);
      toast.success("Viewing access code command sent.");
      await loadSmartAccess();
    } catch (error) {
      console.error("Failed to generate viewing code:", error);
      toast.error("We couldn't generate that access code. Check provider setup.");
    } finally {
      setWorkingAccessId(null);
    }
  };

  const handleSendAccessGrant = async (grantId: string) => {
    try {
      setWorkingAccessId(grantId);
      await smartAccessService.sendAccessGrant(grantId);
      toast.success("Access grant send command recorded.");
      await loadSmartAccess();
    } catch (error) {
      console.error("Failed to send access grant:", error);
      toast.error("We couldn't send that access grant.");
    } finally {
      setWorkingAccessId(null);
    }
  };

  const handleSyncDeviceHealth = async (deviceId: string) => {
    try {
      setWorkingAccessId(deviceId);
      await smartAccessService.syncDeviceHealth(deviceId);
      toast.success("Device health sync complete.");
      await loadSmartAccess();
    } catch (error) {
      console.error("Failed to sync device health:", error);
      toast.error("We couldn't sync that device. Check provider setup.");
    } finally {
      setWorkingAccessId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-primary" />
        Loading smart property access...
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,#f7f1e4,#ffffff)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="mb-3">Phase 4 foundation</Badge>
            <h1 className="text-3xl font-semibold">Smart Property Access</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Register locks, gates, meters, and sensors against listings. Confirmed viewings can
              queue time-limited access grants, while real provider commands stay server-side.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadSmartAccess()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <Card className="p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Register a device</h2>
              <p className="text-sm text-muted-foreground">
                Add provider-neutral device records now. API credentials are never stored in the
                browser.
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleRegisterDevice}>
            <div>
              <label className="mb-2 block text-sm" htmlFor="smart-access-listing">
                Listing
              </label>
              <select
                id="smart-access-listing"
                className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                value={form.listingId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, listingId: event.target.value }))
                }
              >
                {listings.map((listing) => (
                  <option key={listing.id} value={listing.id}>
                    {listing.property?.address || "Untitled property"}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm" htmlFor="smart-access-provider">
                  Provider
                </label>
                <select
                  id="smart-access-provider"
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={form.provider}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, provider: event.target.value }))
                  }
                >
                  {PROVIDERS.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm" htmlFor="smart-access-device-type">
                  Device type
                </label>
                <select
                  id="smart-access-device-type"
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={form.deviceType}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, deviceType: event.target.value }))
                  }
                >
                  {DEVICE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Input
              label="Device name"
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({ ...current, displayName: event.target.value }))
              }
              placeholder="Front door lock"
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Room or access point"
                value={form.roomLabel}
                onChange={(event) =>
                  setForm((current) => ({ ...current, roomLabel: event.target.value }))
                }
                placeholder="Main entrance"
              />
              <Input
                label="Provider device ID"
                value={form.providerDeviceId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, providerDeviceId: event.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <Button type="submit" disabled={saving || listings.length === 0}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Register Device
                </>
              )}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold">Device registry</h2>
          <div className="mt-4 space-y-3">
            {devices.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No smart property devices yet. Add a lock or gate device to enable viewing access
                grants.
              </p>
            ) : (
              devices.map((device) => (
                <div
                  key={device.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{device.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {device.property?.address || "Property"} - {device.provider} /{" "}
                        {device.device_type.replaceAll("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={device.status === "online" ? "default" : "secondary"}>
                      {device.status.replaceAll("_", " ")}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSyncDeviceHealth(device.id)}
                      disabled={workingAccessId === device.id}
                    >
                      {workingAccessId === device.id ? "Syncing..." : "Sync"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Unlock className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Access grants</h2>
        </div>
        <div className="space-y-3">
          {grants.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Confirm a viewing for an IoT-enabled property to queue the first access grant.
            </p>
          ) : (
            grants.map((grant) => (
              <div
                key={grant.id}
                className="flex flex-col gap-4 rounded-2xl border border-border p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {grant.property?.address || "Smart property access"}
                    </p>
                    <Badge>{grant.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {grant.access_reason} access for{" "}
                    {grant.granted_to?.full_name || grant.granted_to?.email || "user"} from{" "}
                    {new Intl.DateTimeFormat("en-GH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(grant.starts_at))}{" "}
                    to{" "}
                    {new Intl.DateTimeFormat("en-GH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(grant.ends_at))}
                  </p>
                  {grant.access_code_hint ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Code hint: {grant.access_code_hint}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    {grant.device_ids?.length || 0} devices
                  </Badge>
                  {grant.status === "pending" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleGenerateViewingCode(grant.id)}
                      disabled={workingAccessId === grant.id}
                    >
                      {workingAccessId === grant.id ? "Working..." : "Generate Code"}
                    </Button>
                  ) : null}
                  {grant.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSendAccessGrant(grant.id)}
                      disabled={workingAccessId === grant.id}
                    >
                      {workingAccessId === grant.id ? "Working..." : "Send Grant"}
                    </Button>
                  ) : null}
                  {["pending", "active"].includes(grant.status) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRevokeGrant(grant.id)}
                      disabled={workingAccessId === grant.id}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
