import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "../ui/Button";

import { Input } from "../ui/Input";

import { Badge } from "../ui/badge";

import { useTranslation } from "../../i18n/LocaleContext";

import { useMyKyc } from "../../hooks/useMyKyc";

import { isKycPending, isKycVerified } from "../../lib/baytmiftah/kyc";

import { submitKyc } from "../../lib/baytmiftah/trust-service";

import { kycService } from "../../../lib/kyc.service";

import { mobileCaptureProps } from "../../../lib/deep-link";

import { useAuth } from "../../context/AuthContext";

import { LegalAcceptanceCheckbox } from "../legal/LegalAcceptanceCheckbox";

import { legalAcceptanceService } from "../../../lib/legal-acceptance.service";

import { ACCEPTANCE_SCOPES, LEGAL_POLICY_VERSION } from "../../../lib/legal-config";

import { KycAiGuide } from "./KycAiGuide";



function formatAiFlag(flag: string) {

  return flag.replace(/_/g, " ");

}



function KycAiStatusCard({ submission }: { submission: Record<string, unknown> | null | undefined }) {

  const { t } = useTranslation();

  if (!submission) return null;



  const screeningStatus = submission.ai_screening_status as string | undefined;

  const recommendation = submission.ai_recommendation as string | undefined;

  const confidence = submission.ai_confidence_score as number | undefined;

  const summary = submission.ai_summary as string | undefined;

  const flags = Array.isArray(submission.ai_flags) ? (submission.ai_flags as string[]) : [];



  if (!screeningStatus || screeningStatus === "pending") {

    return (

      <p className="text-sm text-muted-foreground">{t("kycPage.aiScreeningQueued")}</p>

    );

  }



  if (screeningStatus === "processing") {

    return (

      <p className="text-sm text-muted-foreground">{t("kycPage.aiScreeningProcessing")}</p>

    );

  }



  return (

    <div className="rounded-lg border border-border bg-background/80 p-3 space-y-2">

      <div className="flex flex-wrap items-center gap-2">

        <p className="text-sm font-medium">{t("kycPage.aiScreeningTitle")}</p>

        {recommendation ? (

          <Badge variant="outline" className="capitalize">

            {recommendation}

          </Badge>

        ) : null}

        {typeof confidence === "number" ? (

          <Badge variant="secondary">{confidence}% confidence</Badge>

        ) : null}

      </div>

      {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}

      {flags.length > 0 ? (

        <div className="flex flex-wrap gap-1.5">

          {flags.map((flag) => (

            <Badge key={flag} variant="outline" className="text-xs capitalize">

              {formatAiFlag(flag)}

            </Badge>

          ))}

        </div>

      ) : null}

      <p className="text-xs text-muted-foreground">{t("kycPage.aiScreeningDisclaimer")}</p>

    </div>

  );

}



export function KycVerificationPanel() {

  const { t } = useTranslation();

  const { user, profile } = useAuth();

  const { kyc, loading, verified } = useMyKyc();

  const [fullName, setFullName] = useState("");

  const [documentType, setDocumentType] = useState("national_id");

  const [documentNumber, setDocumentNumber] = useState("");

  const [dateOfBirth, setDateOfBirth] = useState("");

  const [files, setFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const [policyAccepted, setPolicyAccepted] = useState(false);



  useEffect(() => {
    const defaultName = profile?.full_name || user?.user_metadata?.full_name;
    if (defaultName && !fullName) {
      setFullName(defaultName);
    }
  }, [profile?.full_name, user?.user_metadata?.full_name, fullName]);



  if (loading) {

    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;

  }



  if (verified || isKycVerified(kyc)) {

    return (

      <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/30">

        <p className="font-semibold">{t("kycPage.verifiedTitle")}</p>

        <p className="mt-1 text-sm text-muted-foreground">{t("kycPage.verifiedBody")}</p>

      </div>

    );

  }



  if (isKycPending(kyc)) {

    const submission = (kyc as { submission?: Record<string, unknown> } | null)?.submission;



    return (

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3 dark:border-amber-900/40 dark:bg-amber-950/30">

        <p className="font-semibold">{t("kycPage.pendingTitle")}</p>

        <p className="text-sm text-muted-foreground">{t("kycPage.pendingBody")}</p>

        <KycAiStatusCard submission={submission} />

      </div>

    );

  }



  const handleSubmit = async () => {

    if (!user?.id) {

      toast.error("Sign in to submit verification.");

      return;

    }

    if (!fullName.trim()) {

      toast.error(t("kycPage.nameRequired"));

      return;

    }

    if (files.length === 0) {

      toast.error(t("kycPage.documentsRequired"));

      return;

    }

    if (!policyAccepted) {

      toast.error("Please accept the KYC & Identity Verification Policy to continue.");

      return;

    }



    try {

      setSubmitting(true);

      const storagePath = await kycService.uploadDocument({

        userId: user.id,

        file: files[0],

      });



      const result = await submitKyc({

        full_name: fullName.trim(),

        document_type: documentType,

        document_number: documentNumber.trim() || undefined,

        date_of_birth: dateOfBirth || undefined,

        storage_path: storagePath,

        phone: user.phone,

      });



      await legalAcceptanceService.recordAcceptance({

        userId: user.id,

        scope: "kyc_submission",

        policySlugs: ACCEPTANCE_SCOPES.kyc_submission.policySlugs,

        policyVersion: LEGAL_POLICY_VERSION,

      });



      const submissionId = result.kyc?.submission?.id as string | undefined;

      if (submissionId) {

        try {

          await kycService.requestAiScreening(submissionId);

        } catch (screeningError) {

          console.warn("AI KYC screening failed; manual review will continue:", screeningError);

        }

      }



      toast.success(t("kycPage.submitSuccess"));

      window.location.reload();

    } catch (error) {

      console.error(error);

      toast.error(t("kycPage.submitFailed"));

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <div className="space-y-4">

      <div>

        <h3 className="font-semibold">{t("kycPage.title")}</h3>

        <p className="text-sm text-muted-foreground mt-1">{t("kycPage.subtitle")}</p>

      </div>



      <KycAiGuide compact />



      <Input

        value={fullName}

        onChange={(event) => setFullName(event.target.value)}

        placeholder={t("kycPage.legalNamePlaceholder")}

      />



      <select

        className="w-full rounded-lg border border-border px-3 py-2"

        value={documentType}

        onChange={(event) => setDocumentType(event.target.value)}

      >

        <option value="national_id">National ID</option>

        <option value="ghana_card">Ghana Card</option>

        <option value="passport">Passport</option>

        <option value="drivers_license">Driver&apos;s license</option>

      </select>



      <Input

        value={documentNumber}

        onChange={(event) => setDocumentNumber(event.target.value)}

        placeholder="Document number (optional)"

      />



      <Input

        type="date"

        value={dateOfBirth}

        onChange={(event) => setDateOfBirth(event.target.value)}

        placeholder="Date of birth"

      />



      <div>

        <label className="text-sm text-muted-foreground block mb-2">

          {t("kycPage.uploadDocuments")}

        </label>

        <input

          type="file"

          accept="image/*,.pdf"

          onChange={(event) => setFiles(Array.from(event.target.files || []))}

          {...mobileCaptureProps()}

        />

        <p className="text-xs text-muted-foreground mt-1">{t("kycPage.uploadHint")}</p>

      </div>



      <LegalAcceptanceCheckbox

        scope="kyc_submission"

        checked={policyAccepted}

        onChange={setPolicyAccepted}

        id="kyc-policy-acceptance"

      />



      <Button onClick={() => void handleSubmit()} disabled={submitting || !policyAccepted}>

        {submitting ? t("kycPage.submitting") : t("kycPage.submit")}

      </Button>

    </div>

  );

}


