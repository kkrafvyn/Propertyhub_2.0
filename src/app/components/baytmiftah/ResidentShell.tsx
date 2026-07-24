import { WorkspaceShell } from './WorkspaceShell'
import { CONSUMER_ROUTES } from '../../lib/consumer-routes'
import { useTranslation } from '../../i18n/LocaleContext'

export default function ResidentShell(props) {
  const { t } = useTranslation()

  const links = [
    { to: CONSUMER_ROUTES.profile, label: t('shells.resident.home'), end: true },
    { to: CONSUMER_ROUTES.leases, label: t('shells.resident.lease') },
    { to: CONSUMER_ROUTES.maintenance, label: t('shells.resident.maintenance') },
    { to: CONSUMER_ROUTES.payments, label: t('shells.resident.payments') },
    { to: CONSUMER_ROUTES.notifications, label: t('shells.resident.community') },
  ]

  return (
    <WorkspaceShell
      workspaceLabel={t('shells.resident.label')}
      homePath={CONSUMER_ROUTES.profile}
      links={links}
      {...props}
    />
  )
}
