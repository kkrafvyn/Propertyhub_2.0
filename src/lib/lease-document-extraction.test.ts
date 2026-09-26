import { describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { extractLeaseDocument, LEASE_DOCUMENT_LIMITS } from './lease-document-extraction';
import { aiLeaseAnalyzerService } from './ai-lease-analyzer.service';

function file(text: string, name = 'lease.txt') {
  const bytes = new TextEncoder().encode(text);
  return {name, size:bytes.length, arrayBuffer:async()=>bytes.buffer} as File;
}
vi.stubGlobal('crypto', webcrypto);
describe('lease document extraction', () => {
  it('uses each actual document and retains distinct source fingerprints', async () => {
    const first=await extractLeaseDocument(file('Agreement for Alice and Bob at property One.'));
    const second=await extractLeaseDocument(file('Agreement for Clara and Dave at property Two.'));
    expect(first.extractedText).toContain('Alice'); expect(second.extractedText).toContain('Clara');
    expect(first.source.sha256).not.toBe(second.source.sha256);
    expect(first.source.method).toBe('plain_text');
    expect(first.source.confidence).toBeGreaterThan(0);
    expect(first.source.confidence).toBeLessThanOrEqual(1);
  });
  it('fails on unreadable, empty and disguised PDF uploads', async () => {
    await expect(extractLeaseDocument(file('\0\0binary image data cannot be extracted'))).rejects.toThrow('unreadable');
    await expect(extractLeaseDocument(file(''))).rejects.toThrow('empty');
    await expect(extractLeaseDocument(file('This is actually plain text, not a PDF','lease.pdf'))).rejects.toThrow('not a readable PDF');
  });
  it('rejects unsupported types and oversized files before reading', async () => {
    await expect(extractLeaseDocument(file('Some legal agreement contents go here.','lease.docx'))).rejects.toThrow('Supported files');
    const oversized={...file('contents'),size:LEASE_DOCUMENT_LIMITS.maxBytes+1,arrayBuffer:vi.fn()} as unknown as File;
    await expect(extractLeaseDocument(oversized)).rejects.toThrow('10 MB');
    expect(oversized.arrayBuffer).not.toHaveBeenCalled();
  });
  it('preserves source parties and amounts instead of replacing the lease with a sample', () => {
    const text='Agreement between Nadia and Felix for Apartment X. The tenant pays 24 months advance rent of GHS 12345.';
    const result=aiLeaseAnalyzerService.analyzeLease(text);
    expect(result.originalText).toBe(text); expect(result.redlinedText).toBe(text);
    expect(result.rules[0].detectedText).toContain('24 months');
  });
});
