import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Bath,
  BedDouble,
  Bell,
  Building2,
  Car,
  CheckCircle2,
  ChevronRight,
  Heart,
  Home as HomeIcon,
  Landmark,
  MapPin,
  MessageCircle,
  Search,
  Shield,
  SlidersHorizontal,
  Star,
  Store,
  UserRound,
  Warehouse,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { listingService } from "../../lib/listing.service";
import { formatPropertyCategory } from "../../lib/property-category";
import { getPropertyCoverImage } from "../../lib/property-media";

const categories = [
  { label: "Homes", detail: "Family-ready", icon: HomeIcon, href: "/search?propertyType=house" },
  { label: "Apartments", detail: "City rentals", icon: Landmark, href: "/search?propertyType=apartment" },
  { label: "Offices", detail: "Workspaces", icon: Store, href: "/search?propertyType=office" },
  { label: "Warehouses", detail: "Storage & logistics", icon: Warehouse, href: "/search?propertyType=warehouse" },
  { label: "Car Parks", detail: "Managed bays", icon: Car, href: "/search?propertyType=car_park" },
  { label: "Agencies", detail: "Verified teams", icon: Building2, href: "/agencies" },
];

const fallbackProperties = [
  {
    id: "showcase-airport",
    title: "45 Liberation Road, Airport Residential",
    price: "GHS 18,000",
    period: "",
    location: "Airport Residential, Accra",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&q=85&auto=format&fit=crop",
    beds: 0,
    baths: 2,
    status: "Verified",
  },
  {
    id: "showcase-labone",
    title: "12 Fifth Avenue, Labone",
    price: "GHS 6,200",
    period: "/mo",
    location: "Labone, Accra",
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=900&q=85&auto=format&fit=crop",
    beds: 2,
    baths: 2,
    status: "Verified",
  },
  {
    id: "showcase-cantonments",
    title: "7 Second Rangoon Close, Cantonments",
    price: "GHS 3,200,000",
    period: "",
    location: "Cantonments, Accra",
    image: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=900&q=85&auto=format&fit=crop",
    beds: 3,
    baths: 3,
    status: "Verified",
  },
  {
    id: "showcase-east-legon",
    title: "19 Lagos Avenue, East Legon",
    price: "GHS 8,500",
    period: "/mo",
    location: "East Legon, Accra",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85&auto=format&fit=crop",
    beds: 4,
    baths: 4,
    status: "Verified",
  },
];

const verifiedAgents = [
  {
    name: "Kwame Mensah",
    agency: "Accra Prime Homes",
    response: "98%",
    listings: "24",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=220&q=85&auto=format&fit=crop",
  },
  {
    name: "Akosua Addo",
    agency: "Coastal Realty GH",
    response: "96%",
    listings: "31",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=220&q=85&auto=format&fit=crop",
  },
  {
    name: "Kojo Asare",
    agency: "UrbanNest Ghana",
    response: "94%",
    listings: "18",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=220&q=85&auto=format&fit=crop",
  },
];

const verifiedAgencies = [
  {
    name: "Accra Prime Homes",
    initials: "APH",
    listings: "24 listings",
    rating: "4.9",
    cover: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=700&q=85&auto=format&fit=crop",
  },
  {
    name: "Coastal Realty GH",
    initials: "CRG",
    listings: "31 listings",
    rating: "4.8",
    cover: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=700&q=85&auto=format&fit=crop",
  },
  {
    name: "UrbanNest Ghana",
    initials: "UNG",
    listings: "18 listings",
    rating: "4.7",
    cover: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=700&q=85&auto=format&fit=crop",
  },
];

const trustCards = [
  { title: "Verified Properties", detail: "Reviewed documents and active moderation.", icon: Shield },
  { title: "Secure Transactions", detail: "Provider-neutral payments with audit trails.", icon: Wallet },
  { title: "Verified Agencies", detail: "Approved teams with public reputation signals.", icon: Building2 },
  { title: "Fraud Protection", detail: "Reports, risk checks, and human review.", icon: CheckCircle2 },
];

const repeatActions = [
  {
    title: "Continue saved search",
    detail: "Pick up from your last Accra shortlist.",
    href: "/search",
    icon: Search,
  },
  {
    title: "Message last agent",
    detail: "Return to your latest property conversation.",
    href: "/app/messages",
    icon: MessageCircle,
  },
  {
    title: "Resume deal room",
    detail: "Track offers, receipts, and documents.",
    href: "/app/deals",
    icon: Shield,
  },
];

const afterChoiceCards = [
  {
    title: "Message an agent",
    detail: "Keep every question tied to the property instead of losing it in chat apps.",
    href: "/app/messages",
    icon: MessageCircle,
  },
  {
    title: "Track a viewing",
    detail: "See confirmations, reminders, and next steps from your buyer dashboard.",
    href: "/app/viewings",
    icon: Bell,
  },
  {
    title: "Open deal room",
    detail: "Follow payments, receipts, offers, and documents in one calm workspace.",
    href: "/app/deals",
    icon: Shield,
  },
  {
    title: "Review the experience",
    detail: "Leave feedback for agencies and properties after you complete a step.",
    href: "/reviews",
    icon: Star,
  },
];

function formatListing(listing: any) {
  const price = Number(listing.price || 0);
  const category = listing.property?.category || "property";

  return {
    id: listing.id,
    title: listing.property?.address || listing.title || formatPropertyCategory(category),
    price: `${listing.currency || "GHS"} ${price.toLocaleString()}`,
    period: listing.listing_type === "rental" ? "/mo" : "",
    location: [listing.property?.city, listing.property?.region].filter(Boolean).join(", "),
    image: getPropertyCoverImage(listing.property),
    beds: Number(listing.property?.bedrooms || 0),
    baths: Number(listing.property?.bathrooms || 0),
    status: listing.verified ? "Verified" : "Trusted",
  };
}

function SectionHeader({ title, to, action = "See all" }: { title: string; to: string; action?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-xl font-black tracking-[-0.04em] text-[#171214] md:text-2xl">{title}</h2>
      <Link to={to} className="inline-flex items-center gap-1 text-sm font-bold text-primary">
        {action}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"rental" | "sale" | "lease">("rental");
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);

  useEffect(() => {
    const loadListings = async () => {
      try {
        const listings = await listingService.getPublicListings(8, 0);
        setFeaturedListings(listings.map(formatListing));
      } catch (error) {
        console.error("Failed to load home listings:", error);
        toast.error("Failed to load listings");
      }
    };

    void loadListings();
  }, []);

  const showcaseProperties = featuredListings.length > 0 ? featuredListings : fallbackProperties;
  const recentlyViewed = useMemo(() => [...fallbackProperties].reverse(), []);

  const handleSearch = () => {
    const params = new URLSearchParams({ listingType: searchType });
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    navigate(`/search?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(255,56,92,0.12),transparent_32rem),linear-gradient(180deg,#fff7fa_0%,#ffffff_46%,#fff7fa_100%)] text-[#171214]">
      <section className="mx-auto min-h-screen w-full max-w-7xl px-4 py-4 md:px-6 lg:px-8">
        <div className="min-w-0 pb-28 md:pb-12">
          <header className="sticky top-0 z-30 -mx-4 mb-6 border-b border-white/70 bg-[#fff7fa]/88 px-4 py-3 backdrop-blur-2xl md:static md:mx-0 md:border-none md:bg-transparent md:px-0 md:py-2">
            <div className="flex items-center justify-between gap-3 md:hidden">
              <Link to="/" className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
                  <HomeIcon className="h-5 w-5" />
                </span>
                <span className="text-sm font-black">BaytMiftah</span>
              </Link>
              <div className="flex items-center gap-2">
                <Link to="/search" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm">
                  <Search className="h-4 w-4" />
                </Link>
                <Link to={user ? "/app/settings" : "/login"} className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm">
                  <UserRound className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="hidden items-center justify-between gap-5 md:flex">
              <Link to="/" className="flex min-w-[15rem] items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
                  <HomeIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-muted-foreground">Current location</p>
                  <p className="text-lg font-black tracking-[-0.04em]">Accra, Ghana</p>
                </div>
              </Link>
              <div className="flex max-w-2xl flex-1 items-center gap-3 rounded-[1.6rem] border border-white bg-white px-4 py-3 shadow-[0_16px_40px_rgba(255,56,92,0.08)]">
                <MapPin className="h-5 w-5 text-primary" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                  placeholder="Search location, property, or agent"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
                />
                <button type="button" onClick={handleSearch} className="rounded-full bg-primary px-5 py-2 text-sm font-black text-white">
                  Search
                </button>
              </div>
              <Link to="/search" className="grid h-12 w-12 place-items-center rounded-[1.25rem] bg-white shadow-sm" aria-label="Search filters">
                <SlidersHorizontal className="h-5 w-5" />
              </Link>
              <Link to={user ? "/app/notifications" : "/login"} className="grid h-12 w-12 place-items-center rounded-[1.25rem] bg-white shadow-sm" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Link>
            </div>
          </header>

          <section className="mt-8">
            <SectionHeader title="Property Categories" to="/search" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {categories.map((category) => (
                <Link key={category.label} to={category.href} className="rounded-[1.6rem] border border-white bg-white p-4 shadow-[0_16px_50px_rgba(255,56,92,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_70px_rgba(255,56,92,0.14)]">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <category.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-black tracking-[-0.03em]">{category.label}</h3>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{category.detail}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
              <Link
                to={String(showcaseProperties[0]?.id || "").startsWith("showcase-") ? "/search" : `/property/${showcaseProperties[0]?.id}`}
                className="group relative min-h-[34rem] overflow-hidden rounded-[2.5rem] bg-[#171214] shadow-[0_28px_90px_rgba(255,56,92,0.18)]"
              >
                <img
                  src={showcaseProperties[0]?.image || fallbackProperties[0].image}
                  alt={showcaseProperties[0]?.title || "Featured verified property"}
                  className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-10">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/14 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] backdrop-blur">
                    <Shield className="h-4 w-4 text-primary" />
                    Verified Property
                  </span>
                  <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[0.95] tracking-[-0.07em] md:text-6xl">
                    {showcaseProperties[0]?.title || "Find your next verified property"}
                  </h1>
                  <p className="mt-4 max-w-xl text-base font-semibold text-white/78 md:text-lg">
                    {showcaseProperties[0]?.location || "Accra, Ghana"}
                  </p>
                  <div className="mt-6 inline-flex items-center rounded-full bg-primary px-6 py-3 text-sm font-black text-white shadow-[0_18px_45px_rgba(255,56,92,0.36)]">
                    Explore Property
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </div>
                </div>
              </Link>

              <aside className="rounded-[2.25rem] border border-white bg-white/82 p-5 shadow-[0_22px_70px_rgba(255,56,92,0.10)] backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Browse like mobile</p>
                <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.06em]">
                  Open app flow, now on desktop.
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">
                  Choose intent, browse cards, open a property, then save, message, request viewing, or pay from a clear action path.
                </p>
                <div className="mt-6 grid gap-3">
                  {["Rent", "Buy", "Lease"].map((label, index) => (
                    <Link
                      key={label}
                      to={`/search?listingType=${index === 0 ? "rental" : label.toLowerCase()}`}
                      className={`flex items-center justify-between rounded-2xl px-4 py-4 text-sm font-black ${index === 0 ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-primary/5 text-[#171214]"}`}
                    >
                      {label}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ))}
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Continue where you left off" to={user ? "/app" : "/login"} action="Open dashboard" />
            <div className="grid gap-4 md:grid-cols-3">
              {repeatActions.map((item) => (
                <Link
                  key={item.title}
                  to={user ? item.href : "/login"}
                  className="group rounded-[1.85rem] border border-white bg-white/86 p-5 shadow-[0_18px_60px_rgba(255,56,92,0.08)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(255,56,92,0.14)]"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-black tracking-[-0.04em]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-black tracking-[-0.06em] text-[#171214] md:text-4xl">
                Featured Listings
              </h2>
              <Link to="/search" className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                See all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-4">
              {showcaseProperties.slice(0, 4).map((property) => (
                <Link
                  key={property.id}
                  to={String(property.id).startsWith("showcase-") ? "/search" : `/property/${property.id}`}
                  className="group min-w-[18rem] snap-start overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_20px_70px_rgba(255,56,92,0.10)] transition hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(255,56,92,0.16)] md:min-w-0"
                >
                  <div className="relative h-64 overflow-hidden">
                    <img src={property.image} alt={property.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-xs font-black text-primary">
                      {property.status}
                    </span>
                    <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-primary">
                      <Heart className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xl font-black tracking-[-0.04em] text-primary">
                      {property.price}
                      <span className="text-sm text-muted-foreground"> {property.period}</span>
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-black tracking-[-0.04em]">{property.title}</h3>
                    <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      {property.location || "Ghana"}
                    </p>
                    <div className="mt-4 flex gap-2 text-xs font-bold text-muted-foreground">
                      <span className="rounded-full bg-primary/5 px-3 py-2"><BedDouble className="mr-1 inline h-3.5 w-3.5" />{property.beds}</span>
                      <span className="rounded-full bg-primary/5 px-3 py-2"><Bath className="mr-1 inline h-3.5 w-3.5" />{property.baths}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Verified agents" to="/agencies" />
            <div className="grid gap-4 md:grid-cols-3">
              {verifiedAgents.map((agent) => (
                <Link key={agent.name} to="/agencies" className="rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_18px_60px_rgba(255,56,92,0.08)]">
                  <div className="flex items-center gap-4">
                    <img src={agent.image} alt={agent.name} className="h-16 w-16 rounded-2xl object-cover" />
                    <div className="min-w-0">
                      <h3 className="font-black tracking-[-0.03em]">{agent.name}</h3>
                      <p className="text-sm font-semibold text-muted-foreground">{agent.agency}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold">
                    <span className="rounded-2xl bg-primary/10 px-3 py-2 text-primary">Response {agent.response}</span>
                    <span className="rounded-2xl bg-primary/5 px-3 py-2 text-primary">{agent.listings} listings</span>
                  </div>
                  <Button className="mt-4 w-full" variant="outline">
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </Button>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Verified agencies" to="/agencies" />
            <div className="grid gap-5 lg:grid-cols-3">
              {verifiedAgencies.map((agency) => (
                <Link key={agency.name} to="/agencies" className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_18px_60px_rgba(255,56,92,0.08)]">
                  <div className="relative h-32">
                    <img src={agency.cover} alt={agency.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                    <span className="absolute bottom-3 left-4 grid h-14 w-14 place-items-center rounded-2xl bg-white text-sm font-black text-primary">
                      {agency.initials}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black tracking-[-0.03em]">{agency.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-primary">Verified agency</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-3 py-1 text-sm font-black text-primary">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {agency.rating}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-bold text-muted-foreground">{agency.listings}</p>
                    <Button className="mt-4 w-full">View Agency</Button>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Recently viewed" to="/app/saved" />
            <div className="grid gap-4 md:grid-cols-4">
              {recentlyViewed.map((property) => (
                <Link key={property.id} to="/search" className="relative h-40 overflow-hidden rounded-[1.75rem] bg-[#171214] shadow-[0_18px_60px_rgba(23,18,20,0.12)]">
                  <img src={property.image} alt={property.title} className="h-full w-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="text-sm font-black">{property.title}</p>
                    <p className="mt-1 text-xs font-bold text-white/70">{property.price} {property.period}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="After you choose" to={user ? "/app" : "/login"} action="Track progress" />
            <div className="grid gap-4 md:grid-cols-4">
              {afterChoiceCards.map((item) => (
                <Link
                  key={item.title}
                  to={user ? item.href : "/login"}
                  className="rounded-[1.75rem] border border-white bg-white/86 p-5 shadow-[0_18px_60px_rgba(255,56,92,0.08)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(255,56,92,0.14)]"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-black tracking-[-0.04em]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <SectionHeader title="Trust built in" to="/reviews" action="Open reviews" />
            <div className="grid gap-4 md:grid-cols-4">
              {trustCards.map((item) => (
                <div key={item.title} className="rounded-[1.75rem] border border-white bg-white p-5 shadow-[0_18px_60px_rgba(255,56,92,0.08)]">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 font-black tracking-[-0.03em]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

      </section>

      <nav className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 grid-cols-4 rounded-full border border-white/80 bg-white/92 px-3 py-2 shadow-[0_20px_70px_rgba(23,18,20,0.22)] backdrop-blur-2xl md:hidden">
        {[
          { label: "Home", icon: HomeIcon, to: "/" },
          { label: "Saved", icon: Heart, to: "/app/saved" },
          { label: "Messages", icon: MessageCircle, to: "/app/messages" },
          { label: "Profile", icon: UserRound, to: "/app/settings" },
        ].map((item, index) => (
          <Link key={item.label} to={item.to} className={`flex flex-col items-center gap-1 rounded-full px-2 py-1.5 text-[0.68rem] font-black ${index === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
