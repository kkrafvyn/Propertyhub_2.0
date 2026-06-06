import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import marketplaceService from '../services/marketplace-service'
import { supabase } from '../lib/supabase'

const amenities = ['Pool', 'Private Elevator', 'Smart Home', 'Concierge', 'Cinema', 'Gym']

export default function CreateListing() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    price: '',
    type: 'villa',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    amenities: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const toggleAmenity = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity],
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Please sign in before publishing a listing.')
      }

      const ownedOrganization = await marketplaceService.getOwnedOrganization(user.id)

      if (!ownedOrganization) {
        throw new Error('Create or verify your agency profile before publishing listings.')
      }
      const [city, ...neighborhoodParts] = formData.location
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)

      const listing = await marketplaceService.createListing({
        organizationId: ownedOrganization.id,
        property: {
          address: formData.location,
          city: city || formData.location,
          neighborhood: neighborhoodParts.join(', ') || null,
          category: formData.type,
          bedrooms: Number(formData.bedrooms),
          bathrooms: Number(formData.bathrooms),
          square_meters: Math.round(Number(formData.sqft) / 10.7639),
          description: `${formData.title}\n\n${formData.description}`,
          amenities: formData.amenities,
          address_verified: false,
          location_confidence: 0,
          flood_risk_level: 'unknown',
        },
        listing: {
          listing_type: 'sale',
          price: Number(formData.price),
          currency: 'GHS',
          status: 'listed',
          visibility: 'public',
          quality_score: 72,
          whatsapp_enabled: true,
        },
      })

      navigate(`/property/${listing.id}`)
    } catch (err) {
      setError(
        err.message ||
          'Unable to publish this listing. Check Supabase table policies and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />

      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Create New Listing" showBack />

        <div className="px-4 pt-24 md:px-8">
          <form onSubmit={handleSubmit} className="mx-auto grid max-w-container gap-8 xl:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <section className="rounded-lg border border-outline-variant bg-surface-container p-6 md:p-8">
                <p className="text-label-sm text-secondary">Listing package</p>
                <h2 className="mt-2 text-3xl font-semibold text-secondary">
                  Present the property with the detail premium buyers expect.
                </h2>

                <div className="mt-8 grid gap-5">
                  <div>
                    <label className="text-label-sm mb-2 block">Property Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="e.g. The Obsidian Penthouse"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-label-sm mb-2 block">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="input-field min-h-36 resize-none"
                      placeholder="Describe the architecture, light, privacy, smart features, and buyer profile..."
                      required
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="text-label-sm mb-2 block">Location</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="City, district, community"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-label-sm mb-2 block">Property Type</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="input-field"
                      >
                        <option value="villa">Villa</option>
                        <option value="penthouse">Penthouse</option>
                        <option value="apartment">Apartment</option>
                        <option value="townhouse">Townhouse</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-outline-variant bg-surface-container p-6 md:p-8">
                <h3 className="text-2xl font-semibold text-secondary">Property Details</h3>
                <div className="mt-5 grid gap-5 md:grid-cols-4">
                  {[
                    ['bedrooms', 'Bedrooms'],
                    ['bathrooms', 'Bathrooms'],
                    ['sqft', 'Square Feet'],
                    ['price', 'Price (GHS)'],
                  ].map(([name, label]) => (
                    <div key={name} className={name === 'price' ? 'md:col-span-1' : ''}>
                      <label className="text-label-sm mb-2 block">{label}</label>
                      <input
                        type="number"
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="0"
                        required
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-outline-variant bg-surface-container p-6 md:p-8">
                <h3 className="text-2xl font-semibold text-secondary">Amenities</h3>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {amenities.map((amenity) => (
                    <label
                      key={amenity}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${
                        formData.amenities.includes(amenity)
                          ? 'border-secondary bg-secondary/10 text-secondary'
                          : 'border-outline-variant bg-surface-container-high'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="h-4 w-4"
                      />
                      <span className="font-semibold">{amenity}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
                <h3 className="text-2xl font-semibold text-secondary">Media</h3>
                <div className="mt-5 rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-high p-8 text-center">
                  <span className="material-symbols-outlined block text-4xl text-secondary">
                    cloud_upload
                  </span>
                  <p className="mt-3 font-semibold">Upload hero and gallery images</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Use wide, bright images that show the property clearly.
                  </p>
                  <button type="button" className="btn-secondary mt-5">
                    Select Files
                  </button>
                </div>
                <p className="mt-3 text-sm text-on-surface-variant">
                  Media upload storage is not connected yet; the listing will publish with
                  fallback imagery until Storage policies are added.
                </p>
              </section>

              <section className="rounded-lg border border-outline-variant bg-[#111827] p-6 text-white">
                <span className="material-symbols-outlined text-3xl">task_alt</span>
                <h3 className="mt-4 text-2xl font-semibold">Publishing checklist</h3>
                <ul className="mt-4 space-y-3 text-white/75">
                  <li>Title and location are buyer-readable</li>
                  <li>Price and measurements are verified</li>
                  <li>Media shows rooms, exterior, and amenities</li>
                </ul>
              </section>

              <div className="grid gap-3">
                {error && (
                  <div className="rounded-lg border border-error bg-error/10 p-3 text-sm text-error">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center disabled:opacity-50"
                >
                  {loading ? 'Publishing...' : 'Publish Listing'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/my-listings')}
                  className="btn-secondary w-full justify-center"
                >
                  Cancel
                </button>
              </div>
            </aside>
          </form>
        </div>
      </main>
    </div>
  )
}
