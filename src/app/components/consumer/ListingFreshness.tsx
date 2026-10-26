import { readSessionDraft, writeSessionDraft, clearSessionDraft } from "../../../lib/session-draft";
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { getAvailabilityConfirmation } from '../../../lib/consumer-discovery';
import { supabase } from '../../../lib/supabase';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
export function ListingFreshness({ listing }: { listing: any }) {
  const { user } = useAuth(); const navigate = useNavigate();
  const [reporting, setReporting] = useState(false); const [note, setNote] = useState(() => { const value = readSessionDraft<string>(`report:${user?.id || 'guest'}:${listing.id}`); return typeof value === 'string' ? value : ''; }); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  const confirmed = getAvailabilityConfirmation(listing);
  const report = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) { navigate('/login', { state: { from: `/property/${listing.id}` } }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('fraud_reports').insert({ reporter_id: user.id, target_id: listing.id, target_type: 'listing', reason: 'unavailable_property', description: note.trim() || 'The property may no longer be available.', status: 'pending' });
      if (error) throw error;
      clearSessionDraft(`report:${user?.id || 'guest'}:${listing.id}`); setSent(true); setReporting(false); toast.success('Report sent for review. Listing availability is unchanged until reviewed.');
    } catch { toast.error('Could not send the report. Your note is still here; please retry.'); }
    finally { setBusy(false); }
  };
  return <section className="my-4 rounded-xl border border-surface-border p-4" aria-label="Listing freshness">
    <h2 className="text-base font-semibold">Availability</h2>
    <p className="mt-2 text-sm text-ink-secondary">{confirmed ? `Last confirmed by the listing team: ${new Date(confirmed).toLocaleString()}` : 'The listing team has not recorded an availability confirmation.'}</p>
    {confirmed && Date.now() - new Date(confirmed).getTime() > 30 * 24 * 60 * 60 * 1000 && <p className="mt-2 text-sm text-ink-secondary">This confirmation is over 30 days old. Ask the team for an update before arranging your visit.</p>}
    {listing.updated_at && <p className="mt-1 text-xs text-ink-muted">Listing updated {new Date(listing.updated_at).toLocaleDateString()}. An edit is not an availability confirmation.</p>}
    <Button variant="outline" className="mt-3" disabled={sent} onClick={() => setReporting(!reporting)}>{sent ? 'Report submitted' : 'Report unavailable home'}</Button>
    {reporting && <form onSubmit={report} className="mt-3 space-y-3"><label className="block text-sm">What did you find?<textarea maxLength={1000} value={note} onChange={(event) => { setNote(event.target.value); writeSessionDraft(`report:${user?.id || 'guest'}:${listing.id}`, event.target.value); }} className="mt-2 min-h-24 w-full rounded-lg border border-surface-border bg-surface p-3" /></label><Button disabled={busy} type="submit">{busy ? 'Sending…' : user ? 'Submit report' : 'Sign in to report'}</Button></form>}
  </section>;
}
