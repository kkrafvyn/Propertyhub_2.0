import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useTranslation } from "../../i18n/LocaleContext";
import { useMyKyc } from "../../hooks/useMyKyc";
import { isKycPending, isKycVerified } from "../../lib/baytmiftah/kyc";
import { submitKyc } from "../../lib/baytmiftah/trust-service";
import { kycService } from "../../../lib/kyc.service";
import { mobileCaptureProps } from "../../../lib/deep-link";
import { useAuth } from "../../context/AuthContext";

export function KycVerificationPanel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { kyc, loading, verified } = useMyKyc();
  const [fullName, setFullName] = useState("");
  const [documentType, setDocumentType] = useState("national_id");
  const [documentNumber, setDocumentNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
        <p className="font-semibold">{t("kycPage.pendingTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("kycPage.pendingBody")}</p>
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

    try {
      setSubmitting(true);
      const storagePath = await kycService.uploadDocument({
        userId: user.id,
        file: files[0],
      });

      await submitKyc({
        full_name: fullName.trim(),
        document_type: documentType,
        document_number: documentNumber.trim() || undefined,
        date_of_birth: dateOfBirth || undefined,
        storage_path: storagePath,
        phone: user.phone,
      });

      toast.success("Verification submitted for review.");
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

      <Button onClick={() => void handleSubmit()} disabled={submitting}>
        {submitting ? t("kycPage.submitting") : t("kycPage.submit")}
      </Button>
    </div>
  );
}
