import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { Eye, Copy, ImagePlus, RotateCcw, SquarePen, Star, Trash2, Building2, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { MetricCard } from "../../components/ui/MetricCard";
import {
  CardGridSkeleton,
  DashboardStatsSkeleton,
  OperationalQueryState,
  WorkspacePageShell,
} from "../../components/ux";
import { PropertyMediaPicker } from "../../components/PropertyMediaPicker";
import { ListingQualityPanel } from "../../components/ListingQualityPanel";
import { GhanaRegionInput } from "../../components/GhanaRegionInput";
import type { Database } from "../../../lib/database.types";
import type { MemberRole } from "../../../lib/workspace";
import type { MemberScopeMode } from "../../../lib/member-scope";
import { filterByPropertyScope } from "../../../lib/member-scope";
import { canWorkspace } from "../../../lib/workspace-permissions";
import { ghanaMarketService } from "../../../lib/ghana-market.service";
import { getPropertyCoverImage, getPropertyMediaItems } from "../../../lib/property-media";
import { listingQualityService } from "../../../lib/listing-quality.service";
import { propertyMediaService } from "../../../lib/property-media.service";
import { normalizeMatterportTourUrl } from "../../../lib/virtual-tour";
import { listingService } from "../../../lib/listing.service";
import { propertyService } from "../../../lib/property.service";
import { PropertyJurisdictionFields } from "../../components/compliance/PropertyJurisdictionFields";
import { countryRulesService } from "../../../lib/country-rules.service";
import { resolveSubdivisionCode } from "../../../lib/country-rules/subdivision-resolver";
import { resolveJurisdiction } from "../../../lib/real-estate-compliance";
import { LISTING_TYPES as LISTING_TYPE_OPTIONS } from "../../../lib/listing-types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type ListingStatus = Database["public"]["Tables"]["listings"]["Row"]["status"];
type ListingVisibility = Database["public"]["Tables"]["listings"]["Row"]["visibility"];
type ListingType = Database["public"]["Tables"]["listings"]["Row"]["listing_type"];
type PropertyCategory = Database["public"]["Tables"]["properties"]["Row"]["category"];

interface WorkspaceListingsProps {
  organization: Organization;
  workspaceBasePath: string;
  currentUserId: string;
  currentRole: MemberRole | null;
  scopeMode?: MemberScopeMode | null;
  scopedPropertyIds?: string[] | null;
  bypassPropertyScope?: boolean;
}

type ListingDraft = {
  address: string;
  ghanaPostGps: string;
  city: string;
  region: string;
  neighborhood: string;
  country: string;
  subdivisionCode: string;
  category: PropertyCategory;
  bedrooms: string;
  bathrooms: string;
  squareMeters: string;
  description: string;
  virtualTourUrl: string;
  amenities: string;
  listingType: ListingType;
  price: string;
  currency: string;
  status: ListingStatus;
  visibility: ListingVisibility;
  featured: boolean;
  whatsappEnabled: boolean;
  inspectionFeeAmount: string;
  minimumDepositAmount: string;
  titleDocumentStatus: string;
};

const LISTING_STATUS_OPTIONS: ListingStatus[] = [
  "draft",
  "pending_review",
  "listed",
  "under_offer",
  "occupied",
  "sold",
  "leased",
  "archived",
  "suspended",
];

const LISTING_VISIBILITY_OPTIONS: ListingVisibility[] = ["public", "private", "hidden"];
const PROPERTY_CATEGORY_OPTIONS: PropertyCategory[] = [
  "apartment",
  "house",
  "office",
  "commercial",
  "land",
];

const currencyFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  maximumFractionDigits: 0,
});

function createDraft(listing: any): ListingDraft {
  return {
    address: listing.property?.address || "",
    ghanaPostGps: listing.property?.ghana_post_gps || "",
    city: listing.property?.city || "",
    region: listing.property?.region || "",
    neighborhood: listing.property?.neighborhood || "",
    country: listing.property?.country || "Ghana",
    subdivisionCode: listing.property?.subdivision_code || "",
    category: (listing.property?.category || "apartment") as PropertyCategory,
    bedrooms: listing.property?.bedrooms != null ? String(listing.property.bedrooms) : "",
    bathrooms: listing.property?.bathrooms != null ? String(listing.property.bathrooms) : "",
    squareMeters:
      listing.property?.square_meters != null ? String(listing.property.square_meters) : "",
    description: listing.property?.description || "",
    virtualTourUrl: listing.property?.virtual_tour_url || "",
    amenities: Array.isArray(listing.property?.amenities)
      ? listing.property.amenities.join(", ")
      : "",
    listingType: listing.listing_type,
    price: String(listing.price),
    currency: listing.currency || "GHS",
    status: listing.status,
    visibility: listing.visibility,
    featured: listing.featured,
    whatsappEnabled: listing.whatsapp_enabled ?? true,
    inspectionFeeAmount:
      listing.inspection_fee_amount != null ? String(listing.inspection_fee_amount) : "",
    minimumDepositAmount:
      listing.minimum_deposit_amount != null ? String(listing.minimum_deposit_amount) : "",
    titleDocumentStatus: listing.quality_breakdown?.titleDocumentStatus || "missing",
  };
}

function normalizeAmenities(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isDraftDirty(listing: any, draft?: ListingDraft) {
  if (!draft) return false;
  const original = createDraft(listing);

  return (
    original.address !== draft.address ||
    original.ghanaPostGps !== draft.ghanaPostGps ||
    original.city !== draft.city ||
    original.region !== draft.region ||
    original.neighborhood !== draft.neighborhood ||
    original.country !== draft.country ||
    original.subdivisionCode !== draft.subdivisionCode ||
    original.category !== draft.category ||
    original.bedrooms !== draft.bedrooms ||
    original.bathrooms !== draft.bathrooms ||
    original.squareMeters !== draft.squareMeters ||
    original.description !== draft.description ||
    original.virtualTourUrl !== draft.virtualTourUrl ||
    original.amenities !== draft.amenities ||
    original.listingType !== draft.listingType ||
    original.price !== draft.price ||
    original.currency !== draft.currency ||
    original.status !== draft.status ||
    original.visibility !== draft.visibility ||
    original.featured !== draft.featured ||
    original.whatsappEnabled !== draft.whatsappEnabled ||
    original.inspectionFeeAmount !== draft.inspectionFeeAmount ||
    original.minimumDepositAmount !== draft.minimumDepositAmount ||
    original.titleDocumentStatus !== draft.titleDocumentStatus
  );
}

function getDraftQualityReport(listing: any, draft: ListingDraft | undefined, mediaCount: number, organizationVerified: boolean) {
  const source = draft || createDraft(listing);
  const locationConfidence = ghanaMarketService.calculateLocationConfidence({
    address: source.address,
    city: source.city,
    region: source.region,
    neighborhood: source.neighborhood,
    ghanaPostGps: source.ghanaPostGps,
  });

  return listingQualityService.evaluate({
    address: source.address,
    city: source.city,
    region: source.region,
    neighborhood: source.neighborhood,
    ghanaPostGps: source.ghanaPostGps,
    description: source.description,
    amenities: normalizeAmenities(source.amenities),
    price: source.price ? Number(source.price) : null,
    currency: source.currency,
    mediaCount,
    organizationVerified,
    listingVerificationStatus: listing.verification_status,
    titleDocumentStatus: source.titleDocumentStatus,
    whatsappEnabled: source.whatsappEnabled,
    locationConfidence,
  });
}

export function WorkspaceListings({
  organization,
  workspaceBasePath,
  currentUserId,
  currentRole,
  scopeMode = "organization",
  scopedPropertyIds = null,
  bypassPropertyScope = false,
}: WorkspaceListingsProps) {
  const canWrite = canWorkspace(currentRole, "listings:write");
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ListingDraft>>({});
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingMediaFiles, setPendingMediaFiles] = useState<Record<string, File[]>>({});
  const [uploadingMediaForListingId, setUploadingMediaForListingId] = useState<string | null>(null);
  const [mediaActionId, setMediaActionId] = useState<string | null>(null);
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [bulkWorking, setBulkWorking] = useState(false);
  const createdListingId = (location.state as { createdListingId?: string } | null)?.createdListingId;
  const [orgMarket, setOrgMarket] = useState<{ jurisdiction?: string; subdivision?: string; currency?: string }>({});

  useEffect(() => {
    void countryRulesService.getOrganizationSettings(organization.id).then((settings) => {
      if (!settings) return;
      setOrgMarket({
        jurisdiction: settings.default_jurisdiction,
        subdivision: settings.default_subdivision || undefined,
        currency: settings.default_currency || undefined,
      });
    });
  }, [organization.id]);

  useEffect(() => {
    void loadListings();
  }, [organization.id]);

  useEffect(() => {
    if (createdListingId) {
      toast.success("Your new listing is ready to review.");
      setExpandedListingId(createdListingId);
    }
  }, [createdListingId]);

  const loadListings = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await listingService.getOrganizationListings(organization.id);
      const scoped = filterByPropertyScope(
        data || [],
        scopeMode,
        scopedPropertyIds,
        bypassPropertyScope,
      );
      setListings(scoped);
      setDrafts(
        scoped.reduce<Record<string, ListingDraft>>((acc, listing) => {
          acc[listing.id] = createDraft(listing);
          return acc;
        }, {})
      );
    } catch (error) {
      console.error("Failed to load listings:", error);
      setLoadError("We couldn't load your listings. Check your connection and try again.");
      toast.error("Unable to load organization listings.");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: listings.length,
      listed: listings.filter((listing) => listing.status === "listed").length,
      draft: listings.filter((listing) => listing.status === "draft").length,
      featured: listings.filter((listing) => listing.featured).length,
    }),
    [listings]
  );

  const updateDraft = (listingId: string, field: keyof ListingDraft, value: string | boolean) => {
    setDrafts((current) => ({
      ...current,
      [listingId]: {
        ...current[listingId],
        [field]: value,
      },
    }));
  };

  const resetDraft = (listing: any) => {
    setDrafts((current) => ({
      ...current,
      [listing.id]: createDraft(listing),
    }));
  };

  const handleSave = async (listing: any) => {
    const draft = drafts[listing.id];
    if (!draft) return;

    if (!draft.address.trim() || !draft.city.trim() || !draft.region.trim()) {
      toast.error("Address, city, and region are required.");
      return;
    }

    if (draft.virtualTourUrl.trim() && !normalizeMatterportTourUrl(draft.virtualTourUrl)) {
      toast.error("Enter a valid Matterport 3D tour link, or leave the field empty.");
      return;
    }

    if (!draft.price || Number.isNaN(Number(draft.price))) {
      toast.error("Enter a valid price before saving.");
      return;
    }

    try {
      setSavingId(listing.id);
      const locationConfidence = ghanaMarketService.calculateLocationConfidence({
        address: draft.address,
        city: draft.city,
        region: draft.region,
        neighborhood: draft.neighborhood,
        ghanaPostGps: draft.ghanaPostGps,
      });
      const locationInsight = await ghanaMarketService.getLocationInsight(
        draft.city,
        draft.region,
        draft.neighborhood
      );
      const mediaItems = getPropertyMediaItems(listing.property);
      const qualityReport = getDraftQualityReport(
        listing,
        draft,
        mediaItems.length,
        Boolean(organization.verified)
      );

      const jurisdictionId = resolveJurisdiction({
        country: draft.country,
        region: draft.region,
        city: draft.city,
      });
      const subdivisionCode =
        draft.subdivisionCode.trim().toUpperCase() ||
        resolveSubdivisionCode(jurisdictionId, draft.region, draft.city) ||
        null;

      await propertyService.updateProperty(listing.property_id, {
        address: draft.address.trim(),
        ghana_post_gps: ghanaMarketService.normalizeGhanaPostGps(draft.ghanaPostGps) || null,
        city: draft.city.trim(),
        region: draft.region.trim(),
        neighborhood: draft.neighborhood.trim() || null,
        country: draft.country.trim(),
        subdivision_code: subdivisionCode,
        location_confidence: locationConfidence,
        flood_risk_level: locationInsight?.floodRiskLevel || listing.property?.flood_risk_level || "unknown",
        category: draft.category,
        bedrooms: draft.bedrooms ? Number(draft.bedrooms) : null,
        bathrooms: draft.bathrooms ? Number(draft.bathrooms) : null,
        square_meters: draft.squareMeters ? Number(draft.squareMeters) : null,
        description: draft.description.trim() || null,
        virtual_tour_url: normalizeMatterportTourUrl(draft.virtualTourUrl),
        amenities: normalizeAmenities(draft.amenities),
      });

      const publishing = draft.status === "listed" && listing.status !== "listed";
      await listingService.updateListing(listing.id, {
        listing_type: draft.listingType,
        price: Number(draft.price),
        currency: draft.currency.trim() || "GHS",
        status: publishing ? "draft" : draft.status,
        visibility: draft.visibility,
        featured: draft.featured,
        whatsapp_enabled: draft.whatsappEnabled,
        inspection_fee_amount: draft.inspectionFeeAmount
          ? Number(draft.inspectionFeeAmount)
          : null,
        minimum_deposit_amount: draft.minimumDepositAmount
          ? Number(draft.minimumDepositAmount)
          : null,
        quality_score: qualityReport.score,
        quality_breakdown: {
          ...(listing.quality_breakdown || {}),
          checks: qualityReport.checks,
          titleDocumentStatus: draft.titleDocumentStatus,
          evaluatedAt: new Date().toISOString(),
        } as any,
        last_quality_checked_at: new Date().toISOString(),
        published_at: draft.status === "listed" ? listing.published_at || new Date().toISOString() : null,
      });

      if (publishing) await listingService.publishListing(listing.id);

      await listingQualityService.syncListingQuality(
        {
          ...listing,
          price: Number(draft.price),
          currency: draft.currency.trim() || "GHS",
          whatsapp_enabled: draft.whatsappEnabled,
          quality_breakdown: {
            ...(listing.quality_breakdown || {}),
            titleDocumentStatus: draft.titleDocumentStatus,
          },
          property: {
            ...listing.property,
            address: draft.address.trim(),
            city: draft.city.trim(),
            region: draft.region.trim(),
            neighborhood: draft.neighborhood.trim() || null,
            ghana_post_gps: ghanaMarketService.normalizeGhanaPostGps(draft.ghanaPostGps) || null,
            description: draft.description.trim() || null,
            amenities: normalizeAmenities(draft.amenities),
            location_confidence: locationConfidence,
            media: mediaItems,
          },
          organization: {
            verified: Boolean(organization.verified),
          },
        },
        organization.id
      );

      toast.success("Listing and property details updated.");
      await loadListings();
    } catch (error) {
      console.error("Failed to update listing:", error);
      toast.error("We couldn't save that listing.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm("Delete this listing? The property record will remain in your database.")) {
      return;
    }

    try {
      setSavingId(listingId);
      await listingService.deleteListing(listingId);
      toast.success("Listing deleted.");
      await loadListings();
    } catch (error) {
      console.error("Failed to delete listing:", error);
      toast.error("Unable to delete the listing.");
    } finally {
      setSavingId(null);
    }
  };

  const handleArchive = async (listing: any) => {
    setDrafts((current) => ({
      ...current,
      [listing.id]: {
        ...current[listing.id],
        status: "archived",
      },
    }));

    try {
      setSavingId(listing.id);
      await listingService.updateListing(listing.id, {
        status: "archived",
        published_at: null,
      });
      toast.success("Listing archived.");
      await loadListings();
    } catch (error) {
      console.error("Failed to archive listing:", error);
      toast.error("Unable to archive that listing.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleListingSelection = (listingId: string) => {
    setSelectedListingIds((current) =>
      current.includes(listingId)
        ? current.filter((id) => id !== listingId)
        : [...current, listingId]
    );
  };

  const handleDuplicate = async (listingId: string) => {
    try {
      setSavingId(listingId);
      const duplicated = await listingService.duplicateListing(listingId, organization.id);
      toast.success("Listing duplicated as draft.");
      setExpandedListingId(duplicated.id);
      await loadListings();
    } catch (error) {
      console.error(error);
      toast.error("Unable to duplicate listing.");
    } finally {
      setSavingId(null);
    }
  };

  const runBulkAction = async (
    action: "archive" | "publish" | "feature" | "unfeature"
  ) => {
    if (selectedListingIds.length === 0) {
      toast.error("Select at least one listing.");
      return;
    }

    try {
      setBulkWorking(true);
      if (action === "archive") {
        await listingService.bulkUpdateListings(selectedListingIds, {
          status: "archived",
          published_at: null,
        });
      }
      if (action === "publish") {
        await Promise.all(selectedListingIds.map((listingId) => listingService.publishListing(listingId)));
      }
      if (action === "feature") {
        await listingService.bulkUpdateListings(selectedListingIds, { featured: true });
      }
      if (action === "unfeature") {
        await listingService.bulkUpdateListings(selectedListingIds, { featured: false });
      }
      toast.success(`Bulk ${action} completed.`);
      setSelectedListingIds([]);
      await loadListings();
    } catch (error) {
      console.error(error);
      toast.error("Bulk action failed.");
    } finally {
      setBulkWorking(false);
    }
  };

  const handlePendingMediaChange = (listingId: string, files: File[]) => {
    setPendingMediaFiles((current) => ({
      ...current,
      [listingId]: files,
    }));
  };

  const handleUploadMedia = async (listing: any) => {
    const queuedFiles = pendingMediaFiles[listing.id] || [];
    if (queuedFiles.length === 0) {
      toast.error("Select one or more images first.");
      return;
    }

    try {
      setUploadingMediaForListingId(listing.id);
      await propertyMediaService.uploadPropertyMedia({
        organizationId: organization.id,
        propertyId: listing.property_id,
        createdBy: currentUserId,
        files: queuedFiles,
        onUploaded: (file) => setPendingMediaFiles((current) => ({ ...current, [listing.id]: (current[listing.id] || []).filter((item) => item !== file) })),
        altText: drafts[listing.id]?.address || listing.property?.address || null,
      });
      setPendingMediaFiles((current) => ({
        ...current,
        [listing.id]: [],
      }));
      toast.success("Photos uploaded.");
      await loadListings();
    } catch (error) {
      console.error("Failed to upload property media:", error);
      toast.error("Upload interrupted. Completed photos were removed from the queue; remaining photos are still selected. Reconnect and retry.");
    } finally {
      setUploadingMediaForListingId(null);
    }
  };

  const handleSetPrimaryMedia = async (listing: any, mediaId: string) => {
    try {
      setMediaActionId(mediaId);
      await propertyMediaService.setPrimaryMedia(listing.property_id, mediaId);
      toast.success("Cover photo updated.");
      await loadListings();
    } catch (error) {
      console.error("Failed to set cover photo:", error);
      toast.error("We couldn't update the cover photo.");
    } finally {
      setMediaActionId(null);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm("Remove this photo from the property gallery?")) {
      return;
    }

    try {
      setMediaActionId(mediaId);
      await propertyMediaService.deletePropertyMedia(mediaId);
      toast.success("Photo removed.");
      await loadListings();
    } catch (error) {
      console.error("Failed to delete property media:", error);
      toast.error("We couldn't remove that photo.");
    } finally {
      setMediaActionId(null);
    }
  };

  return (
    <WorkspacePageShell
      title="Properties & Listings"
      description="Manage pricing, publication status, compliance fields, and media for your portfolio."
      badge={
        <Badge variant="outline" className="text-xs font-medium">
          {organization.name}
        </Badge>
      }
      actions={
        canWrite ? (
          <Link to={`${workspaceBasePath}/new`} className="shrink-0">
            <Button>
              <Building2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Create listing
            </Button>
          </Link>
        ) : null
      }
    >
      {loading && !loadError ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Properties"
            value={loading ? "—" : stats.total}
            icon={Building2}
            iconColor="primary"
            subtitle="All inventory in workspace"
          />
          <MetricCard
            title="Active Listed"
            value={loading ? "—" : stats.listed}
            icon={CheckCircle2}
            iconColor="primary"
            subtitle="Public on marketplace"
          />
          <MetricCard
            title="Drafts & Staging"
            value={loading ? "—" : stats.draft}
            icon={FileText}
            iconColor="primary"
            subtitle="Pending review or media"
          />
          <MetricCard
            title="Featured Showcase"
            value={loading ? "—" : stats.featured}
            icon={Star}
            iconColor="primary"
            subtitle="Promoted placement"
          />
        </div>
      )}

      <OperationalQueryState
        phase={
          loadError
            ? "error"
            : loading
              ? "loading"
              : listings.length === 0
                ? "empty"
                : "ready"
        }
        errorMessage={loadError ?? undefined}
        onRetry={() => void loadListings()}
        retryLabel="Reload listings"
        loadingFallback={<CardGridSkeleton count={3} />}
        emptyIcon={Building2}
        emptyTitle="No listings yet"
        emptyDescription="Create your first property listing to publish on the marketplace."
        emptyActionLabel={canWrite ? "Create listing" : undefined}
        emptyActionHref={canWrite ? `${workspaceBasePath}/new` : undefined}
      >
        <div className="space-y-6 min-w-0 w-full mt-6">

      {/* Floating Glass Bulk Action Toolbar */}
      {canWrite && selectedListingIds.length > 0 ? (
        <Card className="p-4 flex flex-wrap items-center justify-between gap-3 border-primary/30 bg-primary/5 dark:bg-primary/10 backdrop-blur-md shadow-glass-card rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
              {selectedListingIds.length}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {selectedListingIds.length} {selectedListingIds.length === 1 ? "property" : "properties"} selected
              </p>
              <p className="text-xs text-muted-foreground">Apply batch operations across active inventory</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={bulkWorking} onClick={() => void runBulkAction("publish")} className="bg-surface/80 hover:bg-surface">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
              Publish
            </Button>
            <Button size="sm" variant="outline" disabled={bulkWorking} onClick={() => void runBulkAction("archive")} className="bg-surface/80 hover:bg-surface">
              Archive
            </Button>
            <Button size="sm" variant="outline" disabled={bulkWorking} onClick={() => void runBulkAction("feature")} className="bg-surface/80 hover:bg-surface">
              <Star className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              Feature
            </Button>
            <Button size="sm" variant="outline" disabled={bulkWorking} onClick={() => void runBulkAction("unfeature")} className="bg-surface/80 hover:bg-surface">
              Unfeature
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedListingIds([])} className="text-xs text-muted-foreground hover:text-foreground">
              Clear selection
            </Button>
          </div>
        </Card>
      ) : null}

        <div className="space-y-4 min-w-0">
          {listings.map((listing) => {
            const draft = drafts[listing.id];
            const isExpanded = expandedListingId === listing.id;
            const isDirty = isDraftDirty(listing, draft);
            const mediaItems = getPropertyMediaItems(listing.property);
            const coverImage = getPropertyCoverImage(listing.property);
            const qualityReport = getDraftQualityReport(
              listing,
              draft,
              mediaItems.length,
              Boolean(organization.verified)
            );

            return (
              <Card key={listing.id} className="p-5 sm:p-6 rounded-2xl border-surface-border/80 hover:border-surface-border hover:shadow-card transition-all duration-300 group">
                {!canWrite ? (
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-4">
                      <div className="relative w-36 h-28 sm:w-40 sm:h-32 rounded-2xl overflow-hidden border border-surface-border flex-shrink-0 bg-surface-subtle group/img">
                        <img
                          src={coverImage}
                          alt={listing.property?.address || "Property"}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/img:scale-105"
                        />
                        <span className="absolute bottom-2 right-2 rounded-full bg-surface/85 backdrop-blur-md px-2 py-0.5 text-[11px] font-medium border border-surface-border/60 text-foreground flex items-center gap-1 shadow-sm">
                          <ImagePlus className="w-3 h-3 text-muted-foreground" />
                          {mediaItems.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-display font-semibold text-foreground">
                            {listing.property?.address || "Untitled property"}
                          </h2>
                          <Badge variant="outline" className="capitalize text-xs">
                            {listing.listing_type}
                          </Badge>
                          <Badge className="capitalize text-xs">{listing.status.replaceAll("_", " ")}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {listing.property?.city}, {listing.property?.region}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {currencyFormatter.format(listing.price)} • <span className="text-muted-foreground font-normal">Trust Score: {qualityReport.score}/100</span>
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" disabled={savingId === listing.id} onClick={async () => {
                      setSavingId(listing.id);
                      try { await listingService.confirmAvailability(listing.id); toast.success("Availability confirmation recorded."); await loadListings(); }
                      catch (error) { toast.error(error instanceof Error ? error.message : "Could not confirm availability."); }
                      finally { setSavingId(null); }
                    }}>Confirm still available</Button>
                    <Link to={`/property/${listing.id}`}>
                      <Button variant="outline" className="rounded-xl">
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </Link>
                  </div>
                ) : (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <div className="relative w-36 h-28 sm:w-44 sm:h-32 rounded-2xl overflow-hidden border border-surface-border flex-shrink-0 bg-surface-subtle group/img shadow-sm">
                        <img
                          src={coverImage}
                          alt={listing.property?.address || "Property"}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/img:scale-105"
                        />
                        <span className="absolute bottom-2 right-2 rounded-full bg-surface/85 backdrop-blur-md px-2 py-0.5 text-[11px] font-medium border border-surface-border/60 text-foreground flex items-center gap-1 shadow-sm">
                          <ImagePlus className="w-3 h-3 text-muted-foreground" />
                          {mediaItems.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <label className="relative flex items-center justify-center cursor-pointer select-none mr-1">
                            <input
                              type="checkbox"
                              checked={selectedListingIds.includes(listing.id)}
                              onChange={() => toggleListingSelection(listing.id)}
                              aria-label={`Select ${listing.property?.address || "listing"}`}
                              className="w-4 h-4 rounded text-primary focus:ring-primary/20 border-surface-border accent-primary cursor-pointer"
                            />
                          </label>
                          <h2 className="text-xl font-display font-semibold tracking-tight text-foreground">
                            {listing.property?.address || "Untitled property"}
                          </h2>
                          <Badge variant="outline" className="capitalize text-xs font-medium">
                            {listing.listing_type}
                          </Badge>
                          <Badge
                            className={`capitalize text-xs font-medium ${
                              listing.status === "listed"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : listing.status === "draft" || listing.status === "pending_review"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                : "bg-surface-subtle text-muted-foreground border-surface-border"
                            }`}
                          >
                            {listing.status.replaceAll("_", " ")}
                          </Badge>
                          {listing.featured && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              Featured
                            </Badge>
                          )}
                          <Badge
                            className={
                              qualityReport.score >= 75
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : qualityReport.score >= 50
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            }
                          >
                            Quality {qualityReport.score}
                          </Badge>
                          {listing.verification_status === "verified" && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Platform reviewed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {listing.property?.city}, {listing.property?.region} <span className="opacity-60">•</span> {listing.property?.category || "property"}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {listing.property?.bedrooms ?? 0} beds / {listing.property?.bathrooms ?? 0} baths
                          </span>
                          <span>•</span>
                          <span>
                            {listing.property?.square_meters ? `${listing.property.square_meters} sqm` : "Size not set"}
                          </span>
                          <span>•</span>
                          <span className="text-foreground font-semibold">Live price: {currencyFormatter.format(listing.price)}</span>
                          <span>•</span>
                          <span>
                            GPS: {listing.property?.ghana_post_gps || "not set"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 lg:min-w-[760px] p-3.5 rounded-2xl bg-surface-subtle/50 border border-surface-border/60">
                      <Input
                        label="Price"
                        type="number"
                        min="0"
                        value={draft?.price || ""}
                        onChange={(event) => updateDraft(listing.id, "price", event.target.value)}
                      />
                      <div>
                        <label className="block mb-1.5 text-xs font-medium text-muted-foreground">Currency</label>
                        <input
                          className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-foreground text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          value={draft?.currency || ""}
                          onChange={(event) => updateDraft(listing.id, "currency", event.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-medium text-muted-foreground">Listing Type</label>
                        <NativeSelectControl
                          className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-foreground text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          value={draft?.listingType || listing.listing_type}
                          onChange={(event) => updateDraft(listing.id, "listingType", event.target.value)}
                        >
                          {LISTING_TYPE_OPTIONS.map((listingType) => (
                            <option key={listingType} value={listingType}>
                              {listingType}
                            </option>
                          ))}
                        </NativeSelectControl>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-medium text-muted-foreground">Status</label>
                        <NativeSelectControl
                          className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-foreground text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          value={draft?.status || listing.status}
                          onChange={(event) => updateDraft(listing.id, "status", event.target.value)}
                        >
                          {LISTING_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status.replaceAll("_", " ")}
                            </option>
                          ))}
                        </NativeSelectControl>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-medium text-muted-foreground">Visibility</label>
                        <NativeSelectControl
                          className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-foreground text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          value={draft?.visibility || listing.visibility}
                          onChange={(event) => updateDraft(listing.id, "visibility", event.target.value)}
                        >
                          {LISTING_VISIBILITY_OPTIONS.map((visibility) => (
                            <option key={visibility} value={visibility}>
                              {visibility}
                            </option>
                          ))}
                        </NativeSelectControl>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateDraft(listing.id, "featured", !(draft?.featured || false))}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        draft?.featured
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-sm"
                          : "bg-surface-subtle border-surface-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${draft?.featured ? "fill-amber-500 text-amber-500" : ""}`} />
                      Featured placement
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDraft(listing.id, "whatsappEnabled", !(draft?.whatsappEnabled ?? true))}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        draft?.whatsappEnabled ?? true
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-sm"
                          : "bg-surface-subtle border-surface-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${draft?.whatsappEnabled ?? true ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                      WhatsApp follow-up
                    </button>
                    {isDirty && (
                      <span className="text-xs font-semibold text-primary flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 animate-pulse">
                        ● Unsaved modifications
                      </span>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border pt-6 space-y-6">
                      <ListingQualityPanel report={qualityReport} compact />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Address"
                          value={draft?.address || ""}
                          onChange={(event) => updateDraft(listing.id, "address", event.target.value)}
                        />
                        <Input
                          label="GhanaPostGPS"
                          value={draft?.ghanaPostGps || ""}
                          onChange={(event) =>
                            updateDraft(listing.id, "ghanaPostGps", event.target.value)
                          }
                          placeholder="GA-123-4567"
                        />
                        <Input
                          label="City"
                          value={draft?.city || ""}
                          onChange={(event) => updateDraft(listing.id, "city", event.target.value)}
                        />
                        <GhanaRegionInput
                          label="Region"
                          value={draft?.region || ""}
                          onChange={(value) => updateDraft(listing.id, "region", value)}
                        />
                        <Input
                          label="Neighborhood"
                          value={draft?.neighborhood || ""}
                          onChange={(event) =>
                            updateDraft(listing.id, "neighborhood", event.target.value)
                          }
                        />
                        <Input
                          label="Country"
                          value={draft?.country || ""}
                          onChange={(event) => updateDraft(listing.id, "country", event.target.value)}
                        />
                        {draft ? (
                          <PropertyJurisdictionFields
                            values={{
                              country: draft.country,
                              region: draft.region,
                              city: draft.city,
                              subdivisionCode: draft.subdivisionCode,
                              currency: draft.currency,
                            }}
                            orgJurisdiction={orgMarket.jurisdiction as any}
                            orgSubdivision={orgMarket.subdivision}
                            orgCurrency={orgMarket.currency}
                            onChange={(patch) => {
                              if (patch.subdivisionCode != null) {
                                updateDraft(listing.id, "subdivisionCode", patch.subdivisionCode);
                              }
                              if (patch.currency != null) {
                                updateDraft(listing.id, "currency", patch.currency);
                              }
                            }}
                          />
                        ) : null}
                        <div>
                          <label className="block mb-2 text-sm text-foreground">Category</label>
                          <NativeSelectControl
                            className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                            value={draft?.category || "apartment"}
                            onChange={(event) => updateDraft(listing.id, "category", event.target.value)}
                          >
                            {PROPERTY_CATEGORY_OPTIONS.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </NativeSelectControl>
                        </div>
                        <Input
                          label="Bedrooms"
                          type="number"
                          min="0"
                          value={draft?.bedrooms || ""}
                          onChange={(event) => updateDraft(listing.id, "bedrooms", event.target.value)}
                        />
                        <Input
                          label="Bathrooms"
                          type="number"
                          min="0"
                          value={draft?.bathrooms || ""}
                          onChange={(event) => updateDraft(listing.id, "bathrooms", event.target.value)}
                        />
                        <Input
                          label="Square Meters"
                          type="number"
                          min="0"
                          value={draft?.squareMeters || ""}
                          onChange={(event) => updateDraft(listing.id, "squareMeters", event.target.value)}
                        />
                        <Input
                          label="Inspection Fee (GHS)"
                          type="number"
                          min="0"
                          value={draft?.inspectionFeeAmount || ""}
                          onChange={(event) =>
                            updateDraft(listing.id, "inspectionFeeAmount", event.target.value)
                          }
                        />
                        <Input
                          label="Minimum Deposit (GHS)"
                          type="number"
                          min="0"
                          value={draft?.minimumDepositAmount || ""}
                          onChange={(event) =>
                            updateDraft(listing.id, "minimumDepositAmount", event.target.value)
                          }
                        />
                        <div>
                          <label className="block mb-2 text-sm text-foreground">
                            Document Status
                          </label>
                          <NativeSelectControl
                            className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                            value={draft?.titleDocumentStatus || "missing"}
                            onChange={(event) =>
                              updateDraft(listing.id, "titleDocumentStatus", event.target.value)
                            }
                          >
                            <option value="missing">Missing</option>
                            <option value="submitted">Submitted</option>
                            <option value="in_review">In review</option>
                            <option value="verified">Verified</option>
                            <option value="signed">Signed mandate</option>
                          </NativeSelectControl>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm text-foreground">Description</label>
                        <Textarea
                          className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground min-h-32"
                          value={draft?.description || ""}
                          onChange={(event) => updateDraft(listing.id, "description", event.target.value)}
                          placeholder="Describe the property, its neighborhood, and standout details."
                        />
                      </div>

                      <div className="rounded-2xl border border-surface-border bg-surface-subtle p-4">
                        <Input
                          label="Interactive 3D tour (Matterport link)"
                          type="url"
                          value={draft?.virtualTourUrl || ""}
                          onChange={(event) => updateDraft(listing.id, "virtualTourUrl", event.target.value)}
                          placeholder="https://my.matterport.com/show/?m=AbCdEf12345"
                        />
                        <p className="mt-2 text-xs text-muted-foreground">Paste a published Matterport 3D scan. It will appear on the property page only when valid. Do not upload iframe code or ordinary photos here.</p>
                        {draft?.virtualTourUrl && !normalizeMatterportTourUrl(draft.virtualTourUrl) && <p role="alert" className="mt-1 text-xs text-destructive">That is not a supported Matterport tour URL.</p>}
                      </div>
                      <div>
                        <Input
                          label="Amenities"
                          value={draft?.amenities || ""}
                          onChange={(event) => updateDraft(listing.id, "amenities", event.target.value)}
                          placeholder="Pool, Backup generator, Security post"
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Separate amenities with commas.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold">Property Photos</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Choose a cover photo, remove outdated images, or upload new ones.
                          </p>
                        </div>

                        {mediaItems.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {mediaItems.map((media) => (
                              <div
                                key={media.id}
                                className="rounded-xl border border-border overflow-hidden bg-secondary/10"
                              >
                                <div className="relative h-40 overflow-hidden">
                                  <img
                                    src={media.public_url}
                                    alt={media.alt_text || draft?.address || "Property photo"}
                                    className="w-full h-full object-cover"
                                  />
                                  {media.is_primary && (
                                    <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-1 text-xs font-medium">
                                      Cover photo
                                    </span>
                                  )}
                                </div>
                                <div className="p-3 flex flex-wrap gap-3">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleSetPrimaryMedia(listing, media.id)}
                                    disabled={Boolean(media.is_primary) || mediaActionId === media.id}
                                  >
                                    Set Cover
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleDeleteMedia(media.id)}
                                    disabled={mediaActionId === media.id}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                            No uploaded photos yet. Add a few so this listing looks complete on the public site.
                          </div>
                        )}

                        <PropertyMediaPicker
                          files={pendingMediaFiles[listing.id] || []}
                          onChange={(files) => handlePendingMediaChange(listing.id, files)}
                          disabled={uploadingMediaForListingId === listing.id}
                          helperText="Upload JPG, PNG, or WebP images. The first image on an empty gallery becomes the cover automatically."
                        />

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void handleUploadMedia(listing)}
                          disabled={
                            uploadingMediaForListingId === listing.id ||
                            (pendingMediaFiles[listing.id] || []).length === 0
                          }
                        >
                          {uploadingMediaForListingId === listing.id ? "Uploading Photos..." : "Upload Selected Photos"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-border/60">
                    <Button
                      onClick={() => void handleSave(listing)}
                      disabled={savingId === listing.id || !isDirty}
                      className={`rounded-xl transition-all ${
                        isDirty
                          ? "shadow-md shadow-primary/25 bg-primary hover:bg-primary/90 animate-pulse"
                          : ""
                      }`}
                    >
                      {savingId === listing.id ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl bg-surface/80 hover:bg-surface"
                      onClick={() =>
                        setExpandedListingId((current) => (current === listing.id ? null : listing.id))
                      }
                    >
                      <SquarePen className="w-3.5 h-3.5 mr-1.5" />
                      {isExpanded ? "Hide Details" : "Edit Details"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl bg-surface/80 hover:bg-surface"
                      onClick={() => resetDraft(listing)}
                      disabled={!isDirty}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Reset
                    </Button>
                    <Link to={`/property/${listing.id}`}>
                      <Button variant="outline" className="rounded-xl bg-surface/80 hover:bg-surface">
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        Preview
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="rounded-xl bg-surface/80 hover:bg-surface"
                      onClick={() => updateDraft(listing.id, "featured", !(draft?.featured || false))}
                    >
                      <Star className={`w-3.5 h-3.5 mr-1.5 ${(draft?.featured || false) ? "fill-amber-500 text-amber-500" : ""}`} />
                      {(draft?.featured || false) ? "Unfeature" : "Feature"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl bg-surface/80 hover:bg-surface"
                      onClick={() => void handleDuplicate(listing.id)}
                      disabled={savingId === listing.id}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Duplicate
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl bg-surface/80 hover:bg-surface"
                      onClick={() => void handleArchive(listing)}
                      disabled={savingId === listing.id || listing.status === "archived"}
                    >
                      Archive
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 ml-auto"
                      onClick={() => void handleDelete(listing.id)}
                      disabled={savingId === listing.id}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
                )}
              </Card>
            );
          })}
        </div>
        </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
