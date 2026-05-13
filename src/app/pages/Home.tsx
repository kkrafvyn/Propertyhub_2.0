import { Link, useNavigate } from "react-router";
import { Search, MapPin, Home as HomeIcon, Building2, Landmark, TrendingUp, Shield, Users, Loader2 } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { listingService } from "../../lib/listing.service";
import { organizationService } from "../../lib/organization.service";
import { getPropertyCoverImage } from "../../lib/property-media";
import { toast } from "sonner";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";

export function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"rental" | "sale" | "lease">("rental");
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [verifiedAgencies, setVerifiedAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const listPropertyPath = `${WORKSPACE_ENTRY_PATH}?next=new`;
  const manageListingsPath = `${WORKSPACE_ENTRY_PATH}?next=listings`;
  const analyticsPath = `${WORKSPACE_ENTRY_PATH}?next=market-intelligence`;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const listings = await listingService.getPublicListings(4, 0);
      const formattedListings = listings.map((listing: any) => ({
        ...listing,
      }));
      setFeaturedListings(formattedListings);

      const agencies = await organizationService.getVerifiedOrganizations(6);
      setVerifiedAgencies(agencies);
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

  const categories = [
    { name: "Apartments", searchValue: "apartment", icon: Building2, count: "1,234" },
    { name: "Houses", searchValue: "house", icon: HomeIcon, count: "856" },
    { name: "Commercial", searchValue: "commercial", icon: Landmark, count: "432" },
    { name: "Land", searchValue: "land", icon: MapPin, count: "298" },
  ];

  const locations = [
    { name: "East Legon", count: "234 properties" },
    { name: "Airport Residential", count: "189 properties" },
    { name: "Cantonments", count: "156 properties" },
    { name: "Labone", count: "142 properties" },
    { name: "Osu", count: "128 properties" },
    { name: "Dzorwulu", count: "98 properties" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar transparent />

      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80"
            alt="Hero background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/30" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-semibold text-white mb-6"
          >
            Find Your Perfect Property in Ghana
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-white/90 mb-10"
          >
            Discover quality homes, apartments, and commercial spaces across Accra and beyond
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl p-2 max-w-3xl mx-auto"
          >
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex gap-2 px-2 py-1">
                <button
                  onClick={() => setSearchType("rental")}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    searchType === "rental"
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  Rent
                </button>
                <button
                  onClick={() => setSearchType("sale")}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    searchType === "sale"
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setSearchType("lease")}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    searchType === "lease"
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  Lease
                </button>
              </div>
              <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Location, address, or neighborhood"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="bg-transparent border-0 outline-none placeholder-muted-foreground"
                />
              </div>
              <Button
                onClick={handleSearch}
                size="lg"
                className="px-8"
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold mb-8">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={`/search?propertyType=${category.searchValue}`}>
                <Card hover className="p-6 text-center">
                  <category.icon className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-1">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.count} listings</p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
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
                          {listing.property?.category || 'Property'}
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

      {/* Popular Locations */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold mb-8">Popular Locations in Accra</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {locations.map((location, index) => (
            <motion.div
              key={location.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/search?q=${encodeURIComponent(location.name)}`}>
                <Card hover className="p-4 text-center">
                  <MapPin className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h4 className="font-semibold mb-1">{location.name}</h4>
                  <p className="text-xs text-muted-foreground">{location.count}</p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
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
            Join Property Hub REOS and reach thousands of qualified buyers and renters
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
              <span className="text-xl font-semibold">Property Hub</span>
            </div>
            <p className="text-white/70">Ghana's premier real estate marketplace</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">For Renters</h4>
            <ul className="space-y-2 text-white/70">
              <li><Link to="/search" className="hover:text-white">Search Properties</Link></li>
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
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-white/70">
              <li><a href="#" className="hover:text-white">About Us</a></li>
              <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-white/20 text-center text-white/70">
          <p>&copy; 2026 Property Hub REOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
