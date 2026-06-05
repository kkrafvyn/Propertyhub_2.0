import { useEffect, useState } from 'react'
import { useAgencyStore } from '../../store/useAgencyStore'

export default function PropertyManagement() {
  const { currentAgency, listings, fetchListings, loading } = useAgencyStore()
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (currentAgency?.id) {
      fetchListings(currentAgency.id)
    }
  }, [currentAgency?.id])

  const filteredListings = listings.filter((listing) => {
    if (filter === 'all') return true
    return listing.status === filter
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-display-md font-bold">Properties</h1>
        <a
          href="/create-listing"
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          + New Listing
        </a>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'active', 'pending', 'sold'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg transition capitalize ${
              filter === status
                ? 'bg-primary text-white'
                : 'bg-surface-container text-gray-400 hover:text-white'
            }`}
          >
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>

      {/* Properties Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredListings.map((property) => (
          <a
            key={property.id}
            href={`/property/${property.id}`}
            className="bg-surface-container rounded-lg overflow-hidden hover:shadow-lg transition"
          >
            <div className="h-40 bg-gray-700 flex items-center justify-center">
              <span className="text-4xl">🏠</span>
            </div>
            <div className="p-4">
              <h3 className="font-medium mb-1 line-clamp-2">{property.title}</h3>
              <p className="text-on-surface-variant text-body-sm mb-3">{property.location}</p>
              <div className="flex justify-between items-center">
                <span className="font-bold text-primary">{property.price}</span>
                <span
                  className={`text-body-sm px-2 py-1 rounded capitalize ${
                    property.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {property.status}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {filteredListings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-on-surface-variant mb-4">No properties found</p>
          <a href="/create-listing" className="text-primary hover:text-primary/80">
            Create your first listing
          </a>
        </div>
      )}
    </div>
  )
}
