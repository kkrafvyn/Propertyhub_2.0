import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  HardHat,
  User,
  MapPin,
  Calendar,
  Star,
  ChevronDown,
  Search,
  RefreshCw,
  ImageIcon,
  History,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { MetricCard } from "../../components/ui/MetricCard";
import { EmptyState } from "../../components/ux/EmptyState";
import { ActivityTimeline } from "../../components/ux";
import { buildMaintenanceTimeline } from "../../lib/workflow-timeline";
import { maintenanceService } from "../../../lib/maintenance.service";
import { vendorService } from "../../../lib/vendor.service";
import { filterByNestedPropertyScope, type MemberScopeMode } from "../../../lib/member-scope";

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "cancelled" | string;
  priority?: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at?: string;
  vendor_id?: string | null;
  tenant_user_id?: string;
  photo_urls?: string[];
  tenant_rating?: number | null;
  tenant_rating_comment?: string | null;
  tenant?: {
    full_name?: string;
    email?: string;
  };
  vendor?: {
    id: string;
    business_name: string;
  };
  lease?: {
    listing?: {
      property?: {
        id?: string;
        address?: string;
        city?: string;
      };
    };
  };
}

interface WorkspaceMaintenanceProps {
  organizationId: string;
  scopeMode?: MemberScopeMode | null;
  scopedPropertyIds?: string[] | null;
  bypassPropertyScope?: boolean;
}

function getMaintenancePropertyId(request: MaintenanceRequest): string | null | undefined {
  return request.lease?.listing?.property?.id;
}

export function WorkspaceMaintenance({
  organizationId,
  scopeMode = "organization",
  scopedPropertyIds = null,
  bypassPropertyScope = false,
}: WorkspaceMaintenanceProps) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const [rows, vendorRows] = await Promise.all([
        maintenanceService.getOrganizationRequests(organizationId),
        vendorService.getVerifiedVendors("maintenance", 20),
      ]);
      setRequests(
        filterByNestedPropertyScope(
          (rows as MaintenanceRequest[]) || [],
          getMaintenancePropertyId,
          scopeMode,
          scopedPropertyIds,
          bypassPropertyScope,
        ),
      );
      setVendors(vendorRows || []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load maintenance queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [organizationId]);

  const updateStatus = async (requestId: string, status: "in_progress" | "resolved") => {
    const request = requests.find((row) => row.id === requestId);
    try {
      setUpdatingId(requestId);
      await maintenanceService.updateRequestStatus(
        requestId,
        status,
        organizationId,
        request?.updated_at ?? null,
      );
      toast.success(`Request marked ${status.replace(/_/g, " ")}.`);
      await loadRequests();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update request.");
    } finally {
      setUpdatingId(null);
    }
  };

  const shareContractorLink = async (requestId: string, title: string) => {
    try {
      setUpdatingId(requestId);
      const url = await maintenanceService.createContractorAccessLink({
        organizationId,
        requestId,
        label: title,
      });
      await navigator.clipboard.writeText(url);
      toast.success("Contractor access link copied to clipboard.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to create contractor link.");
    } finally {
      setUpdatingId(null);
    }
  };

  const assignVendor = async (requestId: string, vendorId: string) => {
    const request = requests.find((row) => row.id === requestId);
    try {
      setUpdatingId(requestId);
      await maintenanceService.assignVendor(
        requestId,
        vendorId,
        organizationId,
        request?.updated_at ?? null,
      );
      toast.success("Vendor assigned successfully.");
      await loadRequests();
    } catch (error) {
      console.error(error);
      toast.error("Unable to assign vendor.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = requests.length;
    const open = requests.filter((r) => r.status === "open").length;
    const inProgress = requests.filter((r) => r.status === "in_progress").length;
    const resolved = requests.filter((r) => r.status === "resolved").length;
    return { total, open, inProgress, resolved };
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const titleMatch = r.title?.toLowerCase().includes(q);
      const descMatch = r.description?.toLowerCase().includes(q);
      const tenantMatch =
        r.tenant?.full_name?.toLowerCase().includes(q) ||
        r.tenant?.email?.toLowerCase().includes(q);
      const propertyMatch =
        r.lease?.listing?.property?.address?.toLowerCase().includes(q) ||
        r.lease?.listing?.property?.city?.toLowerCase().includes(q);
      const vendorMatch = r.vendor?.business_name?.toLowerCase().includes(q);
      return Boolean(titleMatch || descMatch || tenantMatch || propertyMatch || vendorMatch);
    });
  }, [requests, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded-lg bg-surface-subtle animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface-subtle animate-pulse border border-surface-border" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-surface-subtle animate-pulse border border-surface-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-ink">
            Maintenance Operations
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Dispatch verified contractors, track repairs, and manage work order progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadRequests()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Open Requests"
          value={metrics.open}
          icon={AlertCircle}
          iconColor="amber"
          subtitle="Awaiting contractor dispatch"
        />
        <MetricCard
          title="In Progress"
          value={metrics.inProgress}
          icon={Clock}
          iconColor="indigo"
          subtitle="Active contractor repairs"
        />
        <MetricCard
          title="Resolved"
          value={metrics.resolved}
          icon={CheckCircle2}
          iconColor="emerald"
          subtitle="Completed and verified"
        />
        <MetricCard
          title="Total Work Orders"
          value={metrics.total}
          icon={Wrench}
          iconColor="primary"
          subtitle="All-time recorded tickets"
        />
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-3 border-surface-border bg-surface/85 backdrop-blur-md shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "all", label: "All Tickets", count: metrics.total },
              { id: "open", label: "Open", count: metrics.open },
              { id: "in_progress", label: "In Progress", count: metrics.inProgress },
              { id: "resolved", label: "Resolved", count: metrics.resolved },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-ink-secondary hover:text-ink hover:bg-surface-subtle"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === tab.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-surface-subtle text-ink-muted"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search tickets, properties, tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-surface-border bg-surface/90 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary"
            />
          </div>
        </div>
      </Card>

      {/* Ticket List */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={searchQuery ? "No matching work orders" : "No maintenance requests"}
          description={
            searchQuery
              ? `No maintenance tickets matched "${searchQuery}". Try clearing search terms or selecting another status filter.`
              : "There are currently no maintenance tickets in this queue. When tenants report issues, they will appear here for review and vendor assignment."
          }
          actionLabel={searchQuery ? "Clear Search" : undefined}
          onAction={searchQuery ? () => setSearchQuery("") : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const isTimelineOpen = expandedTimelineId === request.id;
            const priorityBadge = request.priority === "urgent"
              ? "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10"
              : request.priority === "high"
              ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
              : "border-surface-border text-ink-muted bg-surface-subtle";

            const statusVariant =
              request.status === "resolved"
                ? "success"
                : request.status === "in_progress"
                ? "info"
                : "warning";

            return (
              <Card
                key={request.id}
                className="p-5 sm:p-6 space-y-4 border-surface-border bg-surface shadow-card hover:shadow-card-hover transition-all duration-200"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-ink">
                        {request.title}
                      </h3>
                      {request.priority && (
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${priorityBadge}`}>
                          {request.priority} priority
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-secondary leading-relaxed max-w-3xl">
                      {request.description}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Badge variant={statusVariant} className="capitalize px-3 py-1 font-semibold text-xs">
                      {request.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                {/* Metadata details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-surface-border/60 text-xs text-ink-secondary">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    <span className="truncate">
                      {request.tenant?.full_name || request.tenant?.email || "Tenant"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    <span className="truncate">
                      {request.lease?.listing?.property?.address || "Property Address"}
                      {request.lease?.listing?.property?.city ? `, ${request.lease.listing.property.city}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <HardHat className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    <span className="truncate">
                      {request.vendor ? (
                        <span className="text-ink font-medium">
                          {request.vendor.business_name}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Unassigned
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Tenant Rating if present */}
                {request.tenant_rating ? (
                  <div className="flex items-center gap-2 rounded-xl bg-surface-subtle p-2.5 text-xs text-ink">
                    <div className="flex items-center text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < (request.tenant_rating || 0)
                              ? "fill-amber-400 text-amber-400"
                              : "text-ink-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold">{request.tenant_rating}/5</span>
                    {request.tenant_rating_comment ? (
                      <span className="text-ink-muted truncate">
                        - &quot;{request.tenant_rating_comment}&quot;
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* Photo Evidence */}
                {Array.isArray(request.photo_urls) && request.photo_urls.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Photo Evidence ({request.photo_urls.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {request.photo_urls.map((url: string, index: number) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative h-20 w-20 rounded-xl overflow-hidden border border-surface-border shadow-xs hover:border-primary/50 transition-all"
                        >
                          <img
                            src={url}
                            alt={`Evidence ${index + 1}`}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                            View
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Actions & Vendor Assignment */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-surface-border/60">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {request.status === "open" ? (
                      <Button
                        size="sm"
                        onClick={() => void updateStatus(request.id, "in_progress")}
                        disabled={updatingId === request.id}
                        className="flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Start Work</span>
                      </Button>
                    ) : null}

                    {["open", "in_progress"].includes(request.status) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void updateStatus(request.id, "resolved")}
                        disabled={updatingId === request.id}
                        className="flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Mark Resolved</span>
                      </Button>
                    ) : null}

                    {["open", "in_progress"].includes(request.status) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void shareContractorLink(request.id, request.title)}
                        disabled={updatingId === request.id}
                      >
                        Share contractor link
                      </Button>
                    ) : null}

                    {/* Vendor selector */}
                    {!request.vendor_id && vendors.length > 0 ? (
                      <div className="relative">
                        <select
                          className="appearance-none rounded-lg border border-surface-border bg-surface-subtle pl-3 pr-8 py-1.5 text-xs text-ink font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                          defaultValue=""
                          onChange={(event) => {
                            if (event.target.value) {
                              void assignVendor(request.id, event.target.value);
                            }
                          }}
                          disabled={updatingId === request.id}
                        >
                          <option value="">Assign Contractor...</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.business_name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
                      </div>
                    ) : null}
                  </div>

                  {/* Timeline toggle button */}
                  <button
                    type="button"
                    onClick={() => setExpandedTimelineId(isTimelineOpen ? null : request.id)}
                    className="flex items-center gap-1 text-xs text-ink-secondary hover:text-ink font-medium transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>{isTimelineOpen ? "Hide History" : "View History"}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${isTimelineOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {/* Collapsible Timeline */}
                {isTimelineOpen && (
                  <div className="pt-3 border-t border-surface-border/40 bg-surface-subtle/40 rounded-xl p-4 mt-2">
                    <ActivityTimeline steps={buildMaintenanceTimeline(request)} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
