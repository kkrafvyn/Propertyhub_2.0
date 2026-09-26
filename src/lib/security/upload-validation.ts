const BLOCKED_EXTENSIONS = new Set([
  "exe", "dll", "js", "html", "htm", "svg", "php", "sh", "bat", "cmd", "msi", "scr",
]);

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function getFileExtension(fileName: string) {
  const name = fileName.trim().toLowerCase();
  const lastDot = name.lastIndexOf(".");
  return lastDot > -1 ? name.slice(lastDot + 1) : "";
}

export function getSafeUploadExtension(file: File, allowPdf = false) {
  const mimeType = file.type.trim().toLowerCase();
  const extension = getFileExtension(file.name);
  const expectedExtension = EXTENSION_BY_TYPE[mimeType];
  const extensionMatches =
    (mimeType === "image/jpeg" && ["jpg", "jpeg"].includes(extension)) ||
    extension === expectedExtension;

  if (!expectedExtension || !extensionMatches || (mimeType === "application/pdf" && !allowPdf)) {
    throw new Error("File extension does not match its content type");
  }

  return expectedExtension;
}

export function validateStoragePath(storagePath: string) {
  const normalized = storagePath.trim();
  const segments = normalized.split("/");

  if (
    !normalized ||
    normalized.length > 512 ||
    normalized.startsWith("/") ||
    normalized.includes("\\") ||
    normalized.includes("..") ||
    normalized.includes("\0") ||
    segments.some((segment) => !segment || segment === "." || /[\u0000-\u001f\u007f]/.test(segment))
  ) {
    throw new Error("Invalid storage path");
  }

  return normalized;
}

export function validateClientUpload(input: {
  file: File;
  maxBytes: number;
  allowPdf?: boolean;
}) {
  const extension = getFileExtension(input.file.name);
  if (!extension || BLOCKED_EXTENSIONS.has(extension)) {
    throw new Error("This file type is not allowed");
  }

  const allowed = input.allowPdf ? DOCUMENT_TYPES : IMAGE_TYPES;
  if (!allowed.has(input.file.type.trim().toLowerCase())) {
    throw new Error("Unsupported file format");
  }

  getSafeUploadExtension(input.file, input.allowPdf);

  if (input.file.size <= 0 || input.file.size > input.maxBytes) {
    throw new Error(`File must be smaller than ${Math.round(input.maxBytes / 1024 / 1024)}MB`);
  }
}

export async function validateFileSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const mimeType = file.type.trim().toLowerCase();
  const matches = (expected: number[], offset = 0) => expected.every((byte, index) => bytes[index + offset] === byte);
  const valid =
    (mimeType === "image/jpeg" && matches([0xff, 0xd8, 0xff])) ||
    (mimeType === "image/png" && matches([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (mimeType === "image/webp" && matches([0x52, 0x49, 0x46, 0x46]) && matches([0x57, 0x45, 0x42, 0x50], 8)) ||
    (mimeType === "application/pdf" && matches([0x25, 0x50, 0x44, 0x46, 0x2d]));

  if (!valid) throw new Error("File content does not match its declared type");
}

export function sanitizeWhitelabelCss(css: string) {
  const blockedValue = /(?:url\s*\(|expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding|@import|@namespace|@charset|<|>)/i;
  const allowedProperty = /^(?:--[a-z0-9-]+|color|background(?:-color)?|border(?:-color|-width|-style)?|border-radius|font(?:-family|-size|-weight|-style)?|line-height|letter-spacing|text-align|text-decoration|opacity|box-shadow|margin(?:-(?:top|right|bottom|left))?|padding(?:-(?:top|right|bottom|left))?|display|gap|grid-template-columns|flex-direction|width|max-width|min-width|height|max-height|min-height)$/i;

  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("}")
    .map((block) => {
      const separator = block.indexOf("{");
      if (separator < 1) return "";

      const selector = block.slice(0, separator).trim();
      if (!selector || selector.length > 300 || blockedValue.test(selector)) return "";

      const declarations = block
        .slice(separator + 1)
        .split(";")
        .map((declaration) => declaration.trim())
        .map((declaration) => {
          const colon = declaration.indexOf(":");
          if (colon < 1) return null;
          const property = declaration.slice(0, colon).trim();
          const value = declaration.slice(colon + 1).trim();
          return property.length <= 80 && allowedProperty.test(property) && value.length <= 500 && !blockedValue.test(value)
            ? `${property}:${value}`
            : null;
        })
        .filter((declaration): declaration is string => Boolean(declaration));

      return declarations.length ? `${selector}{${declarations.join(";")}}` : "";
    })
    .join("");
}

export function sanitizeCssColor(value: string | null | undefined, fallback: string) {
  const normalized = String(value || "").trim();
  return /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%+-]+\)|[a-z]+)$/i.test(normalized)
    ? normalized
    : fallback;
}
