import React, { useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

export default function ExploreProperties() {
  const [filters, setFilters] = useState({
    priceMin: 0,
    priceMax: 100000000,
    propertyType: 'all',
    location: '',
  })

  const [listings, setListings] = useState([
    {
      id: 1,
      title: 'The Celestial Penthouse',
      location: 'Palm Jumeirah, Dubai',
      price: 45000000,
      type: 'Penthouse',
      image: 'https://via.placeholder.com/300x200?text=Penthouse',
      beds: 5,
      baths: 7,
      sqft: 8400,
    },
    {
      id: 2,
      title: 'Emirates Hills Villa',
      location: 'Emirates Hills, Dubai',
      price: 82000000,
      type: 'Villa',
      image: 'https://via.placeholder.com/300x200?text=Villa',
      beds: 7,
      baths: 8,
      sqft: 12000,
    },
    {
      id: 3,
      title: 'Bvigari Ocean Front',
      location: 'Jumeirah Bay Island',
      price: 115000000,
      type: 'Waterfront Villa',
      image: 'https://via.placeholder.com/300x200?text=Ocean',
      beds: 6,
      baths: 9,
      sqft: 15000,
    },
  ])

  return (
    <div className="bg-surface min-h-screen">
      <Navigation />

      <main className="md:ml-64 pb-32 md:pb-8">
        <Header title="Explore Exclusive Properties" />

        <div className="pt-24 px-4 md:px-8 pb-12">
          <div className="max-w-container mx-auto">
            {/* Search & Filters */}
            <div className="glass-card p-6 mb-8">
              <h3 className="text-headline-md font-semibold mb-4">Search Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Location"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  className="input-field"
                />
                <input
                  type="number"
                  placeholder="Min Price"
                  value={filters.priceMin}
                  onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                  className="input-field"
                />
                <input
                  type="number"
                  placeholder="Max Price"
                  value={filters.priceMax}
                  onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                  className="input-field"
                />
                <select
                  value={filters.propertyType}
                  onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                  className="input-field"
                >
                  <option value="all">All Types</option>
                  <option value="villa">Villa</option>
                  <option value="penthouse">Penthouse</option>
                  <option value="apartment">Apartment</option>
                </select>
              </div>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <div key={listing.id} className="card overflow-hidden hover:border-secondary/50 transition cursor-pointer group">
                  <img
                    src={listing.image}
                    alt={listing.title}
                    className="w-full h-48 object-cover rounded-md group-hover:scale-105 transition duration-300"
                  />
                  <div className="pt-4">
                    <h4 className="font-semibold mb-1 group-hover:text-secondary transition">
                      {listing.title}
                    </h4>
                    <p className="text-sm text-on-surface-variant mb-3">{listing.location}</p>

                    <div className="flex gap-4 mb-3 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">bed</span>
                        {listing.beds} Beds
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">shower</span>
                        {listing.baths} Baths
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">aspect_ratio</span>
                        {listing.sqft.toLocaleString()} sqft
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-secondary font-bold">AED {listing.price.toLocaleString()}</p>
                      <button className="p-2 hover:bg-surface-container-high rounded-md transition">
                        <span className="material-symbols-outlined">favorite_border</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
