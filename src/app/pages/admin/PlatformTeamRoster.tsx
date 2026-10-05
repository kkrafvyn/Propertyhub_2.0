import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import { AdminSectionGate } from "./AdminSectionGate";
import { PlatformRoleAssignmentDialog } from "../../components/admin/PlatformRoleAssignmentDialog";
import { adminService, type AdminUserRow } from "../../../lib/admin.service";
import {
  listPlatformStaff,
  listRoleChangeAudit,
  type PlatformStaffRow,
} from "../../../lib/platform-admin-dashboard.service";
import {
  formatPlatformGrantSummary,
  PLATFORM_ROLE_PRESETS,
  type PlatformConsoleGrant,
} from "../../../lib/platform-console-grants";
import { canManagePlatformRoles } from "../../../lib/platform-access";

export function PlatformTeamRoster() {
  const { profile, user } = useAuth();
  const [staff, setStaff] = useState<PlatformStaffRow[]>([]);
  const [audit, setAudit] = useState<Awaited<ReturnType<typeof listRoleChangeAudit>>>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [roleUser, setRoleUser] = useState<AdminUserRow | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextStaff, nextAudit] = await Promise.all([listPlatformStaff(), listRoleChangeAudit(25)]);
      setStaff(nextStaff);
      setAudit(nextAudit);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const canAssign = canManagePlatformRoles(profile);

  return (
    <AdminSectionGate section="team" label="Platform team">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Platform team</h1>
          <p className="text-muted-foreground mt-2">
            Owner and delegated staff with console grants. Role changes are audited.
          </p>
        </div>

        {loading ? (
          <Card className="p-10 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Grants</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {staff.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-3">
                      <p className="font-medium">{row.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    </td>
                    <td className="p-3">
                      {row.is_platform_admin ? (
                        <Badge>Owner</Badge>
                      ) : (
                        <Badge variant="outline">
                          {PLATFORM_ROLE_PRESETS[row.preset as keyof typeof PLATFORM_ROLE_PRESETS]?.label ??
                            row.preset}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {row.is_platform_admin
                        ? "Full console"
                        : formatPlatformGrantSummary(row.platform_console_grants as PlatformConsoleGrant[])}
                    </td>
                    <td className="p-3 text-right">
                      {canAssign && row.id !== user?.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingId === row.id}
                          onClick={() => {
                            setRoleUser({
                              id: row.id,
                              email: row.email,
                              full_name: row.full_name,
                              phone: null,
                              verified: null,
                              banned: null,
                              is_platform_admin: row.is_platform_admin,
                              is_platform_manager: row.is_platform_manager,
                              platform_console_grants: row.platform_console_grants,
                              created_at: null,
                            });
                            setRoleOpen(true);
                          }}
                        >
                          Edit access
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Recent role assignments</h2>
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audited role changes yet.</p>
          ) : (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {audit.map((row) => (
                <li key={row.id}>
                  {row.created_at ? new Date(row.created_at).toLocaleString() : "—"} · user{" "}
                  {row.target_id?.slice(0, 8)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <PlatformRoleAssignmentDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        user={roleUser}
        saving={Boolean(workingId)}
        onSave={async ({ isPlatformAdmin, grants }) => {
          if (!roleUser) return;
          setWorkingId(roleUser.id);
          try {
            await adminService.setPlatformAccess(roleUser.id, { isPlatformAdmin, grants });
            toast.success("Platform access updated.");
            setRoleOpen(false);
            setRoleUser(null);
            await refresh();
          } finally {
            setWorkingId(null);
          }
        }}
      />
    </AdminSectionGate>
  );
}
