import { ConnectionStatus } from "./ConnectionStatus";
import { useCallback, useMemo, useState } from 'react';
import { MapView } from '../baytmiftah/MapView';
import { MapErrorBoundary } from '../baytmiftah/MapErrorBoundary';
import { mapListingToCard } from '../baytmiftah/listing-mappers';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/Button';
import { LocationSuggestions } from '../baytmiftah/LocationSuggestions';
import { openStreetMapService } from '../../../lib/openstreetmap.service';
import type { SearchBounds } from '../../../lib/consumer-discovery';
export function FullScreenPropertyMap({ listings, onSearchArea, onClose, loading, initialBounds }: { initialBounds?: SearchBounds; listings: any[]; onSearchArea: (bounds: SearchBounds) => void; onClose: () => void; loading: boolean }) {
  const [bounds, setBounds] = useState<SearchBounds>(); const [query, setQuery] = useState(''); const [error, setError] = useState(''); const [finding, setFinding] = useState(false); const [center, setCenter] = useState<[number, number]>(() => {
    if (!initialBounds) return [5.6037, -0.187];
    const span = initialBounds.east >= initialBounds.west ? initialBounds.east - initialBounds.west : 360 + initialBounds.east - initialBounds.west;
    return [(initialBounds.north + initialBounds.south) / 2, ((initialBounds.west + span / 2 + 180) % 360 + 360) % 360 - 180];
  });
  const [zoom, setZoom] = useState(() => {
    if (!initialBounds) return 13;
    const longitudeSpan = initialBounds.east >= initialBounds.west ? initialBounds.east - initialBounds.west : 360 + initialBounds.east - initialBounds.west;
    const span = Math.max(initialBounds.north - initialBounds.south, longitudeSpan, 0.001);
    return Math.max(3, Math.min(16, Math.floor(Math.log2(360 / span))));
  });
  const changed = useCallback((value: SearchBounds) => setBounds(value), []);
  const pins = useMemo(() => listings.filter((listing) => listing.property?.latitude != null && listing.property?.longitude != null && Number.isFinite(Number(listing.property.latitude)) && Number.isFinite(Number(listing.property.longitude)) && Math.abs(Number(listing.property.latitude)) <= 90 && Math.abs(Number(listing.property.longitude)) <= 180).map((listing) => ({ ...mapListingToCard(listing), lat: Number(listing.property.latitude), lng: Number(listing.property.longitude) })), [listings]);
  const findArea = async (event: React.FormEvent) => {
    event.preventDefault(); if (finding || !query.trim()) return; setFinding(true); setError('');
    try { const result = await openStreetMapService.geocodeAddress(query.trim(), '', ''); if (!result) throw new Error('No area found. Try a city or neighbourhood name.'); setZoom(13); setCenter([result.latitude, result.longitude]); }
    catch (error) { setError(error instanceof Error ? error.message : 'Area search failed. Please retry.'); }
    finally { setFinding(false); }
  };
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="!fixed !inset-0 !left-0 !top-0 !z-[80] flex !h-[100dvh] !max-h-none !w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 !rounded-none p-0 [&>button:last-child]:hidden">
    <header className="flex shrink-0 items-center justify-between border-b border-surface-border bg-surface p-4"><DialogTitle>Explore properties on the map</DialogTitle><Button variant="outline" onClick={onClose}>Back to list</Button></header>
    <ConnectionStatus />
    <form onSubmit={findArea} className="flex shrink-0 gap-2 bg-surface px-4 py-3"><LocationSuggestions id="map-area-suggestions" /><input list="map-area-suggestions" aria-label="Map neighbourhood or city" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Neighbourhood or city" className="min-h-11 min-w-0 flex-1 rounded-lg border border-surface-border bg-surface px-3 text-base" /><Button disabled={finding} type="submit">{finding ? 'Finding…' : 'Find area'}</Button></form>
    {error && <p role="alert" className="px-4 pb-2 text-sm">{error}</p>}
    <div className="relative min-h-0 flex-1"><MapErrorBoundary><MapView listings={pins} center={center} zoom={zoom} autoFit={false} pricePins onBoundsChange={changed} /></MapErrorBoundary><div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center"><Button className="pointer-events-auto shadow-lg" disabled={!bounds || loading} onClick={() => bounds && onSearchArea(bounds)}>{loading ? 'Searching…' : 'Search this area'}</Button></div></div>
    <p role="status" className="shrink-0 border-t border-surface-border bg-surface px-4 py-3 text-xs text-ink-secondary">{pins.length} mapped properties (up to 200 results). Properties without recorded coordinates are omitted. Pan or zoom, then search this area.</p>
  </DialogContent></Dialog>;
}
