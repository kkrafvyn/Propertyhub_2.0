import React from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

export default function Favorites() {
  const [favorites] = React.useState([
    {
      id: 1,
      title: 'The Celestial Penthouse',
      location: 'Palm Jumeirah, Dubai',
      price: 45000000,
      image: 'https://via.placeholder.com/300x200?text=Penthouse',
      beds: 5,
      baths: 7,
      sqft: 8400,
      savedDate: '3 days ago',
    },
    {
      id: 2,
      title: 'Emirates Hills Villa',
      location: 'Emirates Hills, Dubai',
      price: 82000000,
      image: 'https://via.placeholder.com/300x200?text=Villa',
      beds: 7,
      baths: 8,
      sqft: 12000,
      savedDate: '1 week ago',
    },
  ])

  return (
    <div className="bg-surface min-h-screen">
      <Navigation />

      <main className="md:ml-64 pb-32 md:pb-8">
        <Header title="Saved Listings" />

        <div className="pt-24 px-4 md:px-8">
          <div className="max-w-container mx-auto">
            <h2 className="text-headline-md font-semibold mb-6">
              Your Favorite Properties ({favorites.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {favorites.map((property) => (
                <div key={property.id} className="card overflow-hidden hover:border-secondary/50 transition">
                  <div className="relative">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="w-full h-48 object-cover"
                    />
                    <button className="absolute top-3 right-3 p-2 bg-secondary/80 rounded-full hover:bg-secondary transition">
                      <span className="material-symbols-outlined text-on-secondary">favorite</span>
                    </button>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold mb-1">{property.title}</h3>
                    <p className="text-sm text-on-surface-variant mb-3">{property.location}</p>

                    <div className="flex gap-4 mb-3 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">bed</span>
                        {property.beds}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">shower</span>
                        {property.baths}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">aspect_ratio</span>
                        {property.sqft.toLocaleString()} sqft
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-3">
                      <p className="text-secondary font-bold">AED {property.price.toLocaleString()}</p>
                      <p className="text-xs text-on-surface-variant">Saved {property.savedDate}</p>
                    </div>

                    <button className="w-full btn-primary">Schedule Tour</button>
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
