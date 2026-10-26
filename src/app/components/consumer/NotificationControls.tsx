import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { communicationService, type NotificationPreferencesSettings } from '../../../lib/communication.service';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
export function NotificationControls({ userId }: { userId: string }) {
  const [preferences, setPreferences] = useState<NotificationPreferencesSettings | null>(null);
  const [error, setError] = useState(false); const [attempt, setAttempt] = useState(0); const [saving, setSaving] = useState(false);
  useEffect(() => { let cancelled = false; setError(false); setPreferences(null); communicationService.getNotificationPreferences(userId).then((value) => { if (!cancelled) setPreferences(value); }).catch(() => { if (!cancelled) setError(true); }); return () => { cancelled = true; }; }, [userId, attempt]);
  const save = async () => { if (!preferences) return;
    if (preferences.quiet_hours_enabled && (![preferences.quiet_hours_start, preferences.quiet_hours_end].every((value) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value || '')))) { toast.error('Choose a start and end time for quiet hours.'); return; }
    setSaving(true); try { await communicationService.updateNotificationPreferences(userId, preferences); toast.success('Notification preferences saved.'); } catch { toast.error('Could not save. Your choices are still here; retry when connected.'); } finally { setSaving(false); } };
  return <details className="rounded-xl border border-surface-border bg-surface p-4"><summary className="cursor-pointer text-base font-semibold">Notification preferences</summary>
    {error ? <div role="alert" className="mt-3">Could not load preferences.<Button variant="outline" onClick={() => setAttempt(attempt + 1)}>Retry</Button></div> : !preferences ? <p role="status" className="mt-3">Loading preferences…</p> : <div className="mt-4 space-y-4">
      <p className="text-sm text-ink-secondary">Choose delivery channels. External delivery also depends on your verified contact details, device permissions and available providers.</p>
      {(['in_app_enabled','email_enabled','push_enabled','sms_enabled','whatsapp_enabled'] as const).map((key, index) => <label key={key} className="flex min-h-11 items-center justify-between gap-3 text-sm"><span>{['In-app updates','Email','Push notifications','SMS','WhatsApp'][index]}</span><input type="checkbox" checked={Boolean(preferences[key])} onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })} /></label>)}
      <label className="block text-sm">Delivery frequency<select value={preferences.notification_frequency || 'daily'} onChange={(event) => setPreferences({ ...preferences, notification_frequency: event.target.value })} className="ml-3 min-h-11 rounded-lg border border-surface-border bg-surface px-3"><option value="immediate">Immediate</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="never">Never</option></select></label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={preferences.quiet_hours_enabled} onChange={(event) => setPreferences({ ...preferences, quiet_hours_enabled: event.target.checked })} />Quiet hours for external delivery</label>
      {preferences.quiet_hours_enabled && <div className="flex flex-wrap gap-4"><label className="text-sm">From<input type="time" value={preferences.quiet_hours_start || '22:00'} onChange={(event) => setPreferences({ ...preferences, quiet_hours_start: event.target.value })} className="block min-h-11 rounded border border-surface-border bg-surface px-2" /></label><label className="text-sm">To<input type="time" value={preferences.quiet_hours_end || '08:00'} onChange={(event) => setPreferences({ ...preferences, quiet_hours_end: event.target.value })} className="block min-h-11 rounded border border-surface-border bg-surface px-2" /></label></div>}
      <p className="text-xs text-ink-secondary">In-app updates are immediate when enabled. Manage which property searches notify you in <Link className="underline" to="/app/alerts">saved-search alerts</Link>.</p>
      <Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save preferences'}</Button>
    </div>}
  </details>;
}
