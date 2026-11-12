import { useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { adminOperationsService } from "../../../lib/admin-operations.service";

export function AdminCaseForm({
  category,
  sourceId,
  accountId,
  onCreated,
  sourceLedger,
}: {
  category: string;
  sourceId?: string;
  accountId?: string;
  onCreated?: () => void;
  sourceLedger?: 'platform'|'property';
}) {
  const [subject, setSubject] = useState("");
  const [account, setAccount] = useState(accountId || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  const pending = useRef(false);
  return (
    <form
      className="space-y-4 border-t border-border pt-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError("");
        setCreated("");
        try {
          const id = sourceLedger==='property' && sourceId ? await adminOperationsService.createPropertyPaymentCase(sourceId,subject,note) : await adminOperationsService.createCase({
            subject,
            category,
            sourceId,
            accountId: account,
            note,
          });
          setCreated(String(id));
          setSubject("");
          setNote("");
          onCreated?.();
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Unable to create case.",
          );
        } finally {
          pending.current = false;
          setBusy(false);
        }
      }}
    >
      <h3 className="font-semibold">
        {category === "delivery_retry"
          ? "Request delivery retry review"
          : category === "payment_review"
            ? "Open payment follow-up"
            : category === "mfa_recovery"
              ? "Open authenticator recovery review"
              : "Create support ticket"}
      </h3>
      <p className="text-sm text-muted-foreground">
        {category === "mfa_recovery"
          ? "Record the identity checks needed. Opening or resolving this case does not remove an authenticator or grant access."
          : category === "delivery_retry"
            ? "This creates an assigned review case. A message is not resent automatically."
            : category === "payment_review"
              ? "Track reconciliation, refund, or dispute follow-up. Creating a case does not move money."
              : "Internal notes are visible to authorized platform staff. Do not include passwords, access tokens, or verification codes."}
      </p>
      <Input
        label="Subject"
        required
        minLength={3}
        maxLength={200}
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        disabled={busy}
      />
      {!sourceId && !accountId ? (
        <Input
          label="Account ID"
          required={category === "mfa_recovery"}
          value={account}
          onChange={(event) => setAccount(event.target.value)}
          disabled={busy}
        />
      ) : null}
      <label className="block space-y-2 text-sm">
        Context and next steps
        <textarea
          className="block min-h-28 w-full rounded-lg border border-border bg-background p-3"
          required
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
      {created ? (
        <p role="status" className="break-all text-sm">
          Case created: {created}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create review case"}
        </Button>
        <a
          className="text-sm font-semibold text-primary underline"
          href="/admin/support"
        >
          Open follow-up queue
        </a>
      </div>
    </form>
  );
}
