export type PublicMapProvider = "openstreetmap" | "maptiler";

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

export interface PublicMapProviderConfig {
  provider: PublicMapProvider;
  label: string;
  tileUrl: string;
  attribution: string;
}

export const DEFAULT_GHANA_MAP_CENTER: MapCoordinates = {
  latitude: 5.6037,
  longitude: -0.187,
};

function normalizeProvider(value?: string | null): PublicMapProvider {
  return String(value || "").trim().toLowerCase() === "maptiler" ? "maptiler" : "openstreetmap";
}

export function getPublicMapProviderConfig(): PublicMapProviderConfig {
  const provider = normalizeProvider(import.meta.env.VITE_MAP_PROVIDER);
  const mapTilerKey = String(import.meta.env.VITE_MAPTILER_KEY || "").trim();

  if (provider === "maptiler" && mapTilerKey) {
    return {
      provider,
      label: "MapTiler",
      tileUrl: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapTilerKey}`,
      attribution:
        '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
    };
  }

  return {
    provider: "openstreetmap",
    label: "OpenStreetMap",
    tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
  };
}

export function buildPublicMapUrl(input: {
  latitude?: number | null;
  longitude?: number | null;
  query?: string | null;
  zoom?: number;
}) {
  const zoom = Number.isFinite(input.zoom) ? Number(input.zoom) : 16;

  if (typeof input.latitude === "number" && typeof input.longitude === "number") {
    return `https://www.openstreetmap.org/?mlat=${input.latitude}&mlon=${input.longitude}#map=${zoom}/${input.latitude}/${input.longitude}`;
  }

  const query = encodeURIComponent(String(input.query || "Ghana").trim() || "Ghana");
  return `https://www.openstreetmap.org/search?query=${query}`;
}
