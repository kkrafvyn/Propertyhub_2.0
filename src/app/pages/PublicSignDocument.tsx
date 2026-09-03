import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { FileSignature, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/badge";
import { eSignatureService } from "../../lib/esignature.service";
import { leaseEsignatureService } from "../../lib/lease-esignature.service";
import { sanitizePublicDocumentUrl } from "../../lib/sanitize-document-url";
import { StandalonePageShell } from "../components/ux/StandalonePageShell";

type PublicSigningRequest = Awaited<ReturnType<typeof eSignatureService.getRequestByToken>>;

export function PublicSignDocument() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const signerToken = searchParams.get("st")?.trim() || "";
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<PublicSigningRequest | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [signed, setSigned] = useState(false);
  const [partialComplete, setPartialComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const signersSummary = useMemo(
    () => (Array.isArray(request?.signers_summary) ? request.signers_summary : []),
    [request?.signers_summary],
  );

  const documentUrl = useMemo(
    () => sanitizePublicDocumentUrl(request?.document_url),
    [request?.document_url],
  );

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setLinkError("This signing link is invalid.");
      return;
    }
    if (!signerToken) {
      setLoading(false);
      setLinkError("This signing link is incomplete. Open the personal link from your email or SMS.");
      return;
    }

    void (async () => {
      try {
        const row = await eSignatureService.getRequestByToken(token, signerToken);
        setRequest(row);
        if (row.current_signer_name) setSignatureName(row.current_signer_name);
      } catch (err: any) {
        setLinkError(err.message || "Signing link invalid or expired");
        toast.error(err.message || "Signing link invalid or expired");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, signerToken]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !signerToken) return;
    try {
      setSubmitting(true);
      const result = await eSignatureService.signWithToken(token, signerToken, signatureName);
      await leaseEsignatureService.handleLeaseSigningProgress(result);

      if (result?.status === "completed") {
        setSigned(true);
        toast.success("Document fully executed");
      } else if (result?.status === "partially_signed") {
        setPartialComplete(true);
        toast.success("Your signature recorded — awaiting countersignature");
      } else {
        setSigned(true);
        toast.success("Document signed successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sign document");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StandalonePageShell>
      <div className="mx-auto max-w-lg py-8 px-4">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading document...</p>
        ) : linkError || !request ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              {linkError || "This signing link is invalid or has expired."}
            </p>
          </Card>
        ) : signed ? (
          <Card className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h1 className="text-xl font-semibold">Document signed</h1>
            <p className="text-muted-foreground">{request.document_name} has been executed.</p>
          </Card>
        ) : (
          <Card className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <FileSignature className="h-10 w-10 mx-auto text-primary" />
              <h1 className="text-xl font-semibold">{request.document_name || "Document"}</h1>
              <p className="text-sm text-muted-foreground capitalize">
                {request.document_type?.replace(/_/g, " ") || "Agreement"}
              </p>
            </div>

            {signersSummary.length > 1 ? (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  Signing order
                </div>
                {signersSummary.map((signer, index) => (
                  <div key={`${signer.name}-${index}`} className="flex items-center justify-between text-sm">
                    <span>
                      {index + 1}. {signer.name || "Signer"}
                      {signer.role ? ` (${signer.role})` : ""}
                    </span>
                    <Badge variant={signer.status === "signed" ? "default" : "outline"}>
                      {signer.status === "signed" ? "Signed" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}

            {partialComplete ? (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                Thank you — the next signer
                {request.cosign_required ? " (landlord)" : ""} has been notified.
              </p>
            ) : null}

            {request.document_body ? (
              <div className="rounded-lg border bg-muted/30 p-4 max-h-64 overflow-y-auto text-xs font-mono whitespace-pre-wrap text-left">
                {request.document_body}
              </div>
            ) : documentUrl ? (
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-primary underline"
              >
                Review document before signing
              </a>
            ) : null}

            {!partialComplete && request.current_signer_name ? (
              <form onSubmit={handleSign} className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
                  <p className="text-muted-foreground">Signing as</p>
                  <p className="font-medium">{request.current_signer_name}</p>
                  {request.current_signer_email ? (
                    <p className="text-muted-foreground">{request.current_signer_email}</p>
                  ) : null}
                </div>
                <Input
                  placeholder="Full legal name (signature)"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  By signing, you agree this electronic signature is legally binding.
                </p>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Signing..." : "Sign document"}
                </Button>
              </form>
            ) : partialComplete ? null : (
              <p className="text-sm text-center text-muted-foreground">All parties have signed.</p>
            )}
          </Card>
        )}
      </div>
    </StandalonePageShell>
  );
}
