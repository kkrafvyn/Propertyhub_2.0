import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router';
import { listingService } from '../../lib/listing.service';
import { publicShortlistIds } from '../../lib/consumer-discovery';
import { DesktopShell, ListingCard, mapListingToCard } from '../components/baytmiftah';
import { Button } from '../components/ui/Button';
export function SharedShortlist() {
  const { search } = useLocation(); const [items, setItems] = useState<any[]>([]); const [state, setState] = useState('loading'); const [attempt, setAttempt] = useState(0);
  useEffect(() => { let cancelled = false; setState('loading'); const ids = publicShortlistIds(search); listingService.getPublicShortlist(ids).then((rows) => { if (!cancelled) { setItems(ids.flatMap((id) => rows.filter((row) => row.id === id))); setState('ready'); } }).catch(() => { if (!cancelled) setState('error'); }); return () => { cancelled = true; }; }, [search, attempt]);
  return <DesktopShell><h1 className="mb-2 text-2xl font-semibold">Shared property shortlist</h1><p className="mb-6 text-sm text-ink-secondary">A public selection for comparing homes. Removed or private listings are omitted.</p>
    {state === 'loading' ? <p role="status">Loading properties…</p> : state === 'error' ? <div role="alert">Could not load this shortlist.<Button onClick={() => setAttempt(attempt + 1)}>Retry</Button></div> : !items.length ? <p>No public properties are available in this shortlist. <Link to="/search" className="underline">Browse properties</Link></p> : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((listing) => <ListingCard key={listing.id} listing={mapListingToCard(listing)} />)}</div>}
  </DesktopShell>;
}
