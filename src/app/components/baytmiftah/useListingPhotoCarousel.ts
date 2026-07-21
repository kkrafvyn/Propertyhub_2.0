import { useEffect, useState } from "react";

export const LISTING_PHOTO_INTERVAL_MS = 3000;

export function getListingPhotos(listing: { photos?: string[]; image?: string }) {
  const fromArray = Array.isArray(listing?.photos) ? listing.photos.filter(Boolean) : [];
  if (fromArray.length) return fromArray;
  if (listing?.image) return [listing.image];
  return [];
}

export function useListingPhotoCarousel(photos: string[], intervalMs = LISTING_PHOTO_INTERVAL_MS) {
  const [index, setIndex] = useState(0);
  const photoKey = photos.join("|");

  useEffect(() => {
    setIndex(0);
  }, [photoKey]);

  useEffect(() => {
    if (photos.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % photos.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [photoKey, photos.length, intervalMs]);

  return [index, setIndex] as const;
}
