import { WorkspaceShell } from './WorkspaceShell'
import { CONSUMER_ROUTES } from '../../lib/consumer-routes'
import { useTranslation } from '../../i18n/LocaleContext'

export default function TenantShell(props) {
  const { t } = useTranslation()

  const links = [
    { to: CONSUMER_ROUTES.profile, label: t('shells.tenant.portal'), end: true },
    { to: CONSUMER_ROUTES.leases, label: t('shells.tenant.lease') },
    { to: CONSUMER_ROUTES.payments, label: t('shells.tenant.payments') },
    { to: CONSUMER_ROUTES.maintenance, label: t('shells.tenant.maintenance') },
    { to: CONSUMER_ROUTES.notifications, label: t('shells.tenant.visitorPasses') },
    { to: CONSUMER_ROUTES.documents, label: t('shells.tenant.buildingAccess') },
    { to: CONSUMER_ROUTES.notifications, label: t('shells.tenant.announcements') },
  ]

  return (
    <WorkspaceShell
      workspaceLabel={t('shells.tenant.label')}
      homePath={CONSUMER_ROUTES.profile}
      links={links}
      {...props}
    />
  )
}
