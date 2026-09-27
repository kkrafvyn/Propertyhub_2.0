import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc, getUser, upload, remove, createSignedUrl, storageFrom } = vi.hoisted(() => {
  const upload = vi.fn();
  const remove = vi.fn();
  const createSignedUrl = vi.fn();
  return { rpc: vi.fn(), getUser: vi.fn(), upload, remove, createSignedUrl, storageFrom: vi.fn(() => ({ upload, remove, createSignedUrl })) };
});
vi.mock('./supabase', () => ({ supabase: { rpc, auth: { getUser }, storage: { from: storageFrom } } }));
import { propertyListingClaimService as service } from './property-listing-claim.service';
const userId = '00000000-0000-0000-0000-000000000001';
const listingId = '00000000-0000-0000-0000-000000000002';
const claimId = '00000000-0000-0000-0000-000000000003';
const evidence = `${userId}/${listingId}/00000000-0000-0000-0000-000000000004.pdf`;
const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const file = () => new File([new Uint8Array([...pdfHeader, ...new TextEncoder().encode('evidence content')]).buffer], 'ownership.pdf', { type: 'application/pdf' });

describe('private claim evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.test/temporary-evidence' }, error: null });
    rpc.mockResolvedValue({ data: { id: claimId }, error: null });
  });
  it('rejects excess, oversized, empty and unsupported files before storage calls', async () => {
    await expect(service.uploadEvidence(listingId, Array.from({ length: 6 }, file))).rejects.toThrow('five');
    await expect(service.uploadEvidence(listingId, [new File([], 'empty.pdf', { type: 'application/pdf' })])).rejects.toThrow('smaller');
    const oversized = file();
    Object.defineProperty(oversized, 'size', { value: 10485761 });
    await expect(service.uploadEvidence(listingId, [oversized])).rejects.toThrow('smaller');
    await expect(service.uploadEvidence(listingId, [new File(['bad'], 'page.html', { type: 'text/html' })])).rejects.toThrow('not allowed');
    expect(upload).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });
  it('uses the authenticated owner and listing path, private bucket and no overwrite', async () => {
    const selected = file();
    const paths = await service.uploadEvidence(listingId, [selected]);
    expect(paths[0]).toMatch(new RegExp(`^${userId}/${listingId}/[a-f0-9-]+\\.pdf$`));
    expect(storageFrom).toHaveBeenCalledWith('claim-evidence');
    expect(upload).toHaveBeenCalledWith(paths[0], selected, { contentType: 'application/pdf', upsert: false });
  });
  it('requires authentication and leaves no uploads behind after a partial failure', async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(service.uploadEvidence(listingId, [file()])).rejects.toThrow('Sign in');
    expect(upload).not.toHaveBeenCalled();
    upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('Connection failed') });
    await expect(service.uploadEvidence(listingId, [file(), file()])).rejects.toThrow('Connection failed');
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
  });
  it('reports cleanup failure instead of silently leaving orphaned uploads', async () => {
    upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('Upload failed') });
    remove.mockResolvedValueOnce({ error: new Error('Cleanup failed') });
    await expect(service.uploadEvidence(listingId, [file(), file()])).rejects.toThrow('could not be cleaned up');
  });
  it('rejects arbitrary URLs and duplicate paths and requires notes for resubmission and needs-info', async () => {
    await expect(service.submitClaim({ listingId, evidenceStoragePaths: ['https://example.test/file.pdf'] })).rejects.toThrow('uploaded file paths');
    await expect(service.submitClaim({ listingId, evidenceStoragePaths: [evidence, evidence] })).rejects.toThrow('distinct');
    await expect(service.resubmitClaim(claimId, ' ', [evidence])).rejects.toThrow('response');
    await expect(service.reviewClaim({ claimId, status: 'needs_info' })).rejects.toThrow('response');
    expect(rpc).not.toHaveBeenCalled();
  });
  it('uses guarded RPCs, preserves submission errors and requests short-lived evidence links', async () => {
    await service.resubmitClaim(claimId, ' More evidence ', [evidence]);
    expect(rpc).toHaveBeenLastCalledWith('resubmit_property_listing_claim', { p_claim_id: claimId, p_note: 'More evidence', p_paths: [evidence] });
    rpc.mockResolvedValueOnce({ error: new Error('Claim review not authorized') });
    await expect(service.reviewClaim({ claimId, status: 'approved' })).rejects.toThrow('not authorized');
    await service.withdrawClaim(claimId);
    expect(rpc).toHaveBeenLastCalledWith('withdraw_property_listing_claim', { p_claim_id: claimId });
    await expect(service.evidenceUrl(evidence)).resolves.toBe('https://example.test/temporary-evidence');
    expect(createSignedUrl).toHaveBeenCalledWith(evidence, 60);
    createSignedUrl.mockResolvedValueOnce({ data: {}, error: null });
    await expect(service.evidenceUrl(evidence)).rejects.toThrow('unavailable');
  });
});
