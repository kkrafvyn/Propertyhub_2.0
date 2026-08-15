import { useState } from "react";
import { Link, Navigate } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/LocaleContext";
import { legalAcceptanceService } from "../../../lib/legal-acceptance.service";
import { toast } from "sonner";

const CATEGORIES = [
  "Fraudulent listing",
  "Impersonation",
  "Unsafe behaviour",
  "Harassment",
  "Discrimination",
  "IP violation",
  "Privacy concern",
  "Suspicious activity",
  "Account abuse",
  "Inaccurate listing",
  "Payment / transaction",
  "Other",
] as const;

export function ComplaintFormPanel({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [form, setForm] = useState({
    category: "Fraudulent listing",
    subject: "",
    description: "",
    listingId: "",
    contactEmail: user?.email ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.description.trim().length < 20) {
      toast.error(t("legal.complaint.descriptionMin"));
      return;
    }

    setLoading(true);
    try {
      const result = await legalAcceptanceService.submitComplaint({
        userId: user?.id ?? null,
        category: form.category,
        subject: form.subject.trim(),
        description: form.description.trim(),
        listingId: form.listingId.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
      });
      setReference(result.id);
      setSubmitted(true);
      toast.success(t("legal.complaint.success"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("legal.complaint.error"));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-950">
        <p className="font-semibold">{t("legal.complaint.received")}</p>
        <p className="mt-2 text-sm">
          {t("legal.complaint.reference")}: <code className="font-mono">{reference}</code>
        </p>
        {!embedded ? (
          <Link to="/help" className="mt-4 inline-block text-sm font-medium underline">
            {t("legal.complaint.backHelp")}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div>
        <label htmlFor="complaint-category" className="mb-1 block text-sm font-medium text-ink">
          {t("legal.complaint.category")}
        </label>
        <select
          id="complaint-category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
          required
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <Input
        label={t("legal.complaint.subject")}
        value={form.subject}
        onChange={(e) => setForm({ ...form, subject: e.target.value })}
        required
      />

      <div>
        <label htmlFor="complaint-description" className="mb-1 block text-sm font-medium text-ink">
          {t("legal.complaint.description")}
        </label>
        <textarea
          id="complaint-description"
          rows={6}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
          placeholder={t("legal.complaint.descriptionPlaceholder")}
          required
        />
      </div>

      <Input
        label={t("legal.complaint.listingId")}
        value={form.listingId}
        onChange={(e) => setForm({ ...form, listingId: e.target.value })}
        placeholder={t("legal.complaint.optional")}
      />

      {!user ? (
        <Input
          label={t("legal.complaint.email")}
          type="email"
          value={form.contactEmail}
          onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          required
        />
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("legal.complaint.submitting")}
          </>
        ) : (
          t("legal.complaint.submit")
        )}
      </Button>
    </form>
  );
}

/** Legacy /complaint route — canonical page is /legal/complaints. */
export function ComplaintForm() {
  return <Navigate to="/legal/complaints" replace />;
}
