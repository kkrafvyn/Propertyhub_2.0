import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgencyStore } from '../../store/useAgencyStore'
import { DataBanner } from '../../components/UI'
import { uploadVerificationDocument } from '../../services/media-service'

const steps = ['Agency Identity', 'Verification', 'Team Setup', 'Confirmation']

export default function AgencyOnboarding() {
  const navigate = useNavigate()
  const { createAgency, loading, error } = useAgencyStore()
  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    taxId: '',
    website: '',
    email: '',
    phone: '',
    description: '',
  })
  const [documents, setDocuments] = useState([])
  const [documentWarning, setDocumentWarning] = useState('')

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const completedFields = [
    formData.name,
    formData.registrationNumber,
    formData.website,
    formData.taxId,
    formData.email,
    formData.phone,
    formData.description,
  ].filter(Boolean).length
  const progress = Math.round((completedFields / 7) * 100)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const agency = await createAgency({
      name: formData.name,
      slug: formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      ghana_business_registration_number: formData.registrationNumber,
      ghana_tax_identification_number: formData.taxId || null,
      website: formData.website || null,
      email: formData.email || null,
      phone: formData.phone || null,
      description: formData.description || null,
      verification_submitted_at: new Date().toISOString(),
    })

    if (documents.length > 0) {
      try {
        await Promise.all(
          documents.map((item) =>
            uploadVerificationDocument({
              organizationId: agency.id,
              file: item.file,
              documentType: item.documentType,
            })
          )
        )
      } catch (uploadError) {
        setDocumentWarning(
          uploadError.message ||
            'Agency saved, but documents could not upload. Check Storage policies.'
        )
        return
      }
    }

    navigate('/agency/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#f5f7fc] text-[#071121]">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-[#d8dde6] bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Agency onboarding</h1>
          <p className="hidden text-sm text-[#596170] sm:block">BaytMiftah verification workspace</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-[#f5f7fc]" aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-[#f5f7fc]" aria-label="Settings">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <img
            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80"
            alt=""
            className="h-11 w-11 rounded-full object-cover"
          />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="panel-light">
            <h2 className="text-2xl font-semibold">Onboarding</h2>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-[#596170]">
                <span>Profile readiness</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#d8dde6]">
                <div
                  className="h-full rounded-full bg-[#E9C349] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="mt-8 space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className={`flex min-h-14 items-center gap-4 rounded-md px-4 py-3 ${
                    index === 0 ? 'bg-[#fff7d6] text-[#071121]' : 'bg-[#f8faff] text-[#596170]'
                  }`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-semibold ${index === 0 ? 'border-[#E9C349] bg-[#E9C349] text-[#071121]' : 'border-[#d8dde6] bg-white'}`}>
                    {index + 1}
                  </span>
                  <span className="font-semibold">{step}</span>
                </div>
              ))}
            </div>
            <p className="mt-8 border-t border-[#d8dde6] pt-5 text-sm leading-6 text-[#596170]">
              Setting up your agency profile ensures compliance and unlocks the full suite
              of BaytMiftah&apos;s listing, team, and verification tools.
            </p>
          </section>

          <section className="rounded-lg bg-[#111827] p-5 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#F5D76B]">
              <span className="material-symbols-outlined mr-2 align-middle">lightbulb</span>
              Expert Tip
            </p>
            <p className="mt-4 text-sm leading-6 text-[#CBD5E1]">
              Having your trade license and tax ID ready helps reviewers validate the agency faster.
            </p>
          </section>
        </aside>

        <section className="overflow-hidden rounded-lg border border-[#cbd3df] bg-white shadow-sm">
          <div className="h-2 w-1/4 bg-[#E9C349]" />
          <form
            onSubmit={handleSubmit}
          >
            <div className="p-5 sm:p-6 lg:p-8">
              <h2 className="text-3xl font-semibold">Agency Identity</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#596170]">
                Provide the foundational details of your enterprise.
              </p>
              <DataBanner
                className="mt-6"
                title="Verification package"
                description="Completing identity, tax, contact, and operating profile fields prepares the agency for admin review."
              />
              {documentWarning && (
                <DataBanner
                  className="mt-4"
                  variant="warning"
                  title="Document upload needs attention"
                  description={documentWarning}
                />
              )}

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-[#303744]">Agency Name</span>
                  <input
                    required
                    value={formData.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder="e.g. Global Realty Partners"
                    className="mt-2 min-h-11 w-full rounded-md border border-[#b9c3d2] bg-white px-4 text-base outline-none focus:border-[#E9C349]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[#303744]">License Number</span>
                  <input
                    required
                    value={formData.registrationNumber}
                    onChange={(event) => updateField('registrationNumber', event.target.value)}
                    placeholder="TX-9920-X12"
                    className="mt-2 min-h-11 w-full rounded-md border border-[#b9c3d2] bg-white px-4 text-base outline-none focus:border-[#E9C349]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[#303744]">Website</span>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(event) => updateField('website', event.target.value)}
                    placeholder="https://agency.example"
                    className="mt-2 min-h-11 w-full rounded-md border border-[#b9c3d2] bg-white px-4 text-base outline-none focus:border-[#E9C349]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[#303744]">Tax ID</span>
                  <input
                    value={formData.taxId}
                    onChange={(event) => updateField('taxId', event.target.value)}
                    placeholder="Ghana TIN"
                    className="mt-2 min-h-11 w-full rounded-md border border-[#b9c3d2] bg-white px-4 text-base outline-none focus:border-[#E9C349]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[#303744]">Contact Email</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    placeholder="ops@agency.example"
                    className="mt-2 min-h-11 w-full rounded-md border border-[#b9c3d2] bg-white px-4 text-base outline-none focus:border-[#E9C349]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-[#303744]">Phone</span>
                  <input
                    value={formData.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    placeholder="+233..."
                    className="mt-2 min-h-11 w-full rounded-md border border-[#b9c3d2] bg-white px-4 text-base outline-none focus:border-[#E9C349]"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-[#303744]">Company Bio</span>
                  <textarea
                    rows="4"
                    value={formData.description}
                    onChange={(event) => updateField('description', event.target.value)}
                    placeholder="Briefly describe your agency's mission..."
                    className="mt-2 w-full rounded-md border border-[#b9c3d2] bg-white px-4 py-3 text-base outline-none focus:border-[#E9C349]"
                  />
                </label>
                <div className="md:col-span-2">
                  <span className="text-sm font-semibold text-[#303744]">Verification Documents</span>
                  <div className="mt-2 rounded-lg border border-dashed border-[#b9c3d2] bg-[#f8faff] p-5">
                    <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md bg-black px-5 py-3 font-semibold text-white">
                      Upload Documents
                      <input
                        type="file"
                        multiple
                        accept="application/pdf,image/*"
                        className="sr-only"
                        onChange={(event) =>
                          setDocuments((current) => [
                            ...current,
                            ...Array.from(event.target.files || []).map((file) => ({
                              id: `${file.name}-${file.size}-${Date.now()}`,
                              file,
                              documentType: 'agency_license',
                            })),
                          ])
                        }
                      />
                    </label>
                    <div className="mt-4 grid gap-3">
                      {documents.map((item) => (
                        <div key={item.id} className="grid gap-2 rounded-md bg-white p-3 md:grid-cols-[1fr_220px]">
                          <p className="truncate font-semibold">{item.file.name}</p>
                          <select
                            value={item.documentType}
                            onChange={(event) =>
                              setDocuments((current) =>
                                current.map((doc) =>
                                  doc.id === item.id
                                    ? { ...doc, documentType: event.target.value }
                                    : doc
                                )
                              )
                            }
                            className="rounded border border-[#b9c3d2] px-3 py-2"
                          >
                            <option value="agency_license">Agency license</option>
                            <option value="tax_certificate">Tax certificate</option>
                            <option value="business_registration">Business registration</option>
                            <option value="identity_document">Identity document</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <footer className="flex flex-col gap-3 border-t border-[#cbd3df] p-5 sm:flex-row sm:items-center sm:justify-end sm:p-6 lg:p-8">
              {error && <p className="mr-auto text-red-600">{error}</p>}
              <button
                disabled={loading}
                className="min-h-11 rounded-md bg-black px-8 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Continue'}
              </button>
            </footer>
          </form>
        </section>
      </main>
    </div>
  )
}
