import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-[#cbd3df] bg-white p-8 text-center shadow-sm">
        <p className="text-label-sm text-on-surface-variant mb-3">404</p>
        <h1 className="text-headline-md font-semibold mb-3">Page not found</h1>
        <p className="text-on-surface-variant mb-6">
          The route you opened does not exist in Property Hub.
        </p>
        <Link to="/" className="btn-primary inline-flex justify-center">
          Return home
        </Link>
      </div>
    </div>
  )
}
