import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Clock, Plus, Timer, History, Calendar } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { staffTimeService } from "../../../lib/staff-time.service";
import { useAuth } from "../../context/AuthContext";

export function StaffTimeTracking({ organizationId }: { organizationId?: string }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [minutes, setMinutes] = useState("60");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!organizationId) return;
    setEntries(await staffTimeService.listEntries(organizationId));
  };

  useEffect(() => {
    void load().catch((error) => {
      console.error(error);
      toast.error("Unable to load time entries.");
    });
  }, [organizationId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !user?.id) return;
    try {
      setSaving(true);
      await staffTimeService.logTime({
        organizationId,
        userId: user.id,
        minutes: Number(minutes),
        notes,
      });
      setNotes("");
      toast.success("Work time recorded successfully.");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Unable to log time.");
    } finally {
      setSaving(false);
    }
  };

  const totalMinutes = useMemo(() => {
    return entries.reduce((acc, curr) => acc + (Number(curr.minutes) || 0), 0);
  }, [entries]);

  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    if (hours === 0) return `${remainder} min`;
    if (remainder === 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
    return `${hours} hr ${remainder} min`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Team Time Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Log operational hours against property maintenance, inspections, and estate duties.
          </p>
        </div>
        {entries.length > 0 && (
          <Badge variant="outline" className="text-sm font-medium px-3 py-1 bg-primary/5 border-primary/20 text-primary w-fit">
            Total logged: {formatDuration(totalMinutes)}
          </Badge>
        )}
      </div>

      {/* Log Form Card */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          Record Work Hours
        </h2>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto]">
            <div>
              <label htmlFor="duration-input" className="block text-xs font-medium text-muted-foreground mb-1">
                Duration (minutes)
              </label>
              <Input
                id="duration-input"
                type="number"
                min="15"
                max="1440"
                step="15"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="notes-input" className="block text-xs font-medium text-muted-foreground mb-1">
                Activity / Task Notes
              </label>
              <Input
                id="notes-input"
                placeholder="e.g. Unit 402 plumbing repair inspection..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <Button disabled={saving} className="h-10 w-full sm:w-auto">
                <Clock className="h-4 w-4 mr-1.5" />
                {saving ? "Saving..." : "Log Time"}
              </Button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground mr-1">Quick pick:</span>
            {[
              { label: "30 min", val: "30" },
              { label: "1 hour", val: "60" },
              { label: "2 hours", val: "120" },
              { label: "4 hours", val: "240" },
            ].map((preset) => (
              <button
                key={preset.val}
                type="button"
                onClick={() => setMinutes(preset.val)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  minutes === preset.val
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </form>
      </Card>

      {/* Entry History */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Recent Time Logs
        </h3>

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground bg-card/50">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="font-medium text-foreground">No time entries recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use the form above to log time spent on repairs, tenant support, or property management.
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-border bg-card p-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-primary font-mono text-sm bg-primary/10 px-2.5 py-1 rounded-md">
                  {formatDuration(entry.minutes)}
                </span>
                <span className="text-foreground">{entry.notes || "General estate operations"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {new Date(entry.work_date || entry.created_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
