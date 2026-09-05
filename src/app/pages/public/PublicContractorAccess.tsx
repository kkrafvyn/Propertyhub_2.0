import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { externalAccessService } from "../../../lib/external-access.service";

type MaintenanceRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority?: string;
  label?: string | null;
};

export function PublicContractorAccess() {
  const { token = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [grantLabel, setGrantLabel] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceRow | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const row = await externalAccessService.getMaintenanceByToken(token);
        if (!row) {
          toast.error("This access link is invalid or expired.");
          setLoading(false);
          return;
        }

        setGrantLabel(row.label ?? null);
        setMaintenance(row as MaintenanceRow);
      } catch (error) {
        console.error(error);
        toast.error("Unable to load this assignment.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const markInProgress = async () => {
    if (!maintenance) return;
    try {
      setSubmitting(true);
      await externalAccessService.updateMaintenanceByToken(token, "in_progress", note || undefined);
      setMaintenance({ ...maintenance, status: "in_progress" });
      toast.success("Status updated.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to update this work order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DesktopShell minimal showFooter={false}>
      <div className="mx-auto max-w-xl px-4 py-10">
        <Card className="space-y-4 p-6">
          <p className="text-sm font-medium text-primary">Contractor access</p>
          <h1 className="text-2xl font-semibold">Assigned work order</h1>
          {grantLabel ? (
            <p className="text-sm text-ink-secondary">{grantLabel}</p>
          ) : null}

          {loading ? (
            <p className="text-sm text-ink-secondary">Loading assignment…</p>
          ) : !maintenance ? (
            <p className="text-sm text-ink-secondary">
              This link is no longer valid or the assignment could not be found.
            </p>
          ) : (
            <>
              <div>
                <p className="font-medium">{maintenance.title}</p>
                <p className="mt-1 text-sm text-ink-secondary">{maintenance.description}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-ink-muted">
                  Status: {maintenance.status}
                </p>
              </div>
              <textarea
                className="min-h-24 w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm"
                placeholder="Add a progress note (saved when you update status online)"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              {maintenance.status === "open" ? (
                <Button disabled={submitting} onClick={() => void markInProgress()}>
                  Mark in progress
                </Button>
              ) : null}
            </>
          )}
        </Card>
      </div>
    </DesktopShell>
  );
}
