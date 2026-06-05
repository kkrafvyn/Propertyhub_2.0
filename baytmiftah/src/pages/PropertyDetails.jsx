import React from 'react'
import { useParams } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

export default function PropertyDetails() {
  const { id } = useParams()

  const property = {
    id,
    title: 'The Celestial Penthouse',
    location: 'Palm Jumeirah, Dubai',
    price: 45000000,
    image: 'https://via.placeholder.com/800x400?text=Penthouse+Hero',
    images: [
      'https://via.placeholder.com/200x150?text=Image+1',
      'https://via.placeholder.com/200x150?text=Image+2',
      'https://via.placeholder.com/200x150?text=Image+3',
      'https://via.placeholder.com/200x150?text=Image+4',
    ],
    description: 'Experience unparalleled luxury at the apex of Palm Jumeirah. This exquisite penthouse offers breathtaking views of the Arabian Gulf, state-of-the-art amenities, and bespoke interiors designed by world-renowned architects.',
    features: {
      beds: 5,
      baths: 7,
      sqft: 8400,
      yearBuilt: 2023,
      type: 'Penthouse',
    },
    amenities: [
      'Private Elevator',
      'Home Cinema',
      'Infinity Pool',
      'Spa & Sauna',
      'Wine Cellar',
      'Smart Home System',
    ],
    agent: {
      name: 'Marcus Sterling',
      title: 'Global Portfolio Manager',
      image: 'https://via.placeholder.com/80x80?text=Agent',
    },
  }

  return (
    <div className="bg-surface min-h-screen">
      <Navigation />

      <main className="md:ml-64 pb-32 md:pb-8">
        <Header title={property.title} showBack={true} />

        <div className="pt-24 px-4 md:px-8">
          <div className="max-w-container mx-auto">
            {/* Hero Image */}
            <div className="mb-8 rounded-lg overflow-hidden h-96">
              <img
                src={property.image}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Header Info */}
                <div>
                  <h1 className="text-display-lg-mobile md:text-display-lg font-bold mb-2">
                    {property.title}
                  </h1>
                  <p className="text-on-surface-variant flex items-center gap-2">
                    <span className="material-symbols-outlined">location_on</span>
                    {property.location}
                  </p>
                </div>

                {/* Price & Features */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card text-center">
                    <p className="text-secondary text-2xl font-bold">
                      AED {(property.price / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">Price</p>
                  </div>
                  <div className="card text-center">
                    <p className="text-secondary text-2xl font-bold">{property.features.beds}</p>
                    <p className="text-xs text-on-surface-variant mt-1">Bedrooms</p>
                  </div>
                  <div className="card text-center">
                    <p className="text-secondary text-2xl font-bold">{property.features.baths}</p>
                    <p className="text-xs text-on-surface-variant mt-1">Bathrooms</p>
                  </div>
                  <div className="card text-center">
                    <p className="text-secondary text-2xl font-bold">
                      {(property.features.sqft / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">Sq.Ft</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-headline-md font-semibold mb-3">About This Property</h3>
                  <p className="text-body-lg text-on-surface-variant">{property.description}</p>
                </div>

                {/* Amenities */}
                <div>
                  <h3 className="text-headline-md font-semibold mb-3">Amenities</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {property.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-secondary">check_circle</span>
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Image Gallery */}
                <div>
                  <h3 className="text-headline-md font-semibold mb-3">Gallery</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {property.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Gallery ${idx}`}
                        className="w-full h-32 object-cover rounded-md hover:opacity-80 transition cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Agent Card */}
                <div className="card p-6">
                  <h3 className="text-headline-md font-semibold mb-4">Listing Agent</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={property.agent.image}
                      alt={property.agent.name}
                      className="w-16 h-16 rounded-full"
                    />
                    <div>
                      <p className="font-semibold">{property.agent.name}</p>
                      <p className="text-xs text-on-surface-variant">{property.agent.title}</p>
                    </div>
                  </div>
                  <button className="w-full btn-primary mb-2">Contact Agent</button>
                  <button className="w-full btn-secondary">Schedule Tour</button>
                </div>

                {/* Actions */}
                <div className="card p-6">
                  <button className="w-full btn-primary mb-2">Make Offer</button>
                  <button className="w-full btn-secondary">Save Property</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
