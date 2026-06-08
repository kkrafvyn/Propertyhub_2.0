import React from 'react'
import { Link } from 'react-router-dom'

const listingImages = [
  'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=85',
]

const listings = [
  {
    title: 'The Obsidian Suite',
    location: 'Tribeca, New York',
    area: '3,200 sqft',
    price: '$2,450,000',
    badge: 'Smart Home',
    beds: 4,
    baths: 3.5,
    image: listingImages[0],
  },
  {
    title: 'Skyline Penthouse',
    location: 'Brooklyn Heights',
    area: '2,450 sqft',
    price: '$1,890,000',
    beds: 3,
    baths: 2,
    image: listingImages[1],
  },
]

const testimonials = [
  {
    name: 'Elena Rodriguez',
    role: 'Luxury Condo Buyer',
    quote:
      "Marcus transformed our search process. His technical knowledge of building systems and smart integration saved us from two potential money pits.",
  },
  {
    name: 'David Chen',
    role: 'Multi-Property Investor',
    quote:
      "Marcus's data-driven approach to valuations gave us the confidence to move quickly on an off-market opportunity. His professionalism is unmatched.",
  },
]

export default function AgentProfileShowcase() {
  return (
    <div className="min-h-screen bg-[#f5f7fc] text-[#071121]">
      <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#ccd3df] bg-[#f8faff]/95 px-6 backdrop-blur md:px-8">
        <Link to="/explore" className="text-2xl font-black tracking-tight">
          BaytMiftah
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
          <Link to="/portfolio">Listings</Link>
          <Link to="/agency/leads">Leads</Link>
          <Link to="/smart-property/devices">Devices</Link>
        </nav>
        <div className="flex items-center gap-5">
          <span className="material-symbols-outlined">notifications</span>
          <img
            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80"
            alt="Marcus Thorne"
            className="h-10 w-10 rounded-full object-cover ring-2 ring-[#dbe7ff]"
          />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-lg border border-[#cbd3df] bg-white p-6 text-center shadow-sm">
          <div className="relative mx-auto h-40 w-40">
            <img
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=85"
              alt="Marcus Thorne"
              className="h-full w-full rounded-full object-cover ring-8 ring-[#dff6fb]"
            />
            <span className="absolute bottom-5 right-2 h-5 w-5 rounded-full border-2 border-white bg-[#E9C349]" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Marcus Thorne</h1>
          <p className="mt-1 text-sm text-[#4b5563]">Principal Agent • 12+ Years Experience</p>
          <div className="mx-auto mt-5 grid max-w-[170px] grid-cols-2 divide-x divide-[#ccd3df]">
            <div>
              <p className="text-2xl font-bold">140+</p>
              <p className="text-xs">Closed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">4.9</p>
              <p className="text-xs">Rating</p>
            </div>
          </div>
          <button className="mt-7 w-full rounded-md bg-black py-4 font-semibold text-white">
            Contact Agent
          </button>
          <button className="mt-4 w-full rounded-md border border-[#9ba4b2] bg-white py-4 font-semibold">
            Book a Valuation
          </button>
        </aside>

        <section className="space-y-8">
          <article className="rounded-lg border border-[#cbd3df] bg-white p-8">
            <h2 className="text-3xl font-bold">Biography</h2>
            <p className="mt-5 max-w-5xl leading-7 text-[#303744]">
              Marcus Thorne is an award-winning independent agent specializing in high-end
              residential real estate and smart property integration. With a background in
              architecture and property technology, Marcus brings a unique analytical
              perspective to the market, helping buyers find not just homes, but future-proof
              investments.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['location_on', 'Specialty', 'Urban Luxury'],
                ['language', 'Languages', 'EN, FR, DE'],
                ['verified', 'License', '#77892-NY'],
                ['trending_up', 'Success Rate', '98.4%'],
              ].map(([icon, label, value]) => (
                <div key={label} className="rounded-md bg-[#edf4ff] p-5">
                  <span className="material-symbols-outlined text-[#E9C349]">{icon}</span>
                  <p className="mt-2 text-xs font-medium">{label}</p>
                  <p className="font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </article>

          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Active Listings</h2>
              <Link to="/portfolio" className="text-sm font-semibold text-[#E9C349]">
                View All Active (8)
              </Link>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {listings.map((listing) => (
                <article
                  key={listing.title}
                  className="overflow-hidden rounded-lg border border-[#cbd3df] bg-white"
                >
                  <div className="relative">
                    <img src={listing.image} alt="" className="h-64 w-full object-cover" />
                    <span className="absolute right-4 top-4 rounded-full bg-black px-4 py-2 text-sm font-bold text-white">
                      {listing.price}
                    </span>
                    {listing.badge && (
                      <span className="absolute bottom-4 left-4 bg-[#E9C349] px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                        {listing.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-bold">{listing.title}</h3>
                    <p className="mt-1 text-[#4b5563]">
                      {listing.location} • {listing.area}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-[#d8dde6] pt-4">
                      <div className="flex gap-5 text-sm">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">bed</span>
                          {listing.beds}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">bathtub</span>
                          {listing.baths}
                        </span>
                      </div>
                      <span className="material-symbols-outlined">favorite</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-lg bg-[#111827] p-8 text-white">
              <span className="material-symbols-outlined text-[#F5D76B]">analytics</span>
              <h3 className="mt-7 text-2xl font-bold">Market Analyst</h3>
              <p className="mt-4 text-[#aab3c2]">
                Marcus provides monthly bespoke market analysis reports to all his
                high-net-worth clients.
              </p>
            </article>
            <article className="rounded-lg bg-[#dbeafe] p-8">
              <p className="text-xs font-semibold uppercase tracking-widest">Top Districts</p>
              <div className="mt-5 space-y-4">
                {[
                  ['Manhattan', '45%'],
                  ['Brooklyn', '30%'],
                  ['Hamptons', '25%'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <p className="mt-8 border-t border-[#b8c9e6] pt-5 text-sm font-semibold text-[#E9C349]">
                Verified Local Specialist
              </p>
            </article>
            <article className="rounded-lg border border-[#F5D76B] bg-[#fff7d6] p-8">
              <h3 className="flex items-center gap-2 text-xl font-bold">
                <span className="material-symbols-outlined">settings_input_antenna</span>
                IoT Integrated
              </h3>
              <p className="mt-5 text-sm text-[#4b5563]">
                Pioneer in selling Smart Homes with pre-configured ecosystem dashboards.
              </p>
              <div className="mt-7 h-2 rounded-full bg-[#b5c2c8]">
                <div className="h-2 w-3/4 rounded-full bg-[#E9C349]" />
              </div>
              <p className="mt-3 text-sm font-semibold">Agency Leaderboard Rank: #4</p>
            </article>
          </section>

          <section>
            <h2 className="text-2xl font-bold">Client Testimonials</h2>
            <div className="mt-5 space-y-5">
              {testimonials.map((testimonial) => (
                <article
                  key={testimonial.name}
                  className="rounded-lg border border-[#cbd3df] bg-[#edf4ff] p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80"
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-bold">{testimonial.name}</h3>
                        <p className="text-sm text-[#4b5563]">{testimonial.role}</p>
                      </div>
                    </div>
                    <span className="text-[#f59e0b]">★★★★★</span>
                  </div>
                  <p className="mt-5 italic leading-7 text-[#303744]">"{testimonial.quote}"</p>
                </article>
              ))}
            </div>
            <button className="mt-6 w-full border-b border-[#cbd3df] pb-5 text-sm font-semibold">
              Read All 48 Reviews
            </button>
          </section>

          <section className="overflow-hidden rounded-lg border border-[#cbd3df] bg-white">
            <h2 className="p-8 text-2xl font-bold">Sold Portfolio (Recent)</h2>
            <div className="grid grid-cols-4 bg-[#edf4ff] px-8 py-4 text-sm font-semibold">
              <span>Property</span>
              <span>Location</span>
              <span>Sale Price</span>
              <span>Sold Date</span>
            </div>
            {[
              ['The Glass Pavilion', 'SoHo, NYC', '$4,250,000', 'Nov 2023'],
              ['Riverside Lofts', 'DUMBO, BK', '$1,420,000', 'Sep 2023'],
              ['The Penthouse 8', 'Greenwich Village', '$3,100,000', 'June 2023'],
            ].map((row) => (
              <div
                key={row[0]}
                className="grid grid-cols-4 border-t border-[#d8dde6] px-8 py-6"
              >
                {row.map((cell) => (
                  <span key={cell}>{cell}</span>
                ))}
              </div>
            ))}
          </section>
        </section>
      </main>
    </div>
  )
}
