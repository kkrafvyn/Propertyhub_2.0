import { useRef, useState } from "react";
import { AdminSectionGate } from "./AdminSectionGate";
import { AdminRecordBrowser } from "./AdminRecordBrowser";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import {
  adminOperationsService,
  isUuid,
  type AdminRecord,
} from "../../../lib/admin-operations.service";
function AiDecision({
  row,
  onSaved,
}: {
  row: AdminRecord;
  onSaved: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const decide = async (decision: "approved" | "rejected") => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await adminOperationsService.decideAi(row.id, decision, note);
      onSaved();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Decision could not be saved.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return row.action_status === "recommended" ? (
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="font-semibold">Review recommendation</h3>
      <p className="text-sm text-muted-foreground">
        A decision updates the review record. Approval does not dispatch an
        action.
      </p>
      <label className="block space-y-2 text-sm">
        Review reason
        <textarea
          className="block min-h-24 w-full rounded-lg border border-border bg-background p-3"
          minLength={10}
          maxLength={4000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={busy}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button
          disabled={busy || note.trim().length < 10}
          onClick={() => void decide("approved")}
        >
          Approve recommendation
        </Button>
        <Button
          variant="outline"
          disabled={busy || note.trim().length < 10}
          onClick={() => void decide("rejected")}
        >
          Reject recommendation
        </Button>
      </div>
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">
      This action has already been reviewed.
    </p>
  );
}
function AiControls() {
  const [organization, setOrganization] = useState("");
  const [agent, setAgent] = useState("");
  const [budget, setBudget] = useState("100");
  const [enabled, setEnabled] = useState(true);
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof adminOperationsService.aiControls>>
  >([]);
  const [loaded, setLoaded] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  async function run(save: boolean) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!isUuid(organization))
        throw new Error("Enter a valid organization ID.");
      if (save)
        await adminOperationsService.setAiControl(
          organization,
          agent,
          enabled,
          Number(budget),
        );
      setRows(await adminOperationsService.aiControls(organization));
      setLoaded(organization);
      if (save) setMessage("Agent control saved.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to load controls.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-lg font-semibold">Organization agent controls</h2>
      <p className="text-sm text-muted-foreground">
        Manage the controls read by integrated agents. Budget enforcement
        depends on each agent using these controls.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Input
            label="Controls organization ID"
            value={organization}
            disabled={busy}
            onChange={(event) => {
              setOrganization(event.target.value);
              setLoaded("");
              setRows([]);
              setMessage("");
            }}
          />
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void run(false)}
        >
          Load controls
        </Button>
      </div>
      {loaded === organization ? (
        <>
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.agent_name}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-border p-3 text-left text-sm"
                  disabled={busy}
                  onClick={() => {
                    setAgent(row.agent_name);
                    setEnabled(row.enabled);
                    setBudget(String(row.daily_action_budget));
                  }}
                >
                  {row.agent_name} · {row.enabled ? "Enabled" : "Paused"} ·{" "}
                  {row.daily_action_budget} actions/day
                </button>
              </li>
            ))}
          </ul>
          {!rows.length ? (
            <p className="text-sm text-muted-foreground">
              No controls configured for this organization.
            </p>
          ) : null}
          <form
            className="space-y-3 border-t border-border pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              void run(true);
            }}
          >
            <Input
              label="Agent name (must match the agent integration)"
              required
              maxLength={100}
              value={agent}
              onChange={(event) => setAgent(event.target.value)}
              disabled={busy}
            />
            <Input
              label="Daily action budget"
              type="number"
              required
              min={0}
              max={100000}
              step={1}
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              disabled={busy}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                disabled={busy}
              />
              Agent enabled
            </label>
            <Button type="submit" disabled={busy}>
              Save agent control
            </Button>
          </form>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm">
          {message}
        </p>
      ) : null}
    </Card>
  );
}
export function AdminPlatformAi() {
  return (
    <AdminSectionGate section="ai" label="Platform AI">
      <AdminRecordBrowser
        kind="ai"
        title="Platform AI governance"
        description="Review recommendations, inspect risks, and manage organization agent controls."
        organizationFilter
        statuses={["recommended", "approved", "rejected", "executed"]}
        columns={[
          { key: "created_at", label: "When" },
          { key: "organization_id", label: "Organization" },
          { key: "agent_type", label: "Agent" },
          { key: "trigger_type", label: "Trigger" },
          { key: "action_status", label: "Status" },
          { key: "risk_level", label: "Risk" },
        ]}
        detail={(row, refresh) => (
          <AiDecision key={row.id} row={row} onSaved={refresh} />
        )}
      >
        <AiControls />
      </AdminRecordBrowser>
    </AdminSectionGate>
  );
}
