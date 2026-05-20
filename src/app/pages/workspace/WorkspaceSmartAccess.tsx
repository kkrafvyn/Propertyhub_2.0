import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock3,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { listingService } from "../../../lib/listing.service";
import { formatPropertyCategory, getPropertyCategoryIoTHints } from "../../../lib/property-category";
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
  { value: "parking_gate", label: "Parking gate" },
  { value: "dock_door", label: "Dock door" },
  { value: "energy_monitor", label: "Energy monitor" },
  { value: "door_sensor", label: "Door sensor" },
  { value: "motion_sensor", label: "Motion sensor" },
  { value: "smart_meter", label: "Smart meter" },
  { value: "warehouse_sensor", label: "Warehouse sensor" },
  { value: "occupancy_counter", label: "Occupancy counter" },
  { value: "cctv_link", label: "CCTV link" },
];

const PROVIDER_CONNECTION_LAUNCH_CHECKS = [
  {
    key: "credentialsVaulted",
    label: "Secrets vaulted",
    helper: "Server-side endpoint and token saved outside the frontend.",
  },
  {
    key: "webhookVerified",
    label: "Webhook verified",
    helper: "Callbacks and signatures confirmed in the live provider dashboard.",
  },
  {
    key: "realDeviceTested",
    label: "Real-device tested",
    helper: "A live code issue, send, and revoke cycle passed on physical hardware.",
  },
] as const;

type ProviderConnectionLaunchCheckKey =
  (typeof PROVIDER_CONNECTION_LAUNCH_CHECKS)[number]["key"];

function formatSmartAccessLabel(value?: string | null) {
  if (!value) return "Pending";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRelativeTime(dateString?: string | null) {
  if (!dateString) return "Recently";

  const diffMs = new Date(dateString).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return "Schedule pending";
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function getProviderLabel(provider?: string | null) {
  return PROVIDERS.find((item) => item.value === provider)?.label || formatSmartAccessLabel(provider);
}

function getStatusVariant(
  status?: string | null
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "online":
    case "active":
    case "succeeded":
      return "default";
    case "needs_attention":
    case "failed":
    case "provider_error":
      return "destructive";
    case "pending":
    case "configured":
    case "queued":
    case "sent":
      return "secondary";
    default:
      return "outline";
  }
}

function getProviderConnectionLaunchChecks(connection: any) {
  const checklist =
    connection?.metadata &&
    typeof connection.metadata === "object" &&
    connection.metadata.launchChecklist &&
    typeof connection.metadata.launchChecklist === "object"
      ? connection.metadata.launchChecklist
      : {};

  return PROVIDER_CONNECTION_LAUNCH_CHECKS.map((item) => ({
    ...item,
    complete: checklist[item.key] === true,
  }));
}

function isProviderConnectionLaunchReady(connection: any) {
  return (
    connection?.status === "configured" &&
    getProviderConnectionLaunchChecks(connection).every((item) => item.complete)
  );
}

export function WorkspaceSmartAccess({
  organization,
  currentUserId,
}: WorkspaceSmartAccessProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingConnection, setSavingConnection] = useState(false);
  const [workingAccessId, setWorkingAccessId] = useState<string | null>(null);
  const [workingConnectionId, setWorkingConnectionId] = useState<string | null>(null);
  const [providerConnections, setProviderConnections] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [commandEvents, setCommandEvents] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [form, setForm] = useState({
    listingId: "",
    provider: "manual",
    providerConnectionId: "",
    deviceType: "smart_lock",
    displayName: "",
    roomLabel: "",
    providerDeviceId: "",
    status: "offline",
  });
  const [connectionForm, setConnectionForm] = useState({
    provider: "ttlock",
    displayName: "",
    providerAccountReference: "",
    status: "configured",
  });

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === form.listingId) || listings[0] || null,
    [form.listingId, listings]
  );
  const selectedCategoryLabel = formatPropertyCategory(selectedListing?.property?.category);
  const smartAccessHints = getPropertyCategoryIoTHints(selectedListing?.property?.category);
  const suggestedDeviceTypes = DEVICE_TYPES.filter((type) =>
    smartAccessHints.devices.includes(type.label)
  );
  const availableProviderConnections = useMemo(
    () => providerConnections.filter((connection) => connection.provider === form.provider),
    [form.provider, providerConnections]
  );
  const activeGrantCount = grants.filter((grant) => grant.status === "active").length;
  const pendingGrantCount = grants.filter((grant) => grant.status === "pending").length;
  const onlineDeviceCount = devices.filter((device) => device.status === "online").length;
  const needsAttentionCount = devices.filter((device) =>
    ["offline", "needs_attention"].includes(device.status)
  ).length;
  const launchReadyConnectionCount = providerConnections.filter((connection) =>
    isProviderConnectionLaunchReady(connection)
  ).length;
  const providerIssueCount = commandEvents.filter((event) =>
    ["failed", "provider_error"].includes(String(event.command_status || event.event_type || ""))
  ).length;
  const providerReadiness = useMemo(
    () =>
      PROVIDERS.map((provider) => {
        const connections = providerConnections.filter(
          (connection) => connection.provider === provider.value
        );
        const providerDevices = devices.filter((device) => device.provider === provider.value);
        const online = providerDevices.filter((device) => device.status === "online").length;
        const pending = providerDevices.filter((device) =>
          ["offline", "needs_attention"].includes(device.status)
        ).length;
        const accessGrants = grants.filter((grant) =>
          Array.isArray(grant.device_ids)
            ? grant.device_ids.some((deviceId: string) =>
                providerDevices.some((device) => device.id === deviceId)
              )
            : false
        ).length;

        return {
          ...provider,
          total: providerDevices.length,
          connections,
          online,
          pending,
          accessGrants,
          launchReadyConnections: connections.filter((connection) =>
            isProviderConnectionLaunchReady(connection)
          ).length,
        };
      }).filter((provider) => provider.total > 0 || provider.connections.length > 0),
    [devices, grants, providerConnections]
  );

  const loadSmartAccess = async () => {
    try {
      setLoading(true);
      const [connectionRows, deviceRows, grantRows, eventRows, commandRows, listingRows] =
        await Promise.all([
          smartAccessService.getOrganizationProviderConnections(organization.id),
        smartAccessService.getOrganizationDevices(organization.id),
        smartAccessService.getOrganizationAccessGrants(organization.id),
        smartAccessService.getOrganizationAccessEvents(organization.id),
        smartAccessService.getOrganizationCommandEvents(organization.id),
        listingService.getOrganizationListings(organization.id),
      ]);

      setProviderConnections(connectionRows);
      setDevices(deviceRows);
      setGrants(grantRows);
      setEvents(eventRows);
      setCommandEvents(commandRows);
      setListings(listingRows || []);
      setForm((current) => ({
        ...current,
        listingId: current.listingId || listingRows?.[0]?.id || "",
        providerConnectionId:
          current.providerConnectionId ||
          connectionRows.find((connection: any) => connection.provider === current.provider)?.id ||
          "",
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

  useEffect(() => {
    setForm((current) => {
      if (current.provider === "manual") {
        if (!current.providerConnectionId) return current;
        return { ...current, providerConnectionId: "" };
      }

      const matchingConnection = availableProviderConnections.find(
        (connection) => connection.id === current.providerConnectionId
      );

      if (matchingConnection) return current;

      return {
        ...current,
        providerConnectionId: availableProviderConnections[0]?.id || "",
      };
    });
  }, [availableProviderConnections, form.provider]);

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

    if (form.provider !== "manual" && !form.providerConnectionId) {
      toast.error("Choose a provider connection before registering a live-provider device.");
      return;
    }

    try {
      setSaving(true);
      await smartAccessService.registerDevice({
        organizationId: organization.id,
        propertyId: selectedListing.property_id,
        listingId: selectedListing.id,
        providerConnectionId: form.providerConnectionId || null,
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

  const handleCreateProviderConnection = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!connectionForm.displayName.trim()) {
      toast.error("Provider connection name is required.");
      return;
    }

    try {
      setSavingConnection(true);
      const createdConnection = await smartAccessService.createProviderConnection({
        organizationId: organization.id,
        provider: connectionForm.provider as any,
        displayName: connectionForm.displayName.trim(),
        providerAccountReference: connectionForm.providerAccountReference.trim() || null,
        status: connectionForm.status as any,
        createdBy: currentUserId,
      });
      toast.success("Provider connection saved.");
      setConnectionForm((current) => ({
        ...current,
        displayName: "",
        providerAccountReference: "",
      }));
      setForm((current) => {
        if (current.provider !== createdConnection.provider || current.providerConnectionId) {
          return current;
        }

        return {
          ...current,
          providerConnectionId: createdConnection.id,
        };
      });
      await loadSmartAccess();
    } catch (error) {
      console.error("Failed to create provider connection:", error);
      toast.error("We couldn't save that provider connection.");
    } finally {
      setSavingConnection(false);
    }
  };

  const handleProviderConnectionStatus = async (
    connection: any,
    status: "configured" | "needs_attention" | "disabled"
  ) => {
    try {
      setWorkingConnectionId(connection.id);
      await smartAccessService.updateProviderConnection(connection.id, {
        status,
        providerAccountReference: connection.provider_account_reference || null,
        lastHealthCheckAt: new Date().toISOString(),
        metadata: {
          ...(connection.metadata || {}),
          updatedFrom: "workspace_smart_access",
          updatedBy: currentUserId,
        },
      });
      toast.success("Provider connection updated.");
      await loadSmartAccess();
    } catch (error) {
      console.error("Failed to update provider connection:", error);
      toast.error("We couldn't update that provider connection.");
    } finally {
      setWorkingConnectionId(null);
    }
  };

  const handleProviderConnectionLaunchCheck = async (
    connection: any,
    checkKey: ProviderConnectionLaunchCheckKey,
    complete: boolean
  ) => {
    try {
      setWorkingConnectionId(connection.id);
      const existingLaunchChecklist =
        connection?.metadata &&
        typeof connection.metadata === "object" &&
        connection.metadata.launchChecklist &&
        typeof connection.metadata.launchChecklist === "object"
          ? connection.metadata.launchChecklist
          : {};

      await smartAccessService.updateProviderConnection(connection.id, {
        status: connection.status,
        providerAccountReference: connection.provider_account_reference || null,
        lastHealthCheckAt: new Date().toISOString(),
        metadata: {
          ...(connection.metadata || {}),
          launchChecklist: {
            ...existingLaunchChecklist,
            [checkKey]: complete,
          },
          updatedFrom: "workspace_smart_access",
          updatedBy: currentUserId,
        },
      });
      toast.success("Provider launch checklist updated.");
      await loadSmartAccess();
    } catch (error) {
      console.error("Failed to update provider launch checklist:", error);
      toast.error("We couldn't update that provider readiness check.");
    } finally {
      setWorkingConnectionId(null);
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
            <Badge className="mb-3">Phase 4 rollout</Badge>
            <h1 className="text-3xl font-semibold">Smart Property Access</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Register locks, parking gates, dock doors, meters, and sensors against listings.
              Confirmed viewings can queue time-limited access grants, while real provider commands
              stay server-side with an auditable event trail.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadSmartAccess()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Devices</p>
          <p className="mt-2 text-3xl font-semibold">{devices.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {onlineDeviceCount} healthy / {needsAttentionCount} need follow-up
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Access Grants</p>
          <p className="mt-2 text-3xl font-semibold">{grants.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeGrantCount} active / {pendingGrantCount} queued
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent Events</p>
          <p className="mt-2 text-3xl font-semibold">{events.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {providerIssueCount} provider issues in the latest command and access feed
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Coverage</p>
          <p className="mt-2 text-3xl font-semibold">{providerConnections.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {launchReadyConnectionCount} launch-ready provider profile
            {launchReadyConnectionCount === 1 ? "" : "s"} in this workspace
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <Card className="p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Provider connections</h2>
              <p className="text-sm text-muted-foreground">
                Track each TTLock, Yale, Tuya, or manual test connection as a workspace-level
                profile. Secrets stay server-side; this only stores safe routing metadata.
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleCreateProviderConnection}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm" htmlFor="provider-connection-provider">
                  Provider
                </label>
                <select
                  id="provider-connection-provider"
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={connectionForm.provider}
                  onChange={(event) =>
                    setConnectionForm((current) => ({ ...current, provider: event.target.value }))
                  }
                >
                  {PROVIDERS.filter((provider) => provider.value !== "manual").map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm" htmlFor="provider-connection-status">
                  Status
                </label>
                <select
                  id="provider-connection-status"
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={connectionForm.status}
                  onChange={(event) =>
                    setConnectionForm((current) => ({ ...current, status: event.target.value }))
                  }
                >
                  <option value="configured">Configured</option>
                  <option value="needs_attention">Needs attention</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            <Input
              label="Connection name"
              value={connectionForm.displayName}
              onChange={(event) =>
                setConnectionForm((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              placeholder="TTLock Accra cluster"
            />
            <Input
              label="Provider account reference"
              value={connectionForm.providerAccountReference}
              onChange={(event) =>
                setConnectionForm((current) => ({
                  ...current,
                  providerAccountReference: event.target.value,
                }))
              }
              placeholder="Optional account or gateway reference"
            />
            <Button type="submit" disabled={savingConnection}>
              {savingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Save Connection
                </>
              )}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold">Connection registry</h2>
          <div className="mt-4 space-y-3">
            {providerConnections.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No provider connections yet. Add a provider profile before assigning live-provider
                devices.
              </p>
            ) : (
              providerConnections.map((connection) => {
                const launchChecks = getProviderConnectionLaunchChecks(connection);
                const completedChecks = launchChecks.filter((item) => item.complete).length;

                return (
                  <div key={connection.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{connection.display_name}</p>
                          <Badge variant={getStatusVariant(connection.status)}>
                            {formatSmartAccessLabel(connection.status)}
                          </Badge>
                          {isProviderConnectionLaunchReady(connection) ? (
                            <Badge variant="default">Launch ready</Badge>
                          ) : (
                            <Badge variant="outline">Launch checklist open</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {getProviderLabel(connection.provider)}
                          {connection.provider_account_reference
                            ? ` / ${connection.provider_account_reference}`
                            : ""}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {connection.last_health_check_at
                            ? `Last reviewed ${formatRelativeTime(connection.last_health_check_at)}`
                            : "No health review recorded yet."}
                        </p>
                        <p className="mt-2 text-xs font-medium text-foreground">
                          {completedChecks}/{launchChecks.length} launch checks complete
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void handleProviderConnectionStatus(connection, "configured")
                          }
                          disabled={workingConnectionId === connection.id}
                        >
                          Healthy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void handleProviderConnectionStatus(connection, "needs_attention")
                          }
                          disabled={workingConnectionId === connection.id}
                        >
                          Needs Review
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void handleProviderConnectionStatus(connection, "disabled")
                          }
                          disabled={workingConnectionId === connection.id}
                        >
                          Disable
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {launchChecks.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() =>
                            void handleProviderConnectionLaunchCheck(
                              connection,
                              item.key,
                              !item.complete
                            )
                          }
                          disabled={workingConnectionId === connection.id}
                          className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                            item.complete
                              ? "border-primary/20 bg-primary/5"
                              : "border-border bg-secondary/20 hover:border-primary/20"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{item.label}</p>
                            <Badge variant={item.complete ? "default" : "outline"}>
                              {item.complete ? "Done" : "Pending"}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Provider readiness</h2>
            <p className="text-sm text-muted-foreground">
              See which providers are already represented by devices, how many are online, and how
              much access traffic each one is carrying.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {providerReadiness.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground md:col-span-2 xl:col-span-4">
              Register the first smart device to start tracking provider readiness here.
            </p>
          ) : (
            providerReadiness.map((provider) => (
              <div key={provider.value} className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{provider.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {provider.connections.length} connection
                      {provider.connections.length === 1 ? "" : "s"} / {provider.total} device
                      {provider.total === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant={provider.pending > 0 ? "secondary" : "default"}>
                    {provider.pending > 0 ? "Needs review" : "Healthy"}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Online</p>
                    <p className="mt-1 font-semibold">{provider.online}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Attention</p>
                    <p className="mt-1 font-semibold">{provider.pending}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Grants</p>
                    <p className="mt-1 font-semibold">{provider.accessGrants}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {provider.launchReadyConnections} launch-ready connection
                  {provider.launchReadyConnections === 1 ? "" : "s"} for live commands
                </p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Launch readiness checklist</h2>
            <p className="text-sm text-muted-foreground">
              Use these non-secret checkpoints to confirm each provider connection is actually ready
              for live code delivery and not just registered in the workspace.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {PROVIDER_CONNECTION_LAUNCH_CHECKS.map((item) => (
            <div key={item.key} className="rounded-2xl border border-border bg-secondary/20 p-4">
              <p className="font-medium">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">
                {
                  providerConnections.filter((connection) =>
                    getProviderConnectionLaunchChecks(connection).some(
                      (check) => check.key === item.key && check.complete
                    )
                  ).length
                }
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
            </div>
          ))}
        </div>
      </Card>

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

            {selectedListing ? (
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {smartAccessHints.title} for {selectedCategoryLabel}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {smartAccessHints.description}
                    </p>
                  </div>
                  <Badge variant="secondary">{selectedCategoryLabel}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestedDeviceTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          deviceType: type.value,
                          displayName: current.displayName || type.label,
                        }))
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        form.deviceType === type.value
                          ? "border-primary bg-primary text-white"
                          : "border-primary/15 bg-white text-primary hover:border-primary/45"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
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
                    setForm((current) => ({
                      ...current,
                      provider: event.target.value,
                      providerConnectionId: "",
                    }))
                  }
                >
                  {PROVIDERS.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
              {form.provider !== "manual" ? (
                <div>
                  <label className="mb-2 block text-sm" htmlFor="smart-access-provider-connection">
                    Provider connection
                  </label>
                  <select
                    id="smart-access-provider-connection"
                    className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                    value={form.providerConnectionId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        providerConnectionId: event.target.value,
                      }))
                    }
                  >
                    <option value="">
                      {availableProviderConnections.length === 0
                        ? "No connection available yet"
                        : "Choose provider connection"}
                    </option>
                    {availableProviderConnections.map((connection) => (
                      <option key={connection.id} value={connection.id}>
                        {connection.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
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
                No smart property devices yet. Add a lock, gate, parking, or dock-door device to
                enable viewing access grants.
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
                        {device.property?.address || "Property"} - {getProviderLabel(device.provider)} /{" "}
                        {formatSmartAccessLabel(device.device_type)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {device.room_label ? <span>Access point: {device.room_label}</span> : null}
                        {device.provider_connection?.display_name ? (
                          <span>Connection: {device.provider_connection.display_name}</span>
                        ) : null}
                        {device.last_seen_at ? (
                          <span>Last seen {formatRelativeTime(device.last_seen_at)}</span>
                        ) : null}
                        {typeof device.battery_percent === "number" ? (
                          <span>Battery {Math.round(device.battery_percent)}%</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getStatusVariant(device.status)}>
                      {formatSmartAccessLabel(device.status)}
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
                    <Badge variant={getStatusVariant(grant.status)}>
                      {formatSmartAccessLabel(grant.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatSmartAccessLabel(grant.access_reason)} access for{" "}
                    {grant.granted_to?.full_name || grant.granted_to?.email || "user"} from{" "}
                    {formatDateTime(grant.starts_at)} to {formatDateTime(grant.ends_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Scope: {formatSmartAccessLabel(grant.access_scope)}</span>
                    {grant.viewing?.status ? (
                      <span>Viewing: {formatSmartAccessLabel(grant.viewing.status)}</span>
                    ) : null}
                    {grant.provider_reference ? (
                      <span>Provider ref: {grant.provider_reference}</span>
                    ) : null}
                  </div>
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

      <Card className="p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Provider command history</h2>
            <p className="text-sm text-muted-foreground">
              Review every code-generation, send, revoke, and health-sync command that went to a
              provider channel.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {commandEvents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No command events yet. The first code generation, send, revoke, or sync action will
              appear here.
            </p>
          ) : (
            commandEvents.map((event) => {
              const actorLabel =
                event.actor?.full_name || event.actor?.email || "BaytMiftah workflow";

              return (
                <div
                  key={event.id}
                  className="rounded-2xl border border-border p-4 transition-colors hover:border-primary/20"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{formatSmartAccessLabel(event.command_type)}</p>
                        <Badge variant={getStatusVariant(event.command_status)}>
                          {formatSmartAccessLabel(event.command_status)}
                        </Badge>
                        <Badge variant="outline">{getProviderLabel(event.provider)}</Badge>
                        {event.device?.display_name ? (
                          <Badge variant="secondary">{event.device.display_name}</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {actorLabel} / {formatRelativeTime(event.created_at)}
                        {event.property?.address ? ` / ${event.property.address}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {event.grant?.access_reason ? (
                          <span>Reason: {formatSmartAccessLabel(event.grant.access_reason)}</span>
                        ) : null}
                        {event.provider_reference ? (
                          <span>Provider ref: {event.provider_reference}</span>
                        ) : null}
                        {event.error_message ? (
                          <span className="text-destructive">{event.error_message}</span>
                        ) : null}
                      </div>
                    </div>
                    <details className="rounded-xl border border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer font-medium text-foreground">
                        Command payloads
                      </summary>
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="mb-1 font-medium text-foreground">Request</p>
                          <pre className="max-w-xl overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 font-mono text-[11px] text-foreground">
                            {JSON.stringify(event.request_payload || {}, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-1 font-medium text-foreground">Response</p>
                          <pre className="max-w-xl overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 font-mono text-[11px] text-foreground">
                            {JSON.stringify(event.response_payload || {}, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Access event history</h2>
            <p className="text-sm text-muted-foreground">
              Backend events are hashed and stored per property so teams can review what happened,
              who triggered it, and whether the provider replied cleanly.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No smart-access events yet. Generate or send a grant to start the audit trail.
            </p>
          ) : (
            events.map((event) => {
              const payload: Record<string, unknown> =
                event.event_payload && typeof event.event_payload === "object"
                  ? event.event_payload
                  : {};
              const actorLabel =
                event.actor?.full_name || event.actor?.email || "BaytMiftah workflow";
              const eventSummary =
                typeof payload.error === "string"
                  ? payload.error
                  : typeof payload.accessCodeHint === "string"
                    ? `Code hint ${payload.accessCodeHint}`
                    : typeof payload.action === "string"
                      ? `Action ${formatSmartAccessLabel(payload.action)}`
                      : "Event payload recorded.";

              return (
                <div
                  key={event.id}
                  className="rounded-2xl border border-border p-4 transition-colors hover:border-primary/20"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {event.event_type === "provider_error" ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        )}
                        <p className="font-medium">
                          {formatSmartAccessLabel(event.event_type)}
                        </p>
                        <Badge
                          variant={
                            event.event_type === "provider_error" ? "destructive" : "secondary"
                          }
                        >
                          {event.property?.address || "Property"}
                        </Badge>
                        {event.grant?.status ? (
                          <Badge variant={getStatusVariant(event.grant.status)}>
                            Grant {formatSmartAccessLabel(event.grant.status)}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {actorLabel} / {formatRelativeTime(event.created_at)} / {eventSummary}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {event.grant?.access_reason ? (
                          <span>Reason: {formatSmartAccessLabel(event.grant.access_reason)}</span>
                        ) : null}
                        {event.grant?.starts_at ? (
                          <span>Window opens {formatDateTime(event.grant.starts_at)}</span>
                        ) : null}
                        <span className="font-mono">Hash {String(event.event_hash).slice(0, 12)}</span>
                      </div>
                    </div>
                    <details className="rounded-xl border border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer font-medium text-foreground">
                        Payload
                      </summary>
                      <pre className="mt-3 max-w-xl overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 font-mono text-[11px] text-foreground">
                        {JSON.stringify(payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
