import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthPageLayout from '../components/AuthPageLayout'
import { Field, inputClass } from '../components/ui/AirbnbUI'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'
import { isSupabaseConfigured } from '../lib/supabase'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message || 'Could not send reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout>
      <div className="mx-auto max-w-[568px] rounded-2xl border border-surface-border bg-surface p-6 shadow-card md:p-8">
        <h1 className="text-2xl font-semibold text-ink">{t('auth.resetPassword')}</h1>
        <p className="mt-2 text-sm text-ink-secondary">{t('auth.resetSubtitle')}</p>

        {!isSupabaseConfigured && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Supabase is not configured.
          </p>
        )}

        {sent ? (
          <p className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {t('auth.resetSent')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label={t('auth.email')}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder={t('auth.email')}
                disabled={!isSupabaseConfigured}
              />
            </Field>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !isSupabaseConfigured}
              className="w-full rounded-lg bg-brand-accent py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? t('auth.sending') : t('auth.sendResetLink')}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink-secondary">
          <Link to="/login" className="font-semibold text-ink underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  )
}
