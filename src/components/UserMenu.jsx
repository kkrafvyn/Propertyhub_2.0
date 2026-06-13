import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconMenu } from './icons'
import { useAuth } from '../context/AuthContext'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initial = user?.email?.charAt(0).toUpperCase() ?? 'B'

  async function handleSignOut() {
    await signOut()
    setOpen(false)
    navigate('/')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-surface-border bg-surface py-1.5 pl-3 pr-1.5 transition hover:shadow-search"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <IconMenu className="h-4 w-4 text-ink" />
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-dark text-sm font-medium text-brand">
          {initial}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-surface-border bg-surface py-2 shadow-card">
          {user ? (
            <>
              <p className="truncate px-4 py-2 text-sm font-medium text-ink">{user.email}</p>
              <hr className="my-2 border-surface-border" />
              <MenuLink to="/messages" onClick={() => setOpen(false)}>Messages</MenuLink>
              <MenuLink to="/profile" onClick={() => setOpen(false)}>Profile</MenuLink>
              <MenuLink to="/saved" onClick={() => setOpen(false)}>Saved</MenuLink>
              <MenuLink to="/trips" onClick={() => setOpen(false)}>Trips</MenuLink>
              <MenuLink to="/documents" onClick={() => setOpen(false)}>Documents</MenuLink>
              <MenuLink to="/agency" onClick={() => setOpen(false)}>Agency</MenuLink>
              <MenuLink to="/admin" onClick={() => setOpen(false)}>Admin</MenuLink>
              <MenuLink to="/host" onClick={() => setOpen(false)}>List your property</MenuLink>
              <hr className="my-2 border-surface-border" />
              <button
                type="button"
                onClick={handleSignOut}
                className="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-subtle"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <MenuLink to="/signup" onClick={() => setOpen(false)}>Sign up</MenuLink>
              <MenuLink to="/login" onClick={() => setOpen(false)}>Log in</MenuLink>
              <hr className="my-2 border-surface-border" />
              <MenuLink to="/host" onClick={() => setOpen(false)}>List your property</MenuLink>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuLink({ to, onClick, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-4 py-2 text-sm text-ink hover:bg-surface-subtle"
    >
      {children}
    </Link>
  )
}
