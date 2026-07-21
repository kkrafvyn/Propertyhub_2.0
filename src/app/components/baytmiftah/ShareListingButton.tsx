import { useState } from "react";
import type { MarketplaceListingCard } from "./listing-mappers";

export function ShareListingButton({
  listing,
  variant = "default",
}: {
  listing?: MarketplaceListingCard | { id: string; title?: string; location?: string } | null;
  variant?: "default" | "icon";
}) {
  const [copied, setCopied] = useState(false);
  if (!listing) return null;

  const url = `${window.location.origin}/property/${listing.id}`;
  const text = `${listing.title || "Property"} — ${"location" in listing ? listing.location : ""}`;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: listing?.title || "Property", text, url });
        return;
      } catch {
        /* fall through */
      }
    }
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={share}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 shadow-sm"
        aria-label="Share listing"
      >
        <svg className="h-5 w-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={share}
        className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-ink hover:bg-white/10"
      >
        Share on WhatsApp
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-ink hover:bg-white/10"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
