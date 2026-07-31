import { getLegalDocument } from "./legal-documents";
import { LegalDocumentView } from "./LegalDocumentView";

export function TermsOfService() {
  const document = getLegalDocument("terms")!;
  return <LegalDocumentView document={document} />;
}
