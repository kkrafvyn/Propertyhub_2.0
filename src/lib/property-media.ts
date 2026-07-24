const FALLBACK_PROPERTY_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'%3E%3Crect width='1200' height='800' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-family='sans-serif' font-size='32'%3ENo image available%3C/text%3E%3C/svg%3E";

type PropertyMediaLike = {
  id?: string;
  public_url?: string | null;
  alt_text?: string | null;
  sort_order?: number | null;
  is_primary?: boolean | null;
};

type PropertyLike = {
  media?: PropertyMediaLike[] | null;
  property_media?: PropertyMediaLike[] | null;
};

export function getFallbackPropertyImage() {
  return FALLBACK_PROPERTY_IMAGE;
}

export function getPropertyMediaItems(property?: PropertyLike | null) {
  const media = property?.media || property?.property_media || [];
  return [...media].sort((a, b) => {
    const primaryDelta = Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary));
    if (primaryDelta !== 0) return primaryDelta;

    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

export function getPropertyCoverImage(property?: PropertyLike | null) {
  return getPropertyMediaItems(property)[0]?.public_url || FALLBACK_PROPERTY_IMAGE;
}

export function getPropertyImageGallery(property?: PropertyLike | null) {
  const media = getPropertyMediaItems(property);
  if (media.length > 0) {
    return media.map((item) => item.public_url || FALLBACK_PROPERTY_IMAGE);
  }

  return [FALLBACK_PROPERTY_IMAGE];
}
