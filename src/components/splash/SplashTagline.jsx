import { SPLASH_TAGLINE } from './constants'

export default function SplashTagline({ text = SPLASH_TAGLINE }) {
  return (
    <div className="splash-tagline" aria-hidden="true">
      <span className="splash-tagline__line splash-tagline__line--left" />
      <p className="splash-tagline__text">{text}</p>
      <span className="splash-tagline__line splash-tagline__line--right" />
    </div>
  )
}
