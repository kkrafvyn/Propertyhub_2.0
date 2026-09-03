import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { FileSignature, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/badge";
import { eSignatureService, type EsigSigner } from "../../lib/esignature.service";
import { leaseEsignatureService } from "../../lib/lease-esignature.service";
import { StandalonePageShell } from "../components/ux/StandalonePageShell";
import { useAuth } from "../context/AuthContext";

export function PublicSignDocument() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any>(null);
  const [signerEmail, setSignerEmail] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [signed, setSigned] = useState(false);
  const [partialComplete, setPartialComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const signers: EsigSigner[] = useMemo(
    () => (Array.isArray(request?.signers) ? request.signers : []),
    [request?.signers]
  );

  const nextPendingSigner = useMemo(
    () =>
      signers.find((signer) => signer.status !== "signed") ||
      signers.find((signer) => !signer.signed_at),
    [signers]
  );

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const row = await eSignatureService.getRequestByToken(token);
        setRequest(row);
        const pending = (row?.signers as EsigSigner[] | undefined)?.find(
          (signer) => signer.status !== "signed"
        );
        const firstSigner = pending || row?.signers?.[0];
        if (firstSigner?.email) setSignerEmail(firstSigner.email);
        if (firstSigner?.name) setSignatureName(firstSigner.name);
      } catch (err: any) {
        toast.error(err.message || "Signing link invalid or expired");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      setSubmitting(true);
      const result = await eSignatureService.signWithToken(token, signerEmail, signatureName);
      await leaseEsignatureService.handleLeaseSigningProgress(
        {
          ...result,
          signerUserId: user?.id,
          organizationId: request?.organization_id,
        },
        request
      );

      if (result?.status === "completed") {
        setSigned(true);
        toast.success("Document fully executed");
      } else if (result?.status === "partially_signed") {
        setPartialComplete(true);
        toast.success("Your signature recorded — awaiting countersignature");
        const refreshed = await eSignatureService.getRequestByToken(token);
        setRequest(refreshed);
        const pending = (refreshed?.signers as EsigSigner[] | undefined)?.find(
          (signer) => signer.status !== "signed"
        );
        if (pending?.email) setSignerEmail(pending.email);
        if (pending?.name) setSignatureName(pending.name);
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
        ) : !request ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">This signing link is invalid or has expired.</p>
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

            {signers.length > 1 ? (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  Signing order
                </div>
                {signers.map((signer, index) => (
                  <div key={`${signer.email}-${index}`} className="flex items-center justify-between text-sm">
                    <span>
                      {index + 1}. {signer.name || signer.email}
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
                Thank you — the next signer ({nextPendingSigner?.role || "landlord"}) has been notified.
              </p>
            ) : null}

            {request.document_body ? (
              <div className="rounded-lg border bg-muted/30 p-4 max-h-64 overflow-y-auto text-xs font-mono whitespace-pre-wrap text-left">
                {request.document_body}
              </div>
            ) : request.document_url ? (
              <a
                href={request.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-primary underline"
              >
                Review document before signing
              </a>
            ) : null}

            {nextPendingSigner ? (
              <form onSubmit={handleSign} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  required
                />
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
                  {submitting ? "Signing..." : partialComplete ? "Sign as next party" : "Sign document"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-center text-muted-foreground">All parties have signed.</p>
            )}
          </Card>
        )}
      </div>
    </StandalonePageShell>
  );
}
