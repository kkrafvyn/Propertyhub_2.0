import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Submit listing
    navigate('/my-listings')
  }

  return (
    <div className="bg-surface min-h-screen">
      <Navigation />

      <main className="md:ml-64 pb-32 md:pb-8">
        <Header title="Create New Listing" showBack={true} />

        <div className="pt-24 px-4 md:px-8">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="card p-6">
                <h3 className="text-headline-md font-semibold mb-4">Basic Information</h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-label-sm mb-2 block">Property Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="e.g., The Celestial Penthouse"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-label-sm mb-2 block">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="input-field resize-none"
                      rows="4"
                      placeholder="Describe your property..."
                      required
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-label-sm mb-2 block">Location</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="City, Area"
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
              </div>

              {/* Property Details */}
              <div className="card p-6">
                <h3 className="text-headline-md font-semibold mb-4">Property Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-label-sm mb-2 block">Bedrooms</label>
                    <input
                      type="number"
                      name="bedrooms"
                      value={formData.bedrooms}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-label-sm mb-2 block">Bathrooms</label>
                    <input
                      type="number"
                      name="bathrooms"
                      value={formData.bathrooms}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-label-sm mb-2 block">Square Feet</label>
                    <input
                      type="number"
                      name="sqft"
                      value={formData.sqft}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="card p-6">
                <h3 className="text-headline-md font-semibold mb-4">Pricing</h3>

                <div>
                  <label className="text-label-sm mb-2 block">Price (AED)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {/* Media Upload */}
              <div className="card p-6">
                <h3 className="text-headline-md font-semibold mb-4">Upload Images</h3>

                <div className="border-2 border-dashed border-outline rounded-lg p-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2 block">
                    cloud_upload
                  </span>
                  <p className="text-on-surface-variant mb-2">Drag and drop images here</p>
                  <button type="button" className="btn-secondary">
                    Select Files
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button type="submit" className="btn-primary flex-1">
                  Publish Listing
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/my-listings')}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
