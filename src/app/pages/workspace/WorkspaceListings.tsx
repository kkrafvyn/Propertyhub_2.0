import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { Eye, ImagePlus, RotateCcw, SquarePen, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PropertyMediaPicker } from "../../components/PropertyMediaPicker";
import { ListingQualityPanel } from "../../components/ListingQualityPanel";
import { GhanaRegionInput } from "../../components/GhanaRegionInput";
import type { Database } from "../../../lib/database.types";
import { ghanaMarketService } from "../../../lib/ghana-market.service";
import { getPropertyCoverImage, getPropertyMediaItems } from "../../../lib/property-media";
import { listingQualityService } from "../../../lib/listing-quality.service";
import { propertyMediaService } from "../../../lib/property-media.service";
import { listingService } from "../../../lib/listing.service";
import { propertyService } from "../../../lib/property.service";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type ListingStatus = Database["public"]["Tables"]["listings"]["Row"]["status"];
type ListingVisibility = Database["public"]["Tables"]["listings"]["Row"]["visibility"];
type ListingType = Database["public"]["Tables"]["listings"]["Row"]["listing_type"];
type PropertyCategory = Database["public"]["Tables"]["properties"]["Row"]["category"];

interface WorkspaceListingsProps {
  organization: Organization;
  workspaceBasePath: string;
  currentUserId: string;
}

type ListingDraft = {
  address: string;
  ghanaPostGps: string;
  city: string;
  region: string;
  neighborhood: string;
  country: string;
  category: PropertyCategory;
  bedrooms: string;
  bathrooms: string;
  squareMeters: string;
  description: string;
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
const LISTING_TYPE_OPTIONS: ListingType[] = ["rental", "sale", "lease"];
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
    category: (listing.property?.category || "apartment") as PropertyCategory,
    bedrooms: listing.property?.bedrooms != null ? String(listing.property.bedrooms) : "",
    bathrooms: listing.property?.bathrooms != null ? String(listing.property.bathrooms) : "",
    squareMeters:
      listing.property?.square_meters != null ? String(listing.property.square_meters) : "",
    description: listing.property?.description || "",
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
    original.category !== draft.category ||
    original.bedrooms !== draft.bedrooms ||
    original.bathrooms !== draft.bathrooms ||
    original.squareMeters !== draft.squareMeters ||
    original.description !== draft.description ||
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
}: WorkspaceListingsProps) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ListingDraft>>({});
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingMediaFiles, setPendingMediaFiles] = useState<Record<string, File[]>>({});
  const [uploadingMediaForListingId, setUploadingMediaForListingId] = useState<string | null>(null);
  const [mediaActionId, setMediaActionId] = useState<string | null>(null);
  const createdListingId = (location.state as { createdListingId?: string } | null)?.createdListingId;

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
      const data = await listingService.getOrganizationListings(organization.id);
      setListings(data || []);
      setDrafts(
        (data || []).reduce<Record<string, ListingDraft>>((acc, listing) => {
          acc[listing.id] = createDraft(listing);
          return acc;
        }, {})
      );
    } catch (error) {
      console.error("Failed to load listings:", error);
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
      const locationInsight = ghanaMarketService.getLocationInsight(
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

      await propertyService.updateProperty(listing.property_id, {
        address: draft.address.trim(),
        ghana_post_gps: ghanaMarketService.normalizeGhanaPostGps(draft.ghanaPostGps) || null,
        city: draft.city.trim(),
        region: draft.region.trim(),
        neighborhood: draft.neighborhood.trim() || null,
        country: draft.country.trim(),
        location_confidence: locationConfidence,
        flood_risk_level: locationInsight?.floodRiskLevel || listing.property?.flood_risk_level || "unknown",
        category: draft.category,
        bedrooms: draft.bedrooms ? Number(draft.bedrooms) : null,
        bathrooms: draft.bathrooms ? Number(draft.bathrooms) : null,
        square_meters: draft.squareMeters ? Number(draft.squareMeters) : null,
        description: draft.description.trim() || null,
        amenities: normalizeAmenities(draft.amenities),
      });

      await listingService.updateListing(listing.id, {
        listing_type: draft.listingType,
        price: Number(draft.price),
        currency: draft.currency.trim() || "GHS",
        status: draft.status,
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
          checks: qualityReport.checks,
          titleDocumentStatus: draft.titleDocumentStatus,
          evaluatedAt: new Date().toISOString(),
        },
        last_quality_checked_at: new Date().toISOString(),
        published_at: draft.status === "listed" ? listing.published_at || new Date().toISOString() : null,
      });

      await listingQualityService.syncListingQuality(
        {
          ...listing,
          price: Number(draft.price),
          currency: draft.currency.trim() || "GHS",
          whatsapp_enabled: draft.whatsappEnabled,
          quality_breakdown: {
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
      toast.error("We couldn't upload those photos.");
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Listings</h1>
          <p className="text-muted-foreground mt-2">
            Manage pricing, publication status, property details, and listing photos for {organization.name}.
          </p>
        </div>
        <Link to={`${workspaceBasePath}/new`}>
          <Button>Create New Listing</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-semibold mt-1">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Listed</p>
          <p className="text-2xl font-semibold mt-1">{stats.listed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Drafts</p>
          <p className="text-2xl font-semibold mt-1">{stats.draft}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Featured</p>
          <p className="text-2xl font-semibold mt-1">{stats.featured}</p>
        </Card>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading listings...</Card>
      ) : listings.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No listings yet</h2>
          <p className="text-muted-foreground mb-5">
            Add your first listing to start publishing inventory from this workspace.
          </p>
          <Link to={`${workspaceBasePath}/new`}>
            <Button>Create New Listing</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
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
              <Card key={listing.id} className="p-6">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      <div className="w-32 h-28 rounded-xl overflow-hidden border border-border flex-shrink-0 bg-secondary/20">
                        <img
                          src={coverImage}
                          alt={listing.property?.address || "Property"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-xl font-semibold">
                            {listing.property?.address || "Untitled property"}
                          </h2>
                          <Badge variant="outline" className="capitalize">
                            {listing.listing_type}
                          </Badge>
                          <Badge className="capitalize">{listing.status.replaceAll("_", " ")}</Badge>
                          {listing.featured && <Badge variant="secondary">Featured</Badge>}
                          <Badge variant={qualityReport.score >= 75 ? "default" : "secondary"}>
                            Quality {qualityReport.score}
                          </Badge>
                          {listing.verification_status === "verified" && (
                            <Badge variant="default">Verified Listing</Badge>
                          )}
                          <Badge variant="outline">
                            <ImagePlus className="w-3 h-3" />
                            {mediaItems.length} photo{mediaItems.length === 1 ? "" : "s"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          {listing.property?.city}, {listing.property?.region} - {listing.property?.category || "property"}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>
                            {listing.property?.bedrooms ?? 0} beds / {listing.property?.bathrooms ?? 0} baths
                          </span>
                          <span>
                            {listing.property?.square_meters ? `${listing.property.square_meters} sqm` : "Size not set"}
                          </span>
                          <span>Live price: {currencyFormatter.format(listing.price)}</span>
                          <span>
                            GPS: {listing.property?.ghana_post_gps || "not set"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 lg:min-w-[760px]">
                      <Input
                        label="Price"
                        type="number"
                        min="0"
                        value={draft?.price || ""}
                        onChange={(event) => updateDraft(listing.id, "price", event.target.value)}
                      />
                      <div>
                        <label className="block mb-2 text-sm text-foreground">Currency</label>
                        <input
                          className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                          value={draft?.currency || ""}
                          onChange={(event) => updateDraft(listing.id, "currency", event.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-sm text-foreground">Listing Type</label>
                        <select
                          className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                          value={draft?.listingType || listing.listing_type}
                          onChange={(event) => updateDraft(listing.id, "listingType", event.target.value)}
                        >
                          {LISTING_TYPE_OPTIONS.map((listingType) => (
                            <option key={listingType} value={listingType}>
                              {listingType}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 text-sm text-foreground">Status</label>
                        <select
                          className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                          value={draft?.status || listing.status}
                          onChange={(event) => updateDraft(listing.id, "status", event.target.value)}
                        >
                          {LISTING_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 text-sm text-foreground">Visibility</label>
                        <select
                          className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                          value={draft?.visibility || listing.visibility}
                          onChange={(event) => updateDraft(listing.id, "visibility", event.target.value)}
                        >
                          {LISTING_VISIBILITY_OPTIONS.map((visibility) => (
                            <option key={visibility} value={visibility}>
                              {visibility}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft?.featured || false}
                        onChange={(event) => updateDraft(listing.id, "featured", event.target.checked)}
                      />
                      Featured placement
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft?.whatsappEnabled ?? true}
                        onChange={(event) =>
                          updateDraft(listing.id, "whatsappEnabled", event.target.checked)
                        }
                      />
                      WhatsApp follow-up
                    </label>
                    {isDirty && <span className="text-sm text-primary">You have unsaved changes.</span>}
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
                        <div>
                          <label className="block mb-2 text-sm text-foreground">Category</label>
                          <select
                            className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                            value={draft?.category || "apartment"}
                            onChange={(event) => updateDraft(listing.id, "category", event.target.value)}
                          >
                            {PROPERTY_CATEGORY_OPTIONS.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
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
                          <select
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
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm text-foreground">Description</label>
                        <textarea
                          className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground min-h-32"
                          value={draft?.description || ""}
                          onChange={(event) => updateDraft(listing.id, "description", event.target.value)}
                          placeholder="Describe the property, its neighborhood, and standout details."
                        />
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

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => void handleSave(listing)} disabled={savingId === listing.id || !isDirty}>
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setExpandedListingId((current) => (current === listing.id ? null : listing.id))
                      }
                    >
                      <SquarePen className="w-4 h-4" />
                      {isExpanded ? "Hide Details" : "Edit Details"}
                    </Button>
                    <Button variant="outline" onClick={() => resetDraft(listing)} disabled={!isDirty}>
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </Button>
                    <Link to={`/property/${listing.id}`}>
                      <Button variant="outline">
                        <Eye className="w-4 h-4" />
                        Preview
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => updateDraft(listing.id, "featured", !(draft?.featured || false))}
                    >
                      <Star className="w-4 h-4" />
                      {(draft?.featured || false) ? "Unfeature" : "Feature"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void handleArchive(listing)}
                      disabled={savingId === listing.id || listing.status === "archived"}
                    >
                      Archive
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void handleDelete(listing.id)}
                      disabled={savingId === listing.id}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
