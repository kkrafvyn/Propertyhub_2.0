import { getSectionId, type LegalSection } from "../../../content/legal";

export function LegalTableOfContents({ sections }: { sections: LegalSection[] }) {
  if (sections.length < 3) return null;

  return (
    <nav aria-label="On this page">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">On this page</p>
      <ol className="mt-3 space-y-2">
        {sections.map((section) => (
          <li key={section.heading}>
            <a
              href={`#${getSectionId(section.heading)}`}
              className="text-sm text-ink-secondary underline-offset-2 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-forest"
            >
              {section.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
