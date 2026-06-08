import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Header from '../components/Header'
import marketplaceService from '../services/marketplace-service'
import { DataBanner } from '../components/UI'
import {
  uploadPropertyMedia,
  uploadVerificationDocument,
} from '../services/media-service'
import BackendStatusBanner from '../components/BackendStatusBanner'
import { reviewListingQualityWithAI } from '../services/listing-review-service'

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
  const [success, setSuccess] = useState('')
  const [mediaFiles, setMediaFiles] = useState([])
  const [verificationDocs, setVerificationDocs] = useState([])
  const [submitAction, setSubmitAction] = useState('published')
  const [uploadProgress, setUploadProgress] = useState(null)
  const [uploadWarning, setUploadWarning] = useState('')
  const [aiReview, setAiReview] = useState(null)
  const [aiReviewing, setAiReviewing] = useState(false)

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

  const checklist = [
    { label: 'Property title', done: Boolean(formData.title.trim()) },
    { label: 'Buyer-ready description', done: formData.description.trim().length >= 40 },
    { label: 'Location and type', done: Boolean(formData.location.trim() && formData.type) },
    { label: 'Price and measurements', done: Boolean(formData.price && formData.sqft) },
    { label: 'At least one amenity', done: formData.amenities.length > 0 },
    { label: 'Media selected', done: mediaFiles.length > 0 },
  ]
  const verificationChecklist = [
    { label: 'Address or GhanaPost GPS supplied', done: Boolean(formData.location.trim()) },
    { label: 'Ownership or mandate document staged', done: verificationDocs.length > 0 },
    { label: 'Pricing and measurements ready', done: Boolean(formData.price && formData.sqft) },
    { label: 'Agency review required before verification badge', done: true },
  ]
  const readyCount = checklist.filter((item) => item.done).length
  const canPublish = readyCount === checklist.length

  const runAiReview = async () => {
    setAiReviewing(true)
    setAiReview(
      await reviewListingQualityWithAI({
        formData,
        mediaCount: mediaFiles.length,
        documentCount: verificationDocs.length,
        checklist,
      })
    )
    setAiReviewing(false)
  }

  const handleMediaSelect = (event) => {
    const staged = Array.from(event.target.files || []).map((file, index) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      isPrimary: mediaFiles.length === 0 && index === 0,
    }))
    setMediaFiles((current) => [...current, ...staged])
  }

  const removeMedia = (id) => {
    setMediaFiles((current) => {
      const next = current.filter((item) => item.id !== id)
      return next.map((item, index) => ({
        ...item,
        isPrimary: item.isPrimary || (index === 0 && !next.some((nextItem) => nextItem.isPrimary)),
      }))
    })
  }

  const makePrimary = (id) => {
    setMediaFiles((current) =>
      current.map((item) => ({ ...item, isPrimary: item.id === id }))
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const ownedOrganization = await marketplaceService.getOwnedOrganization()

      if (!ownedOrganization) {
        throw new Error('Create or verify your agency profile before publishing listings.')
      }
      const [city, ...neighborhoodParts] = formData.location
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)

      if (submitAction === 'published' && !canPublish) {
        throw new Error('Complete the publishing checklist before publishing.')
      }

      const workflowStatus = {
        draft: 'draft',
        review: 'submitted_for_review',
        published: 'published',
      }[submitAction]

      const listing = await marketplaceService.createListing({
        organizationId: ownedOrganization.id,
        property: {
          title: formData.title,
          address: formData.location,
          city: city || formData.location,
          neighborhood: neighborhoodParts.join(', ') || null,
          category: formData.type,
          property_type: formData.type,
          bedrooms: Number(formData.bedrooms),
          bathrooms: Number(formData.bathrooms),
          square_meters: Math.round(Number(formData.sqft) / 10.7639),
          sqft: Number(formData.sqft),
          description: `${formData.title}\n\n${formData.description}`,
          amenities: formData.amenities,
          address_verified: false,
          location_confidence: 0,
          flood_risk_level: 'unknown',
          verification_checklist: Object.fromEntries(
            verificationChecklist.map((item) => [item.label, item.done])
          ),
        },
        listing: {
          listing_type: 'sale',
          price: Number(formData.price),
          currency: 'GHS',
          status: submitAction === 'draft' ? 'draft' : 'listed',
          visibility: submitAction === 'published' ? 'public' : 'private',
          workflow_status: workflowStatus,
          submitted_for_review_at:
            submitAction === 'review' ? new Date().toISOString() : null,
          quality_score: 72,
          whatsapp_enabled: true,
          metadata: {
            ai_review: aiReview,
            verification_documents: verificationDocs.map((item) => ({
              name: item.file.name,
              documentType: item.documentType,
            })),
          },
        },
      })

      const uploadedDocuments = []
      if (verificationDocs.length > 0) {
        for (const item of verificationDocs) {
          const uploadedDocument = await uploadVerificationDocument({
            organizationId: ownedOrganization.id,
            propertyId: listing.propertyId,
            listingId: listing.id,
            file: item.file,
            documentType: item.documentType,
          })
          uploadedDocuments.push(uploadedDocument)
        }
      }

      if (mediaFiles.length > 0) {
        try {
          await uploadPropertyMedia({
            propertyId: listing.propertyId,
            listingId: listing.id,
            files: mediaFiles,
            title: formData.title,
            onProgress: setUploadProgress,
          })
        } catch (uploadError) {
          setUploadWarning(
            uploadError.message ||
              'Listing saved, but media upload failed. Check Storage bucket policies.'
          )
          if (submitAction === 'published') return
        }
      }

      if (uploadedDocuments.length > 0) {
        setSuccess(`${uploadedDocuments.length} verification document staged for review.`)
      }

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
          <BackendStatusBanner className="mx-auto mb-6 max-w-container" />
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

              <section className="rounded-lg border border-outline-variant bg-surface-container p-6 md:p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-secondary">AI Listing Review</h3>
                    <p className="mt-2 text-on-surface-variant">
                      Score the listing package before publish and generate review notes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runAiReview}
                    disabled={aiReviewing}
                    className="btn-secondary disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined">auto_awesome</span>
                    {aiReviewing ? 'Reviewing...' : 'Review Listing'}
                  </button>
                </div>

                {aiReview && (
                  <div className="mt-6 grid gap-4 lg:grid-cols-[180px_1fr]">
                    <div className="rounded-lg bg-secondary p-5 text-on-secondary">
                      <p className="text-sm uppercase tracking-widest">Quality score</p>
                      <p className="mt-2 text-5xl font-bold">{aiReview.score}</p>
                      <p className="mt-2 text-xs uppercase tracking-widest opacity-70">
                        {aiReview.source || 'local'}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        ['Missing info', aiReview.issues],
                        ['Suggestions', aiReview.suggestions],
                        ['Risk signals', aiReview.riskSignals],
                        ['Admin note', [aiReview.adminReviewNote]],
                      ].map(([label, items]) => (
                        <div key={label} className="rounded-lg border border-outline-variant bg-surface p-4">
                          <p className="font-semibold">{label}</p>
                          <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
                            {(items.length ? items : ['No items flagged.']).map((item) => (
                              <li key={item} className="flex gap-2">
                                <span className="material-symbols-outlined text-base text-secondary">check_circle</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div className="lg:col-span-2 rounded-lg bg-surface p-4">
                      <p className="font-semibold">Suggested title</p>
                      <p className="mt-2 text-on-surface-variant">{aiReview.titleSuggestion}</p>
                      <p className="mt-4 font-semibold">Description guidance</p>
                      <p className="mt-2 text-on-surface-variant">{aiReview.descriptionSuggestion}</p>
                    </div>
                  </div>
                )}
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
                  <label className="btn-secondary mt-5 inline-flex cursor-pointer">
                    Select Files
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="sr-only"
                      onChange={handleMediaSelect}
                    />
                  </label>
                </div>
                {mediaFiles.length > 0 && (
                  <div className="mt-4 grid gap-3">
                    {mediaFiles.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-3 rounded-md bg-surface p-3 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.preview}
                            alt=""
                            className="h-14 w-16 rounded object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{item.file.name}</p>
                            <p className="text-on-surface-variant">
                              {(item.file.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => makePrimary(item.id)}
                            className={`rounded-md px-3 py-2 ${
                              item.isPrimary ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high'
                            }`}
                          >
                            Primary
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMedia(item.id)}
                            className="rounded-md bg-error/10 px-3 py-2 text-error"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {uploadProgress && (
                  <p className="mt-3 text-sm text-on-surface-variant">
                    {uploadProgress.status === 'complete' ? 'Uploaded' : 'Uploading'}{' '}
                    {uploadProgress.fileName} ({uploadProgress.index + 1} of{' '}
                    {uploadProgress.total})
                  </p>
                )}
              </section>

              <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
                <h3 className="text-2xl font-semibold text-secondary">Verification</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Upload ownership proof, agency mandate, or land/title documents for review.
                </p>
                <label className="btn-secondary mt-5 inline-flex cursor-pointer">
                  Add Documents
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/*"
                    className="sr-only"
                    onChange={(event) =>
                      setVerificationDocs((current) => [
                        ...current,
                        ...Array.from(event.target.files || []).map((file) => ({
                          id: `${file.name}-${file.size}-${Date.now()}`,
                          file,
                          documentType: 'ownership_proof',
                        })),
                      ])
                    }
                  />
                </label>
                <div className="mt-4 space-y-3">
                  {verificationDocs.map((item) => (
                    <div key={item.id} className="rounded-md bg-surface p-3">
                      <p className="truncate font-semibold">{item.file.name}</p>
                      <select
                        value={item.documentType}
                        onChange={(event) =>
                          setVerificationDocs((current) =>
                            current.map((doc) =>
                              doc.id === item.id
                                ? { ...doc, documentType: event.target.value }
                                : doc
                            )
                          )
                        }
                        className="input-field mt-2"
                      >
                        <option value="ownership_proof">Ownership proof</option>
                        <option value="agency_mandate">Agency mandate</option>
                        <option value="tax_certificate">Tax certificate</option>
                        <option value="address_evidence">Address evidence</option>
                      </select>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-outline-variant bg-[#111827] p-6 text-white">
                <span className="material-symbols-outlined text-3xl">task_alt</span>
                <h3 className="mt-4 text-2xl font-semibold">Publishing checklist</h3>
                <p className="mt-2 text-sm text-white/60">{readyCount} of {checklist.length} checks ready</p>
                <ul className="mt-4 space-y-3 text-white/75">
                  {checklist.map((item) => (
                    <li key={item.label} className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${item.done ? 'text-[#E9C349]' : 'text-white/35'}`}>
                        {item.done ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      {item.label}
                    </li>
                  ))}
                </ul>
              </section>

              <DataBanner
                variant={uploadWarning ? 'warning' : 'info'}
                title={uploadWarning ? 'Storage upload needs attention' : 'Storage upload enabled'}
                description={
                  uploadWarning ||
                  'Selected media and verification documents upload to the property-media bucket when the listing is saved.'
                }
              />

              <div className="grid gap-3">
                {success && (
                  <div className="rounded-lg border border-success bg-success/10 p-3 text-sm text-success">
                    {success}
                  </div>
                )}
                {error && (
                  <div className="rounded-lg border border-error bg-error/10 p-3 text-sm text-error">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || !canPublish}
                  onClick={() => setSubmitAction('published')}
                  className="btn-primary w-full justify-center disabled:opacity-50"
                >
                  {loading ? 'Publishing...' : 'Publish Listing'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  onClick={() => setSubmitAction('review')}
                  className="btn-secondary w-full justify-center"
                >
                  Submit for Verification
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  onClick={() => setSubmitAction('draft')}
                  className="btn-secondary w-full justify-center"
                >
                  Save Draft
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
