import type { SearchBounds } from "../../../lib/consumer-discovery";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router";
import { LocateFixed } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { MapListing } from "./listing-mappers";

export type { MapListing };

const pin = L.divIcon({
  className: "",
  html: `<div style="background:#0F2922;color:#fff;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:10px;">●</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const userDot = L.divIcon({
  className: "",
  html: `<div style="background:#2563eb;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,0.35);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface MapViewProps {
  listings: MapListing[];
  center?: [number, number];
  zoom?: number;
  autoFit?: boolean;
  pricePins?: boolean;
  onBoundsChange?: (bounds: SearchBounds) => void;
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
}

function MapViewport({ listings, userLocation }: Pick<MapViewProps, "listings" | "userLocation">) {
  const map = useMap();

  useEffect(() => {
    const points = listings
      .filter((listing) => listing.lat != null && listing.lng != null)
      .map((listing) => [Number(listing.lat), Number(listing.lng)] as [number, number]);

    if (userLocation?.lat != null && userLocation.lng != null) {
      points.push([userLocation.lat, userLocation.lng]);
    }

    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 13));
      return;
    }

    map.fitBounds(points, { padding: [32, 32], maxZoom: 15 });
  }, [listings, map, userLocation]);

  return null;
}

function BoundsListener({ onChange }: { onChange?: (bounds: SearchBounds) => void }) {
  const map = useMap();
  useEffect(() => {
    const publish = () => { const bounds = map.getBounds(); const wrap = (value: number) => ((value + 180) % 360 + 360) % 360 - 180; const world = bounds.getEast() - bounds.getWest() >= 360; onChange?.({ north: Math.min(90, bounds.getNorth()), south: Math.max(-90, bounds.getSouth()), east: world ? 180 : wrap(bounds.getEast()), west: world ? -180 : wrap(bounds.getWest()) }); };
    map.on('moveend', publish); publish();
    return () => { map.off('moveend', publish); };
  }, [map, onChange]);
  return null;
}
function pricePin(label: string) {
  const element = document.createElement('div');
  element.textContent = label;
  element.style.cssText = 'background:#123b2a;color:white;padding:6px 10px;border:2px solid white;border-radius:18px;white-space:nowrap;font-weight:700;box-shadow:0 2px 8px #0004';
  return L.divIcon({ className: '', html: element, iconSize: [110, 34], iconAnchor: [55, 17] });
}
export function MapView({
  listings,
  center = [5.6037, -0.187],
  zoom = 12,
  userLocation = null,
  autoFit = true,
  pricePins = false,
  onBoundsChange,
}: MapViewProps) {
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [tileRetry, setTileRetry] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(userLocation);

  useEffect(() => {
    setReady(true);
    return () => setReady(false);
  }, []);

  useEffect(() => {
    setCurrentLocation(userLocation);
  }, [userLocation]);

  const mappable = (listings ?? []).filter((l) => l.lat != null && l.lng != null);
  const mapCenter =
    currentLocation?.lat != null ? [Number(currentLocation.lat), Number(currentLocation.lng)] : center;
  const mapKey = `${Number(mapCenter[0]).toFixed(4)}-${Number(mapCenter[1]).toFixed(4)}-${zoom}`;

  const locateUser = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    });
  };

  if (!ready) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center bg-surface-subtle text-sm text-ink-secondary">
        Loading map…
      </div>
    );
  }

  return (
    <div className="h-full min-h-[280px] overflow-hidden rounded-xl border border-surface-border">
      <div className="relative h-full">
        <MapContainer
          key={mapKey}
          center={mapCenter as [number, number]}
          zoom={zoom}
          className="h-full w-full"
          scrollWheelZoom
        >
        {autoFit && <MapViewport listings={mappable} userLocation={currentLocation} />}
        <BoundsListener onChange={onBoundsChange} />
        <TileLayer
          key={tileRetry}
          eventHandlers={{ tileerror: () => setTileError(true), tileload: () => setTileError(false) }}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {currentLocation?.lat != null && (
          <>
            <Marker position={[currentLocation.lat, currentLocation.lng]} icon={userDot} />
            <Circle
              center={[currentLocation.lat, currentLocation.lng]}
              radius={Math.min(currentLocation.accuracy ?? 120, 400)}
              pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.12, weight: 1 }}
            />
          </>
        )}
        {mappable.map((listing) => (
          <Marker key={listing.id} position={[listing.lat!, listing.lng!]} icon={pricePins ? pricePin(listing.priceLabel) : pin}>
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-semibold text-ink">{listing.title}</p>
                {listing.distanceLabel && (
                  <p className="text-xs font-semibold text-mobile-forest">{listing.distanceLabel} away</p>
                )}
                <p className="text-sm text-ink-secondary">{listing.priceLabel}</p>
                <Link
                  to={`/property/${listing.id}`}
                  className="mt-2 inline-block text-sm font-semibold text-ink underline"
                >
                  View property
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
        </MapContainer>
        {tileError && <div role="alert" className="absolute inset-x-3 bottom-8 z-[1000] rounded-lg border border-surface-border bg-surface p-3 text-sm text-ink">Some map tiles could not load. Your search is retained.<button type="button" className="ml-2 min-h-11 underline" onClick={() => { setTileError(false); setTileRetry((value) => value + 1); }}>Retry map</button></div>}
        <button
          type="button"
          onClick={locateUser}
          className="absolute end-3 top-3 z-[1000] rounded-lg border border-surface-border bg-surface p-2 text-ink shadow-md transition hover:bg-surface-subtle"
          aria-label="Use my location"
          title="Use my location"
        >
          <LocateFixed className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
