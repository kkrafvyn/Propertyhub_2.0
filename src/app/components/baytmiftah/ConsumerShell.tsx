import { WorkspaceShell } from './WorkspaceShell'
import { useTranslation } from '../../i18n/LocaleContext'
import {
  BUY_HUB_PATH,
  CONSUMER_HUB_PATH,
  LEASE_HUB_PATH,
  RENT_HUB_PATH,
  STAY_HUB_PATH,
} from '../../lib/baytmiftah/journey-nav'
import { CONSUMER_ROUTES } from '../../lib/consumer-routes'

export default function ConsumerShell(props) {
  const { t } = useTranslation()
  const links = [
    { to: CONSUMER_HUB_PATH, label: t('consumer.journeys.shell.overview'), end: true },
    { to: BUY_HUB_PATH, label: t('profileNav.buyJourney') },
    { to: RENT_HUB_PATH, label: t('profileNav.rentJourney') },
    { to: LEASE_HUB_PATH, label: t('profileNav.leaseJourney') },
    { to: STAY_HUB_PATH, label: t('consumer.journeys.stay.title') },
    { to: CONSUMER_ROUTES.wallet, label: t('profileNav.wallet') },
  ]

  return (
    <WorkspaceShell
      workspaceLabel={t('consumer.journeys.shell.label')}
      homePath={CONSUMER_HUB_PATH}
      links={links}
      {...props}
    />
  )
}
