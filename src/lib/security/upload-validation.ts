const BLOCKED_EXTENSIONS = new Set([
  "exe", "dll", "js", "html", "htm", "svg", "php", "sh", "bat", "cmd", "msi", "scr",
]);

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export function validateClientUpload(input: {
  file: File;
  maxBytes: number;
  allowPdf?: boolean;
}) {
  const extension = input.file.name.split(".").pop()?.toLowerCase() || "";
  if (!extension || BLOCKED_EXTENSIONS.has(extension)) {
    throw new Error("This file type is not allowed");
  }

  const allowed = input.allowPdf ? DOCUMENT_TYPES : IMAGE_TYPES;
  if (!allowed.has(input.file.type.toLowerCase())) {
    throw new Error("Unsupported file format");
  }

  if (input.file.size <= 0 || input.file.size > input.maxBytes) {
    throw new Error(`File must be smaller than ${Math.round(input.maxBytes / 1024 / 1024)}MB`);
  }
}

export function sanitizeWhitelabelCss(css: string) {
  return css
    .replace(/<\/style/gi, "")
    .replace(/<script/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/@import/gi, "");
}
