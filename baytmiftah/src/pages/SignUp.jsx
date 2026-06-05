import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function SignUp({ setUser }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'buyer',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const user = {
        id: '1',
        name: formData.name,
        email: formData.email,
        role: formData.role,
        verified: false,
      }

      localStorage.setItem('baytmiftah_user', JSON.stringify(user))
      setUser(user)
      navigate('/')
    } catch (err) {
      setError('Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-secondary mb-2">BaytMiftah</h1>
          <p className="text-on-surface-variant">Request Premium Access</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
          {error && (
            <div className="p-4 bg-error/20 border border-error rounded-md">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-label-sm mb-2 text-on-surface">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-field"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-label-sm mb-2 text-on-surface">
              Professional Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
              placeholder="name@firm.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-label-sm mb-2 text-on-surface">
              Access Key
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-label-sm mb-2 text-on-surface">
              Account Type
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="input-field"
            >
              <option value="buyer">Buyer / Investor</option>
              <option value="agent">Agent / Advisor</option>
              <option value="owner">Property Owner</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-on-surface-variant">
            Already have access?{' '}
            <Link to="/login" className="text-secondary hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
