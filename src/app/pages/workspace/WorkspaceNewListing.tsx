import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ChevronDown, Sparkles, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { FormRow, OperationalQueryState, WorkspacePageShell } from "../../components/ux";
import { PropertyMediaPicker } from "../../components/PropertyMediaPicker";
import { ListingQualityPanel } from "../../components/ListingQualityPanel";
import { GhanaRegionInput } from "../../components/GhanaRegionInput";
import { ListingComplianceChecklist } from "../../components/compliance/ListingComplianceChecklist";
import { PropertyJurisdictionFields } from "../../components/compliance/PropertyJurisdictionFields";
import type { Database } from "../../../lib/database.types";
import { ghanaMarketService, type GhanaLocationInsight } from "../../../lib/ghana-market.service";
import { realEstateComplianceService, type ListingType as ComplianceListingType } from "../../../lib/real-estate-compliance.service";
import { countryRulesService } from "../../../lib/country-rules.service";
import { resolveSubdivisionCode } from "../../../lib/country-rules/subdivision-resolver";
import { validatePropertyLocationForPublish } from "../../../lib/property-jurisdiction-validation";
import { resolveJurisdiction } from "../../../lib/real-estate-compliance";
import { listingQualityService } from "../../../lib/listing-quality.service";
import { LISTING_TYPES, type ListingType } from "../../../lib/listing-types";
import { publishListingDraft, saveListingDraft } from "../../../lib/listing-publish.workflow";
import { aiAssistantService } from "../../../lib/ai-assistant.service";
import { openStreetMapService, type GeocodingResult } from "../../../lib/openstreetmap.service";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type PropertyCategory = Database["public"]["Tables"]["properties"]["Row"]["category"];
type ListingStatus = Database["public"]["Tables"]["listings"]["Row"]["status"];
type ListingVisibility = Database["public"]["Tables"]["listings"]["Row"]["visibility"];

interface WorkspaceNewListingProps {
  organization: Organization;
  workspaceBasePath: string;
  currentUserId: string;
}

const PROPERTY_CATEGORIES: PropertyCategory[] = [
  "apartment",
  "house",
  "office",
  "commercial",
  "land",
];

const LISTING_STATUSES: ListingStatus[] = ["draft", "pending_review", "listed"];
const VISIBILITY_OPTIONS: ListingVisibility[] = ["public", "private", "hidden"];

export function WorkspaceNewListing({
  organization,
  workspaceBasePath,
  currentUserId,
}: WorkspaceNewListingProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [complianceReady, setComplianceReady] = useState(false);
  const [marketInsight, setMarketInsight] = useState<GhanaLocationInsight | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [draftIds, setDraftIds] = useState<{ propertyId?: string; listingId?: string }>({});
  const [geocoding, setGeocoding] = useState(false);
  const [geocodingResult, setGeocodingResult] = useState<GeocodingResult | null>(null);
  const [orgMarket, setOrgMarket] = useState<{ jurisdiction?: string; subdivision?: string; currency?: string }>({});
  const [form, setForm] = useState({
    address: "",
    ghanaPostGps: "",
    city: "",
    region: "",
    neighborhood: "",
    country: "Ghana",
    subdivisionCode: "",
    category: "apartment" as PropertyCategory,
    bedrooms: "",
    bathrooms: "",
    squareMeters: "",
    description: "",
    amenities: "",
    listingType: "rental" as ListingType,
    price: "",
    currency: "GHS",
    status: "draft" as ListingStatus,
    visibility: "public" as ListingVisibility,
    featured: false,
    whatsappEnabled: true,
    inspectionFeeAmount: "",
    minimumDepositAmount: "",
    titleDocumentStatus: "missing",
  });

  const updateField = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    let cancelled = false;
    const loadOrgMarket = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const settings = await countryRulesService.getOrganizationSettings(organization.id);
        if (cancelled) return;
        if (settings) {
          setOrgMarket({
            jurisdiction: settings.default_jurisdiction,
            subdivision: settings.default_subdivision || undefined,
            currency: settings.default_currency || undefined,
          });
          if (settings.default_currency) {
            setForm((current) => ({ ...current, currency: settings.default_currency! }));
          }
        }
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Unable to load listing defaults.";
        setLoadError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadOrgMarket();
    return () => {
      cancelled = true;
    };
  }, [organization.id]);

  useEffect(() => {
    let cancelled = false;

    void ghanaMarketService
      .getLocationInsight(form.city, form.region, form.neighborhood)
      .then((insight) => {
        if (!cancelled) setMarketInsight(insight);
      })
      .catch(() => {
        if (!cancelled) setMarketInsight(null);
      });

    return () => {
      cancelled = true;
    };
  }, [form.city, form.region, form.neighborhood]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.address || !form.city || !form.region || !form.price) {
      toast.error("Address, city, region, and price are required.");
      return;
    }

    if (form.status === "listed" || form.status === "pending_review") {
      if (!complianceReady) {
        toast.error("Complete the compliance checklist before publishing.");
        return;
      }
      const locationCheck = validatePropertyLocationForPublish({
        country: form.country,
        region: form.region,
        city: form.city,
        address: form.address,
        subdivision_code: form.subdivisionCode || undefined,
        ghana_post_gps: form.ghanaPostGps,
      });
      if (!locationCheck.valid) {
        toast.error(locationCheck.errors[0] || "Property location is not valid for publish.");
        return;
      }
    }

    try {
      setSubmitting(true);

      const locationInsight = await ghanaMarketService.getLocationInsight(
        form.city,
        form.region,
        form.neighborhood
      );

      const jurisdictionId = resolveJurisdiction({
        country: form.country,
        region: form.region,
        city: form.city,
      });
      const subdivisionCode =
        form.subdivisionCode.trim().toUpperCase() ||
        resolveSubdivisionCode(jurisdictionId, form.region, form.city) ||
        null;

      const saved = await saveListingDraft({
        organizationId: organization.id,
        currentUserId,
        propertyId: draftIds.propertyId,
        listingId: draftIds.listingId,
        address: form.address,
        ghanaPostGps: ghanaMarketService.normalizeGhanaPostGps(form.ghanaPostGps) || null,
        city: form.city,
        region: form.region,
        neighborhood: form.neighborhood.trim() || null,
        country: form.country,
        subdivisionCode,
        latitude: geocodingResult?.latitude || null,
        longitude: geocodingResult?.longitude || null,
        locationConfidence: ghanaMarketService.calculateLocationConfidence({
          address: form.address,
          city: form.city,
          region: form.region,
          neighborhood: form.neighborhood,
          ghanaPostGps: form.ghanaPostGps,
        }),
        floodRiskLevel: locationInsight?.floodRiskLevel || "unknown",
        category: form.category,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        squareMeters: form.squareMeters ? Number(form.squareMeters) : null,
        description: form.description || null,
        amenities: form.amenities
          ? form.amenities
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : null,
        listingType: form.listingType,
        price: Number(form.price),
        currency: form.currency,
        status: form.status,
        visibility: form.visibility,
        featured: form.featured,
        whatsappEnabled: form.whatsappEnabled,
        inspectionFeeAmount: form.inspectionFeeAmount ? Number(form.inspectionFeeAmount) : null,
        minimumDepositAmount: form.minimumDepositAmount ? Number(form.minimumDepositAmount) : null,
        titleDocumentStatus: form.titleDocumentStatus,
        qualityReport,
        mediaFiles,
        mediaAltText: form.address,
      });

      setDraftIds({ propertyId: saved.propertyId, listingId: saved.listingId });

      if (saved.mediaUploadFailed) {
        toast.error("Draft saved, but one or more photos failed to upload. Retry from listings.");
        navigate(`${workspaceBasePath}/listings`, {
          replace: true,
          state: { createdListingId: saved.listingId, recoverDraft: true },
        });
        return;
      }

      if (form.status === "listed" || form.status === "pending_review") {
        const targetStatus = form.status as Extract<ListingStatus, "listed" | "pending_review">;
        await publishListingDraft({
          listingId: saved.listingId,
          userId: currentUserId,
          targetStatus,
        });
      }

      toast.success(
        form.status === "listed" || form.status === "pending_review"
          ? "Listing published successfully."
          : "Listing draft saved.",
      );
      navigate(`${workspaceBasePath}/listings`, {
        replace: true,
        state: { createdListingId: saved.listingId },
      });
    } catch (error) {
      console.error("Failed to create listing:", error);
      toast.error("We couldn't create the listing right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const locationConfidence = ghanaMarketService.calculateLocationConfidence({
    address: form.address,
    city: form.city,
    region: form.region,
    neighborhood: form.neighborhood,
    ghanaPostGps: form.ghanaPostGps,
  });
  const qualityReport = listingQualityService.evaluate({
    address: form.address,
    city: form.city,
    region: form.region,
    neighborhood: form.neighborhood,
    ghanaPostGps: form.ghanaPostGps,
    description: form.description,
    amenities: form.amenities
      ? form.amenities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    price: form.price ? Number(form.price) : null,
    currency: form.currency,
    mediaCount: mediaFiles.length,
    organizationVerified: organization.verified,
    listingVerificationStatus:
      form.status === "listed" || form.status === "pending_review" ? "submitted" : "draft",
    titleDocumentStatus: form.titleDocumentStatus,
    whatsappEnabled: form.whatsappEnabled,
    locationConfidence,
  });

  const findAddressOnMap = async () => {
    if (!form.address || !form.city || !form.country) {
      toast.error("Enter an address, city, and country first.");
      return;
    }

    try {
      setGeocoding(true);
      const result = await openStreetMapService.geocodeAddress(form.address, form.city, form.region, form.country);
      setGeocodingResult(result);
      if (result) toast.success("Location found on OpenStreetMap.");
      else toast.error("No matching location found. Check the address details.");
    } catch (error) {
      console.error("Failed to geocode listing address:", error);
      toast.error("Unable to find this address on the map.");
    } finally {
      setGeocoding(false);
    }
  };

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  return (
    <WorkspacePageShell
      title="Create a new listing"
      description={`Add a property and publish it into ${organization.name}'s workspace inventory.`}
      badge={
        <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-secondary px-3 py-1 text-xs font-medium text-ink-secondary">
          <Building2 className="w-4 h-4 text-primary" aria-hidden="true" />
          Inventory publishing
        </span>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError ?? undefined}
        onRetry={() => {
          setLoadError(null);
          setLoading(true);
          void countryRulesService
            .getOrganizationSettings(organization.id)
            .then((settings) => {
              if (settings) {
                setOrgMarket({
                  jurisdiction: settings.default_jurisdiction,
                  subdivision: settings.default_subdivision || undefined,
                  currency: settings.default_currency || undefined,
                });
                if (settings.default_currency) {
                  setForm((current) => ({ ...current, currency: settings.default_currency! }));
                }
              }
            })
            .catch((error: unknown) => {
              const message =
                error instanceof Error ? error.message : "Unable to load listing defaults.";
              setLoadError(message);
              toast.error(message);
            })
            .finally(() => setLoading(false));
        }}
      >
      <form onSubmit={handleSubmit} className="space-y-6 min-w-0">
        <Card className="p-6 border-surface-border bg-surface shadow-card">
          <h2 className="text-xl font-semibold mb-4 text-ink">Property Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              placeholder="18 Independence Avenue"
              required
            />
            <Input
              label="GhanaPostGPS"
              value={form.ghanaPostGps}
              onChange={(event) => updateField("ghanaPostGps", event.target.value)}
              placeholder="GA-123-4567"
            />
            <Input
              label="City"
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              placeholder="Accra"
              required
            />
            <GhanaRegionInput
              label="Region"
              value={form.region}
              onChange={(value) => updateField("region", value)}
              placeholder="Greater Accra"
              required
            />
            <Input
              label="Neighborhood"
              value={form.neighborhood}
              onChange={(event) => updateField("neighborhood", event.target.value)}
              placeholder="East Legon, Labone, Osu"
            />
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-sm text-foreground">Map location</p>
                <p className="truncate text-xs text-muted-foreground" title={geocodingResult?.displayName}>
                  {geocodingResult
                    ? `${geocodingResult.latitude.toFixed(5)}, ${geocodingResult.longitude.toFixed(5)}`
                    : "Coordinates not selected"}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => void findAddressOnMap()} disabled={geocoding}>
                {geocoding ? "Finding..." : "Find on map"}
              </Button>
            </div>
            <Input
              label="Country"
              value={form.country}
              onChange={(event) => updateField("country", event.target.value)}
              placeholder="Ghana"
              required
            />
            <div>
              <label className="block mb-2 text-sm text-foreground">Category</label>
              <div className="relative">
                <NativeSelectControl
                  className="w-full appearance-none px-4 py-3 rounded-lg border border-border bg-input-background pr-10 text-ink text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.category}
                  onChange={(event) => updateField("category", event.target.value)}
                >
                  {PROPERTY_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </NativeSelectControl>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              </div>
            </div>
            <Input
              label="Bedrooms"
              type="number"
              min="0"
              value={form.bedrooms}
              onChange={(event) => updateField("bedrooms", event.target.value)}
              placeholder="3"
            />
            <Input
              label="Bathrooms"
              type="number"
              min="0"
              value={form.bathrooms}
              onChange={(event) => updateField("bathrooms", event.target.value)}
              placeholder="2"
            />
            <Input
              label="Square Meters"
              type="number"
              min="0"
              value={form.squareMeters}
              onChange={(event) => updateField("squareMeters", event.target.value)}
              placeholder="140"
            />
          </div>

          <div className="mt-4 rounded-xl border border-border bg-secondary/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">Ghana address confidence</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {locationConfidence}% confidence from address, GhanaPostGPS, and local context.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-medium">
                Flood risk: {marketInsight?.floodRiskLevel || "unknown"}
              </span>
            </div>
            {marketInsight && (
              <p className="mt-3 text-sm text-muted-foreground">{marketInsight.notes}</p>
            )}
          </div>

          <div className="mt-4">
            <FormRow
              label={
                <span className="flex w-full items-center justify-between gap-3">
                  <span>Description</span>
                  <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={generatingDescription}
                className="flex items-center gap-1.5 shrink-0"
                onClick={async () => {
                  setGeneratingDescription(true);
                  try {
                    const description = await aiAssistantService.generateListingDescriptionRemote(
                      {
                        address: form.address,
                        city: form.city,
                        region: form.region,
                        category: form.category,
                        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
                        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
                        squareMeters: form.squareMeters ? Number(form.squareMeters) : null,
                        amenities: form.amenities
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                        listingType: form.listingType,
                        price: form.price ? Number(form.price) : null,
                        currency: form.currency,
                      },
                      organization.id,
                    );
                    updateField("description", description);
                    toast.success("AI draft added. Edit before publishing.");
                  } catch {
                    toast.error("AI draft unavailable. Using local template.");
                    const description = aiAssistantService.generateListingDescription({
                      address: form.address,
                      city: form.city,
                      region: form.region,
                      category: form.category,
                      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
                      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
                      squareMeters: form.squareMeters ? Number(form.squareMeters) : null,
                      amenities: form.amenities
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                      listingType: form.listingType,
                      price: form.price ? Number(form.price) : null,
                      currency: form.currency,
                    });
                    updateField("description", description);
                  } finally {
                    setGeneratingDescription(false);
                  }
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>{generatingDescription ? "Generating..." : "Generate with AI"}</span>
              </Button>
                </span>
              }
              hint="Edit AI drafts before publishing."
            >
            <Textarea
              className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground min-h-32 focus:outline-none focus:ring-1 focus:ring-primary"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Describe the property, neighborhood, and unique selling points."
            />
            </FormRow>
          </div>

          <div className="mt-4">
            <Input
              label="Amenities"
              value={form.amenities}
              onChange={(event) => updateField("amenities", event.target.value)}
              placeholder="Pool, Backup generator, Security post"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Separate amenities with commas.
            </p>
          </div>
        </Card>

        <Card className="p-6 border-surface-border bg-surface shadow-card">
          <h2 className="text-xl font-semibold mb-4 text-ink">Listing Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm text-foreground">Listing Type</label>
              <div className="relative">
                <NativeSelectControl
                  className="w-full appearance-none px-4 py-3 rounded-lg border border-border bg-input-background pr-10 text-ink text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.listingType}
                  onChange={(event) => updateField("listingType", event.target.value)}
                >
                  {LISTING_TYPES.map((listingType) => (
                    <option key={listingType} value={listingType}>
                      {listingType.charAt(0).toUpperCase() + listingType.slice(1)}
                    </option>
                  ))}
                </NativeSelectControl>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              </div>
            </div>
            <Input
              label="Price"
              type="number"
              min="0"
              value={form.price}
              onChange={(event) => updateField("price", event.target.value)}
              placeholder="3500"
              required
            />
            <Input
              label="Currency"
              value={form.currency}
              onChange={(event) => updateField("currency", event.target.value)}
              placeholder="GHS"
            />
            <div>
              <label className="block mb-2 text-sm text-foreground">Status</label>
              <div className="relative">
                <NativeSelectControl
                  className="w-full appearance-none px-4 py-3 rounded-lg border border-border bg-input-background pr-10 text-ink text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                >
                  {LISTING_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </NativeSelectControl>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              </div>
            </div>
            <div>
              <label className="block mb-2 text-sm text-foreground">Visibility</label>
              <div className="relative">
                <NativeSelectControl
                  className="w-full appearance-none px-4 py-3 rounded-lg border border-border bg-input-background pr-10 text-ink text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.visibility}
                  onChange={(event) => updateField("visibility", event.target.value)}
                >
                  {VISIBILITY_OPTIONS.map((visibility) => (
                    <option key={visibility} value={visibility}>
                      {visibility}
                    </option>
                  ))}
                </NativeSelectControl>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => updateField("featured", event.target.checked)}
            />
            <span className="text-sm">Mark this listing as featured</span>
          </label>
        </Card>

        <Card className="p-6 border-surface-border bg-surface shadow-card">
          <h2 className="text-xl font-semibold mb-4 text-ink">Ghana Trust & Mobile Money</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Inspection Fee (GHS)"
              type="number"
              min="0"
              value={form.inspectionFeeAmount}
              onChange={(event) => updateField("inspectionFeeAmount", event.target.value)}
              placeholder="100"
            />
            <Input
              label="Minimum Deposit (GHS)"
              type="number"
              min="0"
              value={form.minimumDepositAmount}
              onChange={(event) => updateField("minimumDepositAmount", event.target.value)}
              placeholder="5000"
            />
            <div>
              <label className="block mb-2 text-sm text-foreground">Document Status</label>
              <div className="relative">
                <NativeSelectControl
                  className="w-full appearance-none px-4 py-3 rounded-lg border border-border bg-input-background pr-10 text-ink text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.titleDocumentStatus}
                  onChange={(event) => updateField("titleDocumentStatus", event.target.value)}
                >
                  <option value="missing">Missing</option>
                  <option value="submitted">Submitted</option>
                  <option value="in_review">In review</option>
                  <option value="verified">Verified</option>
                  <option value="signed">Signed mandate</option>
                </NativeSelectControl>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              </div>
            </div>
          </div>
          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={form.whatsappEnabled}
              onChange={(event) => updateField("whatsappEnabled", event.target.checked)}
            />
            <span className="text-sm">Enable WhatsApp follow-up for this listing</span>
          </label>
        </Card>

        <Card className="p-6 border-surface-border bg-surface shadow-card">
          <PropertyMediaPicker
            files={mediaFiles}
            onChange={setMediaFiles}
            disabled={submitting}
            helperText="Add photos now so the property is ready to publish as soon as the listing is created."
          />
        </Card>

        <ListingQualityPanel report={qualityReport} />

        <PropertyJurisdictionFields
          values={{
            country: form.country,
            region: form.region,
            city: form.city,
            subdivisionCode: form.subdivisionCode,
            currency: form.currency,
          }}
          orgJurisdiction={orgMarket.jurisdiction as any}
          orgSubdivision={orgMarket.subdivision}
          orgCurrency={orgMarket.currency}
          onChange={(patch) => {
            setForm((current) => ({
              ...current,
              ...(patch.country != null ? { country: patch.country } : {}),
              ...(patch.region != null ? { region: patch.region } : {}),
              ...(patch.city != null ? { city: patch.city } : {}),
              ...(patch.subdivisionCode != null ? { subdivisionCode: patch.subdivisionCode } : {}),
              ...(patch.currency != null ? { currency: patch.currency } : {}),
            }));
          }}
        />

        <ListingComplianceChecklist
          jurisdictionId={realEstateComplianceService.resolveFromProperty({
            country: form.country,
            region: form.region,
            city: form.city,
          })}
          listingType={form.listingType as ComplianceListingType}
          property={{
            country: form.country,
            region: form.region,
            city: form.city,
            subdivision_code: form.subdivisionCode || undefined,
          }}
          onValidated={setComplianceReady}
        />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={submitting || !complianceReady}>
            {submitting ? "Creating listing..." : "Create Listing"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => navigate(`${workspaceBasePath}/listings`)}
          >
            Cancel
          </Button>
        </div>
      </form>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
