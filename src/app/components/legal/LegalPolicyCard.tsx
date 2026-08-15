import { Link } from "react-router";
import { getLegalPath, type LegalDocument } from "../../../content/legal";

export function LegalPolicyCard({ document }: { document: LegalDocument }) {
  return (
    <Link
      to={getLegalPath(document.slug)}
      className="block rounded-xl border border-surface-border bg-white p-4 transition hover:border-brand-forest/40 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest"
    >
      <span className="font-medium text-ink">{document.title}</span>
      <p className="mt-1 text-sm text-ink-secondary line-clamp-2">{document.description}</p>
    </Link>
  );
}
