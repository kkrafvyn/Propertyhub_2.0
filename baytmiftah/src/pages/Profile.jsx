import React, { useState } from 'react'
import Navigation from '../components/Navigation'
import Header from '../components/Header'

export default function Profile({ user, setUser }) {
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '+971501234567',
    company: 'Sterling Global Partners',
    title: 'Global Portfolio Manager',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    // Save changes
    setEditMode(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('baytmiftah_user')
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <div className="bg-surface min-h-screen">
      <Navigation />

      <main className="md:ml-64 pb-32 md:pb-8">
        <Header title="Profile" />

        <div className="pt-24 px-4 md:px-8">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Profile Header */}
            <div className="card p-8 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-secondary to-primary mx-auto mb-4 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-on-secondary">account_circle</span>
              </div>
              <h2 className="text-headline-md font-bold mb-1">{formData.name}</h2>
              <p className="text-on-surface-variant mb-2">{formData.title}</p>
              <p className="text-on-surface-variant text-sm">{formData.company}</p>
            </div>

            {/* Account Information */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-headline-md font-semibold">Account Information</h3>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="btn-secondary text-sm"
                >
                  {editMode ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-label-sm mb-2 block">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!editMode}
                    className={editMode ? 'input-field' : 'input-field opacity-50 cursor-not-allowed'}
                  />
                </div>

                <div>
                  <label className="text-label-sm mb-2 block">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!editMode}
                    className={editMode ? 'input-field' : 'input-field opacity-50 cursor-not-allowed'}
                  />
                </div>

                <div>
                  <label className="text-label-sm mb-2 block">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!editMode}
                    className={editMode ? 'input-field' : 'input-field opacity-50 cursor-not-allowed'}
                  />
                </div>

                <div>
                  <label className="text-label-sm mb-2 block">Company</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    disabled={!editMode}
                    className={editMode ? 'input-field' : 'input-field opacity-50 cursor-not-allowed'}
                  />
                </div>

                <div>
                  <label className="text-label-sm mb-2 block">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    disabled={!editMode}
                    className={editMode ? 'input-field' : 'input-field opacity-50 cursor-not-allowed'}
                  />
                </div>

                {editMode && (
                  <button onClick={handleSave} className="btn-primary w-full mt-4">
                    Save Changes
                  </button>
                )}
              </div>
            </div>

            {/* Preferences */}
            <div className="card p-6">
              <h3 className="text-headline-md font-semibold mb-4">Preferences</h3>
              <div className="space-y-3">
                {[
                  { label: 'Email Notifications', checked: true },
                  { label: 'Marketing Updates', checked: false },
                  { label: 'Property Alerts', checked: true },
                ].map((pref) => (
                  <label key={pref.label} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={pref.checked}
                      className="w-4 h-4"
                    />
                    <span>{pref.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="card p-6 border-error/50">
              <h3 className="text-headline-md font-semibold mb-4 text-error">Danger Zone</h3>
              <button
                onClick={handleLogout}
                className="btn-secondary text-error border-error w-full"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
