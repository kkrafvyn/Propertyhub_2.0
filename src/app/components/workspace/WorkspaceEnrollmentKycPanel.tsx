import { ShieldCheck, ShieldAlert, Clock, Sparkles, CheckCircle2, ArrowRight, Lock } from "lucide-react";
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
      <Card className={`${compact ? "p-4" : "p-5"} border-border/80 bg-secondary/15 rounded-2xl`}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Standard Jurisdiction Onboarding</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Identity verification is optional for this market, but recommended before full workspace payouts.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`${compact ? "p-4" : "p-6"} overflow-hidden rounded-2xl border transition-all ${
        verified
          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent"
          : pending
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent"
          : "border-primary/20 bg-gradient-to-br from-primary/5 via-surface-subtle to-transparent"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform ${
            verified
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30"
              : pending
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30"
              : "bg-primary/15 text-primary ring-primary/25"
          }`}
        >
          {verified ? (
            <ShieldCheck className="h-6 w-6" />
          ) : pending ? (
            <Clock className="h-6 w-6 animate-pulse" />
          ) : (
            <ShieldAlert className="h-6 w-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold tracking-tight text-foreground text-sm sm:text-base">
              Compliance & Identity Verification (KYC)
            </h3>
            <Badge variant="outline" className="text-[10px] tracking-wide uppercase font-mono py-0.5">
              Engine: {engine}
            </Badge>
            {verified ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </Badge>
            ) : pending ? (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[11px]">
                Under Review
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[11px]">
                Required for Access
              </Badge>
            )}
          </div>

          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {verified
              ? "Your identity is authenticated and AML-cleared. BaytMiftah will review your workspace application next."
              : pending
              ? "Your identification documents and biometric check are in review. You can proceed to submit your workspace application."
              : "BaytMiftah requires identity verification before granting workspace access for agency management and property owner privileges."}
          </p>

          {!ready && !loading && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link to={`${CONSUMER_ROUTES.kyc}?context=workspace&jurisdiction=${jurisdictionId}`}>
                <Button size="sm" className="gap-1.5 text-xs font-semibold shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  Complete Identity Verification
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
