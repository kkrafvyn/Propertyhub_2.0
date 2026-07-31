import { Link } from "react-router";
import { useTranslation } from "../../i18n/LocaleContext";
import { ACCEPTANCE_SCOPES, type LegalAcceptanceScope } from "../../../lib/legal-config";

type Props = {
  scope: LegalAcceptanceScope;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
};

function policyHref(slug: string) {
  if (slug === "terms") return "/terms";
  if (slug === "privacy") return "/privacy";
  return `/legal/${slug}`;
}

export function LegalAcceptanceCheckbox({
  scope,
  checked,
  onChange,
  id = "legal-acceptance",
  className = "",
}: Props) {
  const { t } = useTranslation();
  const config = ACCEPTANCE_SCOPES[scope];
  const policies = config.policySlugs;

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-border text-primary"
        required
      />
      <label htmlFor={id} className="text-sm text-muted-foreground leading-relaxed">
        {t(config.labelKey)}{" "}
        {policies.map((slug, index) => {
          const title = slug
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          return (
            <span key={slug}>
              {index > 0 && (index === policies.length - 1 ? ` ${t("legal.acceptance.and")} ` : ", ")}
              <Link to={policyHref(slug)} className="text-primary hover:underline">
                {title}
              </Link>
            </span>
          );
        })}
      </label>
    </div>
  );
}

type MultiProps = {
  scopes: LegalAcceptanceScope[];
  values: Record<string, boolean>;
  onChange: (scope: LegalAcceptanceScope, checked: boolean) => void;
};

export function LegalAcceptanceFields({ scopes, values, onChange }: MultiProps) {
  return (
    <div className="space-y-3">
      {scopes.map((scope) => (
        <LegalAcceptanceCheckbox
          key={scope}
          scope={scope}
          id={`legal-${scope}`}
          checked={Boolean(values[scope])}
          onChange={(checked) => onChange(scope, checked)}
        />
      ))}
    </div>
  );
}

export function allScopesAccepted(scopes: LegalAcceptanceScope[], values: Record<string, boolean>) {
  return scopes.every((scope) => Boolean(values[scope]));
}
