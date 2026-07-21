import { Link } from "react-router";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Circle } from "lucide-react";
import { Card } from "../ui/Card";

export type TimelineStep = {
  id: string;
  label: string;
  description?: string;
  status: "completed" | "current" | "upcoming";
  href?: string;
  timestamp?: string | null;
};

export type TimelineActivity = {
  id: string;
  message: string;
  href?: string;
  createdAt?: string | null;
  icon?: LucideIcon;
};

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

export function ActivityTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <Card className="p-6">
      <ol className="space-y-4" aria-label="Activity timeline">
        {steps.map((step, index) => {
          const Icon = step.status === "completed" ? CheckCircle2 : Circle;
          const content = (
            <div className="flex items-start gap-3">
              <Icon
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  step.status === "completed"
                    ? "text-primary"
                    : step.status === "current"
                      ? "text-accent"
                      : "text-muted-foreground"
                }`}
                aria-hidden="true"
              />
              <div>
                <p className={`font-medium ${step.status === "upcoming" ? "text-muted-foreground" : ""}`}>
                  {step.label}
                </p>
                {step.description ? (
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                ) : null}
                {step.timestamp ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(step.timestamp)}
                  </p>
                ) : null}
              </div>
            </div>
          );

          return (
            <li key={step.id} className={index < steps.length - 1 ? "pb-1 border-b border-border/60" : ""}>
              {step.href ? (
                <Link to={step.href} className="block hover:bg-secondary/30 rounded-lg -mx-2 px-2 py-1">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export function ActivityFeed({ items }: { items: TimelineActivity[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="divide-y divide-border">
      {items.map((item) => {
        const Icon = item.icon;
        const body = (
          <div className="flex items-start gap-4 p-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              {Icon ? <Icon className="w-5 h-5" aria-hidden="true" /> : null}
            </div>
            <div className="flex-1">
              <p>{item.message}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatRelativeTime(item.createdAt)}
              </p>
            </div>
          </div>
        );

        return item.href ? (
          <Link key={item.id} to={item.href} className="block hover:bg-secondary/40 transition-colors">
            {body}
          </Link>
        ) : (
          <div key={item.id}>{body}</div>
        );
      })}
    </Card>
  );
}
