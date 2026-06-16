import DesktopShell, { CompactSearch } from './DesktopShell'
import MobileShell, { MobileHeader } from './MobileShell'
import { useIsMobileViewport } from '../hooks/useMediaQuery'

export default function ResponsivePageShell({
  title,
  subtitle,
  backTo = '/consumer/buy',
  hideNav = false,
  showContextual = true,
  search,
  children,
}) {
  const mobile = useIsMobileViewport()

  if (mobile) {
    return (
      <MobileShell hideNav={hideNav} showContextual={showContextual}>
        {(title || subtitle) && (
          <MobileHeader title={title} subtitle={subtitle} backTo={backTo} />
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
