export type PdfExtractProgress = { message: string; page?: number; totalPages?: number };

export type PdfExtractOptions = {
  maxPages?: number;
  maxCharacters?: number;
  timeoutMs?: number;
  /** When true, fail if any page lacks readable text (lease analyzer). */
  strictPages?: boolean;
};

const DEFAULTS: Required<PdfExtractOptions> = {
  maxPages: 100,
  maxCharacters: 500_000,
  timeoutMs: 30_000,
  strictPages: false,
};

export class PdfTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfTextError";
  }
}

export async function extractPdfPlainText(
  bytes: ArrayBuffer,
  onProgress: (progress: PdfExtractProgress) => void = () => {},
  options: PdfExtractOptions = {},
): Promise<{ text: string; pageCount: number }> {
  const opts = { ...DEFAULTS, ...options };
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new PdfTextError("This file is not a readable PDF.");
  }

  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
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
        if (document.numPages > opts.maxPages) {
          throw new PdfTextError(`This PDF exceeds the ${opts.maxPages}-page limit.`);
        }
        let extractedText = "";
        let readablePages = 0;
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
          onProgress({
            message: `Extracting page ${pageNumber} of ${document.numPages}…`,
            page: pageNumber,
            totalPages: document.numPages,
          });
          const page = await document.getPage(pageNumber);
          try {
            const content = await page.getTextContent();
            const pageText = content.items
              .map((item) => ("str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : ""))
              .join("")
              .trim();
            const letters = pageText.match(/\p{L}/gu)?.length || 0;
            if (letters < 10) {
              if (opts.strictPages) {
                throw new PdfTextError(
                  `Page ${pageNumber} has no readable text. Scanned pages need OCR or AI assist.`,
                );
              }
            } else {
              readablePages += 1;
              if (extractedText) extractedText += "\n\n";
              extractedText += pageText;
              if (extractedText.length > opts.maxCharacters) {
                throw new PdfTextError("This PDF contains too much text for import.");
              }
            }
          } finally {
            page.cleanup();
          }
        }
        const normalized = extractedText.replace(/\r\n?/g, "\n").trim();
        if (!normalized.length && readablePages === 0) {
          throw new PdfTextError(
            "No selectable text found. This may be a scanned PDF — try AI-assisted import.",
          );
        }
        return { text: normalized, pageCount: document.numPages };
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new PdfTextError("PDF extraction timed out. Try a smaller file.")),
          opts.timeoutMs,
        );
      }),
    ]);
  } catch (error) {
    if (error instanceof PdfTextError) throw error;
    if (error instanceof Error && error.name === "PasswordException") {
      throw new PdfTextError("This PDF is password protected. Upload an unlocked copy.");
    }
    throw new PdfTextError("The PDF could not be read. Export with selectable text or use Excel.");
  } finally {
    clearTimeout(timeout!);
    await task.destroy();
  }
}
