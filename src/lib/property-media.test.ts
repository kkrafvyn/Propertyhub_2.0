import { describe, expect, it } from "vitest";
import { isPropertyMediaUrlStale, parseSignedUrlExpirySec } from "./property-media.service";

function fakeSignedUrl(expSec: number) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ exp: expSec }));
  const token = `${header}.${payload}.sig`;
  return `https://example.supabase.co/storage/v1/object/sign/property-media/org/p.jpg?token=${encodeURIComponent(token)}`;
}

describe("property media URL freshness", () => {
  it("treats missing URLs as stale", () => {
    expect(isPropertyMediaUrlStale(null)).toBe(true);
    expect(isPropertyMediaUrlStale("")).toBe(true);
  });

  it("treats non-signed URLs as fresh", () => {
    expect(isPropertyMediaUrlStale("https://cdn.example.com/listing.jpg")).toBe(false);
  });

  it("detects expired signed URLs", () => {
    const expired = fakeSignedUrl(Math.floor(Date.now() / 1000) - 60);
    expect(isPropertyMediaUrlStale(expired)).toBe(true);
  });

  it("detects URLs expiring within the resign buffer", () => {
    const soon = fakeSignedUrl(Math.floor(Date.now() / 1000) + 60);
    expect(isPropertyMediaUrlStale(soon)).toBe(true);
  });

  it("accepts signed URLs with comfortable TTL remaining", () => {
    const fresh = fakeSignedUrl(Math.floor(Date.now() / 1000) + 60 * 60);
    expect(isPropertyMediaUrlStale(fresh)).toBe(false);
  });

  it("parses signed URL expiry from token query param", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const url = fakeSignedUrl(exp);
    expect(parseSignedUrlExpirySec(url)).toBe(exp);
  });
});
