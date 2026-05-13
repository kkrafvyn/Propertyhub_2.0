const FALLBACK_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80";

type PropertyMediaLike = {
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
