import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
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
      toast.success("Time logged.");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Unable to log time.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff Time Tracking</h1>
        <p className="text-sm text-muted-foreground">Log minutes against estate work. Managers can see the full team log.</p>
      </div>
      <Card className="p-5">
        <form className="grid gap-3 sm:grid-cols-[120px_1fr_auto]" onSubmit={submit}>
          <Input type="number" min="15" max="1440" step="15" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          <Input placeholder="What did you work on?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button disabled={saving}><Clock className="h-4 w-4" /> Log time</Button>
        </form>
      </Card>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-border p-3 text-sm flex justify-between">
            <span>{entry.work_date} · {entry.minutes} min</span>
            <span className="text-muted-foreground">{entry.notes || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
