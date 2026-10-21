import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { FormRow, OperationalQueryState, PageHeader, PageLayout } from "../../components/ux";
import { EmptyState } from "../../components/ux/EmptyState";
import { leaseScreeningService } from "../../../lib/lease-screening.service";
import { useAuth } from "../../context/AuthContext";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building2,
  Users,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronRight,
  FileCheck2,
} from "lucide-react";

interface LeaseApplication {
  id: string;
  estate_id: string;
  unit_id?: string | null;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string | null;
  household_size: number;
  employment_summary?: string | null;
  status: "submitted" | "screening" | "approved" | "rejected" | string;
  review_note?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
}

export function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<LeaseApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    if (!user?.id) return;
    void leaseScreeningService
      .listMyApplications(user.id)
      .then((data) => {
        setLoadError(null);
        setApplications((data as LeaseApplication[]) || []);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Unable to load applications.";
        setLoadError(message);
        console.error(error);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => ["submitted", "screening"].includes(a.status)).length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter === "pending" && !["submitted", "screening"].includes(app.status)) return false;
      if (statusFilter === "approved" && app.status !== "approved") return false;
      if (statusFilter === "rejected" && app.status !== "rejected") return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const idMatch = app.id.toLowerCase().includes(q);
      const nameMatch = app.applicant_name?.toLowerCase().includes(q);
      const emailMatch = app.applicant_email?.toLowerCase().includes(q);
      const jobMatch = app.employment_summary?.toLowerCase().includes(q);
      return Boolean(idMatch || nameMatch || emailMatch || jobMatch);
    });
  }, [applications, statusFilter, searchQuery]);

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  return (
    <PageLayout variant="consumer" maxWidthClassName="max-w-4xl">
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError ?? undefined}
        onRetry={() => {
          if (!user?.id) return;
          setLoading(true);
          void leaseScreeningService
            .listMyApplications(user.id)
            .then((data) => setApplications((data as LeaseApplication[]) || []))
            .catch(console.error)
            .finally(() => setLoading(false));
        }}
        loadingFallback={
          <div className="space-y-6 animate-pulse">
            <div className="h-10 w-64 rounded-xl bg-surface-subtle" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-surface-subtle border border-surface-border" />
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-surface-subtle border border-surface-border" />
              ))}
            </div>
          </div>
        }
      >
      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-emerald-500/5 to-surface/80 border border-primary/20 shadow-lg backdrop-blur-md mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-primary/15 via-emerald-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="success" dot className="text-xs font-bold px-2.5 py-0.5">
                Tenant Portal
              </Badge>
              <span className="text-xs text-ink-muted flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Ghana Rent Act 220 Compliant
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-medium text-ink tracking-tight">
              My Rental Applications
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary max-w-xl leading-relaxed">
              Track your submitted lease applications, view background screening status, and access lease agreements once approved.
            </p>
          </div>

          <Link to="/search" className="shrink-0">
            <Button variant="gradient" size="sm" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span>Browse Properties</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Metric Highlights ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card variant="glass" className="p-4 border border-surface-border/80 bg-surface/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-secondary">Under Review</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-ink mt-2 font-mono">{stats.pending}</div>
          <p className="text-[11px] text-ink-muted mt-1">Pending landlord decision</p>
        </Card>

        <Card variant="glass" className="p-4 border border-surface-border/80 bg-surface/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-secondary">Approved Leases</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-ink mt-2 font-mono">{stats.approved}</div>
          <p className="text-[11px] text-ink-muted mt-1">Ready for lease signing</p>
        </Card>

        <Card variant="glass" className="p-4 border border-surface-border/80 bg-surface/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-secondary">Total Submissions</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-ink mt-2 font-mono">{stats.total}</div>
          <p className="text-[11px] text-ink-muted mt-1">All recorded applications</p>
        </Card>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-surface/60 backdrop-blur-md rounded-2xl border border-surface-border/80 mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: "all", label: "All", count: stats.total },
            { id: "pending", label: "Under Review", count: stats.pending },
            { id: "approved", label: "Approved", count: stats.approved },
            { id: "rejected", label: "Rejected", count: stats.rejected },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "text-ink-secondary hover:text-ink hover:bg-surface-hover/80"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-surface-subtle text-ink-tertiary"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <FormRow htmlFor="applications-search" label="Search" className="min-w-[220px] mb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
            <input
              id="applications-search"
              type="text"
              placeholder="Search by ID, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-surface/90 border border-surface-border text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </FormRow>
      </div>

      {/* ── Applications List ── */}
      {filteredApplications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery ? "No matching applications" : "No applications submitted yet"}
          description={
            searchQuery
              ? `No applications matched "${searchQuery}". Try adjusting your filters.`
              : "When you find a rental property you love and submit an application, its live screening progress and decisions will appear right here."
          }
          actionLabel={searchQuery ? "Clear Search" : "Explore Properties"}
          onAction={searchQuery ? () => setSearchQuery("") : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => {
            const isApproved = application.status === "approved";
            const isRejected = application.status === "rejected";
            const isPending = !isApproved && !isRejected;

            const statusBadgeVariant = isApproved
              ? "success"
              : isRejected
              ? "destructive"
              : "warning";

            // Lifecycle Step calculation
            const currentStep = isApproved ? 4 : isRejected ? 3 : 2;

            return (
              <Card
                key={application.id}
                variant="glass"
                className="p-5 sm:p-6 space-y-5 border border-surface-border/80 bg-surface/80 backdrop-blur-md rounded-2xl shadow-sm hover:border-primary/40 transition-all group"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        APP-{application.id.slice(0, 8).toUpperCase()}
                      </span>
                      <h2 className="text-base font-display font-medium text-ink">
                        Rental Application
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Submitted on {new Date(application.submitted_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant={statusBadgeVariant}
                    dot
                    pulse={isPending}
                    className="capitalize px-3 py-1 text-xs font-semibold"
                  >
                    {application.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                {/* Lifecycle Stepper Bar */}
                <div className="p-3.5 rounded-xl bg-surface-subtle/70 border border-surface-border/60">
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-semibold text-ink-secondary mb-2">
                    <span className={currentStep >= 1 ? "text-primary font-bold" : ""}>1. Received</span>
                    <span className={currentStep >= 2 ? "text-primary font-bold" : ""}>2. Screening</span>
                    <span className={currentStep >= 3 ? (isRejected ? "text-red-500 font-bold" : "text-primary font-bold") : ""}>
                      3. Landlord Review
                    </span>
                    <span className={currentStep >= 4 ? "text-emerald-600 font-bold" : ""}>4. Lease Ready</span>
                  </div>
                  <div className="w-full bg-surface-border/50 h-2 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isApproved
                          ? "bg-emerald-500 w-full"
                          : isRejected
                          ? "bg-red-500 w-3/4"
                          : "bg-amber-500 w-1/2"
                      }`}
                    />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-ink-secondary pt-1 border-t border-surface-border/60">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    <span>Household: <strong className="text-ink">{application.household_size} Person{application.household_size !== 1 ? "s" : ""}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    <span className="truncate">{application.applicant_email}</span>
                  </div>

                  {application.applicant_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                      <span>{application.applicant_phone}</span>
                    </div>
                  )}
                </div>

                {/* Employment Summary if provided */}
                {application.employment_summary && (
                  <div className="p-3 rounded-xl bg-surface-subtle/40 border border-surface-border/40 text-xs text-ink-secondary flex items-start gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-ink-muted mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-ink">Employment & Income: </span>
                      <span>{application.employment_summary}</span>
                    </div>
                  </div>
                )}

                {/* Landlord Review Note */}
                {application.review_note && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      isApproved
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        : isRejected
                        ? "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300"
                        : "bg-surface-subtle border-surface-border text-ink"
                    }`}
                  >
                    <span className="font-bold">Reviewer Note: </span>
                    {application.review_note}
                  </div>
                )}

                {/* Action Row */}
                <div className="pt-2 border-t border-surface-border/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-ink-muted">
                    {application.reviewed_at ? (
                      <span>Reviewed on {new Date(application.reviewed_at).toLocaleDateString()}</span>
                    ) : (
                      <span>Under automated compliance verification</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isApproved ? (
                      <Link to="/workspace/leases">
                        <Button size="sm" variant="gradient" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>View Approved Lease</span>
                        </Button>
                      </Link>
                    ) : (
                      <Link to="/search">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                          <span>Browse Other Homes</span>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      </OperationalQueryState>
    </PageLayout>
  );
}