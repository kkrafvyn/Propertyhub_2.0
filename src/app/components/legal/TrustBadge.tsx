import { Info } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "../ui/badge";
import { TRUST_VERIFICATION_POLICY_PATH } from "../../../lib/legal-disclaimers";

type TrustBadgeProps = {
  label: string;
  disclaimer: string;
  active?: boolean;
  showPolicyLink?: boolean;
  className?: string;
};

export function TrustBadge({
  label,
  disclaimer,
  active = true,
  showPolicyLink = false,
  className,
}: TrustBadgeProps) {
  return (
    <span className={`inline-flex max-w-full flex-col gap-1 ${className || ""}`}>
      <Badge
        variant={active ? "default" : "outline"}
        className="gap-1 max-w-full whitespace-normal text-left"
        title={disclaimer}
      >
        <Info className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        <span>{label}</span>
      </Badge>
      {showPolicyLink ? (
        <Link
          to={TRUST_VERIFICATION_POLICY_PATH}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          What these labels mean
        </Link>
      ) : null}
    </span>
  );
}
