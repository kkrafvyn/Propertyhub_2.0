import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Card } from "./ui/Card";

interface PageLoadingStateProps {
  label?: string;
}

export function PageLoadingState({ label = "Loading..." }: PageLoadingStateProps) {
  return (
    <Card className="overflow-hidden border-border/70 bg-white/90 p-0">
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">Pulling the latest BaytMiftah signals.</p>
        </div>
      </div>
      <div className="grid gap-3 border-t border-border/70 bg-secondary/20 p-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded-2xl bg-white/80" />
        ))}
      </div>
    </Card>
  );
}

interface ActionEmptyStateProps {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function ActionEmptyState({ icon: Icon, eyebrow, title, description, actions }: ActionEmptyStateProps) {
  return (
    <Card className="overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(255,51,102,0.08),transparent_34%),linear-gradient(135deg,rgba(255,255,255,1),rgba(248,247,244,0.95))] p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-sm">
        <Icon className="h-7 w-7" />
      </div>
      {eyebrow && (
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">{eyebrow}</p>
      )}
      <h3 className="mx-auto mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{description}</p>
      {actions && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </Card>
  );
}
