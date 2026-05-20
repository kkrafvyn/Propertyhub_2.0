import { Badge } from "../ui/badge";

interface EscrowMilestoneTimelineProps {
  milestones: any[];
  title?: string;
  description?: string;
  compact?: boolean;
}

function formatMilestoneLabel(value?: string | null) {
  if (!value) return "Pending";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getMilestoneStatusVariant(
  status?: string | null
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "completed":
      return "default";
    case "blocked":
      return "destructive";
    case "in_progress":
      return "secondary";
    default:
      return "outline";
  }
}

function formatMilestoneDate(value?: string | null) {
  if (!value) return "Date pending";

  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function EscrowMilestoneTimeline({
  milestones,
  title = "Escrow timeline",
  description = "Follow each trust checkpoint before funds move or keys change hands.",
  compact = false,
}: EscrowMilestoneTimelineProps) {
  const safeMilestones = Array.isArray(milestones) ? milestones : [];

  if (safeMilestones.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border border-border ${
        compact ? "bg-white p-3" : "bg-secondary/20 p-4"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`font-medium text-foreground ${compact ? "text-sm" : "text-base"}`}>
            {title}
          </p>
          <p className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
            {description}
          </p>
        </div>
        <Badge variant="outline">{safeMilestones.length} checkpoints</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {safeMilestones.map((milestone, index) => {
          const releaseRequirements = Array.isArray(milestone?.release_conditions?.required)
            ? milestone.release_conditions.required
            : [];

          return (
            <div
              key={milestone.id || `${milestone.label || "milestone"}-${index}`}
              className="flex gap-3 rounded-xl border border-border/70 bg-background/80 p-3"
            >
              <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`font-medium text-foreground ${compact ? "text-sm" : "text-base"}`}>
                    {milestone.label || "Escrow step"}
                  </p>
                  <Badge variant={getMilestoneStatusVariant(milestone.status)}>
                    {formatMilestoneLabel(milestone.status)}
                  </Badge>
                  {milestone.is_suggested ? <Badge variant="outline">Suggested</Badge> : null}
                </div>

                <p className={`mt-1 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
                  Due {formatMilestoneDate(milestone.due_at)}
                </p>

                {milestone.metadata?.guidance ? (
                  <p className={`mt-2 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
                    {milestone.metadata.guidance}
                  </p>
                ) : null}

                {releaseRequirements.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {releaseRequirements.map((requirement: string) => (
                      <span
                        key={`${milestone.id || index}-${requirement}`}
                        className="rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary"
                      >
                        {formatMilestoneLabel(requirement)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
