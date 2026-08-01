import { Link } from "react-router";
import {
  MARKETPLACE_FOOTER_DISCLAIMER,
  TRUST_VERIFICATION_POLICY_PATH,
} from "../../../lib/legal-disclaimers";

export function MarketplaceDisclaimerStrip({
  text = MARKETPLACE_FOOTER_DISCLAIMER,
  compact = false,
  className = "",
}: {
  text?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <p
      className={`${
        compact
          ? "text-xs leading-relaxed text-muted-foreground"
          : "text-sm leading-relaxed text-muted-foreground"
      } ${className}`.trim()}
    >
      {text}{" "}
      <Link
        to={TRUST_VERIFICATION_POLICY_PATH}
        className="font-medium text-foreground underline-offset-2 hover:underline"
      >
        Trust & verification policy
      </Link>
      .
    </p>
  );
}
