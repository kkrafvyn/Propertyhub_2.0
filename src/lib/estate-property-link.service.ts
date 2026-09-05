import { supabase } from "./supabase";
import type { ManagedEstate } from "./estate-operations.service";

type LinkableProperty = {
  id: string;
  organization_id: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
};

const estateDb = supabase as any;

function buildEstateName(property: LinkableProperty) {
  const parts = [property.address, property.city].filter(Boolean);
  if (parts.length) return parts.join(", ");
  return `Property ${property.id.slice(0, 8)}`;
}

function normalizeAddress(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

/**
 * Ensures a managed_estates row exists and is linked to the given property.
 * Creates a new estate when none is linked; reuses an unlinked estate with the same address.
 */
export async function ensureEstateForProperty(
  property: LinkableProperty,
): Promise<ManagedEstate | null> {
  if (!property.organization_id) return null;

  const { data: linked, error: linkedError } = await estateDb
    .from("managed_estates")
    .select("*")
    .eq("property_id", property.id)
    .maybeSingle();

  if (linkedError) throw linkedError;
  if (linked) return linked as ManagedEstate;

  const normalizedAddress = normalizeAddress(property.address);
  if (normalizedAddress) {
    const { data: candidates, error: candidateError } = await estateDb
      .from("managed_estates")
      .select("*")
      .eq("organization_id", property.organization_id)
      .is("property_id", null);

    if (candidateError) throw candidateError;

    const match = (candidates || []).find(
      (estate) => normalizeAddress((estate as { address?: string }).address) === normalizedAddress,
    ) as ManagedEstate | undefined;

    if (match) {
      const { data: updated, error: updateError } = await estateDb
        .from("managed_estates")
        .update({ property_id: property.id })
        .eq("id", match.id)
        .select("*")
        .single();

      if (updateError) throw updateError;
      return updated as ManagedEstate;
    }
  }

  const { data: created, error: createError } = await estateDb
    .from("managed_estates")
    .insert({
      organization_id: property.organization_id,
      property_id: property.id,
      name: buildEstateName(property),
      address: property.address?.trim() || null,
      city: property.city?.trim() || null,
      region: property.region?.trim() || null,
    })
    .select("*")
    .single();

  if (createError) throw createError;
  return created as ManagedEstate;
}

export async function ensureEstateForPropertyId(propertyId: string) {
  const { data: property, error } = await supabase
    .from("properties")
    .select("id, organization_id, address, city, region")
    .eq("id", propertyId)
    .single();

  if (error) throw error;
  if (!property?.organization_id) return null;

  return ensureEstateForProperty(property);
}
