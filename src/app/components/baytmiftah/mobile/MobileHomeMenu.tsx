import { useEffect } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../../context/AuthContext'
import { useTranslation } from '../../../i18n/LocaleContext'
import { LogoMark } from '../Logo'
import { IconClose } from '../icons'
import ConsumerMenuContent from '../consumer/ConsumerMenuContent'

function getInitials(user) {
  return (
    user?.user_metadata?.full_name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    'BM'
  )
}

export default function MobileHomeMenu({ open, onClose }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return (
    <div className="bm-mobile-menu-overlay fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="bm-mobile-menu-backdrop flex-1"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div className="bm-mobile-menu-panel flex h-full w-[min(100%,360px)] flex-col shadow-2xl">
        <header className="bm-mobile-menu-header relative overflow-hidden px-5 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/[0.06] blur-2xl" aria-hidden />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <LogoMark className="h-10 w-10 shrink-0" inverted />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  BaytMiftah
                </p>
                <h2 className="truncate text-lg font-bold text-white">{t('mobile.menu')}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
              aria-label={t('common.close')}
            >
              <IconClose className="h-5 w-5" />
            </button>
          </div>

          {user ? (
            <Link
              to="/app"
              onClick={onClose}
              className="relative mt-4 flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.08] px-3 py-2.5 backdrop-blur-sm transition hover:bg-white/[0.12]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-[#c45d44] text-sm font-bold text-white">
                {getInitials(user)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
                <p className="truncate text-xs text-white/55">{user.email}</p>
              </div>
            </Link>
          ) : (
            <div className="relative mt-4 flex gap-2">
              <Link
                to="/login"
                onClick={onClose}
                className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/15"
              >
                {t('auth.logIn')}
              </Link>
              <Link
                to="/signup"
                onClick={onClose}
                className="flex-1 rounded-full bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#0f2922] transition hover:bg-white/90"
              >
                {t('auth.signUp')}
              </Link>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain bg-[#f7f7f5]">
          <ConsumerMenuContent onNavigate={onClose} showIntro={false} />
        </div>
      </div>
    </div>
  )
}
