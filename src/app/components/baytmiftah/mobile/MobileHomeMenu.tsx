import { useEffect } from 'react'
import { Link } from 'react-router'
import { X } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { isWorkspaceRole } from '../../../lib/baytmiftah/roles'
import { WORKSPACE_ENTRY_PATH } from '../../../../lib/workspace'
import { useTranslation } from '../../../i18n/LocaleContext'
import { LogoMark } from '../Logo'
import { SPLASH_WORDMARK } from '../splash/constants'
import ConsumerMenuContent from '../consumer/ConsumerMenuContent'

function getInitials(user: any) {
  return (
    user?.user_metadata?.full_name
      ?.split(' ')
      .map((part: string) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    'BM'
  )
}

export default function MobileHomeMenu({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { user, role } = useAuth()
  const accountPath = isWorkspaceRole(role) ? WORKSPACE_ENTRY_PATH : '/app'

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="bm-mobile-menu-overlay fixed inset-0 z-[100] flex justify-end"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="bm-mobile-menu-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div className="bm-mobile-menu-panel relative z-10 flex h-full w-[min(100%,380px)] flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out">
        {/* Branded Header */}
        <header className="bm-mobile-menu-header relative overflow-hidden bg-gradient-to-b from-[#0f2922] via-[#14372e] to-[#0f2922] px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-md">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl"
            aria-hidden
          />

          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 shadow-inner backdrop-blur-md">
                <LogoMark className="h-6 w-6" inverted />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                  {SPLASH_WORDMARK}
                </p>
                <h2 className="text-base font-bold text-white leading-tight">
                  {t("mobile.menu")}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 active:scale-95"
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Profile Card */}
          {user ? (
            <Link
              to={accountPath}
              onClick={onClose}
              className="relative mt-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md transition-colors hover:bg-white/15 shadow-sm"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-[#c45d44] text-sm font-bold text-white shadow-md ring-2 ring-white/20">
                {getInitials(user)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
                <p className="truncate text-xs text-white/70">{user.email}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {role || t("mobile.defaultRole")}
              </span>
            </Link>
          ) : (
            <div className="relative mt-4 flex gap-2">
              <Link
                to="/login"
                onClick={onClose}
                className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                {t("auth.logIn")}
              </Link>
              <Link
                to="/signup"
                onClick={onClose}
                className="flex-1 rounded-full bg-white px-4 py-2.5 text-center text-sm font-semibold text-brand-forest transition-colors hover:bg-white/90 shadow-sm"
              >
                {t("auth.signUp")}
              </Link>
            </div>
          )}
        </header>

        {/* Scrollable Menu Items */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-surface-subtle">
          <ConsumerMenuContent onNavigate={onClose} showIntro={false} />
        </div>
      </div>
    </div>
  )
}

