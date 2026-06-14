import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconMenu } from './icons'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const { t } = useTranslation()
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

  const initial = user?.email?.charAt(0).toUpperCase() ?? 'G'

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
        className="flex items-center gap-3 rounded-full border border-surface-border bg-surface py-1.5 pl-3 pr-1.5 transition hover:shadow-search"
        aria-label={t('nav.openMenu')}
        aria-expanded={open}
      >
        <IconMenu className="h-4 w-4 text-ink" />
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-secondary text-sm font-medium text-white">
          {initial}
        </span>
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-surface-border bg-surface py-2 shadow-menu">
          {user ? (
            <>
              <p className="truncate px-4 py-2 text-sm font-medium text-ink">{user.email}</p>
              <hr className="my-2 border-surface-border" />
              <MenuLink to="/messages" onClick={() => setOpen(false)}>{t('menu.messages')}</MenuLink>
              <MenuLink to="/profile" onClick={() => setOpen(false)}>{t('menu.profile')}</MenuLink>
              <MenuLink to="/saved" onClick={() => setOpen(false)}>{t('menu.saved')}</MenuLink>
              <MenuLink to="/trips" onClick={() => setOpen(false)}>{t('menu.trips')}</MenuLink>
              <MenuLink to="/documents" onClick={() => setOpen(false)}>{t('menu.documents')}</MenuLink>
              <MenuLink to="/agency" onClick={() => setOpen(false)}>{t('menu.agency')}</MenuLink>
              <MenuLink to="/admin" onClick={() => setOpen(false)}>{t('menu.admin')}</MenuLink>
              <MenuLink to="/host" onClick={() => setOpen(false)}>{t('menu.listProperty')}</MenuLink>
              <hr className="my-2 border-surface-border" />
              <button
                type="button"
                onClick={handleSignOut}
                className="block w-full px-4 py-2 text-start text-sm text-ink hover:bg-surface-hover"
              >
                {t('menu.logOut')}
              </button>
            </>
          ) : (
            <>
              <MenuLink to="/signup" onClick={() => setOpen(false)}>{t('auth.signUp')}</MenuLink>
              <MenuLink to="/login" onClick={() => setOpen(false)}>{t('auth.logIn')}</MenuLink>
              <hr className="my-2 border-surface-border" />
              <MenuLink to="/host" onClick={() => setOpen(false)}>{t('menu.listProperty')}</MenuLink>
              <MenuLink to="/help" onClick={() => setOpen(false)}>{t('menu.help')}</MenuLink>
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
      className="block px-4 py-2 text-sm text-ink hover:bg-surface-hover"
    >
      {children}
    </Link>
  )
}
