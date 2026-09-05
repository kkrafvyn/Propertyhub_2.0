import { useMemo } from "react";
import type { WorkspacePermission } from "../../../lib/workspace-permissions";
import {
  PERMISSION_GROUPS,
  WORKSPACE_PERMISSION_LABELS,
  canGrantPermission,
  summarizePermissionState,
} from "../../../lib/permission-matrix";
import type { RoleAssignerContext } from "../../../lib/role-assignment";
import type { MemberRole } from "../../../lib/workspace";

interface PermissionMatrixEditorProps {
  role: MemberRole;
  permissions: string[];
  assignerContext: RoleAssignerContext;
  disabled?: boolean;
  onChange: (nextPermissions: string[]) => void;
}

export function PermissionMatrixEditor({
  role,
  permissions,
  assignerContext,
  disabled = false,
  onChange,
}: PermissionMatrixEditorProps) {
  const rows = useMemo(() => summarizePermissionState(role, permissions), [role, permissions]);

  const toggle = (permission: WorkspacePermission) => {
    if (disabled || !canGrantPermission(assignerContext, permission)) return;

    const roleDefaults = summarizePermissionState(role, null)
      .filter((row) => row.enabled)
      .map((row) => row.permission);

    const customOnly = permissions.filter((entry) => !roleDefaults.includes(entry as WorkspacePermission));
    const nextCustom = customOnly.includes(permission)
      ? customOnly.filter((entry) => entry !== permission)
      : [...customOnly, permission];

    onChange(nextCustom);
  };

  return (
    <div className="space-y-3">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label} className="rounded-xl border border-surface-border bg-surface p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.permissions.map((permission) => {
              const row = rows.find((entry) => entry.permission === permission);
              const enabled = row?.enabled ?? false;
              const grantable = canGrantPermission(assignerContext, permission);
              return (
                <button
                  key={permission}
                  type="button"
                  disabled={disabled || !grantable}
                  onClick={() => toggle(permission)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    enabled
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-surface-border bg-surface-subtle text-ink-muted"
                  } ${!grantable ? "cursor-not-allowed opacity-50" : ""}`}
                  title={WORKSPACE_PERMISSION_LABELS[permission]}
                >
                  {WORKSPACE_PERMISSION_LABELS[permission]}
                  {row?.fromRole && row.custom ? " +" : row?.fromRole ? "" : row?.custom ? " (custom)" : ""}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
