import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import AuthPageLayout from '../components/AuthPageLayout'
import OAuthButtons, { AuthDivider } from '../components/OAuthButtons'
import IntegrationsBanner from '../components/IntegrationsBanner'
import { Field, inputClass } from '../components/ui/AirbnbUI'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'
import { getRoleHomePath } from '../lib/roles'
import { isSupabaseConfigured } from '../lib/supabase'

export default function LoginPage() {
  const { signIn, signInWithOAuth } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthProvider, setOauthProvider] = useState(null)

  const redirectTo = location.state?.from || '/'

  async function handleOAuth(provider) {
    setError('')
    setOauthProvider(provider)
    try {
      await signInWithOAuth(provider, { redirectPath: redirectTo })
    } catch (err) {
      setError(err.message || `Could not sign in with ${provider}.`)
      setOauthProvider(null)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn(email, password)
      const user = result?.user
      const destination = redirectTo !== '/login' ? redirectTo : getRoleHomePath(user) || '/'
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message || 'Could not sign in. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout>
      <div className="mx-auto max-w-[568px] rounded-2xl border border-surface-border bg-surface p-6 shadow-card md:p-8">
        <h1 className="text-2xl font-semibold text-ink">{t('auth.welcome')}</h1>

        {isSupabaseConfigured && <IntegrationsBanner showOAuth />}

        {isSupabaseConfigured && (
          <>
            <div className="mt-6">
              <OAuthButtons
                loadingProvider={oauthProvider}
                disabled={loading}
                onGoogle={() => handleOAuth('google')}
                onApple={() => handleOAuth('apple')}
              />
            </div>
            <AuthDivider />
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('auth.email')}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder={t('auth.email')}
            />
          </Field>

          <Field label={t('auth.password')}>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder={t('auth.password')}
            />
          </Field>

          <div className="text-end">
            <Link to="/forgot-password" className="text-sm font-semibold text-ink underline">
              {t('auth.forgotPassword')}
            </Link>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || oauthProvider}
            className="w-full rounded-lg bg-brand-accent py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? t('auth.signingIn') : t('auth.continue')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-secondary">
          {t('auth.noAccount')}{' '}
          <Link to="/signup" className="font-semibold text-ink underline">
            {t('auth.signUp')}
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  )
}
