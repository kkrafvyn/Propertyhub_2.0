import { describe, expect, it, vi } from 'vitest';
const upload = vi.hoisted(() => vi.fn());
const insert = vi.hoisted(() => vi.fn());
vi.mock('./supabase', () => ({ supabase: { storage: { from: () => ({ upload, createSignedUrl: async () => ({ data: { signedUrl: 'https://example.test/photo' }, error: null }), remove: vi.fn() }) }, from: () => ({ insert }) } }));
vi.mock('./security/upload-validation', () => ({ getSafeUploadExtension: () => 'png', validateClientUpload: vi.fn(), validateFileSignature: vi.fn() }));
import { propertyMediaService } from './property-media.service';
describe('partial photo upload recovery', () => {
  it('acknowledges only completed files so a retry does not duplicate them', async () => {
    vi.spyOn(propertyMediaService, 'getPropertyMedia').mockResolvedValue([]);
    upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('offline') });
    insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: 'media-1' }, error: null }) }) });
    const first = new File(['image'], 'first.png', { type: 'image/png' }); const second = new File(['image'], 'second.png', { type: 'image/png' }); const completed = vi.fn();
    await expect(propertyMediaService.uploadPropertyMedia({ organizationId: 'org', propertyId: 'property', createdBy: 'user', files: [first, second], onUploaded: completed })).rejects.toThrow('offline');
    expect(completed).toHaveBeenCalledTimes(1); expect(completed).toHaveBeenCalledWith(first);
    vi.restoreAllMocks();
  });
});
