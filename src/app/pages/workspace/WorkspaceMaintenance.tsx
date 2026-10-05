import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
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
  X,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  LayoutGrid,
  List,
  Timer,
  Maximize2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { MetricCard } from "../../components/ui/MetricCard";
import {
  ActivityTimeline,
  DashboardStatsSkeleton,
  OperationalQueryState,
  WorkspacePageShell,
} from "../../components/ux";
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
    email?: string | null;
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

interface SlaStatus {
  targetHours: number;
  deadline: Date;
  isBreached: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  label: string;
}

function calculateSla(createdAt: string, priority?: string, status?: string): SlaStatus | null {
  if (status === "resolved" || status === "cancelled") return null;
  const created = new Date(createdAt).getTime();
  if (isNaN(created)) return null;

  // SLA targets based on priority
  const targetHours =
    priority === "urgent" ? 4 : priority === "high" ? 24 : priority === "normal" ? 48 : 72;
  const deadline = new Date(created + targetHours * 3600 * 1000);
  const diffMs = deadline.getTime() - Date.now();
  const isBreached = diffMs < 0;
  const absDiffMin = Math.floor(Math.abs(diffMs) / (60 * 1000));
  const hours = Math.floor(absDiffMin / 60);
  const minutes = absDiffMin % 60;

  const label = isBreached
    ? `Breached (${hours}h ${minutes}m ago)`
    : `${hours}h ${minutes}m remaining`;

  return { targetHours, deadline, isBreached, hoursRemaining: hours, minutesRemaining: minutes, label };
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [activeLightbox, setActiveLightbox] = useState<{
    url: string;
    index: number;
    total: number;
    title: string;
  } | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setLoadError(null);
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
      setLoadError("We couldn't load the maintenance queue. Try again in a moment.");
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

  const shareContractorLink = async (request: MaintenanceRequest) => {
    try {
      setUpdatingId(request.id);
      if (!request.vendor?.email) {
        throw new Error("Assign a vendor with a verified email before creating an external link.");
      }
      const url = await maintenanceService.createContractorAccessLink({
        organizationId,
        requestId: request.id,
        recipientEmail: request.vendor.email,
        label: request.title,
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

  const listPhase = loadError
    ? "error"
    : loading
      ? "loading"
      : requests.length === 0
        ? "empty"
        : filteredRequests.length === 0
          ? "filtered-empty"
          : "ready";

  return (
    <WorkspacePageShell
      title="Maintenance Operations"
      description="Assign contractors, track repairs in progress, review tenant photos, and close out work orders on time."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-secondary border border-surface-border rounded-xl p-1">
            <button
              type="button"
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === "list" ? "bg-primary text-primary-foreground" : "text-ink-secondary hover:text-ink"
              }`}
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
              List
            </button>
            <button
              type="button"
              aria-label="Kanban view"
              aria-pressed={viewMode === "kanban"}
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-ink-secondary hover:text-ink"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              Kanban
            </button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadRequests()} aria-label="Refresh maintenance tickets">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        </div>
      }
    >
      {loading && !loadError ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Open Requests" value={loading ? "—" : metrics.open} icon={AlertCircle} iconColor="primary" subtitle="Awaiting contractor dispatch" />
          <MetricCard title="In Progress" value={loading ? "—" : metrics.inProgress} icon={Clock} iconColor="primary" subtitle="Active contractor repairs" />
          <MetricCard title="Resolved" value={loading ? "—" : metrics.resolved} icon={CheckCircle2} iconColor="primary" subtitle="Completed and verified" />
          <MetricCard title="Total Work Orders" value={loading ? "—" : metrics.total} icon={Wrench} iconColor="primary" subtitle="All-time recorded tickets" />
        </div>
      )}

      <OperationalQueryState
        phase={listPhase}
        errorMessage={loadError ?? undefined}
        onRetry={() => void loadRequests()}
        retryLabel="Reload queue"
        loadingFallback={<DashboardStatsSkeleton />}
        emptyIcon={Wrench}
        emptyTitle="No maintenance requests"
        emptyDescription="When tenants report issues, tickets will appear here for review and vendor assignment."
        filteredEmptyTitle="No matching work orders"
        filteredEmptyDescription={
          searchQuery
            ? `No tickets matched "${searchQuery}". Try clearing search or changing the status filter.`
            : "No tickets match the current filters."
        }
        emptyActionLabel={searchQuery ? "Clear search" : undefined}
        onEmptyAction={searchQuery ? () => setSearchQuery("") : undefined}
      >
      <div className="space-y-6 min-w-0 mt-6">
      {/* ── Search & Filter Toolbar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2 bg-surface/60 backdrop-blur-md rounded-2xl border border-surface-border/80">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All Tickets", count: metrics.total },
            { id: "open", label: "Open", count: metrics.open },
            { id: "in_progress", label: "In Progress", count: metrics.inProgress },
            { id: "resolved", label: "Resolved", count: metrics.resolved },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-white shadow-sm shadow-primary/25"
                    : "text-ink-secondary hover:text-ink hover:bg-surface-hover/80"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-surface-subtle text-ink-tertiary"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search tickets, properties, tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-surface/90 border border-surface-border text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── KANBAN BOARD VIEW ── */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {[
            {
              id: "open",
              title: "Open Tickets",
              count: requests.filter((r) => r.status === "open").length,
              badgeVariant: "warning" as const,
              borderColor: "border-amber-500/30",
              bgColor: "bg-amber-500/5",
              items: filteredRequests.filter((r) => r.status === "open"),
            },
            {
              id: "in_progress",
              title: "In Progress",
              count: requests.filter((r) => r.status === "in_progress").length,
              badgeVariant: "info" as const,
              borderColor: "border-indigo-500/30",
              bgColor: "bg-indigo-500/5",
              items: filteredRequests.filter((r) => r.status === "in_progress"),
            },
            {
              id: "resolved",
              title: "Resolved & Verified",
              count: requests.filter((r) => r.status === "resolved").length,
              badgeVariant: "success" as const,
              borderColor: "border-emerald-500/30",
              bgColor: "bg-emerald-500/5",
              items: filteredRequests.filter((r) => r.status === "resolved"),
            },
          ].map((column) => (
            <div
              key={column.id}
              className={`rounded-2xl border ${column.borderColor} ${column.bgColor} p-4 space-y-4 backdrop-blur-md`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-surface-border/50">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm text-ink">{column.title}</h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface-subtle text-ink-secondary">
                    {column.count}
                  </span>
                </div>
                <Badge variant={column.badgeVariant} dot className="text-[10px] uppercase font-bold">
                  {column.id.replace(/_/g, " ")}
                </Badge>
              </div>

              {/* Column Cards */}
              {column.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-muted border border-dashed border-surface-border rounded-xl">
                  No work orders in this stage
                </div>
              ) : (
                <div className="space-y-3">
                  {column.items.map((request) => {
                    const sla = calculateSla(request.created_at, request.priority, request.status);
                    return (
                      <Card
                        key={request.id}
                        variant="glass"
                        className="p-4 space-y-3 border border-surface-border/80 bg-surface/90 hover:border-amber-500/40 transition-all shadow-xs group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xs font-semibold text-ink group-hover:text-amber-600 dark:group-hover:text-amber-400 line-clamp-1">
                              {request.title}
                            </h3>
                            {request.priority ? (
                              <span
                                className={`shrink-0 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md border ${
                                  request.priority === "urgent"
                                    ? "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10"
                                    : request.priority === "high"
                                    ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                    : "border-surface-border text-ink-muted bg-surface-subtle"
                                }`}
                              >
                                {request.priority}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                            {request.description}
                          </p>
                        </div>

                        {/* SLA Indicator */}
                        {sla && (
                          <div
                            className={`flex items-center gap-1.5 text-[10px] font-mono font-medium px-2 py-1 rounded-lg border ${
                              sla.isBreached
                                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                                : sla.hoursRemaining < 4
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                : "bg-primary/5 border-primary/20 text-primary"
                            }`}
                          >
                            <Timer className="w-3 h-3 shrink-0" />
                            <span>SLA: {sla.label}</span>
                          </div>
                        )}

                        {/* Meta */}
                        <div className="space-y-1 text-[11px] text-ink-secondary pt-1 border-t border-surface-border/40">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3 h-3 text-ink-muted shrink-0" />
                            <span className="truncate">
                              {request.lease?.listing?.property?.address || "Address unavailable"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="w-3 h-3 text-ink-muted shrink-0" />
                            <span className="truncate">
                              {request.tenant?.full_name || request.tenant?.email || "Tenant"}
                            </span>
                          </div>
                        </div>

                        {/* Photo Thumbnails */}
                        {Array.isArray(request.photo_urls) && request.photo_urls.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1">
                            {request.photo_urls.slice(0, 3).map((url, idx) => (
                              <button
                                key={url}
                                type="button"
                                onClick={() =>
                                  setActiveLightbox({
                                    url,
                                    index: idx + 1,
                                    total: request.photo_urls!.length,
                                    title: request.title,
                                  })
                                }
                                className="relative h-10 w-10 rounded-lg overflow-hidden border border-surface-border hover:opacity-80 transition-opacity"
                              >
                                <img src={url} alt="" className="h-full w-full object-cover" />
                              </button>
                            ))}
                            {request.photo_urls.length > 3 && (
                              <span className="text-[10px] text-ink-muted font-medium">
                                +{request.photo_urls.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Card Quick Action */}
                        <div className="pt-2 border-t border-surface-border/40 flex items-center justify-between gap-2">
                          {column.id === "open" && (
                            <Button
                              size="sm"
                              variant="gradient"
                              onClick={() => void updateStatus(request.id, "in_progress")}
                              disabled={updatingId === request.id}
                              className="w-full text-xs py-1.5"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Start Work
                            </Button>
                          )}
                          {column.id === "in_progress" && (
                            <Button
                              size="sm"
                              variant="gradient"
                              onClick={() => void updateStatus(request.id, "resolved")}
                              disabled={updatingId === request.id}
                              className="w-full text-xs py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Mark Resolved
                            </Button>
                          )}
                          {column.id === "resolved" && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verified Completed</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* ── LIST VIEW ── */
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const isTimelineOpen = expandedTimelineId === request.id;
              const sla = calculateSla(request.created_at, request.priority, request.status);
              const priorityBadge =
                request.priority === "urgent"
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
                  variant="glass"
                  className="p-5 sm:p-6 space-y-4 border border-surface-border/80 bg-surface/80 backdrop-blur-md rounded-2xl shadow-sm hover:shadow-md hover:border-amber-500/40 transition-all duration-300 group"
                >
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-display font-medium text-ink group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {request.title}
                        </h3>
                        {request.priority && (
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${priorityBadge}`}
                          >
                            {request.priority} priority
                          </span>
                        )}
                        {/* SLA Indicator */}
                        {sla && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${
                              sla.isBreached
                                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 animate-pulse"
                                : sla.hoursRemaining < 6
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                : "bg-primary/5 border-primary/20 text-primary"
                            }`}
                          >
                            <Timer className="w-3 h-3" />
                            <span>{sla.label}</span>
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

                  {/* Photo Evidence with Lightbox Trigger */}
                  {Array.isArray(request.photo_urls) && request.photo_urls.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Photo Evidence ({request.photo_urls.length}) — Click to preview</span>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {request.photo_urls.map((url: string, index: number) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() =>
                              setActiveLightbox({
                                url,
                                index: index + 1,
                                total: request.photo_urls!.length,
                                title: request.title,
                              })
                            }
                            aria-label={`View evidence photo ${index + 1} of ${request.photo_urls!.length} for ${request.title}`}
                            className="group relative h-20 w-20 rounded-xl overflow-hidden border border-surface-border shadow-xs hover:border-primary/50 transition-colors cursor-zoom-in"
                          >
                            <img
                              src={url}
                              alt={`Evidence ${index + 1}`}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </button>
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
                          variant="gradient"
                          onClick={() => void updateStatus(request.id, "in_progress")}
                          disabled={updatingId === request.id}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Start Work</span>
                        </Button>
                      ) : null}

                      {["open", "in_progress"].includes(request.status) ? (
                        <Button
                          size="sm"
                          variant="gradient"
                          onClick={() => void updateStatus(request.id, "resolved")}
                          disabled={updatingId === request.id}
                          className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Resolved</span>
                        </Button>
                      ) : null}

                      {["open", "in_progress"].includes(request.status) ? (
                        <Button
                          size="sm"
                          variant="glass"
                          onClick={() => void shareContractorLink(request)}
                          disabled={updatingId === request.id}
                          className="text-xs"
                        >
                          Share Contractor Link
                        </Button>
                      ) : null}

                      {/* Vendor selector */}
                      {!request.vendor_id && vendors.length > 0 ? (
                        <div className="relative">
                          <NativeSelectControl
                            className="appearance-none rounded-xl border border-surface-border bg-surface/80 backdrop-blur-sm pl-3 pr-8 py-2 text-xs text-ink font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                          </NativeSelectControl>
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
      </OperationalQueryState>

      <Dialog open={Boolean(activeLightbox)} onOpenChange={(open) => !open && setActiveLightbox(null)}>
        <DialogContent className="max-w-4xl gap-3 p-4 sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="truncate pr-8">{activeLightbox?.title ?? "Evidence photo"}</DialogTitle>
            <DialogDescription>
              Photo {activeLightbox?.index ?? 0} of {activeLightbox?.total ?? 0}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-auto rounded-xl border border-surface-border bg-secondary p-2">
            {activeLightbox ? (
              <img
                src={activeLightbox.url}
                alt={`Evidence for ${activeLightbox.title}`}
                className="mx-auto max-h-[70vh] max-w-full object-contain rounded-lg"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </WorkspacePageShell>
  );
}
