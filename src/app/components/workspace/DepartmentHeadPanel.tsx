import { useMemo, useState } from "react";
import { Crown, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Card } from "../ui/Card";
import { organizationService } from "../../../lib/organization.service";
import { DEPARTMENT_DEFINITIONS, getRoleCatalogEntry } from "../../../lib/company-model";
import type { DepartmentKey } from "../../../lib/company-model";
import type { MemberRole } from "../../../lib/workspace";

type DepartmentRow = {
  id: string;
  department_key: string;
  name: string;
  head_user_id?: string | null;
  head?: { id: string; full_name?: string | null; email?: string | null } | null;
};

type MemberRow = {
  user_id: string;
  role: MemberRole;
  user?: { full_name?: string | null; email?: string | null } | null;
};

interface DepartmentHeadPanelProps {
  organizationId: string;
  departments: DepartmentRow[];
  members: MemberRow[];
  canManage: boolean;
  onUpdated: () => void;
}

function getMemberLabel(member: MemberRow) {
  return member.user?.full_name || member.user?.email || "Member";
}

function eligibleHeadsForDepartment(members: MemberRow[], departmentKey: DepartmentKey) {
  return members.filter((member) => {
    const entry = getRoleCatalogEntry(member.role);
    return entry?.department === departmentKey && member.role !== "owner";
  });
}

export function DepartmentHeadPanel({
  organizationId,
  departments,
  members,
  canManage,
  onUpdated,
}: DepartmentHeadPanelProps) {
  const [savingDepartmentId, setSavingDepartmentId] = useState<string | null>(null);

  const memberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of members) {
      const departmentKey = getRoleCatalogEntry(member.role)?.department;
      if (!departmentKey) continue;
      counts.set(departmentKey, (counts.get(departmentKey) || 0) + 1);
    }
    return counts;
  }, [members]);

  const handleHeadChange = async (departmentId: string, headUserId: string) => {
    if (!canManage) return;

    try {
      setSavingDepartmentId(departmentId);
      await organizationService.setDepartmentHead(
        organizationId,
        departmentId,
        headUserId || null,
      );
      toast.success(headUserId ? "Department head updated." : "Department head cleared.");
      onUpdated();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update department head.");
    } finally {
      setSavingDepartmentId(null);
    }
  };

  if (!departments.length) {
    return null;
  }

  return (
    <Card className="border-surface-border bg-surface p-6 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Crown className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-ink">Departments & heads</h2>
      </div>
      <p className="mb-4 text-sm text-ink-secondary">
        Appoint a department head to delegate invites and role assignment within that department.
        Heads can only grant roles they are allowed to assign.
      </p>

      <div className="space-y-3">
        {departments.map((department) => {
          const departmentKey = department.department_key as DepartmentKey;
          const definition = DEPARTMENT_DEFINITIONS.find((entry) => entry.key === departmentKey);
          const eligible = eligibleHeadsForDepartment(members, departmentKey);
          const memberCount = memberCounts.get(departmentKey) || 0;

          return (
            <div
              key={department.id}
              className="rounded-xl border border-surface-border bg-surface-subtle p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{department.name}</p>
                    {definition ? (
                      <Badge variant="outline" className="text-[10px]">
                        {definition.label}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Users className="h-3.5 w-3.5" />
                    {memberCount} member{memberCount === 1 ? "" : "s"}
                    {department.head ? (
                      <>
                        {" "}
                        · Head: {department.head.full_name || department.head.email}
                      </>
                    ) : (
                      <> · No head appointed</>
                    )}
                  </p>
                </div>

                {canManage ? (
                  <div className="flex min-w-[220px] flex-col gap-1">
                    <label className="text-[11px] font-medium text-ink-secondary">Department head</label>
                    <select
                      className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                      value={department.head_user_id || ""}
                      disabled={savingDepartmentId === department.id}
                      onChange={(event) =>
                        void handleHeadChange(department.id, event.target.value)
                      }
                    >
                      <option value="">— Not assigned —</option>
                      {eligible.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {getMemberLabel(member)} ({member.role.replace(/_/g, " ")})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function DepartmentHeadScopeBanner({
  departmentKey,
}: {
  departmentKey: DepartmentKey;
}) {
  const label =
    DEPARTMENT_DEFINITIONS.find((entry) => entry.key === departmentKey)?.label || departmentKey;

  return (
    <Card className="border-amber-500/25 bg-amber-500/5 p-4">
      <div className="flex gap-3">
        <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-ink">Department head scope</p>
          <p className="mt-1 text-sm text-ink-secondary">
            You manage team access for <strong>{label}</strong> only. Role options below are limited
            to roles in your department.
          </p>
        </div>
      </div>
    </Card>
  );
}
