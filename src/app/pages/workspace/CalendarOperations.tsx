import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Copy, Download, Link2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import type { Database } from "../../../lib/database.types";
import { calendarOperationsService } from "../../../lib/calendar-operations.service";
import { maintenanceCalendarService } from "../../../lib/staff-time.service";
import { organizationService } from "../../../lib/organization.service";
import { propertyViewingService } from "../../../lib/property-viewing.service";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface CalendarOperationsProps {
  organization: Organization;
  currentUserId: string;
}

const DAY_OPTIONS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatDateTime(value?: string | null) {
  if (!value) return "Awaiting confirmation";
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLabel(value?: string | null) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function CalendarOperations({
  organization,
  currentUserId,
}: CalendarOperationsProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [viewings, setViewings] = useState<any[]>([]);
  const [maintenanceEvents, setMaintenanceEvents] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    userId: currentUserId,
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "17:00",
    bufferMinutes: "15",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [ruleRows, connectionRows, viewingRows, memberRows, maintenanceRows] = await Promise.all([
        calendarOperationsService.getAvailabilityRules(organization.id),
        calendarOperationsService.getConnections(organization.id),
        propertyViewingService.getOrganizationViewings(organization.id),
        organizationService.getOrganizationMembers(organization.id),
        maintenanceCalendarService.listEvents(organization.id).catch(() => []),
      ]);
      setRules(ruleRows || []);
      setConnections(connectionRows || []);
      setViewings(viewingRows || []);
      setMembers(memberRows || []);
      setMaintenanceEvents(maintenanceRows || []);
    } catch (error) {
      console.error("Failed to load calendar operations:", error);
      const message = "We couldn't load calendar operations right now.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization.id, currentUserId]);

  const upcomingViewings = useMemo(
    () =>
      [...viewings]
        .filter((viewing) => ["requested", "confirmed", "rescheduled"].includes(viewing.status))
        .sort(
          (a, b) =>
            new Date(a.confirmed_datetime || a.requested_datetime).getTime() -
            new Date(b.confirmed_datetime || b.requested_datetime).getTime()
        )
        .slice(0, 8),
    [viewings]
  );

  const handleSaveRule = async () => {
    try {
      setSaving(true);
      await calendarOperationsService.saveAvailabilityRule({
        organizationId: organization.id,
        userId: draft.userId,
        dayOfWeek: Number(draft.dayOfWeek),
        startTime: draft.startTime,
        endTime: draft.endTime,
        bufferMinutes: Number(draft.bufferMinutes),
      });
      toast.success("Availability rule saved.");
      await loadData();
    } catch (error) {
      console.error("Failed to save availability rule:", error);
      toast.error("We couldn't save that availability rule.");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectionToggle = async (provider: "google" | "outlook" | "ics") => {
    try {
      setSaving(true);
      const existing = connections.find(
        (connection) => connection.provider === provider && connection.user_id === currentUserId
      );
      await calendarOperationsService.upsertConnection({
        organizationId: organization.id,
        userId: currentUserId,
        provider,
        status: existing?.status === "connected" ? "disconnected" : "connected",
        externalAccountEmail:
          existing?.external_account_email || members.find((member) => member.user_id === currentUserId)?.user?.email,
        externalCalendarId: existing?.external_calendar_id || `${provider}-default`,
        connectionMetadata: {
          syncMode: provider === "ics" ? "export" : "manual_connected",
        },
      });
      toast.success(
        existing?.status === "connected"
          ? `${formatLabel(provider)} disconnected.`
          : `${formatLabel(provider)} marked connected.`
      );
      await loadData();
    } catch (error) {
      console.error("Failed to update connection:", error);
      toast.error("We couldn't update that calendar connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRescheduleLink = async (viewing: any) => {
    try {
      const link = await calendarOperationsService.createOrRefreshRescheduleLink(
        viewing.id,
        currentUserId
      );
      const url = calendarOperationsService.buildRescheduleUrl(link.token);
      await navigator.clipboard.writeText(url);
      toast.success("Reschedule link copied.");
    } catch (error) {
      console.error("Failed to create reschedule link:", error);
      toast.error("We couldn't create a reschedule link.");
    }
  };

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  return (
    <WorkspacePageShell
      title="Calendar Operations"
      description="Manage team availability, sync metadata, reminder-ready viewings, and reschedule links."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void loadData()}
      >
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Availability Rules</p>
          <p className="text-2xl font-semibold mt-1">{rules.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Connected Calendars</p>
          <p className="text-2xl font-semibold mt-1">
            {connections.filter((connection) => connection.status === "connected").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Upcoming Viewings</p>
          <p className="text-2xl font-semibold mt-1">{upcomingViewings.length}</p>
        </Card>
      </div>

      {maintenanceEvents.length > 0 ? (
        <Card className="p-5 space-y-2">
          <h2 className="font-semibold">Maintenance calendar</h2>
          {maintenanceEvents.slice(0, 8).map((event) => (
            <div key={event.id} className="flex justify-between text-sm border border-border rounded-lg p-3">
              <span>{event.title}</span>
              <span className="text-muted-foreground">{new Date(event.starts_at).toLocaleString()}</span>
            </div>
          ))}
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr] ">
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Agent Availability</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set when agents can take viewing assignments.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm text-foreground">Team member</label>
              <NativeSelectControl
                className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                value={draft.userId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, userId: event.target.value }))
                }
              >
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user?.full_name || member.user?.email || "Team member"}
                  </option>
                ))}
              </NativeSelectControl>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-2 text-sm text-foreground">Day</label>
                <NativeSelectControl
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={draft.dayOfWeek}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, dayOfWeek: event.target.value }))
                  }
                >
                  {DAY_OPTIONS.map((day, index) => (
                    <option key={day} value={String(index)}>
                      {day}
                    </option>
                  ))}
                </NativeSelectControl>
              </div>
              <div>
                <label className="block mb-2 text-sm text-foreground">Buffer (mins)</label>
                <input
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={draft.bufferMinutes}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, bufferMinutes: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-2 text-sm text-foreground">Start</label>
                <input
                  type="time"
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={draft.startTime}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, startTime: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block mb-2 text-sm text-foreground">End</label>
                <input
                  type="time"
                  className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                  value={draft.endTime}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, endTime: event.target.value }))
                  }
                />
              </div>
            </div>

            <Button onClick={() => void handleSaveRule()} disabled={saving}>
              {saving ? "Saving..." : "Save Availability"}
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading availability...</p>
            ) : rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No availability rules yet.</p>
            ) : (
              rules.slice(0, 8).map((rule) => (
                <div key={rule.id} className="rounded-lg bg-secondary/20 p-3">
                  <p className="font-medium">
                    {rule.user?.full_name || rule.user?.email || "Team member"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {DAY_OPTIONS[rule.day_of_week]} · {rule.start_time} - {rule.end_time}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Calendar Connections</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Mark Google, Outlook, or ICS connections that should receive viewing exports.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {(["google", "outlook", "ics"] as const).map((provider) => {
                const connection = connections.find(
                  (item) => item.provider === provider && item.user_id === currentUserId
                );

                return (
                  <Card key={provider} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{formatLabel(provider)}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {connection?.external_account_email || "No account linked yet"}
                        </p>
                      </div>
                      <Badge variant={connection?.status === "connected" ? "default" : "outline"}>
                        {formatLabel(connection?.status || "pending")}
                      </Badge>
                    </div>
                    <Button
                      className="mt-4 w-full"
                      variant="outline"
                      onClick={() => void handleConnectionToggle(provider)}
                      disabled={saving}
                    >
                      <RefreshCcw className="w-4 h-4" />
                      {connection?.status === "connected" ? "Disconnect" : "Mark Connected"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold">Upcoming Viewings</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Download ICS files, copy reschedule links, and confirm which appointments need attention.
                </p>
              </div>
              <Badge variant="secondary">{upcomingViewings.length} active</Badge>
            </div>

            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading viewings...</div>
            ) : upcomingViewings.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No active viewing queue right now.</div>
            ) : (
              <div className="space-y-4">
                {upcomingViewings.map((viewing) => (
                  <div key={viewing.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">
                            {viewing.user?.full_name || viewing.user?.email || "Prospect"}
                          </h3>
                          <Badge>{formatLabel(viewing.status)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {viewing.listing?.property?.address || "Property viewing"}
                        </p>
                        <p className="text-sm mt-2">
                          {formatDateTime(viewing.confirmed_datetime || viewing.requested_datetime)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => calendarOperationsService.downloadViewingIcs(viewing)}
                        >
                          <Download className="w-4 h-4" />
                          Download ICS
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleCreateRescheduleLink(viewing)}
                        >
                          <Link2 className="w-4 h-4" />
                          Copy Reschedule Link
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const token =
                              connections.find((item) => item.provider === "ics" && item.user_id === currentUserId)
                                ?.provider || "ics";
                            void navigator.clipboard.writeText(token);
                            toast.success("Connection hint copied.");
                          }}
                        >
                          <Copy className="w-4 h-4" />
                          Copy Sync Hint
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
