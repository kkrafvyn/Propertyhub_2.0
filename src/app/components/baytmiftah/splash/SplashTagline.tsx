import { SPLASH_TAGLINE } from "./constants";

export function SplashTagline({ text = SPLASH_TAGLINE }: { text?: string }) {
  return (
    <div className="splash-tagline" aria-hidden="true">
      <span className="splash-tagline__line splash-tagline__line--left" />
      <p className="splash-tagline__text">{text}</p>
      <span className="splash-tagline__line splash-tagline__line--right" />
    </div>
  );
}
