import { resolveJurisdiction, type JurisdictionId } from "./real-estate-compliance";
import { resolveSubdivisionCode } from "./country-rules/subdivision-resolver";
import { resolveGhanaRegionCode } from "./ghana-regions";
import type { PropertyLocationInput } from "./property-country-context.service";
import { validateLegalJurisdictionForTransactionalAction } from "./legal-jurisdiction-gate";

export type PropertyLocationValidationInput = PropertyLocationInput & {
  address?: string | null;
  ghana_post_gps?: string | null;
};

export type PropertyLocationValidation = {
  valid: boolean;
  errors: string[];
};

export function validatePropertyLocationForPublish(
  property: PropertyLocationValidationInput,
  options?: { requireSubdivision?: boolean }
): PropertyLocationValidation {
  const errors: string[] = [];
  const country = property.country?.trim() || "";
  const region = property.region?.trim() || "";
  const city = property.city?.trim() || "";
  const address = property.address?.trim() || "";

  if (!address) errors.push("Street address is required before publishing.");
  if (!city) errors.push("City is required before publishing.");
  if (!region) errors.push("Region / state is required before publishing.");

  const jurisdictionId: JurisdictionId = resolveJurisdiction({
    country,
    region,
    city,
  });

  const subdivision =
    property.subdivision_code?.trim().toUpperCase() ||
    resolveSubdivisionCode(jurisdictionId, region, city) ||
    (jurisdictionId === "GH" ? resolveGhanaRegionCode(region, city) : undefined);

  if (options?.requireSubdivision !== false && !subdivision) {
    errors.push("Select a valid region or subdivision for this property's jurisdiction.");
  }

  if (jurisdictionId === "GH") {
    const gps = (property as { ghana_post_gps?: string | null }).ghana_post_gps?.trim().toUpperCase();
    if (gps && !/^[A-Z]{2}-\d{3,4}-\d{3,4}$/.test(gps)) {
      errors.push("GhanaPostGPS must use format XX-000-0000.");
    }
  }

  const legalGate = validateLegalJurisdictionForTransactionalAction({
    country: property.country,
    region: property.region,
    city: property.city,
    action: "listing_publish",
  });
  if (!legalGate.allowed && legalGate.message) {
    errors.push(legalGate.message);
  }

  return { valid: errors.length === 0, errors };
}
