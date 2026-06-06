import React, { useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

export default function Profile({ user, setUser }) {
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || 'Alex Sterling',
    email: user?.email || '',
    phone: '+971501234567',
    company: 'Sterling Global Partners',
    title: 'Global Portfolio Manager',
  })

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogout = () => {
    localStorage.removeItem('baytmiftah_user')
    localStorage.removeItem('baytmiftah_token')
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />

      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Profile" />

        <div className="px-4 pt-24 md:px-8">
          <div className="mx-auto grid max-w-container gap-8 xl:grid-cols-[360px_1fr]">
            <aside className="rounded-lg border border-outline-variant bg-surface-container p-7">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary text-on-secondary">
                <span className="material-symbols-outlined text-5xl">account_circle</span>
              </div>
              <h2 className="mt-6 text-3xl font-bold text-secondary">{formData.name}</h2>
              <p className="mt-1 text-on-surface-variant">{formData.title}</p>
              <p className="mt-1 text-sm text-on-surface-variant">{formData.company}</p>

              <div className="mt-8 space-y-3 border-t border-outline-variant pt-6">
                {[
                  ['verified_user', 'Verified client profile'],
                  ['notifications', 'Property alerts enabled'],
                  ['language', 'English / Arabic ready'],
                ].map(([icon, label]) => (
                  <div key={label} className="flex items-center gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-secondary">{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
            </aside>

            <div className="space-y-6">
              <section className="rounded-lg border border-outline-variant bg-surface-container p-6 md:p-8">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-3xl font-semibold text-secondary">
                      Account Information
                    </h3>
                    <p className="mt-1 text-on-surface-variant">
                      Keep contact and professional details current for agency workflows.
                    </p>
                  </div>
                  <button onClick={() => setEditMode(!editMode)} className="btn-secondary">
                    {editMode ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  {[
                    ['name', 'Full Name', 'text'],
                    ['email', 'Email', 'email'],
                    ['phone', 'Phone', 'tel'],
                    ['company', 'Company', 'text'],
                    ['title', 'Title', 'text'],
                  ].map(([name, label, type]) => (
                    <div key={name} className={name === 'title' ? 'md:col-span-2' : ''}>
                      <label className="text-label-sm mb-2 block">{label}</label>
                      <input
                        type={type}
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                        disabled={!editMode}
                        className={`input-field ${!editMode ? 'opacity-70' : ''}`}
                      />
                    </div>
                  ))}
                </div>

                {editMode && (
                  <button onClick={() => setEditMode(false)} className="btn-primary mt-6">
                    Save Changes
                  </button>
                )}
              </section>

              <section className="rounded-lg border border-outline-variant bg-surface-container p-6 md:p-8">
                <h3 className="text-3xl font-semibold text-secondary">Preferences</h3>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {[
                    { label: 'Email Notifications', checked: true },
                    { label: 'Marketing Updates', checked: false },
                    { label: 'Property Alerts', checked: true },
                  ].map((pref) => (
                    <label
                      key={pref.label}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-high px-4 py-3"
                    >
                      <input type="checkbox" defaultChecked={pref.checked} className="h-4 w-4" />
                      <span>{pref.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-error/50 bg-error/10 p-6">
                <h3 className="text-2xl font-semibold text-error">Account Access</h3>
                <p className="mt-2 text-on-surface-variant">
                  Signing out clears the local session for this browser.
                </p>
                <button onClick={handleLogout} className="btn-secondary mt-5 border-error text-error">
                  Sign Out
                </button>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
