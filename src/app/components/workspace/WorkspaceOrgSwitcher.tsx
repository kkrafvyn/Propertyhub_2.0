import { Link } from "react-router";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";

export type WorkspaceOrgOption = {
  id: string;
  name: string;
};

type WorkspaceOrgSwitcherProps = {
  organizations: WorkspaceOrgOption[];
  activeOrganizationId: string;
  onOrganizationChange: (organizationId: string) => void;
  className?: string;
  selectClassName?: string;
  showManageLink?: boolean;
};

export function WorkspaceOrgSwitcher({
  organizations,
  activeOrganizationId,
  onOrganizationChange,
  className = "",
  selectClassName = "min-w-0 max-w-[10rem] sm:max-w-[12rem] px-2.5 py-1.5 rounded-lg border border-surface-border bg-surface text-xs text-ink outline-none transition focus:border-primary",
  showManageLink = true,
}: WorkspaceOrgSwitcherProps) {
  if (organizations.length === 0) return null;

  if (organizations.length === 1) {
    if (!showManageLink) return null;
    return (
      <Link
        to={`${WORKSPACE_ENTRY_PATH}?kind=company`}
        className={`shrink-0 text-[11px] font-semibold text-primary hover:underline ${className}`}
      >
        Add workspace
      </Link>
    );
  }

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <NativeSelectControl
        className={selectClassName}
        value={activeOrganizationId}
        onChange={(event) => onOrganizationChange(event.target.value)}
        aria-label="Switch workspace"
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </NativeSelectControl>
      {showManageLink ? (
        <Link
          to={WORKSPACE_ENTRY_PATH}
          className="hidden shrink-0 text-[11px] font-medium text-ink-secondary hover:text-ink sm:inline"
          title="Choose or add a workspace"
        >
          All
        </Link>
      ) : null}
    </div>
  );
}
