import type { Database } from "./database.types";

export type ListingType = Database["public"]["Tables"]["listings"]["Row"]["listing_type"];

export const LISTING_TYPES: ListingType[] = ["rental", "sale", "lease", "short_stay"];

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  rental: "Rental",
  sale: "Sale",
  lease: "Lease",
  short_stay: "Short stay",
};

export function isListingType(value: string): value is ListingType {
  return (LISTING_TYPES as string[]).includes(value);
}
