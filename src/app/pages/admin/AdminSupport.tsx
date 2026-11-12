import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { canAccessAdminSection } from "../../../lib/platform-access";
import {
  adminOperationsService,
  type AdminRecord,
} from "../../../lib/admin-operations.service";
import { AdminRecordBrowser } from "./AdminRecordBrowser";
import { AdminCaseForm } from "./AdminCaseForm";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { SupportThread } from '../../components/security/SupportThread';
import { CasePriority,OverdueReminders,RecoveryReview } from './AdminCaseTools';

function CaseEditor({
  row,
  onSaved,
}: {
  row: AdminRecord;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [history, setHistory] = useState<
    Awaited<ReturnType<typeof adminOperationsService.caseHistory>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState(String(row.status));
  const [assignee, setAssignee] = useState(String(row.assigned_to || ""));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const [staff,setStaff]=useState<Array<{id:string;full_name:string|null;email:string|null}>>([]);
  useEffect(()=>{let cancelled=false;adminOperationsService.supportStaff(row.id).then(data=>{if(!cancelled)setStaff(data);}).catch(error=>{if(!cancelled)setError(error.message);});return()=>{cancelled=true;};},[row.id]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHistoryError("");
    adminOperationsService
      .caseHistory(row.id)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch((error) => {
        if (!cancelled) setHistoryError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row.id, version]);
  const overdue =
    row.status !== "resolved" &&
    new Date(String(row.due_at)).getTime() < Date.now();
  return (
    <div className="space-y-5 border-t border-border pt-4">
      {overdue ? (
        <p className="text-sm font-semibold text-destructive">
          This case is overdue.
        </p>
      ) : null}
      <h3 className="font-semibold">Internal case history</h3>
      <CasePriority row={row} onSaved={onSaved}/>
      {loading ? (
        <p role="status">Loading case history…</p>
      ) : historyError ? (
        <div>
          <p role="alert" className="text-destructive">
            {historyError}
          </p>
          <Button variant="outline" onClick={() => setVersion((v) => v + 1)}>
            Retry history
          </Button>
        </div>
      ) : (
        <ol className="space-y-3">
          {history.map((event) => (
            <li key={event.id} className="rounded-lg border border-border p-3">
              <p className="whitespace-pre-wrap break-words text-sm">
                {event.note}
              </p>
              <p className="mt-2 break-all text-xs text-muted-foreground">
                {new Date(event.created_at).toLocaleString()} · {event.actor_id}
              </p>
            </li>
          ))}
        </ol>
      )}
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending.current) return;
          pending.current = true;
          setBusy(true);
          setError("");
          try {
            await adminOperationsService.updateCase(
              row.id,
              Number(row.revision),
              status,
              assignee || null,
              note,
            );
            onSaved();
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Unable to update case.",
            );
          } finally {
            pending.current = false;
            setBusy(false);
          }
        }}
      >
        <label className="block space-y-2 text-sm">
          Case status
          <select
            className="block min-h-11 rounded-lg border border-border bg-background px-3"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={busy}
          >
            {["open", "in_progress", "waiting", "resolved"].map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">Assign staff<select className="mt-2 block min-h-11 rounded-lg border border-border bg-background px-3" value={assignee} onChange={event=>setAssignee(event.target.value)} disabled={busy}><option value="">Unassigned</option>{staff.map(member=><option key={member.id} value={member.id}>{member.full_name||member.email||member.id}</option>)}</select></label>
          <p className="break-all text-sm">
            Assigned to: {assignee || "Unassigned"}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !user}
            onClick={() => setAssignee(user?.id || "")}
          >
            Assign to me
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setAssignee("")}
          >
            Unassign
          </Button>
        </div>
        <label className="block space-y-2 text-sm">
          Update note
          <textarea
            required
            maxLength={4000}
            className="block min-h-24 w-full rounded-lg border border-border bg-background p-3"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={busy}
          />
        </label>
        {row.category === "mfa_recovery" ? (
          <p className="text-sm text-muted-foreground">
            Record verified identity evidence and an owner review. Case status
            never resets MFA. An authorized owner must carry out any approved
            recovery separately.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save case update"}
        </Button>
      </form>
      {row.category==='mfa_recovery'?<RecoveryReview row={row}/>:null}
      <SupportThread caseId={row.id} canReply={row.category==='support'} onChanged={onSaved}/>
    </div>
  );
}

export function AdminSupport() {
  const { profile } = useAuth();
  const [version, setVersion] = useState(0);
  const support = canAccessAdminSection(profile, "support");
  const canReview =
    support ||
    canAccessAdminSection(profile, "communications") ||
    canAccessAdminSection(profile, "payments");
  if (!canReview)
    return (
      <Card className="p-6">
        Support access restricted. Ask the platform owner for access.
      </Card>
    );
  return (
    <div className="space-y-8">
      {support?<OverdueReminders/>:null}
      <AdminRecordBrowser
        kind="support"
        title="Support and follow-up"
        description="Assign cases, track the 24-hour initial response target, and keep an internal history. Only cases within your permissions are shown."
        organizationFilter
        statuses={["open", "in_progress", "waiting", "resolved"]}
        refreshKey={version}
        columns={[
          { key: "subject", label: "Subject" },
          { key: "category", label: "Category" },
          { key: "status", label: "Status" },
          { key: "priority", label: "Priority" },
          { key: "account_id", label: "Account" },
          { key: "assigned_to", label: "Assigned to" },
          { key: "due_at", label: "Response target" },
        ]}
        detail={(row, refresh) => (
          <CaseEditor key={row.id} row={row} onSaved={refresh} />
        )}
      />
      {support ? (
        <>
          <Card className="p-5">
            <AdminCaseForm
              category="support"
              onCreated={() => setVersion((v) => v + 1)}
            />
          </Card>
          <AdminRecordBrowser
            kind="accounts"
            title="Account lookup"
            description="Search all accessible accounts by email, name, phone, or exact account ID."
            columns={[
              { key: "full_name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "id", label: "Account ID" },
            ]}
            detail={(row) => (
              <AdminCaseForm
                key={row.id}
                category="mfa_recovery"
                accountId={row.id}
                onCreated={() => setVersion((v) => v + 1)}
              />
            )}
          />
        </>
      ) : null}
    </div>
  );
}
