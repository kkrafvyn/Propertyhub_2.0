import { Link } from "react-router";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { Button } from "../../ui/Button";

type ConsumerWelcomeHeroProps = {
  displayName: string;
  kicker?: string;
  heading?: string;
  description: string;
  primaryActionLabel?: string;
  primaryActionHref?: string;
  unreadMessages?: number;
};

export function ConsumerWelcomeHero({
  displayName,
  kicker = "My BaytMiftah",
  heading,
  description,
  primaryActionLabel = "Explore properties",
  primaryActionHref = "/search",
  unreadMessages = 0,
}: ConsumerWelcomeHeroProps) {
  const firstName = displayName.split(" ")[0] || displayName;
  const resolvedHeading = heading || `Welcome back, ${firstName}`;

  return (
    <section className="consumer-welcome-hero">
      <div className="consumer-welcome-hero-glow" aria-hidden="true" />
      <div className="relative z-[1] flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3 max-w-2xl">
          <p className="consumer-welcome-kicker">
            <Sparkles className="w-3.5 h-3.5" />
            {kicker}
          </p>
          <h1 className="consumer-welcome-title">{resolvedHeading}</h1>
          <p className="consumer-welcome-description">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link to={primaryActionHref}>
            <Button className="consumer-welcome-cta gap-2">
              <Search className="w-4 h-4" />
              {primaryActionLabel}
            </Button>
          </Link>
          <Link to="/app/messages">
            <Button variant="outline" className="consumer-welcome-secondary gap-2 bg-surface/80">
              Messages
              {unreadMessages > 0 ? (
                <span className="consumer-portal-badge">{unreadMessages}</span>
              ) : null}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
