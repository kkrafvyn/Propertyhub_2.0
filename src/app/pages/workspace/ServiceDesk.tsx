import { useEffect, useMemo, useState } from "react";
import { Headphones, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/badge";
import { serviceDeskService, type ServiceCase } from "../../../lib/service-desk.service";

export function ServiceDesk({ organizationId }: { organizationId: string }) {
  const [cases, setCases] = useState<ServiceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState("");
  const [channel, setChannel] = useState<ServiceCase["channel"]>("phone");
  const [priority, setPriority] = useState<ServiceCase["priority"]>("normal");

  const load = async () => {
    try {
      setLoading(true);
      setCases(await serviceDeskService.getCases(organizationId));
    } catch {
      toast.error("Unable to load the service desk.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const openCases = useMemo(
    () => cases.filter((item) => !["resolved", "closed"].includes(item.status)).length,
    [cases]
  );
  const urgentCases = useMemo(
    () => cases.filter((item) => item.priority === "urgent" && item.status !== "closed").length,
    [cases]
  );
  const resolvedCases = useMemo(
    () => cases.filter((item) => item.status === "resolved" || item.status === "closed").length,
    [cases]
  );

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim()) return;

    try {
      setSaving(true);
      await serviceDeskService.createCase({ organizationId, subject, channel, priority });
      setSubject("");
      await load();
      toast.success("Service case created.");
    } catch {
      toast.error("Unable to create the case.");
    } finally {
      setSaving(false);
    }
  };

  const advance = async (item: ServiceCase) => {
    const next: Partial<Record<ServiceCase["status"], ServiceCase["status"]>> = {
      open: "triaged",
      triaged: "assigned",
      assigned: "waiting_customer",
      waiting_customer: "resolved",
      resolved: "closed",
    };

    if (!next[item.status]) return;

    try {
      setSaving(true);
      await serviceDeskService.updateStatus(item.id, next[item.status]!);
      await load();
    } catch {
      toast.error("Unable to update the case.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
        Loading Service Desk...
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">BaytMiftah Workspace</p>
        <h1 className="text-3xl font-semibold">Service Desk</h1>
        <p className="mt-2 text-muted-foreground">
          Capture client contact and turn it into an accountable operational workflow.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Open cases</p>
          <p className="mt-1 text-2xl font-semibold">{openCases}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Urgent cases</p>
          <p className="mt-1 text-2xl font-semibold">{urgentCases}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Resolved / closed</p>
          <p className="mt-1 text-2xl font-semibold">{resolvedCases}</p>
        </Card>
      </div>

      <Card className="p-6">
        <form className="grid gap-3 md:grid-cols-[1.5fr,1fr,1fr,auto]" onSubmit={create}>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What does the customer need?"
          />
          <select
            className="rounded-lg border border-border bg-input-background px-3 py-2"
            value={channel}
            onChange={(e) => setChannel(e.target.value as ServiceCase["channel"])}
          >
            {["phone", "whatsapp", "sms", "email", "in_app", "web"].map((item) => (
              <option key={item} value={item}>
                {item.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-border bg-input-background px-3 py-2"
            value={priority}
            onChange={(e) => setPriority(e.target.value as ServiceCase["priority"])}
          >
            {["low", "normal", "high", "urgent"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Button disabled={saving}>
            <Plus className="h-4 w-4" />
            Create case
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {cases.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Headphones className="mx-auto mb-3 h-6 w-6" />
            No open service cases.
          </Card>
        ) : (
          cases.map((item) => (
            <Card
              key={item.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{item.subject}</p>
                <p className="mt-1 text-sm text-muted-foreground capitalize">
                  {item.channel.replace("_", " ")} · {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={item.priority === "urgent" ? "destructive" : "outline"} className="capitalize">
                  {item.priority}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {item.status.replace("_", " ")}
                </Badge>
                {item.status !== "closed" && (
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => void advance(item)}>
                    Advance
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
