import { Link } from "react-router";
import { ListingCard } from "./ListingCard";
import type { MarketplaceListingCard } from "./listing-mappers";

export function SimilarListings({
  listings,
  currentId,
}: {
  listings: MarketplaceListingCard[];
  currentId?: string;
}) {
  const similar = listings.filter((l) => l.id !== currentId).slice(0, 4);
  if (!similar.length) return null;

  return (
    <section className="mt-16 border-t border-white/10 pt-10">
      <h2 className="mb-6 text-xl font-semibold text-ink">Similar properties</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {similar.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
      <Link to="/search" className="mt-4 inline-block text-sm font-semibold text-ink underline">
        Browse more homes
      </Link>
    </section>
  );
}
