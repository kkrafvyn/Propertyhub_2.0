import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { Building2, Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import {
  organizationUnitsService,
  type OrganizationUnit,
  type OrganizationUnitType,
} from "../../../lib/organization-units.service";
import { propertyService } from "../../../lib/property.service";

interface OrganizationUnitsPanelProps {
  organizationId: string;
  canManage: boolean;
}

export function OrganizationUnitsPanel({
  organizationId,
  canManage,
}: OrganizationUnitsPanelProps) {
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [unitType, setUnitType] = useState<OrganizationUnitType>("region");
  const [properties, setProperties] = useState<Array<{ id: string; label: string }>>([]);
  const [linkPropertyId, setLinkPropertyId] = useState("");
  const [linkUnitId, setLinkUnitId] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [unitRows, propertyRows] = await Promise.all([
        organizationUnitsService.listUnits(organizationId),
        propertyService.getOrganizationProperties(organizationId),
      ]);
      setUnits(unitRows);
      setProperties(
        (propertyRows || []).map((property) => ({
          id: property.id,
          label: [property.address, property.city].filter(Boolean).join(", ") || property.id.slice(0, 8),
        })),
      );
      setLinkUnitId((current) => current || unitRows[0]?.id || "");
    } catch (error) {
      console.error(error);
      toast.error("Unable to load organization units.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const createUnit = async () => {
    if (!name.trim()) return;
    try {
      await organizationUnitsService.createUnit({
        organizationId,
        name: name.trim(),
        unitType,
      });
      setName("");
      toast.success("Unit created.");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Unable to create this unit.");
    }
  };

  const linkProperty = async () => {
    if (!linkUnitId || !linkPropertyId) return;
    try {
      await organizationUnitsService.assignPropertyToUnit(linkUnitId, linkPropertyId);
      toast.success("Property linked to unit.");
      setLinkPropertyId("");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Unable to link property.");
    }
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Business units & regions</h2>
          <p className="text-sm text-ink-secondary">
            Group properties into portfolios or regions for scoped access and reporting.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-secondary">Loading units…</p>
      ) : units.length === 0 ? (
        <p className="text-sm text-ink-secondary">No units yet. Create a region or business unit below.</p>
      ) : (
        <ul className="space-y-2">
          {units.map((unit) => (
            <li
              key={unit.id}
              className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm"
            >
              <span className="font-medium">{unit.name}</span>
              <span className="text-ink-muted capitalize">{unit.unit_type.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] ">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Accra Portfolio"
            />
            <NativeSelectControl
              className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm"
              value={unitType}
              onChange={(event) => setUnitType(event.target.value as OrganizationUnitType)}
            >
              <option value="region">Region</option>
              <option value="business_unit">Business unit</option>
              <option value="portfolio">Portfolio</option>
              <option value="custom">Custom</option>
            </NativeSelectControl>
            <Button type="button" onClick={() => void createUnit()}>
              <Plus className="mr-2 h-4 w-4" />
              Add unit
            </Button>
          </div>

          {units.length > 0 && properties.length > 0 ? (
            <div className="rounded-xl border border-surface-border bg-surface-subtle p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Link2 className="h-4 w-4" />
                Link property to unit
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <NativeSelectControl
                  className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm"
                  value={linkUnitId}
                  onChange={(event) => setLinkUnitId(event.target.value)}
                >
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </NativeSelectControl>
                <NativeSelectControl
                  className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm"
                  value={linkPropertyId}
                  onChange={(event) => setLinkPropertyId(event.target.value)}
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.label}
                    </option>
                  ))}
                </NativeSelectControl>
              </div>
              <Button className="mt-3" size="sm" variant="outline" onClick={() => void linkProperty()}>
                Link property
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
