import { useEffect, useMemo, useState } from "react";
import { BellRing, Download, LogOut, MapPin, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/Input";
import { Textarea } from "@/app/components/ui/textarea";
import { ActionDialog } from "@/app/components/ux/ActionDialog";
import { fieldOpsService } from "@/lib/field-ops.service";
import { mobileAppService } from "@/lib/mobile-app.service";
import { pushNotificationService } from "@/lib/push-notification.service";
import { nativePushAvailable } from "@/lib/communications-capabilities";
import { registerNativeDevicePush } from "@/lib/native-push-registration.service";
import { Capacitor } from "@capacitor/core";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

interface MobileAppSettingsProps {
  currentUserId: string;
  organizationId?: string | null;
}

export default function MobileAppSettings({
  currentUserId,
  organizationId,
}: MobileAppSettingsProps) {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [registeringBrowserPush, setRegisteringBrowserPush] = useState(false);
  const [registeringNativePush, setRegisteringNativePush] = useState(false);
  const [iosVersion, setIosVersion] = useState<any>(null);
  const [androidVersion, setAndroidVersion] = useState<any>(null);
  const [fieldLogs, setFieldLogs] = useState<any[]>([]);
  const [fieldDraft, setFieldDraft] = useState({
    title: "",
    details: "",
  });
  const [loggingFieldNote, setLoggingFieldNote] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState<any | null>(null);
  const [removingDevice, setRemovingDevice] = useState(false);

  const browserPushSupported = pushNotificationService.isSupported();

  const loadDevices = async () => {
    try {
      setLoading(true);
      const data = await mobileAppService.getUserDevices(currentUserId);
      setDevices(data || []);
    } catch (error) {
      console.error("Failed to load devices:", error);
      toast.error("We couldn't load connected devices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoadError(null);
        const [deviceData, iosInfo, androidInfo] = await Promise.all([
          mobileAppService.getUserDevices(currentUserId),
          mobileAppService.getAppVersion("ios"),
          mobileAppService.getAppVersion("android"),
        ]);
        const recentLogs = organizationId
          ? await fieldOpsService.getRecentLogs(organizationId, 8)
          : [];

        if (!cancelled) {
          setDevices(deviceData || []);
          setIosVersion(iosInfo);
          setAndroidVersion(androidInfo);
          setFieldLogs(recentLogs || []);
        }
      } catch (error) {
        console.error("Failed to load mobile settings:", error);
        if (!cancelled) {
          setLoadError("We couldn't load mobile settings.");
          toast.error("We couldn't load mobile settings.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, organizationId]);

  const reload = () => {
    setLoading(true);
    void mobileAppService.getUserDevices(currentUserId).then((deviceData) => {
      setDevices(deviceData || []);
    }).catch(() => setLoadError("We couldn't load mobile settings.")).finally(() => setLoading(false));
  };

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  const handleRemoveDevice = async () => {
    if (!deviceToRemove) return;
    try {
      setRemovingDevice(true);
      await mobileAppService.remoteLogout(deviceToRemove.device_id);
      toast.success("Device removed.");
      setDeviceToRemove(null);
      await loadDevices();
    } catch (error) {
      console.error("Failed to remove device:", error);
      toast.error("We couldn't remove that device.");
    } finally {
      setRemovingDevice(false);
    }
  };

  const handleRegisterNativePush = async () => {
    try {
      setRegisteringNativePush(true);
      const result = await registerNativeDevicePush(currentUserId);
      if (!result.configured) {
        toast.error("reason" in result ? result.reason : "Native push is unavailable.");
        return;
      }
      toast.success("Native push notifications connected.");
      await loadDevices();
    } catch (error) {
      console.error("Failed to register native push:", error);
      toast.error(
        error instanceof Error ? error.message : "We couldn't connect native push notifications.",
      );
    } finally {
      setRegisteringNativePush(false);
    }
  };

  const handleRegisterBrowserPush = async () => {
    try {
      setRegisteringBrowserPush(true);
      const result = await pushNotificationService.registerBrowserPush(currentUserId);
      if (result.configured === false) {
        toast.error(result.reason);
        return;
      }
      toast.success("Browser push notifications connected.");
      await loadDevices();
    } catch (error) {
      console.error("Failed to register browser push:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "We couldn't connect browser push notifications."
      );
    } finally {
      setRegisteringBrowserPush(false);
    }
  };

  const hasBrowserDevice = useMemo(
    () => devices.some((device) => device.device_type === "web"),
    [devices]
  );

  const handleLogFieldNote = async () => {
    if (!organizationId) {
      toast.error("Field mode needs an active workspace organization.");
      return;
    }

    if (!fieldDraft.title.trim()) {
      toast.error("Add a short title for the field note.");
      return;
    }

    try {
      setLoggingFieldNote(true);

      let latitude: number | null = null;
      let longitude: number | null = null;

      if (typeof navigator !== "undefined" && "geolocation" in navigator) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              latitude = position.coords.latitude;
              longitude = position.coords.longitude;
              resolve();
            },
            () => resolve(),
            { maximumAge: 1000 * 60 * 10, timeout: 4000 }
          );
        });
      }

      await fieldOpsService.logActivity({
        organizationId,
        userId: currentUserId,
        title: fieldDraft.title.trim(),
        details: fieldDraft.details.trim() || null,
        latitude,
        longitude,
      });

      toast.success("Field note captured.");
      setFieldDraft({ title: "", details: "" });
      setFieldLogs(await fieldOpsService.getRecentLogs(organizationId, 8));
    } catch (error) {
      console.error("Failed to log field note:", error);
      toast.error("We couldn't save that field note.");
    } finally {
      setLoggingFieldNote(false);
    }
  };

  return (
    <WorkspacePageShell
      title="Mobile App Settings"
      description="Manage connected devices and connect browser push for live delivery."
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={reload}
      >
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-secondary rounded-lg">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Mobile App Versions</h3>
              <p className="text-sm text-muted-foreground">
                {iosVersion?.latest_version
                  ? `iOS ${iosVersion.latest_version}`
                  : "iOS version not configured"}{" "}
                and{" "}
                {androidVersion?.latest_version
                  ? `Android ${androidVersion.latest_version}`
                  : "Android version not configured"}{" "}
                are currently supported.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {iosVersion?.minimum_version ? (
              <Badge variant="outline">iOS min {iosVersion.minimum_version}</Badge>
            ) : null}
            {androidVersion?.minimum_version ? (
              <Badge variant="outline">Android min {androidVersion.minimum_version}</Badge>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Browser Push Notifications</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Enable notifications in this browser to receive immediate alerts for new messages, leads, and workspace updates.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={hasBrowserDevice ? "default" : "outline"}>
              {hasBrowserDevice ? "Connected" : "Not connected"}
            </Badge>
            <Button
              onClick={() => void handleRegisterBrowserPush()}
              disabled={!browserPushSupported || registeringBrowserPush}
            >
              <BellRing className="w-4 h-4" />
              {registeringBrowserPush
                ? "Connecting..."
                : hasBrowserDevice
                  ? "Reconnect Browser Push"
                  : "Enable Browser Push"}
            </Button>
          </div>
        </div>
        {!browserPushSupported && (
          <p className="text-sm text-muted-foreground mt-4">
            Browser push is only available in supported secure browser environments.
          </p>
        )}
        {Capacitor.isNativePlatform() && nativePushAvailable() ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void handleRegisterNativePush()}
              disabled={registeringNativePush}
            >
              <Smartphone className="w-4 h-4" />
              {registeringNativePush ? "Connecting native push..." : "Enable native push (FCM/APNs)"}
            </Button>
          </div>
        ) : !nativePushAvailable() ? (
          <p className="text-sm text-muted-foreground mt-2">
            Native background push (FCM/APNs) is not configured for production mobile builds yet.
          </p>
        ) : null}
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Field Mode</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Capture quick site notes from mobile or browser, optionally with location attached.
            </p>
          </div>
          <Badge variant="outline">Mobile workflow MVP</Badge>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[420px_1fr] ">
          <div className="space-y-4">
            <Input
              label="Note title"
              placeholder="Viewing completed at East Legon"
              value={fieldDraft.title}
              onChange={(event) =>
                setFieldDraft((current) => ({ ...current, title: event.target.value }))
              }
            />
            <div>
              <label className="block mb-2 text-sm text-foreground">Details</label>
              <Textarea
                placeholder="Prospect liked the compound, asked for an updated payment plan, and wants a Saturday follow-up."
                value={fieldDraft.details}
                onChange={(event) =>
                  setFieldDraft((current) => ({ ...current, details: event.target.value }))
                }
                className="min-h-[140px]"
              />
            </div>
            <Button onClick={() => void handleLogFieldNote()} disabled={loggingFieldNote}>
              <MapPin className="w-4 h-4" />
              {loggingFieldNote ? "Saving note..." : "Save Field Note"}
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Recent Field Activity</h3>
            {fieldLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Field notes will appear here once agents start capturing them.
              </p>
            ) : (
              fieldLogs.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{entry.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {entry.user?.full_name || entry.user?.email || "Team member"} ·{" "}
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                    {(entry.latitude || entry.longitude) && (
                      <Badge variant="secondary">Geo tagged</Badge>
                    )}
                  </div>
                  {entry.details && <p className="text-sm mt-3">{entry.details}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Connected Devices ({devices.length})</h2>

        {loading ? (
          <Card className="p-8 text-center text-muted-foreground">Loading devices...</Card>
        ) : devices.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No devices connected yet.</p>
            <p className="text-sm mt-2">
              Browser push and future mobile sign-ins will show up here automatically.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <Card key={device.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-secondary rounded-lg">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold capitalize">
                          {device.device_type || "unknown"} device
                        </h3>
                        {device.device_type === "web" && <Badge>Browser Push</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {device.os_version || "Unknown platform"}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span>
                          Last active:{" "}
                          {device.last_active_at
                            ? new Date(device.last_active_at).toLocaleString()
                            : "Not recorded"}
                        </span>
                        {device.app_version && <span>App v{device.app_version}</span>}
                        <span>Device ID {device.device_id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeviceToRemove(device)}
                    >
                      <LogOut className="w-4 h-4 mr-1" />
                      Logout
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeviceToRemove(device)}
                      className="text-red-600 hover:text-red-700"
                      aria-label={`Remove ${device.device_type || "device"}`}
                      title={`Remove ${device.device_type || "device"}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <ActionDialog
        open={Boolean(deviceToRemove)}
        onOpenChange={(open) => !open && setDeviceToRemove(null)}
        title="Sign out this device?"
        description={`This removes the ${deviceToRemove?.device_type || "device"} record and push subscription from this workspace. It does not sign the user out on that device.`}
        confirmLabel="Remove device"
        tone="destructive"
        pending={removingDevice}
        onConfirm={handleRemoveDevice}
      />
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
