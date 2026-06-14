import { useEffect, useState } from 'react'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import ProtectedRoute from '../components/ProtectedRoute'
import { PageTitle, PrimaryButton } from '../components/ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'
import { getOrCreateReferralCode, referralLink } from '../services/referral-service'
import { trackEvent } from '../lib/analytics'

function ReferralContent() {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [uses, setUses] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getOrCreateReferralCode().then(({ code: c, uses: u }) => {
      setCode(c)
      setUses(u)
    })
  }, [])

  const link = code ? referralLink(code) : ''

  async function copy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    trackEvent('referral_link_copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle title={t('referral.title')} subtitle={t('referral.subtitle')} />
      <div className="panel-card max-w-lg p-8">
        <p className="text-sm text-ink-secondary">{t('referral.yourCode')}</p>
        <p className="mt-2 text-3xl font-bold tracking-wide text-ink">{code || '…'}</p>
        <p className="mt-4 text-sm text-ink-secondary">{t('referral.uses', { count: uses })}</p>
        <p className="mt-6 break-all rounded-lg bg-surface-subtle p-3 text-sm">{link}</p>
        <PrimaryButton className="mt-4" onClick={copy} disabled={!link}>
          {copied ? t('share.copied') : t('referral.copyLink')}
        </PrimaryButton>
      </div>
    </DesktopShell>
  )
}

export default function ReferralPage() {
  return <ProtectedRoute><ReferralContent /></ProtectedRoute>
}
