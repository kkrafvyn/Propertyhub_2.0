import { useState } from 'react';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
export function ShareShortlist({ ids }: { ids: string[] }) {
  const [link, setLink] = useState('');
  const share = async () => {
    const params = new URLSearchParams({ ids: [...new Set(ids)].slice(0, 12).join(',') });
    const url = `https://baytmiftah.com/shortlist?${params}`;
    setLink(url);
    try { if (navigator.share) await navigator.share({ title: 'BaytMiftah property shortlist', text: 'Compare these properties with me.', url }); else { await navigator.clipboard.writeText(url); toast.success('Shortlist link copied.'); } }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) toast.info('Copy the link below to share your shortlist.'); }
  };
  if (!ids.length) return null;
  return <div className="mb-4 space-y-2"><Button variant="outline" onClick={share}>Share {Math.min(new Set(ids).size, 12)} saved properties</Button><p className="text-xs text-ink-secondary">Only public listing links are shared. Your name, notes and account details are not included. Up to 12 properties per link.</p>{link && <label className="block text-xs">Shortlist link<input readOnly onFocus={(event) => event.target.select()} value={link} className="mt-1 min-h-11 w-full rounded border border-surface-border bg-surface p-2 text-sm" /></label>}</div>;
}
