import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  KeyRound,
  ListChecks,
  MessageCircle,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import { dealCaseService } from "../../../lib/dealcase.service";
import type { Database } from "../../../lib/database.types";
import { listingService } from "../../../lib/listing.service";
import { organizationService } from "../../../lib/organization.service";
import { paymentService } from "../../../lib/payment.service";
import { propertyViewingService } from "../../../lib/property-viewing.service";
import {
  buildDocumentTemplateDrafts,
  buildViewingCalendarExports,
} from "../../../lib/competitive-operations.service";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface WorkspaceDashboardProps {
  organization: Organization;
  workspaceBasePath: string;
}

const currencyFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  maximumFractionDigits: 0,
});

const PIPELINE_LABELS: Record<string, string> = {
  new_inquiry: "New Inquiry",
  contacted: "Contacted",
  qualified: "Qualified",
  viewing_scheduled: "Viewing",
  negotiation: "Negotiation",
  payment_pending: "Payment Pending",
  won: "Won",
  lost: "Lost",
};

function formatDateTime(value?: string | null) {
  if (!value) return "Awaiting confirmation";

  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLabel(value?: string | null) {
  if (!value) return "Unknown";

  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getViewingStatusVariant(
  status?: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "confirmed":
    case "completed":
      return "default";
    case "cancelled":
    case "no_show":
      return "destructive";
    case "rescheduled":
      return "outline";
    default:
      return "secondary";
  }
}

export function WorkspaceDashboard({ organization, workspaceBasePath }: WorkspaceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [membersCount, setMembersCount] = useState(0);
  const [listings, setListings] = useState<any[]>([]);
  const [dealCases, setDealCases] = useState<any[]>([]);
  const [propertyTransactions, setPropertyTransactions] = useState<any[]>([]);
  const [propertyViewings, setPropertyViewings] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        if (!cancelled) setLoading(true);

        const [organizationListings, organizationDeals, members, payments, viewings] = await Promise.all([
          listingService.getOrganizationListings(organization.id),
          dealCaseService.getDealCasesByOrganization(organization.id),
          organizationService.getOrganizationMembers(organization.id),
          paymentService.getOrganizationPropertyTransactions(organization.id),
          propertyViewingService.getOrganizationViewings(organization.id),
        ]);

        if (!cancelled) {
          setListings(organizationListings || []);
          setDealCases(organizationDeals || []);
          setMembersCount((members || []).length);
          setPropertyTransactions(payments || []);
          setPropertyViewings(viewings || []);
        }
      } catch (error) {
        console.error("Failed to load workspace dashboard:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [organization.id]);

  const listedCount = useMemo(
    () => listings.filter((listing) => listing.status === "listed").length,
    [listings]
  );

  const activeLeadsCount = useMemo(
    () => dealCases.filter((dealCase) => dealCase.status === "pending").length,
    [dealCases]
  );

  const revenuePipeline = useMemo(
    () => dealCases.reduce((total, dealCase) => total + (dealCase.listing?.price || 0), 0),
    [dealCases]
  );

  const successfulPayments = useMemo(
    () => propertyTransactions.filter((transaction) => transaction.status === "success"),
    [propertyTransactions]
  );

  const verifiedPayments = useMemo(
    () =>
      propertyTransactions.filter((transaction) => {
        const receipt = Array.isArray(transaction.receipt)
          ? transaction.receipt[0]
          : transaction.receipt;
        return receipt?.integrity_status === "hashed" || receipt?.integrity_status === "verified";
      }),
    [propertyTransactions]
  );

  const collectedRevenue = useMemo(
    () =>
      successfulPayments.reduce(
        (total, transaction) => total + ((transaction.amount_minor || 0) / 100),
        0
      ),
    [successfulPayments]
  );

  const recentListings = useMemo(() => listings.slice(0, 3), [listings]);
  const recentDealCases = useMemo(() => dealCases.slice(0, 3), [dealCases]);
  const upcomingViewings = useMemo(
    () =>
      propertyViewings
        .filter((viewing) => ["requested", "confirmed", "rescheduled"].includes(viewing.status))
        .sort(
          (a, b) =>
            new Date(a.confirmed_datetime || a.requested_datetime).getTime() -
            new Date(b.confirmed_datetime || b.requested_datetime).getTime()
        )
        .slice(0, 4),
    [propertyViewings]
  );
  const pipelineBreakdown = useMemo(() => {
    const counts = dealCases.reduce<Record<string, number>>((acc, dealCase) => {
      const stage =
        dealCase.pipeline_stage ||
        (dealCase.status === "approved"
          ? "qualified"
          : dealCase.status === "closed"
            ? "won"
            : dealCase.status === "rejected"
              ? "lost"
              : "new_inquiry");

      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(PIPELINE_LABELS)
      .map(([key, label]) => ({
        key,
        label,
        count: counts[key] || 0,
      }))
      .filter((entry) => entry.count > 0)
      .slice(0, 5);
  }, [dealCases]);
  const templateDrafts = useMemo(() => {
    const listing = recentListings[0];
    return buildDocumentTemplateDrafts({
      organizationName: organization.name,
      propertyAddress: listing?.property?.address || null,
      listingType: listing?.listing_type || null,
      price: listing?.price || null,
      currency: listing?.currency || "GHS",
    });
  }, [organization.name, recentListings]);
  const nextViewingExport = useMemo(() => {
    const viewing = upcomingViewings[0];
    if (!viewing) return null;

    return buildViewingCalendarExports({
      title: `BaytMiftah viewing: ${viewing.listing?.property?.address || "Property"}`,
      startsAt: viewing.confirmed_datetime || viewing.requested_datetime,
      location: [
        viewing.listing?.property?.address,
        viewing.listing?.property?.city,
        viewing.listing?.property?.region,
      ]
        .filter(Boolean)
        .join(", "),
      description: "Viewing scheduled from the BaytMiftah workspace.",
    });
  }, [upcomingViewings]);
  const onboardingItems = useMemo(() => {
    const organizationAny = organization as any;
    return [
      {
        label: "Complete agency profile",
        description: "Add public contact details, website, and agency positioning.",
        complete: Boolean(organization.description && organization.email && organization.phone),
        href: `${workspaceBasePath}/settings`,
        icon: Settings,
      },
      {
        label: "Set payout destination",
        description: "Add payout and release details for every payment gateway before escrow goes live.",
        complete:
          organizationAny.payment_setup_status === "ready" ||
          Boolean(
            organizationAny.paystack_transfer_recipient_code ||
              organizationAny.stripe_connect_account_id
          ),
        href: `${workspaceBasePath}/settings`,
        icon: CreditCard,
      },
      {
        label: "Submit business verification",
        description: "Keep documents ready for admin review and the verified badge.",
        complete: Boolean(organization.verified),
        href: `${workspaceBasePath}/verification`,
        icon: FileCheck2,
      },
      {
        label: "Invite the team",
        description: "Bring managers, agents, and analysts into the workspace.",
        complete: membersCount > 1,
        href: `${workspaceBasePath}/team`,
        icon: Users,
      },
      {
        label: "Create first listing",
        description: "Add inventory so the marketplace and lead system have supply.",
        complete: listings.length > 0,
        href: `${workspaceBasePath}/listings`,
        icon: Building2,
      },
      {
        label: "Prepare Smart Access",
        description: "Optional IoT setup for viewings and tenancy handoff.",
        complete: Boolean(organizationAny.onboarding_checklist?.smart_access_ready),
        href: `${workspaceBasePath}/smart-access`,
        icon: KeyRound,
      },
    ];
  }, [listings.length, membersCount, organization, workspaceBasePath]);
  const onboardingCompleteCount = onboardingItems.filter((item) => item.complete).length;
  const onboardingPercent = Math.round((onboardingCompleteCount / onboardingItems.length) * 100);

  if (loading) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Loading workspace overview...
      </Card>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">{organization.name}</h1>
        <p className="text-muted-foreground">
          Keep an eye on listings, inbound inquiries, and team activity from one workspace.
        </p>
      </div>

      <Card className="mb-8 overflow-hidden">
        <div className="border-b border-border bg-primary/5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white">
                <ListChecks className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Agency onboarding checklist</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Finish these setup steps to make the workspace production-ready.
                </p>
              </div>
            </div>
            <Badge variant={onboardingPercent === 100 ? "default" : "outline"}>
              {onboardingCompleteCount}/{onboardingItems.length} complete
            </Badge>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${onboardingPercent}%` }}
            />
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {onboardingItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.href}
                className="rounded-2xl border border-border p-4 transition hover:border-primary/40 hover:bg-secondary/30"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary">
                    {item.complete ? (
                      <CheckCircle2 className="h-5 w-5 text-accent" />
                    ) : (
                      <Icon className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Listings</p>
              <p className="text-3xl font-semibold">{listedCount}</p>
              <p className="text-xs text-accent mt-1">{listings.length} total in workspace</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Payments Collected</p>
              <p className="text-3xl font-semibold">{currencyFormatter.format(collectedRevenue)}</p>
              <p className="text-xs text-accent mt-1">
                {successfulPayments.length} successful transactions
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pending Leads</p>
              <p className="text-3xl font-semibold">{activeLeadsCount}</p>
              <p className="text-xs text-accent mt-1">{dealCases.length} deal cases overall</p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Upcoming Viewings</p>
              <p className="text-3xl font-semibold">{upcomingViewings.length}</p>
              <p className="text-xs text-accent mt-1">Scheduled or awaiting confirmation</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Team Members</p>
              <p className="text-3xl font-semibold">{membersCount}</p>
              <p className="text-xs text-chart-3 mt-1">Owners, managers, agents, analysts</p>
            </div>
            <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-chart-3" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pipeline Value</p>
              <p className="text-3xl font-semibold">{currencyFormatter.format(revenuePipeline)}</p>
              <p className="text-xs text-accent mt-1">Based on active deal cases</p>
            </div>
            <div className="w-12 h-12 bg-chart-1/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-chart-1" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Verified Receipts</p>
              <p className="text-3xl font-semibold">{verifiedPayments.length}</p>
              <p className="text-xs text-accent mt-1">Internal receipt hashes</p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Recent Listings</h2>
              <p className="text-sm text-muted-foreground">Your latest inventory updates.</p>
            </div>
            <Link to={`${workspaceBasePath}/listings`}>
              <Button variant="outline" size="sm">
                Manage Listings
              </Button>
            </Link>
          </div>

          {recentListings.length === 0 ? (
            <div className="text-muted-foreground text-sm py-8 text-center">
              No listings yet. Create your first listing to get the workspace moving.
            </div>
          ) : (
            <div className="space-y-4">
              {recentListings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between gap-4 p-4 bg-secondary/30 rounded-lg"
                >
                  <div>
                    <h3 className="font-semibold">
                      {listing.property?.address || "Untitled property"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {listing.property?.city}, {listing.property?.region}
                    </p>
                    <p className="text-sm mt-1">
                      {currencyFormatter.format(listing.price)} / {listing.listing_type}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold capitalize">{listing.status.replaceAll("_", " ")}</div>
                    <div className="text-muted-foreground capitalize">{listing.visibility}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Latest Leads</h2>
              <p className="text-sm text-muted-foreground">Recent inquiries from buyers and renters.</p>
            </div>
            <Link to={`${workspaceBasePath}/leads`}>
              <Button variant="outline" size="sm">
                Review Leads
              </Button>
            </Link>
          </div>

          {recentDealCases.length === 0 ? (
            <div className="text-muted-foreground text-sm py-8 text-center">
              No inbound leads yet. They&apos;ll appear here when users contact your team.
            </div>
          ) : (
            <div className="space-y-4">
              {recentDealCases.map((dealCase) => (
                <div
                  key={dealCase.id}
                  className="flex items-center justify-between gap-4 p-4 bg-secondary/30 rounded-lg"
                >
                  <div>
                    <h3 className="font-semibold">
                      {dealCase.user?.full_name || dealCase.user?.email || "Prospect"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {dealCase.listing?.property?.address || "Property inquiry"}
                    </p>
                    <p className="text-sm mt-1 capitalize">
                      {dealCase.case_type.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold capitalize">{dealCase.status}</div>
                    <div className="text-muted-foreground">
                      {new Date(dealCase.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Upcoming Viewings</h2>
              <p className="text-sm text-muted-foreground">What the team needs to confirm next.</p>
            </div>
            <Link to={`${workspaceBasePath}/leads`}>
              <Button variant="outline" size="sm">
                Open Queue
              </Button>
            </Link>
          </div>

          {upcomingViewings.length === 0 ? (
            <div className="text-muted-foreground text-sm py-8 text-center">
              No active viewings right now.
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingViewings.map((viewing) => (
                <div
                  key={viewing.id}
                  className="rounded-lg bg-secondary/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        {viewing.user?.full_name || viewing.user?.email || "Prospect"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {viewing.listing?.property?.address || "Property viewing"}
                      </p>
                      <p className="text-sm mt-2">
                        {formatDateTime(viewing.confirmed_datetime || viewing.requested_datetime)}
                      </p>
                    </div>
                    <Badge variant={getViewingStatusVariant(viewing.status)}>
                      {formatLabel(viewing.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6 mt-8">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Pipeline Health</h2>
        </div>
        {pipelineBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your pipeline stages will appear here as new inquiries and viewings come in.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {pipelineBreakdown.map((stage) => (
              <div key={stage.key} className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">{stage.label}</p>
                <p className="mt-2 text-2xl font-semibold">{stage.count}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-8 mt-8 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Document Automation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Draft operational documents from the latest listing. Legal-sensitive drafts stay review-gated.
              </p>
            </div>
            <Link to={`${workspaceBasePath}/documents`}>
              <Button variant="outline" size="sm">
                Open Docs
              </Button>
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {templateDrafts.map((draft) => (
              <div key={draft.key} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{draft.title}</p>
                  <Badge variant={draft.legalGate ? "outline" : "secondary"}>
                    {draft.legalGate ? "Legal review" : "Ready draft"}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{draft.body}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Calendar & Viewing Sync</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                ICS export works now. Google and Outlook OAuth stay readiness-gated until consent review.
              </p>
            </div>
            <Link to={`${workspaceBasePath}/calendar`}>
              <Button variant="outline" size="sm">
                Calendar
              </Button>
            </Link>
          </div>
          {nextViewingExport ? (
            <div className="mt-5 space-y-3">
              <a
                href={nextViewingExport.googleUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-primary/40 hover:bg-primary/5"
              >
                Preview Google Calendar export
              </a>
              {nextViewingExport.providerReadiness.map((item) => (
                <div key={item} className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Confirm a viewing to generate calendar export links.
            </p>
          )}
        </Card>
      </div>

      <Card className="p-6 mt-8">
        <div className="flex items-center gap-3 mb-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Organization Snapshot</h2>
        </div>
        <p className="text-muted-foreground mb-4">
          {organization.description || "No organization description has been added yet."}
        </p>
        <div className="flex flex-wrap gap-6 text-sm">
          <span>{organization.email || "No public email set"}</span>
          <span>{organization.phone || "No public phone set"}</span>
          <span>{organization.website || "No website configured"}</span>
          <Link to={`${workspaceBasePath}/payments`} className="text-primary font-medium">
            Open payments workspace
          </Link>
        </div>
      </Card>
    </>
  );
}
