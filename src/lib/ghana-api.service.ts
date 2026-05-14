export interface GhanaRegion {
  code: string;
  label: string;
}

export interface GhanaRouteCalculation {
  distance: number;
  duration: number;
  coordinates: Array<[number, number]>;
  instructions: string[];
}

interface GhanaRouteResponse {
  success?: boolean;
  data?: GhanaRouteCalculation;
}

interface GhanaRegionsResponse {
  value?: GhanaRegion[];
  Count?: number;
}

const GHANA_API_BASE_URL = "https://api.ghana-api.dev/api/v1";

export const FALLBACK_GHANA_REGIONS: GhanaRegion[] = [
  { code: "AR", label: "Ahafo Region" },
  { code: "ASR", label: "Ashanti Region" },
  { code: "BR", label: "Bono Region" },
  { code: "BER", label: "Bono East Region" },
  { code: "CR", label: "Central Region" },
  { code: "ER", label: "Eastern Region" },
  { code: "GAR", label: "Greater Accra Region" },
  { code: "NR", label: "Northern Region" },
  { code: "NER", label: "North East Region" },
  { code: "OR", label: "Oti Region" },
  { code: "SR", label: "Savannah Region" },
  { code: "UER", label: "Upper East Region" },
  { code: "UWR", label: "Upper West Region" },
  { code: "VR", label: "Volta Region" },
  { code: "WR", label: "Western Region" },
  { code: "WNR", label: "Western North Region" },
];

let regionsPromise: Promise<GhanaRegion[]> | null = null;

function normalizeCoordinate(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a valid coordinate.`);
  }
  return String(value);
}

export const ghanaApiService = {
  getRegionDisplayName(region: GhanaRegion) {
    return region.label.replace(/\s+Region$/i, "");
  },

  async getRegions() {
    if (!regionsPromise) {
      regionsPromise = fetch(`${GHANA_API_BASE_URL}/locations/regions`)
        .then(async (response) => {
          if (!response.ok) throw new Error("Unable to load Ghana regions.");
          const payload = (await response.json()) as GhanaRegionsResponse;
          return payload.value?.length ? payload.value : FALLBACK_GHANA_REGIONS;
        })
        .catch((error) => {
          console.warn("Falling back to bundled Ghana regions:", error);
          return FALLBACK_GHANA_REGIONS;
        });
    }

    return regionsPromise;
  },

  async calculateDrivingRoute(input: {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
  }) {
    const params = new URLSearchParams({
      start_lat: normalizeCoordinate(input.startLat, "startLat"),
      start_lng: normalizeCoordinate(input.startLng, "startLng"),
      end_lat: normalizeCoordinate(input.endLat, "endLat"),
      end_lng: normalizeCoordinate(input.endLng, "endLng"),
    });

    const response = await fetch(`${GHANA_API_BASE_URL}/transport/route-calculation?${params}`);
    if (!response.ok) throw new Error("Unable to calculate route.");

    const payload = (await response.json()) as GhanaRouteResponse;
    if (!payload.success || !payload.data) {
      throw new Error("Route calculation did not return a usable route.");
    }

    return payload.data;
  },

  formatDistance(meters: number) {
    if (!Number.isFinite(meters)) return "Unknown distance";
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  },

  formatDuration(seconds: number) {
    if (!Number.isFinite(seconds)) return "Unknown duration";
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
  },
};
