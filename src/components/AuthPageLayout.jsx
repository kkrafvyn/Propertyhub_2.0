import { useIsMobileViewport } from '../hooks/useMediaQuery'
import DesktopShell from './DesktopShell'
import MobileShell from './MobileShell'
import LanguageSwitcher from './LanguageSwitcher'
import Logo from './Logo'

export default function AuthPageLayout({ children }) {
  const mobile = useIsMobileViewport()

  if (mobile) {
    return (
      <MobileShell hideNav>
        <div className="flex items-center justify-between px-4 pt-4">
          <Logo to="/" size="sm" />
          <LanguageSwitcher />
        </div>
        <div className="px-4 py-2 pb-6">{children}</div>
      </MobileShell>
    )
  }

  return (
    <DesktopShell minimal>
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher />
      </div>
      {children}
    </DesktopShell>
  )
}
