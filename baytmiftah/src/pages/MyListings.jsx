import React from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

export default function MyListings() {
  const navigate = useNavigate()
  const [listings] = React.useState([
    {
      id: 1,
      title: 'The Celestial Penthouse',
      location: 'Palm Jumeirah, Dubai',
      price: 45000000,
      status: 'Active',
      image: 'https://via.placeholder.com/300x200?text=Penthouse',
      views: 127,
      inquiries: 8,
    },
    {
      id: 2,
      title: 'Emirates Hills Villa',
      location: 'Emirates Hills, Dubai',
      price: 82000000,
      status: 'Under Offer',
      image: 'https://via.placeholder.com/300x200?text=Villa',
      views: 89,
      inquiries: 5,
    },
  ])

  return (
    <div className="bg-surface min-h-screen">
      <Navigation />

      <main className="md:ml-64 pb-32 md:pb-8">
        <Header
          title="My Listings"
          actions={[
            {
              label: 'Create Listing',
              icon: 'add',
              variant: 'primary',
              onClick: () => navigate('/create-listing'),
            },
          ]}
        />

        <div className="pt-24 px-4 md:px-8">
          <div className="max-w-container mx-auto">
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Active Listings', value: 2, icon: 'home' },
                { label: 'Total Views', value: 216, icon: 'visibility' },
                { label: 'Inquiries', value: 13, icon: 'mail' },
              ].map((stat) => (
                <div key={stat.label} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-on-surface-variant text-sm">{stat.label}</p>
                      <p className="text-2xl font-bold text-secondary">{stat.value}</p>
                    </div>
                    <span className="material-symbols-outlined text-secondary text-3xl">{stat.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {listings.map((listing) => (
                <div key={listing.id} className="card p-4 md:p-6 flex gap-4">
                  <img
                    src={listing.image}
                    alt={listing.title}
                    className="w-32 h-32 object-cover rounded-md"
                  />

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{listing.title}</h3>
                        <p className="text-sm text-on-surface-variant">{listing.location}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        listing.status === 'Active'
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        {listing.status}
                      </span>
                    </div>

                    <div className="flex gap-6 mb-3 text-sm">
                      <span>
                        <p className="text-on-surface-variant">Price</p>
                        <p className="font-bold text-secondary">AED {listing.price.toLocaleString()}</p>
                      </span>
                      <span>
                        <p className="text-on-surface-variant">Views</p>
                        <p className="font-bold">{listing.views}</p>
                      </span>
                      <span>
                        <p className="text-on-surface-variant">Inquiries</p>
                        <p className="font-bold text-secondary">{listing.inquiries}</p>
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button className="btn-secondary text-sm">Edit</button>
                      <button className="btn-secondary text-sm">View Inquiries</button>
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
