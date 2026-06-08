import React from 'react'

const paths = {
  eye: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eye_off: (
    <>
      <path d="m3 3 18 18" />
      <path d="M10.6 6.2A10.4 10.4 0 0 1 12 6c6 0 9.5 6 9.5 6a16.7 16.7 0 0 1-3 3.6" />
      <path d="M6.5 6.9C3.9 8.6 2.5 12 2.5 12s3.5 6 9.5 6c1.5 0 2.8-.4 4-1" />
      <path d="M10.2 10.2a3 3 0 0 0 3.6 3.6" />
    </>
  ),
  spinner: (
    <>
      <path d="M12 3a9 9 0 1 1-8.5 6" />
      <path d="M3.5 9H8V4.5" />
    </>
  ),
  google: (
    <>
      <path d="M20.5 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9a8.7 8.7 0 0 0 2.6-6.6Z" />
      <path d="M12 21c2.4 0 4.4-.8 5.9-2.2L15 16.6a5.4 5.4 0 0 1-8-2.9H4v2.3A9 9 0 0 0 12 21Z" />
      <path d="M7 13.7a5.4 5.4 0 0 1 0-3.4V8H4a9 9 0 0 0 0 8Z" />
      <path d="M12 6.6c1.3 0 2.5.5 3.4 1.3L18 5.3A8.8 8.8 0 0 0 12 3 9 9 0 0 0 4 8l3 2.3a5.4 5.4 0 0 1 5-3.7Z" />
    </>
  ),
  apple: (
    <>
      <path d="M15.5 4.2c-.7.8-1.7 1.4-2.7 1.3-.1-1 .4-2 1-2.7.7-.8 1.8-1.4 2.7-1.4.1 1-.3 2-1 2.8Z" />
      <path d="M19.2 16.5c-.5 1.1-.8 1.6-1.5 2.6-1 1.4-2.4 3.1-4.1 3.1-1.5 0-1.9-1-3.9-1s-2.5 1-3.9 1c-1.7.1-3-1.5-4-2.9-2.8-4-3.1-8.8-1.4-11.3A5.1 5.1 0 0 1 4.6 5.7c1.6 0 2.6 1 3.9 1 1.3 0 2.1-1 4-1 1.4 0 2.9.8 4 2.1-3.5 1.9-2.9 6.9.7 8.7Z" />
    </>
  ),
}

export default function AuthFormIcon({ name, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-5 w-5 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  )
}
