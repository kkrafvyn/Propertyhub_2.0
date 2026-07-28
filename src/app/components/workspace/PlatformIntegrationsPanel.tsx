import { CheckCircle2, CircleDashed } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/badge";
import { getIntegrationSummary } from "../../../lib/integrations";

export function PlatformIntegrationsPanel() {
  const integrations = getIntegrationSummary();

  return (
    <Card className="mb-6 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">Platform integrations</h3>
          <p className="text-sm text-ink-secondary">
            Live services wired in this build. Server secrets deploy via{" "}
            <code className="text-xs">supabase/.env.payments</code>.
          </p>
        </div>
        <Badge variant="secondary">
          {integrations.filter((item) => item.configured).length}/{integrations.length} ready
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {integrations.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-subtle/40 p-3"
          >
            {item.configured ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-forest" />
            ) : (
              <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-ink-secondary" />
            )}
            <div className="min-w-0">
              <p className="font-medium text-ink">{item.label}</p>
              <p className="text-xs text-ink-secondary">{item.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
