import { useEffect, useState } from "react";

export const LISTING_PHOTO_INTERVAL_MS = 3000;

export function getListingPhotos(listing: { photos?: string[]; image?: string }) {
  const fromArray = Array.isArray(listing?.photos) ? listing.photos.filter(Boolean) : [];
  if (fromArray.length) return fromArray;
  if (listing?.image) return [listing.image];
  return [];
}

export function useListingPhotoCarousel(photos: string[], intervalMs = LISTING_PHOTO_INTERVAL_MS, paused = false) {
  const [index, setIndex] = useState(0);
  const photoKey = photos.join("|");

  useEffect(() => {
    setIndex(0);
  }, [photoKey]);

  useEffect(() => {
    if (paused || photos.length <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % photos.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [photoKey, photos.length, intervalMs, paused]);

  return [index, setIndex] as const;
}
