export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface MappableProperty {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getAddressQuery(property?: MappableProperty | null) {
  return [property?.address, property?.city, property?.region].filter(Boolean).join(", ");
}

export const mobileLocationService = {
  getCurrentPosition(): Promise<GeoCoordinates> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("Location is not available on this device."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => reject(new Error("We could not get your current location.")),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  },

  distanceKm(from: GeoCoordinates, to?: MappableProperty | null) {
    if (to?.latitude == null || to.longitude == null) return null;

    const earthRadiusKm = 6371;
    const deltaLat = toRadians(to.latitude - from.latitude);
    const deltaLng = toRadians(to.longitude - from.longitude);
    const lat1 = toRadians(from.latitude);
    const lat2 = toRadians(to.latitude);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.sin(deltaLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  formatDistance(distanceKm?: number | null) {
    if (distanceKm == null) return null;
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
    return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km away`;
  },

  getMapsUrl(property?: MappableProperty | null, origin?: GeoCoordinates | null) {
    if (property?.latitude != null && property.longitude != null) {
      const destination = `${property.latitude},${property.longitude}`;
      const originParam = origin ? `&origin=${origin.latitude},${origin.longitude}` : "";
      return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destination}&travelmode=driving`;
    }

    const query = encodeURIComponent(getAddressQuery(property) || "Ghana");
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  },

  sortListingsByDistance<TListing extends { property?: MappableProperty | null }>(
    listings: TListing[],
    origin: GeoCoordinates | null
  ) {
    if (!origin) return listings;

    return [...listings].sort((a, b) => {
      const distanceA = this.distanceKm(origin, a.property);
      const distanceB = this.distanceKm(origin, b.property);

      if (distanceA == null && distanceB == null) return 0;
      if (distanceA == null) return 1;
      if (distanceB == null) return -1;
      return distanceA - distanceB;
    });
  },
};
