import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/badge";
import { vendorService } from "@/lib/vendor.service";
import { vendorSLAService } from "@/lib/vendor-sla.service";
import { propertyService } from "@/lib/property.service";
import { Star, Wrench, MapPin, Phone } from "lucide-react";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

const CATEGORIES = [
  "all",
  "electrician",
  "plumber",
  "cleaner",
  "mover",
  "painter",
  "carpenter",
  "internet_provider",
  "security",
] as const;

type VendorRow = {
  id: string;
  business_name?: string;
  business_category?: string;
  rating_avg?: number;
  total_jobs_completed?: number;
  service_areas?: string[];
  phone?: string;
  availability_status?: string;
  verified?: boolean;
  services?: Array<{
    id: string;
    service_name?: string;
    base_price?: number;
  }>;
};

type PropertyRow = {
  id: string;
  address?: string | null;
  city?: string | null;
};

type AssignmentRow = {
  id: string;
  status?: string | null;
  service_type?: string;
  requested_date?: string | null;
  vendor?: { business_name?: string } | null;
  property?: { address?: string | null } | null;
};

export default function VendorManagement({ organizationId, currentUserId }: { organizationId: string; currentUserId: string }) {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<(typeof CATEGORIES)[number]>("all");
  const [hiringVendor, setHiringVendor] = useState<VendorRow | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [jobNotes, setJobNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [slaAlerts, setSlaAlerts] = useState<Array<{ id: string; alert_type?: string | null; severity?: string | null; triggered_at?: string | null }>>([]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      let data: VendorRow[] = [];

      if (filterCategory === "all") {
        for (const cat of CATEGORIES.slice(1)) {
          const result = await vendorService.getVerifiedVendors(cat, 5);
          data = [...data, ...(result || [])];
        }
      } else {
        data = (await vendorService.getVerifiedVendors(filterCategory, 20)) || [];
      }

      setVendors(data);
    } catch (error) {
      console.error("Failed to load vendors:", error);
      const message = "Unable to load vendors.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  const loadWorkspace = async () => {
    try {
      const [propertyRows, assignmentRows, alerts] = await Promise.all([
        propertyService.getOrganizationProperties(organizationId),
        vendorService.getAssignments(organizationId),
        vendorSLAService.getSLAAlerts(organizationId, { acknowledged: false }),
      ]);
      setProperties(propertyRows || []);
      setAssignments((assignmentRows || []) as AssignmentRow[]);
      setSlaAlerts(alerts || []);
      if (!propertyId && propertyRows?.[0]?.id) {
        setPropertyId(propertyRows[0].id);
      }
    } catch (error) {
      console.error("Failed to load vendor workspace:", error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      setSubmitting(true);
      await vendorSLAService.acknowledgeSLAAlert(alertId, currentUserId);
      setSlaAlerts((current) => current.filter((alert) => alert.id !== alertId));
      toast.success("SLA alert acknowledged.");
    } catch (error) {
      console.error("Failed to acknowledge SLA alert:", error);
      toast.error("Unable to acknowledge this SLA alert.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    void loadVendors();
  }, [filterCategory]);

  useEffect(() => {
    void loadWorkspace();
  }, [organizationId]);

  const openHire = (vendor: VendorRow) => {
    if (!properties.length) {
      toast.error("Add a property first, then you can hire a vendor for it.");
      return;
    }
    setHiringVendor(vendor);
    setJobNotes("");
    setPropertyId((current) => current || properties[0]?.id || "");
  };

  const handleHireVendor = async () => {
    if (!hiringVendor) return;
    if (!propertyId) {
      toast.error("Select a property for this job.");
      return;
    }

    try {
      setSubmitting(true);
      await vendorService.createAssignment(
        organizationId,
        propertyId,
        hiringVendor.id,
        hiringVendor.business_category || "maintenance",
        jobNotes.trim() || `Hire ${hiringVendor.business_name || "vendor"} for property work`,
        new Date()
      );
      toast.success("Vendor assigned. The job is now in your assignments.");
      setHiringVendor(null);
      await loadWorkspace();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to hire this vendor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkspacePageShell
      tone="finance"
      title="Vendor & Contractor Ecosystem"
      description="Find and hire verified contractors for maintenance and repairs."
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void loadVendors()}
      >
    <div className="space-y-6">
      {assignments.length > 0 && (
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Open assignments</h2>
          <div className="space-y-2">
            {assignments.slice(0, 6).map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">
                    {assignment.vendor?.business_name || "Vendor"} · {assignment.service_type}
                  </p>
                  <p className="text-muted-foreground">
                    {assignment.property?.address || "Property"}{" "}
                    {assignment.requested_date
                      ? `· ${new Date(assignment.requested_date).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {assignment.status || "pending"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {slaAlerts.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-amber-950 dark:text-amber-100">Active SLA alerts</h2>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">Review overdue acknowledgement and resolution targets.</p>
            </div>
            <Badge variant="outline">{slaAlerts.length}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {slaAlerts.slice(0, 6).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                <div>
                  <p className="font-medium">{alert.alert_type?.replaceAll("_", " ") || "SLA alert"}</p>
                  <p className="text-xs capitalize text-muted-foreground">{alert.severity?.toLowerCase() || "medium"} · {alert.triggered_at ? new Date(alert.triggered_at).toLocaleString() : "Recently"}</p>
                </div>
                <Button size="sm" variant="outline" disabled={submitting} onClick={() => void acknowledgeAlert(alert.id)}>Acknowledge</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={filterCategory === cat ? "default" : "outline"}
            onClick={() => setFilterCategory(cat)}
            className="capitalize"
          >
            {cat === "internet_provider" ? "Internet" : cat}
          </Button>
        ))}
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading vendors...</Card>
      ) : vendors.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No vendors found in this category</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{vendor.business_name}</h3>

                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.round(vendor.rating_avg || 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{vendor.rating_avg || 0}/5</span>
                    <span className="text-xs text-muted-foreground">
                      ({vendor.total_jobs_completed || 0} jobs)
                    </span>
                  </div>

                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                      <span className="capitalize">{vendor.business_category}</span>
                    </div>

                    {vendor.service_areas && vendor.service_areas.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{vendor.service_areas.join(", ")}</span>
                      </div>
                    )}

                    {vendor.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{vendor.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Badge variant="outline" className="capitalize">
                      {vendor.availability_status}
                    </Badge>
                    {vendor.verified && <Badge className="bg-green-600">Verified</Badge>}
                  </div>
                </div>

                <Button
                  onClick={() => openHire(vendor)}
                  disabled={vendor.availability_status === "unavailable"}
                >
                  Hire
                </Button>
              </div>

              {vendor.services && vendor.services.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Services:</p>
                  <div className="space-y-1">
                    {vendor.services.slice(0, 2).map((service) => (
                      <div key={service.id} className="text-xs">
                        <span className="font-medium">{service.service_name}</span>
                        <span className="text-muted-foreground ml-2">
                          GHS {service.base_price?.toLocaleString() || 0}
                        </span>
                      </div>
                    ))}
                    {vendor.services.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{vendor.services.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {hiringVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md space-y-4 p-6">
            <h2 className="text-xl font-semibold">Hire {hiringVendor.business_name}</h2>
            <p className="text-sm text-muted-foreground">
              This creates a pending vendor assignment on a property in this workspace.
            </p>
            <label className="block text-sm font-medium">
              Property
              <NativeSelectControl
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
              >
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.address || property.id}
                    {property.city ? ` · ${property.city}` : ""}
                  </option>
                ))}
              </NativeSelectControl>
            </label>
            <label className="block text-sm font-medium">
              Job notes
              <Textarea
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                rows={3}
                value={jobNotes}
                onChange={(event) => setJobNotes(event.target.value)}
                placeholder="Describe the work needed"
              />
            </label>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setHiringVendor(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => void handleHireVendor()} disabled={submitting}>
                {submitting ? "Assigning..." : "Create assignment"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
