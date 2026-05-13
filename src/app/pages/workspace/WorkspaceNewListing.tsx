import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PropertyMediaPicker } from "../../components/PropertyMediaPicker";
import type { Database } from "../../../lib/database.types";
import { listingService } from "../../../lib/listing.service";
import { propertyMediaService } from "../../../lib/property-media.service";
import { propertyService } from "../../../lib/property.service";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];
type PropertyCategory = Database["public"]["Tables"]["properties"]["Row"]["category"];
type ListingType = Database["public"]["Tables"]["listings"]["Row"]["listing_type"];
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

const LISTING_TYPES: ListingType[] = ["rental", "sale", "lease"];
const LISTING_STATUSES: ListingStatus[] = ["draft", "pending_review", "listed"];
const VISIBILITY_OPTIONS: ListingVisibility[] = ["public", "private", "hidden"];

export function WorkspaceNewListing({
  organization,
  workspaceBasePath,
  currentUserId,
}: WorkspaceNewListingProps) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    address: "",
    city: "",
    region: "",
    country: "Ghana",
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
  });

  const updateField = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.address || !form.city || !form.region || !form.price) {
      toast.error("Address, city, region, and price are required.");
      return;
    }

    try {
      setSubmitting(true);

      const property = await propertyService.createProperty({
        organization_id: organization.id,
        address: form.address,
        city: form.city,
        region: form.region,
        country: form.country,
        category: form.category,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        square_meters: form.squareMeters ? Number(form.squareMeters) : null,
        description: form.description || null,
        amenities: form.amenities
          ? form.amenities
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : null,
      });

      const listing = await listingService.createListing({
        property_id: property.id,
        organization_id: organization.id,
        listing_type: form.listingType,
        price: Number(form.price),
        currency: form.currency,
        status: form.status,
        visibility: form.visibility,
        featured: form.featured,
        published_at: form.status === "listed" ? new Date().toISOString() : null,
      });

      if (mediaFiles.length > 0) {
        try {
          await propertyMediaService.uploadPropertyMedia({
            organizationId: organization.id,
            propertyId: property.id,
            createdBy: currentUserId,
            files: mediaFiles,
            altText: form.address,
          });
        } catch (mediaError) {
          console.error("Failed to upload property media:", mediaError);
          toast.error("The listing was created, but one or more photos failed to upload.");
        }
      }

      toast.success("Listing created successfully.");
      navigate(`${workspaceBasePath}/listings`, {
        replace: true,
        state: { createdListingId: listing.id },
      });
    } catch (error) {
      console.error("Failed to create listing:", error);
      toast.error("We couldn't create the listing right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Create a New Listing</h1>
        <p className="text-muted-foreground mt-2">
          Add a property and publish it into {organization.name}&apos;s workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Property Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              placeholder="18 Independence Avenue"
              required
            />
            <Input
              label="City"
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              placeholder="Accra"
              required
            />
            <Input
              label="Region"
              value={form.region}
              onChange={(event) => updateField("region", event.target.value)}
              placeholder="Greater Accra"
              required
            />
            <Input
              label="Country"
              value={form.country}
              onChange={(event) => updateField("country", event.target.value)}
              placeholder="Ghana"
              required
            />
            <div>
              <label className="block mb-2 text-sm text-foreground">Category</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
              >
                {PROPERTY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
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

          <div className="mt-4">
            <label className="block mb-2 text-sm text-foreground">Description</label>
            <textarea
              className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground min-h-32"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Describe the property, neighborhood, and unique selling points."
            />
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

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Listing Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm text-foreground">Listing Type</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                value={form.listingType}
                onChange={(event) => updateField("listingType", event.target.value)}
              >
                {LISTING_TYPES.map((listingType) => (
                  <option key={listingType} value={listingType}>
                    {listingType.charAt(0).toUpperCase() + listingType.slice(1)}
                  </option>
                ))}
              </select>
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
              <select
                className="w-full px-4 py-3 rounded-lg border border-border bg-input-background"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
              >
                {LISTING_STATUSES.map((status) => (
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
                value={form.visibility}
                onChange={(event) => updateField("visibility", event.target.value)}
              >
                {VISIBILITY_OPTIONS.map((visibility) => (
                  <option key={visibility} value={visibility}>
                    {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
                  </option>
                ))}
              </select>
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

        <Card className="p-6">
          <PropertyMediaPicker
            files={mediaFiles}
            onChange={setMediaFiles}
            disabled={submitting}
            helperText="Add photos now so the property is ready to publish as soon as the listing is created."
          />
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={submitting}>
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
    </div>
  );
}
