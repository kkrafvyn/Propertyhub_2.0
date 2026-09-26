/** Local text extraction. Files never leave the browser and failures never use sample text. */
export const LEASE_DOCUMENT_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  maxPages: 100,
  maxCharacters: 500_000,
  timeoutMs: 30_000,
} as const;

export const LEASE_DOCUMENT_ACCEPT = '.pdf,.txt,.md';

export interface LeaseSourcePage {
  page: number;
  start: number;
  end: number;
}

export interface ExtractedLeaseDocument {
  title: string;
  extractedText: string;
  source: {
    fileName: string;
    sizeBytes: number;
    mediaType: string;
    sha256: string;
    method: 'pdf_text' | 'plain_text';
    confidence: number;
    extractedAt: string;
    pages: LeaseSourcePage[];
  };
}

export type ExtractionProgress = { message: string; page?: number; totalPages?: number };

export class LeaseExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeaseExtractionError';
  }
}

function readableText(text: string): string {
  // Preserve extracted content for source references; normalization is limited to line endings.
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  if (normalized.length > LEASE_DOCUMENT_LIMITS.maxCharacters) {
    throw new LeaseExtractionError('This document contains too much text. Use a document with at most 500,000 characters.');
  }
  if (/[\u0000-\u0008\u000b\u000e-\u001f]/.test(normalized) || normalized.includes('\ufffd')) {
    throw new LeaseExtractionError('The document contains unreadable text. Export it as UTF-8 text or a PDF with selectable text.');
  }
  if (normalized.length < 20 || (normalized.match(/\p{L}/gu)?.length || 0) < 10) {
    throw new LeaseExtractionError('There is not enough readable text to analyze. Use a PDF with selectable text, or paste the agreement text. Scanned documents need OCR first.');
  }
  return normalized;
}

export async function extractLeaseDocument(
  file: File,
  onProgress: (progress: ExtractionProgress) => void = () => {},
): Promise<ExtractedLeaseDocument> {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new LeaseExtractionError('Select the actual lease file to extract its content.');
  }
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['pdf', 'txt', 'md'].includes(extension || '')) {
    throw new LeaseExtractionError('Supported files are PDF with selectable text, TXT and Markdown. Export Word files to PDF; run OCR on scanned documents first.');
  }
  if (!file.size) throw new LeaseExtractionError('This file is empty. Select a document containing the agreement.');
  if (file.size > LEASE_DOCUMENT_LIMITS.maxBytes) {
    throw new LeaseExtractionError('This file exceeds the 10 MB limit. Upload a smaller document.');
  }

  onProgress({ message: 'Reading document…' });
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    throw new LeaseExtractionError('The file could not be read. Select it again or export a new copy.');
  }
  // Hash before passing data to PDF.js, which transfers the buffer to its worker.
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, '0')).join('');
  let extractedText: string;
  let pages: LeaseSourcePage[] = [];

  if (extension === 'pdf') {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') {
      throw new LeaseExtractionError('This file is not a readable PDF. Export a new PDF or upload the agreement as text.');
    }
    const result = await extractPdf(bytes, onProgress);
    extractedText = result.extractedText;
    pages = result.pages;
  } else {
    try {
      const prefix = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
      const encoding = prefix[0] === 0xff && prefix[1] === 0xfe ? 'utf-16le'
        : prefix[0] === 0xfe && prefix[1] === 0xff ? 'utf-16be' : 'utf-8';
      extractedText = readableText(new TextDecoder(encoding, { fatal: true }).decode(bytes));
    } catch (error) {
      if (error instanceof LeaseExtractionError) throw error;
      throw new LeaseExtractionError('The text encoding could not be read. Save the document as UTF-8 TXT and try again.');
    }
  }

  onProgress({ message: 'Text extracted. Checking clauses…' });
  return {
    title: file.name.replace(/\.[^.]+$/, ''),
    extractedText,
    source: {
      fileName: file.name,
      sizeBytes: file.size,
      mediaType: extension === 'pdf' ? 'application/pdf' : 'text/plain',
      sha256,
      method: extension === 'pdf' ? 'pdf_text' : 'plain_text',
      confidence: extractionConfidence(extractedText, pages.length),
      extractedAt: new Date().toISOString(),
      pages,
    },
  };
}

function extractionConfidence(text: string, pageCount: number): number {
  const letters = text.match(/\p{L}/gu)?.length || 0;
  const words = text.split(/\s+/).filter(Boolean).length;
  const pageFactor = pageCount > 0 ? Math.min(1, pageCount / 2) : 1;
  return Number(Math.min(1, 0.55 + Math.min(0.25, letters / 4000) + Math.min(0.15, words / 2000) + pageFactor * 0.05).toFixed(2));
}

async function extractPdf(bytes: ArrayBuffer, onProgress: (progress: ExtractionProgress) => void) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: false,
    disableFontFace: true,
    stopAtErrors: true,
    useWorkerFetch: false,
  });
  let timeout: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      (async () => {
        const document = await task.promise;
        if (document.numPages > LEASE_DOCUMENT_LIMITS.maxPages) {
          throw new LeaseExtractionError('This PDF exceeds the 100-page limit. Split it into smaller documents.');
        }
        let extractedText = '';
        const pages: LeaseSourcePage[] = [];
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
          onProgress({ message: `Extracting page ${pageNumber} of ${document.numPages}…`, page: pageNumber, totalPages: document.numPages });
          const page = await document.getPage(pageNumber);
          try {
            const content = await page.getTextContent();
            const pageText = content.items.map((item) => 'str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '').join('').trim();
            // Reject incomplete extraction, including mixed scanned/text PDFs, rather than omit pages silently.
            if ((pageText.match(/\p{L}/gu)?.length || 0) < 10) {
              throw new LeaseExtractionError(`Page ${pageNumber} has no readable agreement text. Scanned or image-only pages need OCR first; remove blank pages or upload a fully searchable PDF.`);
            }
            if (extractedText) extractedText += '\n\n';
            const start = extractedText.length;
            extractedText += pageText;
            if (extractedText.length > LEASE_DOCUMENT_LIMITS.maxCharacters) {
              throw new LeaseExtractionError('This PDF contains too much text. Use a document with at most 500,000 characters.');
            }
            pages.push({ page: pageNumber, start, end: extractedText.length });
          } finally {
            page.cleanup();
          }
        }
        return { extractedText: readableText(extractedText), pages };
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new LeaseExtractionError('PDF extraction timed out. Try a smaller PDF or export the agreement as TXT.')), LEASE_DOCUMENT_LIMITS.timeoutMs);
      }),
    ]);
  } catch (error) {
    if (error instanceof LeaseExtractionError) throw error;
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new LeaseExtractionError('This PDF is password protected. Upload an unlocked copy.');
    }
    throw new LeaseExtractionError('The PDF could not be extracted completely. Export a new PDF with selectable text or upload a TXT file.');
  } finally {
    clearTimeout(timeout);
    await task.destroy();
  }
}
