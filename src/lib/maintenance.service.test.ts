import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
const { upload, remove, rpc } = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn(), rpc: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { storage: { from: () => ({ upload, remove }) }, rpc } }));
vi.mock('./notification.service', () => ({ notificationService: {} }));
import { maintenanceService } from './maintenance.service';
const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff]);
const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const file = (content = 'photo', type = 'image/jpeg', name = 'photo.jpg') => {
  const payload =
    type === 'image/png' ? new Uint8Array([...pngHeader, ...new TextEncoder().encode(content)]) :
    type === 'application/pdf' ? new Uint8Array([...pdfHeader, ...new TextEncoder().encode(content)]) :
    new Uint8Array([...jpegHeader, ...new TextEncoder().encode(content)]);
  return {
    name,
    size: payload.byteLength,
    type,
    arrayBuffer: async () => payload.buffer,
    slice: (start?: number, end?: number) => {
      const view = payload.slice(start ?? 0, end ?? payload.length);
      return new Blob([view], { type });
    },
  } as File;
};

const input = (files = [file()]) => ({
  organizationId: 'organization',
  requestId: 'request',
  files,
});

describe('maintenance photo upload recovery', () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubGlobal('crypto', webcrypto);
    upload.mockResolvedValue({ error: null }); remove.mockResolvedValue({ error: null });
    rpc.mockResolvedValue({ data: { id: 'request', photo_urls: ['saved'] }, error: null });
  });
  it('hashes content and reuses the same path after a duplicate-file response', async () => {
    await maintenanceService.uploadRequestPhotos(input());
    const firstPath = upload.mock.calls[0][0];
    expect(firstPath).toMatch(/^organization\/request\/[a-f0-9]{64}\.jpg$/);
    expect(upload.mock.calls[0][2]).toEqual({ contentType: 'image/jpeg', upsert: false });
    upload.mockResolvedValue({ error: { statusCode: '409' } });
    await maintenanceService.uploadRequestPhotos(input());
    expect(upload.mock.calls[1][0]).toBe(firstPath);
    expect(rpc).toHaveBeenLastCalledWith('append_maintenance_photos', { p_request_id: 'request', p_paths: [firstPath] });
    expect(remove).not.toHaveBeenCalled();
  });
  it('cleans newly uploaded files when a later upload fails', async () => {
    upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('Network interrupted') });
    await expect(maintenanceService.uploadRequestPhotos(input([file('one'), file('two')]))).rejects.toThrow('Network interrupted');
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('never cleans previously existing files after attachment failure', async () => {
    upload.mockResolvedValueOnce({ error: { statusCode: '409' } }).mockResolvedValueOnce({ error: null });
    rpc.mockResolvedValue({ error: new Error('Attachment failed') });
    await expect(maintenanceService.uploadRequestPhotos(input([file('old'), file('new')]))).rejects.toThrow('Attachment failed');
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[1][0]]);
  });
  it('surfaces cleanup failure and retries the same files without reuploading duplicates', async () => {
    rpc.mockResolvedValueOnce({ error: new Error('Attachment failed') });
    remove.mockResolvedValueOnce({ error: new Error('Cleanup unavailable') });
    await expect(maintenanceService.uploadRequestPhotos(input())).rejects.toThrow('temporary files could not be removed');
    upload.mockResolvedValue({ error: { name: 'Duplicate', statusCode: '400' } });
    await expect(maintenanceService.uploadRequestPhotos(input())).resolves.toEqual({ id: 'request', photo_urls: ['saved'] });
    expect(upload.mock.calls[0][0]).toBe(upload.mock.calls[1][0]);
  });
  it('leaves protected linked files intact when the successful append response was lost', async () => {
    rpc.mockRejectedValueOnce(new Error('Response lost'));
    remove.mockResolvedValue({ data: [], error: null });
    await expect(maintenanceService.uploadRequestPhotos(input())).rejects.toThrow('Response lost');
    upload.mockResolvedValue({ error: { statusCode: '409' } });
    await expect(maintenanceService.uploadRequestPhotos(input())).resolves.toBeTruthy();
    expect(upload.mock.calls[0][0]).toBe(upload.mock.calls[1][0]);
  });
  it('validates every file and batch size before performing any upload', async () => {
    await expect(maintenanceService.uploadRequestPhotos(input([file(), file('bad', 'text/html')]))).rejects.toThrow('Unsupported file format');
    await expect(maintenanceService.uploadRequestPhotos(input(Array.from({ length: 11 }, () => file())))).rejects.toThrow('at most ten');
    expect(upload).not.toHaveBeenCalled();
  });
});
