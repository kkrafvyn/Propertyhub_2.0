import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthPageLayout from '../components/AuthPageLayout'
import { PrimaryButton } from '../components/ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'
import { completeOAuthCallback } from '../services/auth-service'
import { getRoleHomePath } from '../lib/roles'
import { supabase } from '../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function finish() {
      if (!supabase) {
        setError('Supabase is not configured.')
        return
      }

      try {
        const { session, next } = await completeOAuthCallback()
        if (cancelled) return
        const destination = next && next !== '/auth/callback'
          ? next
          : getRoleHomePath(session.user) || '/'
        navigate(destination, { replace: true })
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not complete sign-in.')
        }
      }
    }

    finish()
    return () => { cancelled = true }
  }, [navigate])

  return (
    <AuthPageLayout>
      <div className="mx-auto max-w-md py-12 text-center md:py-20">
        {!error ? (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
            <p className="mt-4 text-ink-secondary">{t('auth.completingSignIn')}</p>
          </>
        ) : (
          <>
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
            <PrimaryButton as={Link} to="/login" className="mt-6">
              {t('auth.backToLogin')}
            </PrimaryButton>
          </>
        )}
      </div>
    </AuthPageLayout>
  )
}
