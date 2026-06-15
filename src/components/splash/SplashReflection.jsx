import SplashLogoMark from './SplashLogoMark'
import { SPLASH_WORDMARK } from './constants'

export default function SplashReflection() {
  return (
    <div className="splash-reflection" aria-hidden="true">
      <div className="splash-reflection__inner">
        <SplashLogoMark className="splash-reflection__mark" />
        <span className="splash-reflection__wordmark">{SPLASH_WORDMARK}</span>
      </div>
    </div>
  )
}
