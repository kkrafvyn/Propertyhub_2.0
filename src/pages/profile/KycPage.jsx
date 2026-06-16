import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ResponsivePageShell from '../../components/ResponsivePageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import RolePicker from '../../components/RolePicker'
import { Field, inputClass } from '../../components/ui/AirbnbUI'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import { isKycPending, isKycVerified } from '../../lib/kyc'
import { uploadKyc } from '../../lib/storage'
import { USER_ROLES } from '../../platform/registry'
import { fetchMyKyc, submitKyc } from '../../services/trust-service'

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
  const fileRef = useRef(null)
  const [kyc, setKyc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [entityName, setEntityName] = useState('')
  const [entityType, setEntityType] = useState(USER_ROLES.CONSUMER)
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMyKyc()
      .then(({ kyc: record }) => {
        setKyc(record)
        if (record?.entity_name) setEntityName(record.entity_name)
        if (record?.entity_type) setEntityType(record.entity_type)
      })
      .finally(() => setLoading(false))
  }, [])

  function handleFileChange(e) {
    const picked = Array.from(e.target.files ?? [])
    setFiles(picked)
    setError('')
  }

  async function handleSubmit(e) {
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
        try {
          const { path } = await uploadKyc(user.id, file)
          documentPaths.push(path)
        } catch {
          documentPaths.push(`local/${user.id}/${Date.now()}-${file.name}`)
        }
      }
      await submitKyc({ entityName: entityName.trim(), entityType, documentPaths })
      const { kyc: record } = await fetchMyKyc()
      setKyc(record)
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
    return (
      <div className="panel-card bg-amber-50 p-6">
        <p className="text-lg font-semibold text-amber-900">{t('kycPage.pendingTitle')}</p>
        <p className="mt-2 text-sm text-amber-800">{t('kycPage.pendingBody')}</p>
        <p className="mt-4 text-sm text-ink-secondary">
          {kyc.entity_name} · {t(`roles.${kyc.entity_type || 'consumer'}`)} · {kyc.documents} {t('kycPage.documents')}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink lg:hidden">{t('kycPage.title')}</h1>
      <p className="mt-1 text-ink-secondary lg:hidden">{t('kycPage.subtitle')}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-accent py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? t('kycPage.submitting') : t('kycPage.submit')}
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
      subtitle={t('kycPage.subtitle')}
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
