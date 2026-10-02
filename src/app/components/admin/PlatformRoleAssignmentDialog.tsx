import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { AdminUserRow } from "../../../lib/admin.service";
import {
  detectPlatformRolePreset,
  formatPlatformGrantSummary,
  PLATFORM_CONSOLE_GRANT_DESCRIPTIONS,
  PLATFORM_CONSOLE_GRANT_LABELS,
  PLATFORM_CONSOLE_GRANT_ORDER,
  normalizePlatformGrants,
  PLATFORM_ROLE_PRESETS,
  type PlatformConsoleGrant,
  type PlatformRolePresetId,
} from "../../../lib/platform-console-grants";

type PlatformRoleAssignmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUserRow | null;
  saving: boolean;
  onSave: (input: { isPlatformAdmin: boolean; grants: PlatformConsoleGrant[] }) => Promise<void>;
};

export function PlatformRoleAssignmentDialog({
  open,
  onOpenChange,
  user,
  saving,
  onSave,
}: PlatformRoleAssignmentDialogProps) {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [selectedGrants, setSelectedGrants] = useState<PlatformConsoleGrant[]>([]);
  const [presetId, setPresetId] = useState<PlatformRolePresetId>("custom");

  useEffect(() => {
    if (!user || !open) return;
    setIsPlatformAdmin(Boolean(user.is_platform_admin));
    setSelectedGrants(normalizePlatformGrants(user.platform_console_grants));
    setPresetId(
      user.is_platform_admin
        ? "custom"
        : detectPlatformRolePreset(normalizePlatformGrants(user.platform_console_grants)),
    );
  }, [open, user]);

  const summary = useMemo(() => {
    if (isPlatformAdmin) return "Full platform admin — all console areas.";
    return formatPlatformGrantSummary(selectedGrants);
  }, [isPlatformAdmin, selectedGrants]);

  const applyPreset = (nextPresetId: PlatformRolePresetId) => {
    setPresetId(nextPresetId);
    if (nextPresetId === "custom") return;
    setIsPlatformAdmin(false);
    setSelectedGrants([...PLATFORM_ROLE_PRESETS[nextPresetId].grants]);
  };

  const toggleGrant = (grant: PlatformConsoleGrant, checked: boolean) => {
    setIsPlatformAdmin(false);
    setPresetId("custom");
    setSelectedGrants((current) => {
      if (checked) return current.includes(grant) ? current : [...current, grant];
      return current.filter((item) => item !== grant);
    });
  };

  const handleSave = async () => {
    await onSave({
      isPlatformAdmin,
      grants: isPlatformAdmin ? [] : selectedGrants,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign platform roles</DialogTitle>
          <DialogDescription>
            Choose which admin console responsibilities{" "}
            <strong>{user?.full_name || user?.email || "this user"}</strong> should have.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <label className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer">
            <Checkbox
              checked={isPlatformAdmin}
              onCheckedChange={(checked) => {
                const enabled = checked === true;
                setIsPlatformAdmin(enabled);
                if (enabled) {
                  setSelectedGrants([]);
                  setPresetId("custom");
                }
              }}
            />
            <span>
              <span className="font-medium block">Platform admin</span>
              <span className="text-sm text-muted-foreground">
                Full access to every console area, including revenue and role assignment.
              </span>
            </span>
          </label>

          {!isPlatformAdmin ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Quick preset</p>
                <Select value={presetId} onValueChange={(value) => applyPreset(value as PlatformRolePresetId)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(PLATFORM_ROLE_PRESETS) as Array<
                        [PlatformRolePresetId, (typeof PLATFORM_ROLE_PRESETS)[PlatformRolePresetId]]
                      >
                    ).map(([id, preset]) => (
                      <SelectItem key={id} value={id}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Console responsibilities</p>
                {PLATFORM_CONSOLE_GRANT_ORDER.map((grant) => (
                  <label
                    key={grant}
                    className="flex items-start gap-3 rounded-lg border border-border/70 p-3 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedGrants.includes(grant)}
                      onCheckedChange={(checked) => toggleGrant(grant, checked === true)}
                    />
                    <span>
                      <span className="font-medium block">{PLATFORM_CONSOLE_GRANT_LABELS[grant]}</span>
                      <span className="text-sm text-muted-foreground">
                        {PLATFORM_CONSOLE_GRANT_DESCRIPTIONS[grant]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : null}

          <p className="text-sm text-muted-foreground rounded-lg bg-secondary/30 p-3">{summary}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save roles"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
