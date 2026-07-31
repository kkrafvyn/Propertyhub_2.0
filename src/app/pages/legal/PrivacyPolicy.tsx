import { getLegalDocument } from "./legal-documents";
import { LegalDocumentView } from "./LegalDocumentView";

export function PrivacyPolicy() {
  const document = getLegalDocument("privacy")!;
  return <LegalDocumentView document={document} />;
}
