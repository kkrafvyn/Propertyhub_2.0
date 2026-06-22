import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ResponsivePageShell from '../../components/ResponsivePageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import RolePicker from '../../components/RolePicker'
import { Field, inputClass } from '../../components/ui/AirbnbUI'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import { isKycPending, isKycVerified } from '../../lib/kyc'
import { uploadKyc } from '../../lib/storage'
import { USER_ROLES } from '../../platform/registry'
import {
  fetchKycProviderConfig,
  fetchMyKyc,
  startKycProvider,
  submitKyc,
} from '../../services/trust-service'

const entityTypes = [
  USER_ROLES.CONSUMER,
  USER_ROLES.BUYER,
  USER_ROLES.INVESTOR,
  USER_ROLES.INDEPENDENT_AGENT,
  USER_ROLES.AGENCY_OWNER,
  USER_ROLES.PROPERTY_OWNER,
]

function KycContent() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const fileRef = useRef(null)
  const [kyc, setKyc] = useState(null)
  const [providerConfig, setProviderConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [entityName, setEntityName] = useState('')
  const [entityType, setEntityType] = useState(USER_ROLES.CONSUMER)
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [mode, setMode] = useState('provider')

  const smileReturn = searchParams.get('smile')

  function reloadKyc() {
    return fetchMyKyc().then(({ kyc: record }) => {
      setKyc(record)
      if (record?.entity_name) setEntityName(record.entity_name)
      if (record?.entity_type) setEntityType(record.entity_type)
      return record
    })
  }

  useEffect(() => {
    Promise.all([reloadKyc(), fetchKycProviderConfig()])
      .then(([, config]) => {
        setProviderConfig(config)
        if (!config?.smileConfigured) setMode('manual')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (smileReturn !== 'return') return undefined
    const timer = window.setInterval(() => {
      reloadKyc().then((record) => {
        if (record?.status === 'verified' || record?.status === 'rejected') {
          window.clearInterval(timer)
        }
      })
    }, 4000)
    return () => window.clearInterval(timer)
  }, [smileReturn])

  function handleFileChange(e) {
    const picked = Array.from(e.target.files ?? [])
    setFiles(picked)
    setError('')
  }

  async function handleProviderStart(e) {
    e.preventDefault()
    if (!user) return
    if (!entityName.trim()) {
      setError(t('kycPage.nameRequired'))
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const { link } = await startKycProvider({
        entityName: entityName.trim(),
        entityType,
      })
      if (!link) throw new Error(t('kycPage.providerLinkFailed'))
      window.location.href = link
    } catch (err) {
      setError(err.message || t('kycPage.providerStartFailed'))
      setSubmitting(false)
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    if (!user) return
    if (!entityName.trim()) {
      setError(t('kycPage.nameRequired'))
      return
    }
    if (!files.length) {
      setError(t('kycPage.documentsRequired'))
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const documentPaths = []
      for (const file of files) {
        const { path } = await uploadKyc(user.id, file)
        documentPaths.push(path)
      }
      await submitKyc({ entityName: entityName.trim(), entityType, documentPaths })
      await reloadKyc()
      setFiles([])
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err.message || t('kycPage.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-surface-hover" />
      </div>
    )
  }

  if (isKycVerified(kyc)) {
    return (
      <div className="panel-card bg-green-50 p-6 text-center">
        <p className="text-lg font-semibold text-green-900">{t('kycPage.verifiedTitle')}</p>
        <p className="mt-2 text-sm text-green-800">{t('kycPage.verifiedBody')}</p>
        <Link to="/profile" className="mt-4 inline-block text-sm font-semibold text-mobile-forest underline">
          {t('kycPage.backToProfile')}
        </Link>
      </div>
    )
  }

  if (isKycPending(kyc)) {
    const providerPending = kyc.status === 'pending_provider'
    return (
      <div className="panel-card bg-amber-50 p-6">
        <p className="text-lg font-semibold text-amber-900">{t('kycPage.pendingTitle')}</p>
        <p className="mt-2 text-sm text-amber-800">
          {providerPending ? t('kycPage.providerPendingBody') : t('kycPage.pendingBody')}
        </p>
        <p className="mt-4 text-sm text-ink-secondary">
          {kyc.entity_name} · {t(`roles.${kyc.entity_type || 'consumer'}`)}
          {!providerPending && ` · ${kyc.documents} ${t('kycPage.documents')}`}
        </p>
        {kyc.rejection_reason && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {kyc.rejection_reason}
          </p>
        )}
        {providerPending && providerConfig?.smileConfigured && (
          <button
            type="button"
            onClick={handleProviderStart}
            disabled={submitting}
            className="mt-4 text-sm font-semibold text-brand-accent underline disabled:opacity-60"
          >
            {t('kycPage.reopenProvider')}
          </button>
        )}
      </div>
    )
  }

  const smileReady = providerConfig?.smileConfigured

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink lg:hidden">{t('kycPage.title')}</h1>
      <p className="mt-2 text-sm text-ink-secondary lg:mt-0">{t('kycPage.subtitle')}</p>

      {smileReady && (
        <div className="mt-6 flex gap-2 rounded-xl border border-surface-border bg-surface-subtle p-1">
          <button
            type="button"
            onClick={() => setMode('provider')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'provider' ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary'}`}
          >
            {t('kycPage.providerTab')}
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'manual' ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary'}`}
          >
            {t('kycPage.manualTab')}
          </button>
        </div>
      )}

      <form
        onSubmit={mode === 'provider' && smileReady ? handleProviderStart : handleManualSubmit}
        className="mt-6 space-y-5"
      >
        <Field label={t('kycPage.legalName')}>
          <input
            type="text"
            required
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
            className={inputClass}
            placeholder={t('kycPage.legalNamePlaceholder')}
          />
        </Field>

        <Field label={t('kycPage.accountType')}>
          <RolePicker value={entityType} onChange={setEntityType} options={entityTypes} />
        </Field>

        {mode === 'provider' && smileReady ? (
          <p className="text-sm text-ink-secondary">{t('kycPage.providerHint')}</p>
        ) : (
          <Field label={t('kycPage.uploadDocuments')}>
            <p className="mb-2 text-xs text-ink-secondary">{t('kycPage.uploadHint')}</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/jpeg,image/png"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-surface-subtle file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink"
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
                {files.map((f) => (
                  <li key={f.name}>{f.name}</li>
                ))}
              </ul>
            )}
          </Field>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-accent py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting
            ? t('kycPage.submitting')
            : mode === 'provider' && smileReady
              ? t('kycPage.startProvider')
              : t('kycPage.submit')}
        </button>
      </form>
    </div>
  )
}

function KycPageLayout() {
  const { t } = useTranslation()

  return (
    <ResponsivePageShell
      title={t('kycPage.title')}
      backTo="/profile"
    >
      <KycContent />
    </ResponsivePageShell>
  )
}

export default function KycPage() {
  return (
    <ProtectedRoute>
      <KycPageLayout />
    </ProtectedRoute>
  )
}
