import { Link, useNavigate } from "react-router";
import {
  Search,
  MapPin,
  Home as HomeIcon,
  Building2,
  Landmark,
  TrendingUp,
  Shield,
  Users,
  Loader2,
  Smartphone,
  Download,
  MessageSquareQuote,
  Radio,
  Star,
  Menu,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  listingService,
  type PublicCategorySummary,
  type PublicLocationSummary,
} from "../../lib/listing.service";
import { organizationService } from "../../lib/organization.service";
import { formatPropertyCategory } from "../../lib/property-category";
import { getPropertyCoverImage } from "../../lib/property-media";
import {
  publicDiscoveryService,
  type MobileExperienceSnapshot,
  type PublicVendorReview,
} from "../../lib/public-discovery.service";
import { toast } from "sonner";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";

const heroPropertySlides = [
  {
    eyebrow: "Unlock Life's Best Spaces",
    title: "Find Your Perfect Property in Ghana",
    description: "Discover verified rentals, homes, commercials, warehouses, car parks, and more.",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=85&auto=format&fit=crop",
    alt: "Luxury modern home at night with warm lights and outdoor seating",
    query: "/search?listingType=sale&propertyType=house",
  },
  {
    eyebrow: "Verified City Rentals",
    title: "Live Close to Work, School, and Everything",
    description: "Explore apartments with trusted agencies, smart access readiness, and location signals.",
    image:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1600&q=85&auto=format&fit=crop",
    alt: "Modern apartment living room with warm interior lighting",
    query: "/search?listingType=rental&propertyType=apartment",
  },
  {
    eyebrow: "Commercial Spaces",
    title: "Offices, Shops, and Warehouses Built for Growth",
    description: "Find verified commercial inventory for teams, retail, storage, and logistics.",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&q=85&auto=format&fit=crop",
    alt: "Premium modern office space with desks and large windows",
    query: "/search?listingType=lease&propertyType=office",
  },
  {
    eyebrow: "Smart Property Access",
    title: "Book Viewings with Safer Access Controls",
    description: "IoT-ready listings can support timed entry codes after agency approval.",
    image:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600&q=85&auto=format&fit=crop",
    alt: "Beautiful building entryway with secure door and warm exterior lights",
    query: "/search?amenities=smart-access",
  },
  {
    eyebrow: "Diaspora Buyer Ready",
    title: "Track Ghana Deals from Anywhere",
    description: "Saved searches, verified agencies, receipts, reviews, and deal rooms stay in one place.",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85&auto=format&fit=crop",
    alt: "Contemporary home with glass facade and landscaped garden",
    query: "/search?listingType=sale",
  },
];

function getCategoryIcon(category: string) {
  switch (category) {
    case "apartment":
      return Building2;
    case "house":
      return HomeIcon;
    case "commercial":
    case "office":
    case "office_complex":
      return Landmark;
    case "warehouse":
      return Building2;
    case "car_park":
    case "land":
      return MapPin;
    default:
      return HomeIcon;
  }
}

export function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"rental" | "sale" | "lease">("rental");
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<PublicCategorySummary[]>([]);
  const [popularLocations, setPopularLocations] = useState<PublicLocationSummary[]>([]);
  const [verifiedAgencies, setVerifiedAgencies] = useState<any[]>([]);
  const [reviewPreview, setReviewPreview] = useState<PublicVendorReview[]>([]);
  const [mobileSnapshot, setMobileSnapshot] = useState<MobileExperienceSnapshot | null>(null);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [heroMenuOpen, setHeroMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const listPropertyPath = `${WORKSPACE_ENTRY_PATH}?next=new`;
  const manageListingsPath = `${WORKSPACE_ENTRY_PATH}?next=listings`;
  const analyticsPath = `${WORKSPACE_ENTRY_PATH}?next=market-intelligence`;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroIndex((index) => (index + 1) % heroPropertySlides.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [listings, categories, locations, agencies, reputation, appSnapshot] = await Promise.all([
        listingService.getPublicListings(4, 0),
        listingService.getPublicCategorySummaries(7),
        listingService.getPopularLocations(6),
        organizationService.getVerifiedOrganizations(6),
        publicDiscoveryService.getVendorReputationSnapshot(6, 3),
        publicDiscoveryService.getMobileExperienceSnapshot(),
      ]);
      const formattedListings = listings.map((listing: any) => ({
        ...listing,
      }));
      setFeaturedListings(formattedListings);
      setCategoryStats(categories);
      setPopularLocations(locations);
      setVerifiedAgencies(agencies);
      setReviewPreview(reputation.testimonials);
      setMobileSnapshot(appSnapshot);
    } catch (error) {
      console.error('Failed to load home data:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams({
      q: searchQuery,
      listingType: searchType,
    });
    navigate(`/search?${params.toString()}`);
  };

  const activeHeroSlide = heroPropertySlides[activeHeroIndex];
  const heroMenuItems = [
    { label: "For Rent", to: "/search" },
    { label: "For Sale", to: "/search?listingType=sale" },
    { label: "For Lease", to: "/search?listingType=lease" },
    { label: "Agencies", to: "/agencies" },
    { label: "Area Guides", to: "/guides" },
    { label: "Trends", to: "/market-trends" },
    { label: "Reviews", to: "/reviews" },
    { label: "Get App", to: "/get-the-app" },
    { label: "List Property", to: listPropertyPath },
  ];

  const discoveryLinks = [
    {
      title: "Verified Agencies",
      description: "Public company pages with trust docs and live inventory.",
      icon: Shield,
      href: "/agencies",
    },
    {
      title: "Area Guides",
      description: "Neighborhood pages for demand, access, and flood risk context.",
      icon: MapPin,
      href: "/guides",
    },
    {
      title: "Market Trends",
      description: "Average pricing and demand snapshots across active locations.",
      icon: TrendingUp,
      href: "/market-trends",
    },
    {
      title: "Sold Ledger",
      description: "Closed sales publish here with buyer identities shown only as hashes.",
      icon: Radio,
      href: "/sold-ledger",
    },
    {
      title: "Buyer Requests",
      description: "Capture demand before a buyer ever reaches a listing page.",
      icon: Users,
      href: "/buyer-requests",
    },
    {
      title: "Projects",
      description: "Grouped developments and multi-unit inventory collections.",
      icon: Building2,
      href: "/projects",
    },
    {
      title: "Home Valuation",
      description: "Quick asking-price ranges from current public sale comps.",
      icon: Landmark,
      href: "/valuation",
    },
    {
      title: "Public Reviews",
      description: "Read verified service-partner feedback before you engage.",
      icon: MessageSquareQuote,
      href: "/reviews",
    },
    {
      title: "Get The App",
      description: "Install the public mobile builds for alerts, offers, and field follow-up.",
      icon: Download,
      href: "/get-the-app",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="relative min-h-[100svh] overflow-hidden bg-[#090d17] text-white">
        {heroPropertySlides.map((slide, index) => (
          <motion.img
            key={slide.title}
            src={slide.image}
            alt={slide.alt}
            initial={false}
            animate={{
              opacity: index === activeHeroIndex ? 1 : 0,
              scale: index === activeHeroIndex ? 1 : 1.04,
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,17,0.72)_0%,rgba(6,9,16,0.36)_34%,rgba(5,8,14,0.42)_54%,rgba(5,8,14,0.96)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,43,92,0.22),transparent_22%),linear-gradient(90deg,rgba(3,7,14,0.78),rgba(3,7,14,0.22)_52%,rgba(3,7,14,0.72))]" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col px-5 pb-8 pt-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
                <HomeIcon className="h-5 w-5 text-white" />
              </span>
              <span className="text-sm font-semibold sm:text-base">BaytMiftah</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:inline-flex"
              >
                Log In
              </Link>
              <div className="relative">
                <button
                  type="button"
                  className="rounded-full p-2 text-white/90 transition hover:bg-white/10"
                  aria-label={heroMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                  title={heroMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                  aria-expanded={heroMenuOpen}
                  onClick={() => setHeroMenuOpen((open) => !open)}
                >
                  <Menu className="h-6 w-6" />
                </button>
                {heroMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-3xl border border-white/15 bg-[#101522]/95 p-2 text-white shadow-2xl shadow-black/40 backdrop-blur-xl">
                    {heroMenuItems.map((item) => (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => setHeroMenuOpen(false)}
                        className="block rounded-2xl px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.62fr)]">
            <motion.div
              key={activeHeroSlide.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <p className="mb-5 flex items-center gap-2 text-xs font-semibold text-white/80 sm:text-sm">
                <span className="h-0.5 w-4 rounded-full bg-primary" />
                <span>
                  {activeHeroSlide.eyebrow.split("Best Spaces")[0]}
                  {activeHeroSlide.eyebrow.includes("Best Spaces") ? (
                    <span className="text-primary">Best Spaces</span>
                  ) : null}
                </span>
              </p>
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
                {activeHeroSlide.title}
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/78 sm:text-lg">
                {activeHeroSlide.description}
              </p>

              <div className="mt-7 grid max-w-xl grid-cols-3 gap-3">
                {[
                  { icon: Shield, label: "Verified", detail: "Listings" },
                  { icon: MapPin, label: "Smart", detail: "Location Signals" },
                  { icon: HomeIcon, label: "Secure", detail: "& Trusted" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 rounded-2xl bg-black/20 p-2 backdrop-blur-sm">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 text-[0.64rem] font-semibold leading-tight text-white sm:text-xs">
                      {item.label}
                      <br />
                      <span className="text-white/70">{item.detail}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={activeHeroSlide.query}>
                  <Button size="lg" className="w-full rounded-full px-7 sm:w-auto">
                    Explore Properties
                  </Button>
                </Link>
                <Link to={listPropertyPath}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full rounded-full border-white/25 bg-white/10 px-7 text-white hover:bg-white/20 sm:w-auto"
                  >
                    List Property
                  </Button>
                </Link>
              </div>
            </motion.div>

            <div className="hidden rounded-[2.25rem] border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/25 backdrop-blur-xl lg:block">
              <div className="rounded-[1.75rem] bg-black/25 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">
                  Quick Search
                </p>
                <div className="mt-4 flex gap-2">
                  {[
                    ["rental", "Rent"],
                    ["sale", "Buy"],
                    ["lease", "Lease"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setSearchType(value as "rental" | "sale" | "lease")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        searchType === value
                          ? "bg-primary text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-white/95 p-2 text-foreground">
                  <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Location, address, or neighborhood"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="border-0 bg-transparent py-2 focus:ring-0"
                    />
                  </div>
                  <Button onClick={handleSearch} className="mt-2 w-full rounded-xl" size="lg">
                    <Search className="mr-2 h-5 w-5" />
                    Search Ghana
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <div className="mx-auto flex w-full max-w-[min(100%,34rem)] items-center justify-between rounded-full bg-black/18 px-2 py-2 backdrop-blur-sm sm:mx-0">
              <div className="flex items-center gap-1.5 px-2">
                {heroPropertySlides.map((slide, index) => (
                  <button
                    key={slide.title}
                    type="button"
                    onClick={() => setActiveHeroIndex(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === activeHeroIndex ? "w-6 bg-primary" : "w-1.5 bg-white/40 hover:bg-white/80"
                    }`}
                    aria-label={`Show property slide ${index + 1}`}
                  />
                ))}
              </div>
              <p className="px-2 text-[0.68rem] font-semibold tracking-[0.18em] text-white">
                {String(activeHeroIndex + 1).padStart(2, "0")} / {String(heroPropertySlides.length).padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Browse by Category</h2>
            <p className="mt-2 text-muted-foreground">
              Counts below come from the current live public inventory.
            </p>
          </div>
        </div>
        {categoryStats.length === 0 ? (
          <Card className="p-8 text-muted-foreground">
            Public category counts will appear here once more listings are published.
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
            {categoryStats.map((category, index) => {
              const Icon = getCategoryIcon(category.category);

              return (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <Link to={`/search?propertyType=${category.category}`}>
                    <Card hover className="h-full p-6 text-center">
                      <Icon className="mx-auto mb-4 h-12 w-12 text-primary" />
                      <h3 className="mb-1 font-semibold">{category.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {category.count.toLocaleString()} live listings
                      </p>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured Properties */}
      <section className="py-16 px-4 max-w-7xl mx-auto bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-semibold">Featured Properties</h2>
            <Link to="/search">
              <Button variant="outline">View All</Button>
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredListings.map((listing, index) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={`/property/${listing.id}`}>
                    <Card hover className="overflow-hidden">
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={getPropertyCoverImage(listing.property)}
                          alt={listing.property?.address}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                          {formatPropertyCategory(listing.property?.category)}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                          {listing.property?.address || 'Property'}
                        </h3>
                        <div className="flex items-center gap-1 text-muted-foreground mb-3">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">{listing.property?.city}, {listing.property?.region}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-2xl font-semibold text-primary">
                              GHS {listing.price.toLocaleString()}
                            </span>
                            {listing.listing_type === 'rental' && (
                              <span className="text-sm text-muted-foreground">/month</span>
                            )}
                          </div>
                          {listing.property?.bedrooms && (
                            <div className="flex gap-3 text-sm text-muted-foreground">
                              <span>{listing.property.bedrooms} beds</span>
                              <span>{listing.property.bathrooms} baths</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Discovery Grid */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-semibold">Go Beyond Search</h2>
            <p className="mt-2 text-muted-foreground">
              Explore the trust, market, and demand surfaces buyers expect from larger portals.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {discoveryLinks.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={item.href}>
                <Card hover className="p-6 h-full">
                  <item.icon className="w-10 h-10 text-primary" />
                  <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-muted-foreground">{item.description}</p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 max-w-7xl mx-auto">
        <Card className="overflow-hidden border-primary/15 bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(246,244,238,1))]">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-8 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Smartphone className="w-3.5 h-3.5" />
                Mobile Experience
              </div>
              <h2 className="mt-5 text-3xl md:text-4xl font-semibold">
                Install the public mobile experience or keep moving on the mobile web.
              </h2>
              <p className="mt-4 text-muted-foreground max-w-2xl">
                {mobileSnapshot?.releaseHeadline ||
                  "On smaller screens, the home route switches into a mobile shell built for saved alerts, quick comparisons, field notes, and deal follow-up without leaving the product."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/get-the-app">
                  <Button>
                    Get The App
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline">Open Mobile Web</Button>
                </Link>
              </div>
            </div>
            <div className="bg-foreground text-white p-8 md:p-10">
              <h3 className="text-xl font-semibold">Best mobile moments</h3>
              <div className="mt-5 space-y-4 text-white/80">
                {(mobileSnapshot?.fieldMoments || [
                  "Keep search alerts active while commuting or doing field tours.",
                  "Jump from saved listings into compare and buyer tools in a couple taps.",
                  "Track offers, viewings, and receipts without waiting to get back to a laptop.",
                ]).map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-semibold">Reputation You Can Read</h2>
            <p className="mt-2 text-muted-foreground">
              Public-facing testimonials now complement verification badges and trust docs.
            </p>
          </div>
          <Link to="/reviews">
            <Button variant="outline">Open Reviews</Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : reviewPreview.length === 0 ? (
          <Card className="p-8 text-muted-foreground">
            Public testimonials will appear here as more partner reviews are completed.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {reviewPreview.map((review) => (
              <Card key={review.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <MessageSquareQuote className="w-8 h-8 text-primary" />
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={`${review.id}-${index}`}
                        className={`w-4 h-4 ${
                          index < Math.round(review.rating) ? "fill-current" : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-5 text-foreground/90 leading-7">&ldquo;{review.reviewText}&rdquo;</p>
                <div className="mt-5 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{review.vendorName}</p>
                    {review.vendorVerified && (
                      <Shield className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {review.vendorCategory} / {review.reviewerLabel}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">{review.highlight}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Popular Locations */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Active Search Locations</h2>
            <p className="mt-2 text-muted-foreground">
              These neighborhoods and cities are ranked from the live public marketplace feed.
            </p>
          </div>
        </div>
        {popularLocations.length === 0 ? (
          <Card className="p-8 text-muted-foreground">
            Location cards will populate when the public feed has enough published inventory.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {popularLocations.map((location, index) => (
              <motion.div
                key={location.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/search?q=${encodeURIComponent(location.label)}`}>
                  <Card hover className="h-full p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                          <MapPin className="h-3.5 w-3.5" />
                          Live Location
                        </div>
                        <h4 className="mt-4 text-xl font-semibold">{location.label}</h4>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {location.listingCount.toLocaleString()} public listings
                        </p>
                      </div>
                      <div className="rounded-2xl bg-secondary p-3 text-right">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
                        <p className="mt-1 font-semibold">
                          {location.startingPrice
                            ? `GHS ${Math.round(location.startingPrice).toLocaleString()}`
                            : "No price yet"}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Verified Agencies */}
      <section className="py-16 px-4 bg-secondary/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-semibold text-center mb-12">
            Trusted by Verified Agencies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {verifiedAgencies.map((agency) => (
              <motion.div
                key={agency.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Link to={`/agencies/${agency.slug}`}>
                  <Card className="p-6 flex items-center gap-4 hover:shadow-lg transition-shadow">
                    {agency.logo_url ? (
                      <img
                        src={agency.logo_url}
                        alt={agency.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white">
                        <Building2 className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{agency.name}</h3>
                        <Shield className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Verified Agency
                      </p>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-semibold mb-6">
            Ready to List Your Property?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join BaytMiftah REOS and reach thousands of qualified buyers and renters
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Create Free Account
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 hover:bg-white/20">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="text-xl font-semibold">BaytMiftah</span>
            </div>
            <p className="text-white/70">Ghana's premier real estate marketplace</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">For Renters</h4>
            <ul className="space-y-2 text-white/70">
              <li><Link to="/search" className="hover:text-white">Search Properties</Link></li>
              <li><Link to="/buyer-requests" className="hover:text-white">Buyer Requests</Link></li>
              <li><Link to="/reviews" className="hover:text-white">Public Reviews</Link></li>
              <li><Link to="/guides" className="hover:text-white">Area Guides</Link></li>
              <li><Link to="/app" className="hover:text-white">My Dashboard</Link></li>
              <li><Link to="/app" className="hover:text-white">Saved Properties</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">For Landlords</h4>
            <ul className="space-y-2 text-white/70">
              <li><Link to={listPropertyPath} className="hover:text-white">List Property</Link></li>
              <li><Link to={manageListingsPath} className="hover:text-white">Manage Listings</Link></li>
              <li><Link to={analyticsPath} className="hover:text-white">Analytics</Link></li>
              <li><Link to="/valuation" className="hover:text-white">Home Valuation</Link></li>
              <li><Link to="/get-the-app" className="hover:text-white">Get The App</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-white/70">
              <li><Link to="/agencies" className="hover:text-white">Verified Agencies</Link></li>
              <li><Link to="/projects" className="hover:text-white">Projects</Link></li>
              <li><Link to="/market-trends" className="hover:text-white">Market Trends</Link></li>
              <li><Link to="/sold-ledger" className="hover:text-white">Sold Ledger</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-white/20 text-center text-white/70">
          <p>&copy; 2026 BaytMiftah REOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
