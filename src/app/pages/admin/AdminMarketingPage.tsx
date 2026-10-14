import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { AdminSectionGate } from './AdminSectionGate';
import { MarketingEditorialHome } from '../marketing/MarketingEditorialHome';
import { marketingContentService } from '../../../lib/marketing-content.service';
import { DEFAULT_MARKETING_DOCUMENT, MARKETING_IMAGE_IDS, validateMarketingDocument, type MarketingPageDocument } from '../../../lib/marketing-page-document';
import '../../components/marketing/marketing.css';
import '../../components/marketing/editorial/marketing-editorial.css';

const controlClass = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm';
function TextField({ label, value, onChange, maxLength, multiline = false }: { label: string; value: string; onChange: (value: string) => void; maxLength: number; multiline?: boolean }) {
  return <label className="block space-y-1"><span className="text-sm font-medium">{label}</span>{multiline ? <textarea className={controlClass} rows={3} maxLength={maxLength} value={value} onChange={e => onChange(e.target.value)} /> : <input className={controlClass} maxLength={maxLength} value={value} onChange={e => onChange(e.target.value)} />}</label>;
}
export function AdminMarketingPage() { return <AdminSectionGate section="marketing" label="Marketing page"><MarketingEditor /></AdminSectionGate>; }
export function MarketingEditor() {
  const [document, setDocument] = useState<MarketingPageDocument | null>(null);
  const [revision, setRevision] = useState(0);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const load = async () => {
    setBusy(true); setError('');
    try { const result = await marketingContentService.loadDraft(); setDocument(result.document); setRevision(result.revision); setSaved(JSON.stringify(result.document)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load the marketing draft.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const dirty = document && JSON.stringify(document) !== saved;
  const update = (fn: (next: MarketingPageDocument) => void) => { setDocument(current => { const next = structuredClone(current!); fn(next); return next; }); };
  const save = async () => {
    if (!document) return;
    setBusy(true); setError('');
    try { const result = await marketingContentService.saveDraft(document, revision); setDocument(result.document); setRevision(result.revision); setSaved(JSON.stringify(result.document)); toast.success('Draft saved. The public page has not changed.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to save draft. Reload if another admin has changed it.'); }
    finally { setBusy(false); }
  };
  const preview = () => {
    try { validateMarketingDocument(document); setError(''); setShowPreview(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Check the draft.'); }
  };
  const publish = async () => {
    setBusy(true); setError('');
    try { await marketingContentService.publish(revision); setConfirmPublish(false); toast.success('Marketing page published. Visitors will see the saved content when they load the homepage.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to publish. Reload if the draft has changed.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-semibold">Marketing page</h1><p className="text-muted-foreground mt-2">Update the public homepage, preview a private draft, then publish it. Product demonstrations, navigation, and signup links stay connected.</p></div>
    {error && <Card className="p-4"><p role="alert">{error}</p><Button variant="outline" onClick={() => void load()} disabled={busy} className="mt-2">Reload saved draft</Button></Card>}
    {!document ? <p role="status">{busy ? 'Loading draft…' : 'The editor could not load. Check the message above.'}</p> : <>
      <div className="flex flex-wrap gap-2"><Button onClick={() => void save()} disabled={busy}>Save draft</Button><Button variant="outline" onClick={preview} disabled={busy}>Preview draft</Button><Button onClick={() => setConfirmPublish(true)} disabled={busy || Boolean(dirty) || revision === 0}>Publish saved draft</Button><Button variant="outline" disabled={busy} onClick={() => { setDocument(structuredClone(DEFAULT_MARKETING_DOCUMENT)); setShowPreview(false); }}>Restore default content</Button></div>
      <p className="text-sm text-muted-foreground">Saved revision {revision}. {dirty ? 'Unsaved changes — save before publishing.' : 'No unsaved changes.'} Publishing and role changes require your existing admin MFA verification.</p>
      <fieldset disabled={busy} className="space-y-6 min-w-0">
        <Card className="p-6 space-y-4"><h2 className="text-xl font-semibold">Hero</h2>
          <TextField label="Eyebrow" value={document.hero.eyebrow} maxLength={100} onChange={v => update(d => {d.hero.eyebrow=v;})} />
          <TextField label="Headline — first line" value={document.hero.title} maxLength={100} onChange={v => update(d => {d.hero.title=v;})} />
          <TextField label="Headline — second line" value={document.hero.secondLine} maxLength={100} onChange={v => update(d => {d.hero.secondLine=v;})} />
          <TextField label="Supporting copy" value={document.hero.description} maxLength={500} multiline onChange={v => update(d => {d.hero.description=v;})} />
          <div><p className="font-medium">Background photographs</p><p className="text-sm text-muted-foreground mb-3">Choose four or five licensed stock photos. Reorder selected photos with the controls below.</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{MARKETING_IMAGE_IDS.map(id => <label key={id} className="border rounded-lg p-2 space-y-2"><img src={`/marketing/hero/${id}-1280.webp`} alt="" className="w-full aspect-video object-cover rounded" /><span className="flex gap-2 items-center"><input type="checkbox" checked={document.hero.images.includes(id)} onChange={e => update(d => { d.hero.images=e.target.checked ? [...d.hero.images,id] : d.hero.images.filter(item => item!==id); })} />{id}</span></label>)}</div>
            <ol className="mt-3 space-y-2">{document.hero.images.map((id,index) => <li key={id} className="flex flex-wrap items-center gap-2"><span className="mr-auto">{index+1}. {id}</span>{[-1,1].map(direction => <Button key={direction} variant="outline" disabled={index+direction<0 || index+direction>=document.hero.images.length} aria-label={`Move ${id} ${direction<0?'earlier':'later'}`} onClick={() => update(d => { [d.hero.images[index],d.hero.images[index+direction]]=[d.hero.images[index+direction],d.hero.images[index]]; })}>{direction<0?'Move up':'Move down'}</Button>)}</li>)}</ol>
          </div>
        </Card>
        <Card className="p-6 space-y-4"><h2 className="text-xl font-semibold">Search and sharing</h2><TextField label="Page title" value={document.seo.title} maxLength={150} onChange={v => update(d => {d.seo.title=v;})} /><TextField label="Page description" value={document.seo.description} maxLength={500} multiline onChange={v => update(d => {d.seo.description=v;})} /></Card>
        <Card className="p-6 space-y-4"><h2 className="text-xl font-semibold">FAQs</h2>{document.faq.map((item,index) => <div key={index} className="space-y-3 border rounded-lg p-4"><TextField label={`Question ${index+1}`} value={item.q} maxLength={200} onChange={v => update(d => {d.faq[index].q=v;})} /><TextField label={`Answer ${index+1}`} value={item.a} maxLength={1500} multiline onChange={v => update(d => {d.faq[index].a=v;})} /><Button variant="outline" disabled={document.faq.length===1} onClick={() => update(d => {d.faq.splice(index,1);})}>Remove FAQ {index+1}</Button></div>)}<Button variant="outline" disabled={document.faq.length>=12} onClick={() => update(d => {d.faq.push({q:'New question',a:'Add the answer.'});})}>Add FAQ</Button></Card>
        <Card className="p-6 space-y-4"><h2 className="text-xl font-semibold">Additional content sections</h2>{document.sections.map((section,index) => <div key={index} className="border rounded-lg p-4 space-y-3"><TextField label={`Section ${index+1} heading`} value={section.title} maxLength={150} onChange={v => update(d => {d.sections[index].title=v;})} /><TextField label={`Section ${index+1} text`} value={section.body} maxLength={2000} multiline onChange={v => update(d => {d.sections[index].body=v;})} /><Button variant="outline" onClick={() => update(d => {d.sections.splice(index,1);})}>Remove section {index+1}</Button></div>)}<Button variant="outline" disabled={document.sections.length>=8} onClick={() => update(d => {d.sections.push({title:'New section',body:'Add your content.'});})}>Add content section</Button></Card>
        <Card className="p-6 space-y-4"><h2 className="text-xl font-semibold">Final conversion section</h2><TextField label="Final heading" value={document.finalCta.title} maxLength={150} onChange={v => update(d => {d.finalCta.title=v;})} /><TextField label="Final supporting copy" value={document.finalCta.description} maxLength={500} multiline onChange={v => update(d => {d.finalCta.description=v;})} /></Card>
      </fieldset>
      {showPreview && <Card className="p-3"><h2 className="text-xl font-semibold p-3">Private preview — unpublished changes</h2><div className="marketing-page marketing-page--editorial overflow-auto max-h-[75vh] rounded-lg"><MarketingEditorialHome key={JSON.stringify(document.hero.images)} document={document} preview /></div></Card>}
    </>}
    <Dialog open={confirmPublish} onOpenChange={setConfirmPublish}><DialogContent><DialogHeader><DialogTitle>Publish marketing page?</DialogTitle><DialogDescription>Saved revision {revision} will replace the public homepage content. Review the preview before publishing.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirmPublish(false)}>Cancel</Button><Button disabled={busy || Boolean(dirty)} onClick={() => void publish()}>Publish now</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
