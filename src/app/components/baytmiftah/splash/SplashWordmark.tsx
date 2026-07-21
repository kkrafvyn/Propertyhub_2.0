import { SPLASH_PHASES, SPLASH_WORDMARK, WORDMARK_CHAR_STAGGER_MS } from "./constants";

export function SplashWordmark({
  text = SPLASH_WORDMARK,
  className = "splash-wordmark",
}: {
  text?: string;
  className?: string;
}) {
  const chars = [...text];

  return (
    <h1 className={className} aria-label={text.replace(/Λ/g, "A")}>
      {chars.map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="splash-wordmark__char"
          style={{
            animationDelay: `${SPLASH_PHASES.wordmarkStart + index * WORDMARK_CHAR_STAGGER_MS}ms`,
          }}
          aria-hidden="true"
        >
          {char}
        </span>
      ))}
    </h1>
  );
}
