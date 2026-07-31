const BLOCKED_EXTENSIONS = new Set([
  "exe", "dll", "js", "html", "htm", "svg", "php", "sh", "bat", "cmd", "msi", "scr",
]);

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_DOCUMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function validateUploadFile(input: {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  maxBytes: number;
  allowPdf?: boolean;
}) {
  const extension = input.fileName.split(".").pop()?.toLowerCase() || "";

  if (!extension || BLOCKED_EXTENSIONS.has(extension)) {
    throw new Error("File type is not allowed");
  }

  const allowed = input.allowPdf
    ? ALLOWED_DOCUMENT_TYPES
    : ALLOWED_IMAGE_TYPES;

  if (!allowed.has(input.contentType.toLowerCase())) {
    throw new Error("MIME type is not allowed");
  }

  if (input.sizeBytes <= 0 || input.sizeBytes > input.maxBytes) {
    throw new Error("File exceeds maximum allowed size");
  }

  return extension;
}

export function sanitizeCss(css: string) {
  return css
    .replace(/<\/style/gi, "")
    .replace(/<script/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/@import/gi, "");
}

export function isAllowedAppUrl(url: string, allowedOrigins: string[]) {
  try {
    const parsed = new URL(url);
    const origin = `${parsed.protocol}//${parsed.host}`;
    return allowedOrigins.includes(origin);
  } catch {
    return false;
  }
}
