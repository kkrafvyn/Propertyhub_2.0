import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { maintenanceService } from '../../../lib/maintenance.service';
import { validateClientUpload } from '../../../lib/security/upload-validation';
import { monitoring } from '../../../lib/monitoring';
import { mobileCaptureProps } from '../../../lib/deep-link';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

export function MaintenanceRequestForm({ userId, leases, onCreated }: {
  userId: string;
  leases: any[];
  onCreated: () => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [leaseId, setLeaseId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [pendingRequest, setPendingRequest] = useState<{ id: string; organization_id: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const submissionLock = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const activeLeases = useMemo(() => leases.filter(lease => lease.status === 'active'), [leases]);

  const submit = async (photos = files) => {
    if (submissionLock.current) return;
    const lease = activeLeases.find(entry => entry.id === leaseId) || activeLeases[0];
    if (!pendingRequest && !lease) { setError('You need an active lease before submitting maintenance.'); return; }
    if (!pendingRequest && (!title.trim() || !description.trim())) { setError('Add a title and description.'); return; }
    submissionLock.current = true;
    setSubmitting(true); setError(''); setProgress('');
    try {
      if (photos.length > 10) throw new Error('Upload at most ten photos at once');
      photos.forEach(file => validateClientUpload({ file, maxBytes: 10 * 1024 * 1024 }));
      const request = pendingRequest || await maintenanceService.createRequest({
        tenantUserId: userId, organizationId: lease.organization_id,
        leaseId: lease.id, listingId: lease.listing_id, title: title.trim(), description: description.trim(),
      });
      // Keep the saved identity even if upload or attachment fails. Retrying must
      // never create a second maintenance request or use a newly selected lease.
      setPendingRequest(request);
      if (photos.length) {
        await maintenanceService.uploadRequestPhotos({
          organizationId: request.organization_id, requestId: request.id, files: photos,
          onProgress: (done, total) => setProgress(`Uploaded ${done} of ${total} photos`),
        });
      }
      monitoring.trackWorkflowStep('maintenance', 'request_submitted');
      toast.success('Maintenance request submitted.');
      setPendingRequest(null); setFiles([]); setTitle(''); setDescription(''); setProgress('');
      if (fileInput.current) fileInput.current.value = '';
      // A refresh failure must not be presented as a failed submission.
      try { await onCreated(); }
      catch { toast.error('Request saved, but the list could not refresh. Reload to see it.'); }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not submit the request. Retry to continue.');
    } finally {
      submissionLock.current = false; setSubmitting(false);
    }
  };

  return <Card className="p-6 space-y-4">
    <h3 className="font-semibold">{pendingRequest ? 'Finish attaching photos' : 'New request'}</h3>
    {pendingRequest && <p role="status" className="text-sm">Request saved. Retry attaches photos to this request without creating another request.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {progress && <p role="status" className="text-xs">{progress}</p>}
    {activeLeases.length > 1 && <NativeSelectControl aria-label="Lease" className="w-full rounded-lg border border-border px-3 py-2"
      disabled={submitting || Boolean(pendingRequest)} value={leaseId || activeLeases[0]?.id || ''}
      onChange={event => setLeaseId(event.target.value)}>
      {activeLeases.map(lease => <option key={lease.id} value={lease.id}>{lease.listing?.property?.address || lease.id}</option>)}
    </NativeSelectControl>}
    <Input aria-label="Issue title" placeholder="Issue title" value={title} disabled={submitting || Boolean(pendingRequest)} onChange={event => setTitle(event.target.value)} />
    <Textarea aria-label="Describe the issue" placeholder="Describe the issue" className="w-full min-h-28 rounded-lg border border-border px-3 py-2"
      disabled={submitting || Boolean(pendingRequest)} value={description} onChange={event => setDescription(event.target.value)} />
    <label className="text-sm text-muted-foreground block">
      Photos (optional, up to ten)
      <input ref={fileInput} className="mt-2 block" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={submitting}
        onChange={event => setFiles(Array.from(event.target.files || []))} {...mobileCaptureProps()} />
    </label>
    <div className="flex gap-2">
      <Button onClick={() => void submit()} disabled={submitting || (!pendingRequest && activeLeases.length === 0)}>
        {submitting ? 'Submitting...' : pendingRequest ? 'Retry photos' : 'Submit request'}
      </Button>
      {pendingRequest && <Button variant="outline" disabled={submitting} onClick={() => void submit([])}>Finish without photos</Button>}
    </div>
  </Card>;
}
