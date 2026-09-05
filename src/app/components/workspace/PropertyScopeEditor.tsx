import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { propertyService } from "../../../lib/property.service";
import { memberScopeService } from "../../../lib/member-scope.service";
import { organizationUnitsService } from "../../../lib/organization-units.service";
import type { OrganizationUnit } from "../../../lib/organization-units.service";
import type { MemberScopeMode } from "../../../lib/member-scope";
import { defaultScopeModeForRole } from "../../../lib/member-scope";
import type { MemberRole } from "../../../lib/workspace";

interface PropertyScopeEditorProps {
  organizationId: string;
  userId: string;
  role: MemberRole;
  disabled?: boolean;
}

export function PropertyScopeEditor({
  organizationId,
  userId,
  role,
  disabled = false,
}: PropertyScopeEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<Array<{ id: string; address: string; city: string }>>([]);
  const [scopeMode, setScopeMode] = useState<MemberScopeMode>(defaultScopeModeForRole(role));
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

  useEffect(() => {
    void loadScope();
  }, [organizationId, userId]);

  const loadScope = async () => {
    try {
      setLoading(true);
      const [propertyRows, scope, unitRows] = await Promise.all([
        propertyService.getOrganizationProperties(organizationId),
        memberScopeService.getMemberScope(organizationId, userId),
        organizationUnitsService.listUnits(organizationId),
      ]);
      setProperties(
        (propertyRows || []).map((property) => ({
          id: property.id,
          address: property.address,
          city: property.city,
        })),
      );
      setUnits(unitRows);
      setScopeMode(scope.scopeMode);
      setSelectedPropertyIds(scope.propertyIds);
      setSelectedUnitIds(scope.unitIds);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load property scope.");
    } finally {
      setLoading(false);
    }
  };

  const toggleProperty = (propertyId: string) => {
    setSelectedPropertyIds((current) =>
      current.includes(propertyId)
        ? current.filter((id) => id !== propertyId)
        : [...current, propertyId],
    );
  };

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((current) =>
      current.includes(unitId) ? current.filter((id) => id !== unitId) : [...current, unitId],
    );
  };

  const saveScope = async () => {
    try {
      setSaving(true);
      await memberScopeService.updateMemberScope(
        organizationId,
        userId,
        scopeMode,
        scopeMode === "properties" ? selectedPropertyIds : [],
        scopeMode === "properties" ? selectedUnitIds : [],
      );
      toast.success("Property scope updated.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to save property scope.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-xs text-ink-muted">Loading property scope...</p>;
  }

  return (
    <div className="mt-3 rounded-xl border border-surface-border bg-surface p-3">
      <p className="text-xs font-semibold text-ink">Property scope</p>
      <p className="mt-1 text-[11px] text-ink-muted">
        Limit which properties this teammate can access. Executives typically use whole organization.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["organization", "Entire organization"],
            ["properties", "Selected properties"],
            ["assigned_work", "Assigned work only"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => setScopeMode(mode)}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
              scopeMode === mode
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-surface-border text-ink-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {scopeMode === "properties" ? (
        <>
          {units.length > 0 ? (
            <div className="mt-3">
              <p className="text-[11px] font-medium text-ink-secondary">Organization units</p>
              <p className="mt-0.5 text-[10px] text-ink-muted">
                Grant access to all properties linked to a unit or region.
              </p>
              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                {units.map((unit) => (
                  <label
                    key={unit.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-surface-subtle"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUnitIds.includes(unit.id)}
                      disabled={disabled}
                      onChange={() => toggleUnit(unit.id)}
                    />
                    <span>
                      {unit.name}
                      {unit.code ? ` (${unit.code})` : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
            <p className="text-[11px] font-medium text-ink-secondary">Individual properties</p>
          {properties.length === 0 ? (
            <p className="text-xs text-ink-muted">No properties in this organization yet.</p>
          ) : (
            properties.map((property) => (
              <label
                key={property.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-surface-subtle"
              >
                <input
                  type="checkbox"
                  checked={selectedPropertyIds.includes(property.id)}
                  disabled={disabled}
                  onChange={() => toggleProperty(property.id)}
                />
                <span>
                  {property.address}, {property.city}
                </span>
              </label>
            ))
          )}
          </div>
        </>
      ) : null}

      <div className="mt-3">
        <Button size="sm" variant="outline" disabled={disabled || saving} onClick={() => void saveScope()}>
          {saving ? "Saving..." : "Save scope"}
        </Button>
      </div>
    </div>
  );
}
