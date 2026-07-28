import {
  getJurisdictionRules,
  getListingComplianceChecklist,
  getPaymentComplianceDisclosures,
  listSupportedJurisdictions,
  resolveJurisdiction,
  validateListingCompliance,
  type JurisdictionId,
  type ListingType,
} from "./real-estate-compliance";

export const realEstateComplianceService = {
  resolveJurisdiction,
  getJurisdictionRules,
  listSupportedJurisdictions,
  getListingComplianceChecklist,
  getPaymentComplianceDisclosures,
  validateListingCompliance,

  resolveFromProperty(property?: {
    country?: string | null;
    region?: string | null;
    city?: string | null;
  }) {
    return resolveJurisdiction(property);
  },

  resolveFromOrganization(organization?: {
    country?: string | null;
    region?: string | null;
  }) {
    return resolveJurisdiction(organization);
  },

  getLegalContext(jurisdictionId: JurisdictionId) {
    const rules = getJurisdictionRules(jurisdictionId);
    return {
      jurisdictionId,
      label: rules.label,
      dataProtectionLaw: rules.dataProtectionLaw,
      realEstateRegulator: rules.realEstateRegulator,
      governingLaw: rules.governingLaw,
    };
  },

  getPublishConfirmations(listingType: ListingType) {
    const ids = [
      "authority_confirmed",
      "disclosures_accurate",
      "agency_licensed",
      "fair_housing",
    ];

    if (listingType === "rental" || listingType === "lease") {
      ids.push("tenancy_terms");
    }

    if (listingType === "sale") {
      ids.push("title_disclosed");
    }

    if (listingType === "short_stay") {
      ids.push("short_stay_permits");
    }

    ids.push("kyc_ready");

    return ids.map((id) => ({ id }));
  },
};

export type { JurisdictionId, ListingType };
