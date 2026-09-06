import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "../ui/badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { isKycPending, isKycVerified } from "../../lib/baytmiftah/kyc";
import {
  canSubmitWorkspaceEnrollment,
  describeKycEngine,
  requiresWorkspaceKycForEnrollment,
  type KycSnapshot,
} from "../../../lib/kyc-gate.service";
import { CONSUMER_ROUTES } from "../../lib/consumer-routes";

type WorkspaceEnrollmentKycPanelProps = {
  kyc: KycSnapshot | null | undefined;
  loading?: boolean;
  jurisdictionId: string;
  compact?: boolean;
};

export function WorkspaceEnrollmentKycPanel({
  kyc,
  loading = false,
  jurisdictionId,
  compact = false,
}: WorkspaceEnrollmentKycPanelProps) {
  const required = requiresWorkspaceKycForEnrollment(jurisdictionId);
  const ready = canSubmitWorkspaceEnrollment(kyc, jurisdictionId);
  const verified = isKycVerified(kyc);
  const pending = isKycPending(kyc);
  const engine = describeKycEngine(kyc, jurisdictionId);

  if (!required) {
    return (
      <Card className={`${compact ? "p-4" : "p-5"} border-border bg-secondary/20`}>
        <p className="text-sm text-ink-secondary">
          Identity verification is optional for this market, but recommended before workspace access.
        </p>
      </Card>
    );
  }

  return (
    <Card className={`${compact ? "p-4" : "p-5"} border-border`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            verified ? "bg-green-100 text-green-700" : ready ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
          }`}
        >
          {verified ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">Identity verification (KYC)</h2>
            <Badge variant="outline">Engine: {engine}</Badge>
            {verified ? (
              <Badge>Verified</Badge>
            ) : pending ? (
              <Badge variant="warning">Under review</Badge>
            ) : (
              <Badge variant="destructive">Required</Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-ink-secondary">
            {verified
              ? "Your identity is verified. BaytMiftah will review your workspace application next."
              : pending
                ? "Your documents are being reviewed. You can submit your workspace application while we complete KYC."
                : "Complete KYC before applying. BaytMiftah approves workspace access only after identity verification."}
          </p>
          {!ready && !loading ? (
            <div className="mt-4">
              <Link to={`${CONSUMER_ROUTES.kyc}?context=workspace&jurisdiction=${jurisdictionId}`}>
                <Button size="sm">Complete identity verification</Button>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
