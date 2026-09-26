import { describe, expect, it } from "vitest";
import {
  getSafeUploadExtension,
  sanitizeCssColor,
  sanitizeWhitelabelCss,
  validateClientUpload,
  validateFileSignature,
  validateStoragePath,
} from "./upload-validation";

function file(name: string, type: string, size = 10) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("upload validation", () => {
  it("maps allowed MIME types to safe storage extensions", () => {
    expect(getSafeUploadExtension(file("photo.jpeg", "image/jpeg"))).toBe("jpg");
    expect(getSafeUploadExtension(file("photo.webp", "image/webp"))).toBe("webp");
    expect(getSafeUploadExtension(file("document.pdf", "application/pdf"), true)).toBe("pdf");
  });

  it("rejects extension and MIME mismatches", () => {
    expect(() => validateClientUpload({ file: file("payload.html", "image/png"), maxBytes: 100 })).toThrow();
    expect(() => validateClientUpload({ file: file("payload.jpg", "application/pdf"), maxBytes: 100, allowPdf: true })).toThrow();
  });

  it("rejects PDFs unless explicitly enabled", () => {
    expect(() => validateClientUpload({ file: file("document.pdf", "application/pdf"), maxBytes: 100 })).toThrow();
  });

  it("rejects external and traversal storage paths", () => {
    expect(validateStoragePath("tenant-a/property/photo.jpg")).toBe("tenant-a/property/photo.jpg");
    expect(() => validateStoragePath("https://attacker.example/file.jpg")).toThrow();
    expect(() => validateStoragePath("tenant-a/../other/file.jpg")).toThrow();
    expect(() => validateStoragePath("tenant-a\\other\\file.jpg")).toThrow();
  });

  it("removes unsafe white-label CSS capabilities", () => {
    const css = sanitizeWhitelabelCss(".brand { color: red; background: url(https://evil.test/x); } @import url(https://evil.test/x);");
    expect(css).toContain("color:red");
    expect(css).not.toContain("url");
    expect(css).not.toContain("@import");
    expect(sanitizeCssColor("#123456", "#000")).toBe("#123456");
    expect(sanitizeCssColor("red; background:url(evil)", "#000")).toBe("#000");
  });

  it("rejects content with a spoofed MIME type", async () => {
    await expect(validateFileSignature(file("photo.png", "image/png"))).rejects.toThrow();
    await expect(validateFileSignature(new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "photo.png", { type: "image/png" }))).resolves.toBeUndefined();
  });
});