import { useRef, useState } from "react";
import { AdminSectionGate } from "./AdminSectionGate";
import { AdminRecordBrowser } from "./AdminRecordBrowser";
import { AdminCaseForm } from "./AdminCaseForm";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { adminOperationsService } from "../../../lib/admin-operations.service";
import { DeliveryRetry } from './DeliveryRetry';
function CommunicationDiagnostics() {
  const [organization, setOrganization] = useState("");
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof adminOperationsService.communicationHealth>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-lg font-semibold">WhatsApp connection checks</h2>
      <p className="text-sm text-muted-foreground">
        Check webhook configuration and organization credentials. Presence
        checks cannot confirm Meta approval or token validity.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending.current) return;
          pending.current = true;
          setBusy(true);
          setError("");
          setResult(null);
          try {
            setResult(
              await adminOperationsService.communicationHealth(organization),
            );
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Unable to check connection.",
            );
          } finally {
            pending.current = false;
            setBusy(false);
          }
        }}
      >
        <div className="min-w-48 flex-1">
          <Input
            label="Organization to diagnose"
            value={organization}
            onChange={(event) => {
              setOrganization(event.target.value);
              setResult(null);
            }}
            placeholder="Organization ID (optional)"
            disabled={busy}
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Checking…" : "Check connection"}
        </Button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {result ? (
        <div role="status" className="space-y-3">
          {result.checks.map((check) => (
            <div
              key={check.name}
              className="rounded-lg border border-border p-3"
            >
              <p className="text-sm font-semibold">
                {check.ready ? "Configured" : "Needs attention"} · {check.name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {check.detail}
              </p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Checked {new Date(result.checkedAt).toLocaleString()}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
export function AdminPlatformCommunications() {
  return (
    <AdminSectionGate section="communications" label="Communications">
      <AdminRecordBrowser
        kind="communications"
        title="Communications delivery"
        description="Find failed messages across organizations and track retry reviews."
        organizationFilter
        statuses={["queued", "sent", "delivered", "failed", "escalated"]}
        columns={[
          { key: "attempted_at", label: "When" },
          { key: "organization_id", label: "Organization" },
          { key: "channel", label: "Channel" },
          { key: "status", label: "Status" },
          { key: "attempt_number", label: "Attempt" },
          { key: "error_message", label: "Error" },
        ]}
        detail={(row,refresh) =>
          row.status === "failed" ? (
            <div className="space-y-5"><DeliveryRetry key={`retry-${row.id}`} row={row} onSaved={refresh}/><AdminCaseForm
              key={row.id}
              category="delivery_retry"
              sourceId={row.id}
            /></div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Retry review is available for failed deliveries.
            </p>
          )
        }
      >
        <CommunicationDiagnostics />
      </AdminRecordBrowser>
    </AdminSectionGate>
  );
}
