import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

export default function Dashboard() {
  const navigate = useNavigate()

  const featuredListings = [
    {
      id: 1,
      title: 'The Celestial Penthouse',
      location: 'Palm Jumeirah, Dubai',
      price: 'AED 45,000,000',
      image: 'https://via.placeholder.com/400x300?text=Penthouse',
      exclusive: true,
    },
    {
      id: 2,
      title: 'Emirates Hills Villa',
      location: 'Emirates Hills, Dubai',
      price: 'AED 82,000,000',
      image: 'https://via.placeholder.com/400x300?text=Villa',
      exclusive: false,
    },
    {
      id: 3,
      title: 'Bvigari Ocean Front',
      location: 'Jumeirah Bay Island',
      price: 'AED 115,000,000',
      image: 'https://via.placeholder.com/400x300?text=Ocean+Front',
      exclusive: true,
    },
  ]

  return (
    <div className="bg-surface min-h-screen">
      <Navigation />

      <main className="md:ml-64 pb-32 md:pb-8">
        <Header title="Agency Workspace" />

        <div className="pt-24 px-4 md:px-8">
          <div className="max-w-container mx-auto space-y-12">
            {/* Hero Section */}
            <section className="animate-fade-in">
              <h2 className="text-display-lg-mobile md:text-display-lg font-bold mb-4">
                Agency Workspace
              </h2>
              <p className="text-body-lg text-on-surface-variant max-w-2xl">
                Refined oversight for premium property portfolios. Monitor leads, client inquiries, and high-value transactions from a unified sanctuary.
              </p>
              <div className="flex gap-4 mt-6 flex-wrap">
                <button className="btn-primary">Generate Report</button>
                <button className="btn-secondary">Schedule Meeting</button>
              </div>
            </section>

            {/* Quick Stats */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Active Portfolios', value: '12', icon: 'home' },
                { label: 'Client Inquiries', value: '47', icon: 'mail' },
                { label: 'Transactions', value: '$1.2B', icon: 'trending_up' },
                { label: 'Team Members', value: '8', icon: 'people' },
              ].map((stat) => (
                <div key={stat.label} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="material-symbols-outlined text-secondary">{stat.icon}</span>
                  </div>
                  <p className="text-on-surface-variant text-sm mb-1">{stat.label}</p>
                  <p className="text-headline-md font-bold">{stat.value}</p>
                </div>
              ))}
            </section>

            {/* Featured Listings */}
            <section>
              <h3 className="text-headline-md font-semibold mb-6">Featured Exclusive Listings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredListings.map((listing) => (
                  <Link
                    key={listing.id}
                    to={`/property/${listing.id}`}
                    className="group"
                  >
                    <div className="card overflow-hidden hover:border-secondary/50 transition cursor-pointer">
                      <div className="relative">
                        <img
                          src={listing.image}
                          alt={listing.title}
                          className="w-full h-48 object-cover rounded-md"
                        />
                        {listing.exclusive && (
                          <div className="absolute top-3 right-3 bg-secondary/80 px-3 py-1 rounded-full text-xs font-semibold text-on-secondary">
                            EXCLUSIVE
                          </div>
                        )}
                      </div>
                      <div className="pt-4">
                        <h4 className="font-semibold mb-1 group-hover:text-secondary transition">
                          {listing.title}
                        </h4>
                        <p className="text-sm text-on-surface-variant mb-2">
                          {listing.location}
                        </p>
                        <p className="text-secondary font-bold">{listing.price}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Action Cards */}
            <section>
              <h3 className="text-headline-md font-semibold mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/create-listing')}
                  className="card p-6 hover:bg-surface-container-highest transition text-left"
                >
                  <span className="material-symbols-outlined text-secondary text-3xl mb-3">add_circle</span>
                  <h4 className="font-semibold mb-1">Create New Listing</h4>
                  <p className="text-sm text-on-surface-variant">Add a premium property to your portfolio</p>
                </button>

                <button
                  onClick={() => navigate('/messages')}
                  className="card p-6 hover:bg-surface-container-highest transition text-left"
                >
                  <span className="material-symbols-outlined text-secondary text-3xl mb-3">mail</span>
                  <h4 className="font-semibold mb-1">View Messages</h4>
                  <p className="text-sm text-on-surface-variant">Manage client conversations and inquiries</p>
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
