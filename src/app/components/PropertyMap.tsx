import { useEffect, useMemo } from "react";
import { divIcon, latLngBounds } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import {
  DEFAULT_GHANA_MAP_CENTER,
  type MapCoordinates,
  getPublicMapProviderConfig,
} from "../../lib/map-provider";
import { cn } from "./ui/utils";

export interface PropertyMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  subtitle?: string | null;
  caption?: string | null;
  badge?: string | null;
}

interface PropertyMapProps {
  markers: PropertyMapMarker[];
  selectedMarkerId?: string | null;
  onMarkerSelect?: (markerId: string) => void;
  fallbackCenter?: MapCoordinates;
  fallbackZoom?: number;
  className?: string;
  heightClassName?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPinLabel(marker: PropertyMapMarker) {
  const label = String(marker.badge || "Pin").trim();
  if (label.length <= 14) return label;
  return `${label.slice(0, 13)}...`;
}

function createPinIcon(marker: PropertyMapMarker, selected: boolean) {
  return divIcon({
    className: "baytmiftah-map-marker",
    html: `<div class="baytmiftah-map-pin${selected ? " is-selected" : ""}"><span class="baytmiftah-map-pin__badge">${escapeHtml(buildPinLabel(marker))}</span></div>`,
    iconSize: [76, 46],
    iconAnchor: [38, 42],
    popupAnchor: [0, -34],
  });
}

function MapViewportController({
  markers,
  selectedMarker,
  fallbackCenter,
  fallbackZoom,
}: {
  markers: PropertyMapMarker[];
  selectedMarker?: PropertyMapMarker | null;
  fallbackCenter: MapCoordinates;
  fallbackZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedMarker) {
      map.flyTo([selectedMarker.latitude, selectedMarker.longitude], Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 0.6,
      });
      return;
    }

    if (markers.length === 0) {
      map.setView([fallbackCenter.latitude, fallbackCenter.longitude], fallbackZoom, {
        animate: false,
      });
      return;
    }

    if (markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], 14, {
        animate: false,
      });
      return;
    }

    const bounds = latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude]));
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 13,
      animate: false,
    });
  }, [fallbackCenter.latitude, fallbackCenter.longitude, fallbackZoom, map, markers, selectedMarker]);

  return null;
}

export function PropertyMap({
  markers,
  selectedMarkerId,
  onMarkerSelect,
  fallbackCenter = DEFAULT_GHANA_MAP_CENTER,
  fallbackZoom = 11,
  className,
  heightClassName = "h-80",
  emptyStateTitle = "Verified coordinates are still being added",
  emptyStateDescription = "The live map is ready, but this search still needs listing pins with precise latitude and longitude.",
}: PropertyMapProps) {
  const providerConfig = useMemo(() => getPublicMapProviderConfig(), []);
  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === selectedMarkerId) || null,
    [markers, selectedMarkerId]
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-border bg-secondary/20",
        heightClassName,
        className
      )}
    >
      <MapContainer
        center={[fallbackCenter.latitude, fallbackCenter.longitude]}
        zoom={fallbackZoom}
        zoomControl={false}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer attribution={providerConfig.attribution} url={providerConfig.tileUrl} />
        <ZoomControl position="bottomright" />
        <MapViewportController
          markers={markers}
          selectedMarker={selectedMarker}
          fallbackCenter={fallbackCenter}
          fallbackZoom={fallbackZoom}
        />
        {markers.map((marker) => {
          const selected = selectedMarkerId === marker.id;

          return (
            <Marker
              key={marker.id}
              position={[marker.latitude, marker.longitude]}
              icon={createPinIcon(marker, selected)}
              title={marker.label}
              alt={marker.label}
              keyboard
              eventHandlers={{
                click: () => onMarkerSelect?.(marker.id),
              }}
            >
              <Popup autoPan className="baytmiftah-map-popup">
                <div className="space-y-1.5">
                  <p className="font-semibold text-foreground">{marker.label}</p>
                  {marker.subtitle ? (
                    <p className="text-sm text-muted-foreground">{marker.subtitle}</p>
                  ) : null}
                  {marker.caption ? (
                    <p className="text-xs text-muted-foreground">{marker.caption}</p>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
        Live tiles via {providerConfig.label}
      </div>

      {markers.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-[450] grid place-items-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),rgba(255,255,255,0.9))] px-6 text-center">
          <div className="max-w-sm rounded-3xl border border-white/70 bg-white/85 p-5 shadow-xl backdrop-blur">
            <p className="font-semibold text-foreground">{emptyStateTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground">{emptyStateDescription}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
