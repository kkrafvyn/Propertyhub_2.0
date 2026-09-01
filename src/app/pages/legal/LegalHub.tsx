import { Link, useParams } from "react-router";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LAST_UPDATED,
  PLATFORM_ROLE_STATEMENT,
  getLegalDocument,
  getPoliciesByCategory,
} from "../../../content/legal";
import { LEGAL_OPERATOR } from "../../../lib/legal-config";
import { LegalDocumentView } from "./LegalDocumentView";
import { LegalCentreShell } from "../../components/legal/LegalPageLayout";
import { LegalPolicyCard } from "../../components/legal/LegalPolicyCard";
import { LegalContactCard } from "../../components/legal/LegalRelatedPolicies";

export function LegalDocumentPage() {
  const { slug } = useParams<{ slug: string }>();
  const document = slug ? getLegalDocument(slug) : undefined;

  if (!document) {
    return (
      <DesktopShell minimal showFooter>
        <PageMeta title="Document not found" description="This policy may have moved or does not exist." />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold text-ink">Document not found</h1>
          <p className="mt-2 text-ink-secondary">This policy may have moved or does not exist.</p>
          <Link to="/legal" className="mt-6 inline-block text-brand-forest hover:underline">
            View all legal documents
          </Link>
        </div>
      </DesktopShell>
    );
  }

  return <LegalDocumentView document={document} />;
}

export function LegalHub() {
  const groups = getPoliciesByCategory();

  return (
    <LegalCentreShell
      title="BaytMiftah Legal & Policies"
      description="BaytMiftah operates as a neutral technology marketplace. These policies explain how the platform works, what users are responsible for, and the limits of BaytMiftah's role."
      canonicalPath="/legal"
      breadcrumbs={[{ label: "Home", to: "/" }, { label: "Legal & Policies" }]}
    >
      <article>
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-brand-forest">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Legal & Policies
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-secondary">
            BaytMiftah operates as a neutral technology marketplace. These policies explain how the
            platform works, what users are responsible for, and the limits of BaytMiftah's role.
          </p>
        </header>

        <div className="mt-8 rounded-xl border border-brand-forest/20 bg-brand-forest/5 p-5 text-sm leading-relaxed text-ink">
          <strong>Central rule.</strong> {PLATFORM_ROLE_STATEMENT}
        </div>

        <p className="mt-6 leading-relaxed text-ink-secondary">
          BaytMiftah connects property owners, landlords, sellers, buyers, renters, tenants, hosts,
          guests, agents, agencies, developers, property managers, vendors, and other property-market
          participants. Unless expressly stated otherwise in a separate agreement, BaytMiftah is not a
          party to the underlying agreement between users. Where payment functionality exists, the
          actual movement and custody of funds is handled by the applicable third-party payment
          provider and the financial institutions involved in the transaction.
        </p>

        <dl className="mt-8 grid gap-3 text-sm text-ink-secondary sm:grid-cols-2">
          <div>
            <dt className="font-medium text-ink">Operator</dt>
            <dd>{LEGAL_OPERATOR.name}</dd>
          </div>
          {LEGAL_OPERATOR.registrationNumber ? (
          <div>
            <dt className="font-medium text-ink">Company registration</dt>
            <dd>{LEGAL_OPERATOR.registrationNumber}</dd>
          </div>
          ) : null}
          <div>
            <dt className="font-medium text-ink">Registered address</dt>
            <dd>{LEGAL_OPERATOR.registeredAddress}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Governing law</dt>
            <dd>Republic of Ghana</dd>
          </div>
        </dl>

        <div className="mt-12 space-y-12">
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`legal-group-${group.id}`}>
              <h2 id={`legal-group-${group.id}`} className="text-xl font-semibold text-ink">
                {group.label}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {group.documents.map((doc) => (
                  <li key={doc.slug}>
                    <LegalPolicyCard document={doc} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-12 xl:hidden">
          <LegalContactCard />
        </div>
      </article>
    </LegalCentreShell>
  );
}
