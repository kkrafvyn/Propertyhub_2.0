import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import { workQueueService, type WorkItem } from "../../../lib/work-queue.service";
import { orgActivityService } from "../../../lib/org-activity.service";
import { useAuth } from "../../context/AuthContext";
import type { Database } from "../../../lib/database.types";
import type { MemberRole } from "../../../lib/workspace";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface DesktopMyWorkHomeProps {
  organization: Organization;
  workspaceBasePath: string;
  currentRole?: MemberRole | null;
}

function urgencyBucket(urgency: WorkItem["urgency"]) {
  if (urgency === "critical") return "urgent";
  if (urgency === "high") return "attention";
  if (urgency === "medium") return "pending";
  return "scheduled";
}

export function DesktopMyWorkHome({
  organization,
  workspaceBasePath,
  currentRole,
}: DesktopMyWorkHomeProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isExecutive = orgActivityService.isExecutiveRole(currentRole);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = isExecutive
      ? workQueueService.getOrgWork(organization.id)
      : workQueueService.getMyWork(organization.id, user?.id);
    void load
      .then((rows) => {
        if (active) setItems(rows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organization.id, user?.id, isExecutive]);

  const counts = useMemo(() => {
    const buckets = { urgent: 0, attention: 0, pending: 0, scheduled: 0 };
    for (const item of items) {
      buckets[urgencyBucket(item.urgency)] += 1;
    }
    return buckets;
  }, [items]);

  const briefing = useMemo(() => {
    const lines: string[] = [];
    const approvals = items.filter((i) => i.kind === "approval").length;
    const exceptions = items.filter((i) => i.kind === "exception").length;
    const aiPending = items.filter((i) => i.kind === "ai_pending").length;
    const maintenance = items.filter((i) => i.kind === "maintenance").length;

    if (exceptions > 0) {
      lines.push(`${exceptions} operational exception${exceptions === 1 ? "" : "s"} need review.`);
    }
    if (approvals > 0) {
      lines.push(`${approvals} approval${approvals === 1 ? "" : "s"} waiting in your queue.`);
    }
    if (aiPending > 0) {
      lines.push(`${aiPending} AI action${aiPending === 1 ? "" : "s"} pending your decision.`);
    }
    if (maintenance > 0) {
      lines.push(`${maintenance} maintenance item${maintenance === 1 ? "" : "s"} need attention.`);
    }
    if (lines.length === 0) {
      lines.push("Your queue is clear. Review operations or check AI recommendations.");
    }
    return lines.slice(0, 4);
  }, [items]);

  const openItem = (item: WorkItem) => {
    navigate(`${workspaceBasePath}/${item.href}`);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
          BaytMiftah Desktop · {organization.name}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">What needs your attention?</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Command → Work → Context → Action. Your professional workstation for deep operational work.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Today</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-4 border-red-500/30 bg-red-500/5">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{counts.urgent}</p>
            <p className="text-xs text-muted-foreground mt-1">Urgent</p>
          </Card>
          <Card className="p-4 border-orange-500/30 bg-orange-500/5">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{counts.attention}</p>
            <p className="text-xs text-muted-foreground mt-1">Need attention</p>
          </Card>
          <Card className="p-4 border-amber-500/30 bg-amber-500/5">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{counts.pending}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending approval</p>
          </Card>
          <Card className="p-4 border-blue-500/30 bg-blue-500/5">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{counts.scheduled}</p>
            <p className="text-xs text-muted-foreground mt-1">Scheduled</p>
          </Card>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold">AI Briefing</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {briefing.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Bot className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => navigate(`${workspaceBasePath}/ai-command-center`)}
          >
            Open AI Command Center
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-4">Quick access</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Operations", slug: "property-360" },
              { label: "Finance", slug: "finance" },
              { label: "Maintenance", slug: "maintenance" },
              { label: "Approvals", slug: "approval-center" },
            ].map((link) => (
              <Link
                key={link.slug}
                to={`${workspaceBasePath}/${link.slug}`}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50 transition"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Continue work
          </h2>
          <Link to={`${workspaceBasePath}/my-work`} className="text-xs text-emerald-600 hover:underline">
            Full queue
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your queue…
          </div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-80" />
            Nothing urgent right now. Use the workspace rail to manage operations, finance, or CRM.
          </Card>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.urgency === "critical" || item.urgency === "high" ? (
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm truncate">{item.title}</span>
                  </div>
                  <Badge variant="outline" className="capitalize shrink-0">
                    {item.kind.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 pl-6">{item.subtitle}</p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
