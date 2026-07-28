import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import {
  communicationService,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferencesSettings,
} from "../../../lib/communication.service";
import { PushNotificationsPanel } from "./AppSettings";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function ConsumerNotificationPreferences({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<NotificationPreferencesSettings>({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  });

  useEffect(() => {
    void communicationService
      .getNotificationPreferences(userId)
      .then(setFormData)
      .catch(() => setFormData({ ...DEFAULT_NOTIFICATION_PREFERENCES }))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await communicationService.updateNotificationPreferences(userId, formData);
      toast.success("Notification preferences saved.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to save notification preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Card className="p-6 text-sm text-muted-foreground">Loading notification preferences...</Card>;
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold">Notification preferences</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how Property Hub reaches you about messages, bookings, and payments.
        </p>
      </div>

      <div className="space-y-3">
        <ToggleRow
          label="In-app notifications"
          description="Show alerts inside your dashboard and notification center."
          checked={formData.in_app_enabled}
          onChange={(value) => setFormData((current) => ({ ...current, in_app_enabled: value }))}
        />
        <ToggleRow
          label="Email"
          description="Receive summaries and important updates by email when enabled."
          checked={formData.email_enabled}
          onChange={(value) => setFormData((current) => ({ ...current, email_enabled: value }))}
        />
        <ToggleRow
          label="SMS"
          description="Get time-sensitive alerts by text message."
          checked={formData.sms_enabled}
          onChange={(value) => setFormData((current) => ({ ...current, sms_enabled: value }))}
        />
        <ToggleRow
          label="WhatsApp"
          description="Receive updates on WhatsApp when your number is on file."
          checked={formData.whatsapp_enabled}
          onChange={(value) => setFormData((current) => ({ ...current, whatsapp_enabled: value }))}
        />
        <ToggleRow
          label="Quiet hours"
          description="Pause non-urgent notifications overnight."
          checked={formData.quiet_hours_enabled}
          onChange={(value) => setFormData((current) => ({ ...current, quiet_hours_enabled: value }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Frequency
          <select
            className="w-full mt-2 rounded-lg border border-border px-3 py-2"
            value={formData.notification_frequency || "daily"}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                notification_frequency: event.target.value as NotificationPreferencesSettings["notification_frequency"],
              }))
            }
          >
            <option value="instant">Instant</option>
            <option value="daily">Daily digest</option>
            <option value="weekly">Weekly digest</option>
          </select>
        </label>
        <label className="text-sm">
          Quiet hours start
          <input
            type="time"
            className="w-full mt-2 rounded-lg border border-border px-3 py-2"
            value={formData.quiet_hours_start || "22:00"}
            onChange={(event) =>
              setFormData((current) => ({ ...current, quiet_hours_start: event.target.value }))
            }
          />
        </label>
      </div>

      <PushNotificationsPanel />

      <Button onClick={() => void handleSave()} disabled={saving}>
        {saving ? "Saving..." : "Save notification preferences"}
      </Button>
    </Card>
  );
}
