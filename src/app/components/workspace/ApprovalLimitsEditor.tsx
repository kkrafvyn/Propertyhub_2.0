import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { organizationService } from "../../../lib/organization.service";
import { formatApprovalLimit } from "../../../lib/authorization.service";

interface ApprovalLimitsEditorProps {
  organizationId: string;
  userId: string;
  memberName: string;
  financeApprovalLimitMinor?: number | null;
  maintenanceApprovalLimitMinor?: number | null;
  canEdit: boolean;
  onSaved?: () => void;
}

function minorFromMajorInput(value: string) {
  const major = Number(value);
  if (!Number.isFinite(major) || major < 0) return null;
  return Math.round(major * 100);
}

function majorFromMinor(minor?: number | null) {
  if (minor == null) return "";
  return String(minor / 100);
}

export function ApprovalLimitsEditor({
  organizationId,
  userId,
  memberName,
  financeApprovalLimitMinor,
  maintenanceApprovalLimitMinor,
  canEdit,
  onSaved,
}: ApprovalLimitsEditorProps) {
  const [financeMajor, setFinanceMajor] = useState(majorFromMinor(financeApprovalLimitMinor));
  const [maintenanceMajor, setMaintenanceMajor] = useState(majorFromMinor(maintenanceApprovalLimitMinor));
  const [saving, setSaving] = useState(false);

  if (!canEdit) {
    return (
      <p className="text-xs text-ink-secondary">
        Finance: {formatApprovalLimit(financeApprovalLimitMinor ?? 0)} · Maintenance:{" "}
        {formatApprovalLimit(maintenanceApprovalLimitMinor ?? 0)}
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-surface-border p-3">
      <p className="text-xs font-medium text-ink">Approval limits — {memberName}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          label="Finance limit (GHS)"
          value={financeMajor}
          onChange={(event) => setFinanceMajor(event.target.value)}
          placeholder="Leave empty for role default"
        />
        <Input
          label="Maintenance limit (GHS)"
          value={maintenanceMajor}
          onChange={(event) => setMaintenanceMajor(event.target.value)}
          placeholder="Leave empty for role default"
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={saving}
        onClick={() => {
          setSaving(true);
          void organizationService
            .updateMemberApprovalLimits(organizationId, userId, {
              financeApprovalLimitMinor: financeMajor.trim()
                ? minorFromMajorInput(financeMajor)
                : null,
              maintenanceApprovalLimitMinor: maintenanceMajor.trim()
                ? minorFromMajorInput(maintenanceMajor)
                : null,
            })
            .then(() => {
              toast.success("Approval limits updated.");
              onSaved?.();
            })
            .catch(() => toast.error("Unable to save approval limits."))
            .finally(() => setSaving(false));
        }}
      >
        Save limits
      </Button>
    </div>
  );
}
