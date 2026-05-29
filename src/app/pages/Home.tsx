import { Link, useNavigate } from "react-router";
import {
  Search,
  MapPin,
  Home as HomeIcon,
  Building2,
  Landmark,
  Shield,
  Menu,
  SlidersHorizontal,
  Heart,
  MessageCircle,
  UserRound,
  BedDouble,
  Bath,
  Ruler,
  Armchair,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { listingService } from "../../lib/listing.service";
import { formatPropertyCategory } from "../../lib/property-category";
import { getPropertyCoverImage } from "../../lib/property-media";
import { toast } from "sonner";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";
import { useAuth } from "../context/AuthContext";

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

const mobileHomeCategories = [
  { label: "Condos", count: "120+", icon: Building2, href: "/search?propertyType=apartment" },
  { label: "Apartments", count: "340+", icon: Landmark, href: "/search?propertyType=apartment" },
  { label: "Offices", count: "80+", icon: Armchair, href: "/search?propertyType=office" },
  { label: "Villas", count: "150+", icon: HomeIcon, href: "/search?propertyType=house" },
  { label: "Lands", count: "200+", icon: MapPin, href: "/search?propertyType=land" },
];

const fallbackShowcaseProperties = [
  {
    id: "showcase-1",
    title: "2 Bed Apartment",
    price: "GHS 4,500",
    period: "/mo",
    location: "Cantonments, Accra",
    image: "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&q=80&auto=format&fit=crop",
    beds: 2,
    baths: 2,
    size: "110 sqm",
  },
  {
    id: "showcase-2",
    title: "3 Bed Apartment",
    price: "GHS 7,000",
    period: "/mo",
    location: "Airport Residential, Accra",
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&q=80&auto=format&fit=crop",
    beds: 3,
    baths: 3,
    size: "160 sqm",
  },
  {
    id: "showcase-3",
    title: "4 Bed Villa",
    price: "GHS 12,000",
    period: "/mo",
    location: "East Legon, Accra",
    image: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=600&q=80&auto=format&fit=crop",
    beds: 4,
    baths: 5,
    size: "230 sqm",
  },
  {
    id: "showcase-4",
    title: "Office Suite",
    price: "GHS 8,500",
    period: "/mo",
    location: "Osu, Accra",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&q=80&auto=format&fit=crop",
    beds: 0,
    baths: 2,
    size: "95 sqm",
  },
];

const homeAgentPreview = [
  {
    name: "Kwame Mensah",
    role: "Real Estate Advisor",
    rating: "4.9",
    deals: "120",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=240&q=80&auto=format&fit=crop",
  },
  {
    name: "Akosua Addo",
    role: "Property Consultant",
    rating: "4.8",
    deals: "98",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=240&q=80&auto=format&fit=crop",
  },
  {
    name: "Kojo Asare",
    role: "Senior Realtor",
    rating: "4.7",
    deals: "89",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80&auto=format&fit=crop",
  },
  {
    name: "Ama Ofori",
    role: "Real Estate Advisor",
    rating: "4.9",
    deals: "110",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&q=80&auto=format&fit=crop",
  },
];

const homeAgencyPreview = [
  {
    name: "Accra Prime Homes",
    initials: "APH",
    detail: "Verified residential specialists",
    href: "/agencies",
  },
  {
    name: "Coastal Realty GH",
    initials: "CRG",
    detail: "Diaspora-ready agency team",
    href: "/agencies",
  },
  {
    name: "UrbanNest Ghana",
    initials: "UNG",
    detail: "Commercial and apartment experts",
    href: "/agencies",
  },
];

export function Home() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"rental" | "sale" | "lease">("rental");
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [heroMenuOpen, setHeroMenuOpen] = useState(false);
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
      const listings = await listingService.getPublicListings(4, 0);
      const formattedListings = listings.map((listing: any) => ({
        ...listing,
      }));
      setFeaturedListings(formattedListings);
    } catch (error) {
      console.error('Failed to load home data:', error);
      toast.error('Failed to load listings');
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
  const mobileShowcaseProperties =
    featuredListings.length > 0
      ? featuredListings.slice(0, 4).map((listing) => ({
          id: listing.id,
          title:
            listing.property?.address ||
            formatPropertyCategory(listing.property?.category || "property"),
          price: `${listing.currency || "GHS"} ${Number(listing.price || 0).toLocaleString()}`,
          period: listing.listing_type === "rental" ? "/mo" : "",
          location: [listing.property?.city, listing.property?.region].filter(Boolean).join(", "),
          image: getPropertyCoverImage(listing.property),
          beds: Number(listing.property?.bedrooms || 0),
          baths: Number(listing.property?.bathrooms || 0),
          size: listing.property?.square_feet
            ? `${Number(listing.property.square_feet).toLocaleString()} sqft`
            : listing.property?.area_sqm
              ? `${Number(listing.property.area_sqm).toLocaleString()} sqm`
              : "Verified",
        }))
      : fallbackShowcaseProperties;
  const recentlyViewedPreview = [...fallbackShowcaseProperties].reverse();
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

          <div className="flex flex-1 items-center py-10">
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

          </div>
        </div>
      </section>

      <section className="bg-[#f7f4f2] px-4 py-6 text-[#191919] md:px-6 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="relative mx-auto min-h-[100svh] w-full overflow-hidden bg-transparent md:min-h-0">
            <div className="px-0 pb-32 pt-0 md:pb-0">
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                    placeholder="Search location, address or neighborhood"
                    className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    aria-label="Search location, address or neighborhood"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="text-foreground"
                    aria-label="Search"
                    title="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
                <Link
                  to="/search"
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-white shadow-sm"
                  aria-label="Advanced filters"
                  title="Advanced filters"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["rental", "Rent"],
                  ["sale", "Buy"],
                  ["lease", "Lease"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSearchType(value as "rental" | "sale" | "lease")}
                    className={`rounded-2xl border px-4 py-3 text-xs font-semibold transition ${
                      searchType === value
                        ? "border-primary bg-primary text-white shadow-lg shadow-primary/20"
                        : "border-border bg-white text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <h2 className="text-base font-semibold">Categories</h2>
                <Link to="/search" className="text-xs font-semibold text-primary">
                  See all
                </Link>
              </div>
              <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0">
                {mobileHomeCategories.map((category) => (
                  <Link
                    key={category.label}
                    to={category.href}
                    className="min-w-[86px] rounded-2xl border border-primary/10 bg-primary/5 p-3 text-center md:min-w-0 md:p-4"
                  >
                    <category.icon className="mx-auto h-7 w-7 text-primary" />
                    <p className="mt-2 text-xs font-semibold">{category.label}</p>
                    <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{category.count}</p>
                  </Link>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <h2 className="text-base font-semibold">Featured Properties</h2>
                <Link to="/search" className="text-xs font-semibold text-primary">
                  See all
                </Link>
              </div>
              <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:gap-5 md:px-0">
                {mobileShowcaseProperties.map((property) => (
                  <Link
                    key={property.id}
                    to={String(property.id).startsWith("showcase-") ? "/search" : `/property/${property.id}`}
                    className="min-w-[168px] snap-start overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:min-w-[300px] lg:min-w-[320px]"
                  >
                    <div className="relative h-28 overflow-hidden md:h-44">
                      <img src={property.image} alt={property.title} className="h-full w-full object-cover" />
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-primary">
                        <Heart className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold">
                        {property.price}
                        <span className="text-[0.65rem] text-muted-foreground"> {property.period}</span>
                      </p>
                      <p className="mt-1 text-[0.7rem] font-semibold text-foreground">{property.title}</p>
                      <p className="mt-1 flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{property.location || "Accra, Ghana"}</span>
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[0.65rem] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BedDouble className="h-3 w-3" />
                          {property.beds}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="h-3 w-3" />
                          {property.baths}
                        </span>
                        <span className="flex items-center gap-1">
                          <Ruler className="h-3 w-3" />
                          {property.size}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <h2 className="text-base font-semibold">Verified agencies</h2>
                <Link to="/agencies" className="text-xs font-semibold text-primary">
                  Browse
                </Link>
              </div>
              <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
                {homeAgencyPreview.map((agency) => (
                  <Link
                    key={agency.name}
                    to={agency.href}
                    className="grid min-h-[128px] min-w-[148px] place-items-center rounded-2xl border border-border bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:min-w-0"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-slate-700">
                      {agency.initials}
                    </span>
                    <div>
                      <p className="mt-3 text-xs font-semibold text-foreground">{agency.name}</p>
                      <p className="mt-1 text-[0.65rem] text-muted-foreground">{agency.detail}</p>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <h2 className="text-base font-semibold">Meet Our Agents</h2>
                <Link to="/agencies" className="text-xs font-semibold text-primary">
                  See all
                </Link>
              </div>
              <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0">
                {homeAgentPreview.map((agent) => (
                  <Link
                    key={agent.name}
                    to="/agencies"
                    className="min-w-[116px] rounded-2xl border border-border bg-white p-3 text-center shadow-sm md:min-w-0 md:p-5"
                  >
                    <img
                      src={agent.image}
                      alt={agent.name}
                      className="mx-auto h-16 w-16 rounded-full object-cover"
                    />
                    <p className="mt-3 text-xs font-semibold">{agent.name}</p>
                    <p className="mt-0.5 text-[0.62rem] text-muted-foreground">{agent.role}</p>
                    <p className="mt-1 text-[0.65rem] font-semibold text-primary">
                      {agent.rating} ({agent.deals})
                    </p>
                  </Link>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <h2 className="text-base font-semibold">Recently Viewed</h2>
                <Link to="/app" className="text-xs font-semibold text-primary">
                  See all
                </Link>
              </div>
              <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-3 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0">
                {recentlyViewedPreview.map((property) => (
                  <Link
                    key={`recent-${property.id}`}
                    to="/search"
                    className="relative h-20 min-w-[118px] overflow-hidden rounded-2xl bg-foreground md:h-36 md:min-w-0"
                  >
                    <img src={property.image} alt={property.title} className="h-full w-full object-cover opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-1 text-[0.62rem] font-semibold text-white backdrop-blur">
                      {property.price} {property.period}
                    </span>
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-primary">
                      <Heart className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <nav
              className="fixed left-1/2 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 grid w-[calc(100%-2rem)] max-w-[430px] -translate-x-1/2 grid-cols-5 rounded-full border border-white/80 bg-white/90 px-3 py-2 shadow-[0_20px_70px_rgba(15,23,42,0.24)] ring-1 ring-black/5 backdrop-blur-2xl md:hidden"
              aria-label="Mobile home navigation"
            >
              {[
                { label: "Home", icon: HomeIcon, to: "/" },
                { label: "Search", icon: Search, to: "/search" },
                { label: "Saved", icon: Heart, to: "/app/saved" },
                { label: "Messages", icon: MessageCircle, to: "/app/messages" },
                { label: "Profile", icon: UserRound, to: "/app/settings" },
              ].map((item, index) => (
                <Link
                  key={item.label}
                  to={item.to}
                  aria-current={index === 0 ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 rounded-full px-2 py-1.5 text-[0.68rem] font-semibold transition ${
                    index === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  } hover:bg-primary/5 hover:text-primary`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {!user ? (
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
      ) : null}
    </div>
  );
}
