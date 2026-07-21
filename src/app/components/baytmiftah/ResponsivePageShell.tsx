import { DesktopShell } from './DesktopShell'
import { CompactSearch } from './SearchPill'
import MobileShell, { MobileHeader } from './MobileShell'
import { useIsMobileViewport } from '../../hooks/useMediaQuery'
import { useTranslation } from '../../i18n/LocaleContext'

export default function ResponsivePageShell({
  title,
  subtitle,
  titleKey,
  subtitleKey,
  titleVars,
  subtitleVars,
  backTo = '/consumer/buy',
  hideNav = false,
  search,
  children,
}) {
  const { t } = useTranslation()
  const mobile = useIsMobileViewport()
  const resolvedTitle = titleKey ? t(titleKey, titleVars) : title
  const resolvedSubtitle = subtitleKey ? t(subtitleKey, subtitleVars) : subtitle

  if (mobile) {
    return (
      <MobileShell hideNav={hideNav}>
        {(resolvedTitle || resolvedSubtitle) && (
          <MobileHeader title={resolvedTitle} subtitle={resolvedSubtitle} backTo={backTo} />
        )}
        <div className="px-4 pb-6">{children}</div>
      </MobileShell>
    )
  }

  return (
    <DesktopShell search={search ?? <CompactSearch />}>
      {children}
    </DesktopShell>
  )
}
