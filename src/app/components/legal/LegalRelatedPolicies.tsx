import { Link } from "react-router";
import { LEGAL_CONTACT, getLegalPath, type LegalDocument } from "../../../content/legal";

export function LegalRelatedPolicies({ documents }: { documents: LegalDocument[] }) {
  if (!documents.length) return null;

  return (
    <section aria-labelledby="related-policies-heading">
      <h2 id="related-policies-heading" className="text-lg font-semibold text-ink">
        Related policies
      </h2>
      <ul className="mt-3 space-y-2">
        {documents.map((doc) => (
          <li key={doc.slug}>
            <Link
              to={getLegalPath(doc.slug)}
              className="text-sm text-brand-forest underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest"
            >
              {doc.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LegalContactCard() {
  return (
    <aside
      className="rounded-xl border border-surface-border bg-surface-subtle/50 p-5"
      aria-labelledby="legal-contact-heading"
    >
      <h2 id="legal-contact-heading" className="text-sm font-semibold uppercase tracking-wide text-ink">
        Contact BaytMiftah
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
        For legal questions, privacy requests, complaints, or accessibility feedback, use the contacts
        below.
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        <li>
          <a className="text-brand-forest underline-offset-2 hover:underline" href={`mailto:${LEGAL_CONTACT.legal}`}>
            {LEGAL_CONTACT.legal}
          </a>
        </li>
        <li>
          <a className="text-brand-forest underline-offset-2 hover:underline" href={`mailto:${LEGAL_CONTACT.privacy}`}>
            {LEGAL_CONTACT.privacy}
          </a>
        </li>
        <li>
          <a
            className="text-brand-forest underline-offset-2 hover:underline"
            href={`mailto:${LEGAL_CONTACT.complaints}`}
          >
            {LEGAL_CONTACT.complaints}
          </a>
        </li>
        <li>
          <a className="text-brand-forest underline-offset-2 hover:underline" href={`mailto:${LEGAL_CONTACT.support}`}>
            {LEGAL_CONTACT.support}
          </a>
        </li>
      </ul>
    </aside>
  );
}
