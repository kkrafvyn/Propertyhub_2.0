import { useState } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { DesktopShell } from "../../components/baytmiftah/DesktopShell";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/LocaleContext";
import { legalAcceptanceService } from "../../../lib/legal-acceptance.service";
import { toast } from "sonner";

const CATEGORIES = [
  "Dispute",
  "Fraud",
  "Copyright / IP",
  "Safety",
  "Payment / Escrow",
  "Listing accuracy",
  "Harassment",
  "Other",
] as const;

export function ComplaintForm() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [form, setForm] = useState({
    category: "Dispute",
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

  return (
    <DesktopShell minimal>
      <PageMeta
        title={t("legal.complaint.title")}
        description={t("legal.complaint.subtitle")}
      />
      <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
        <h1 className="text-3xl font-semibold text-ink">{t("legal.complaint.title")}</h1>
        <p className="mt-3 text-ink-secondary">{t("legal.complaint.subtitle")}</p>
        <p className="mt-2 text-sm text-ink-secondary">
          {t("legal.complaint.disputeNote")}{" "}
          <Link to="/legal/dispute-resolution" className="text-brand-forest hover:underline">
            {t("legal.complaint.disputePolicy")}
          </Link>
        </p>

        {submitted ? (
          <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-green-950">
            <p className="font-semibold">{t("legal.complaint.received")}</p>
            <p className="mt-2 text-sm">
              {t("legal.complaint.reference")}: <code className="font-mono">{reference}</code>
            </p>
            <Link to="/help" className="mt-4 inline-block text-sm font-medium underline">
              {t("legal.complaint.backHelp")}
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-5">
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
        )}
      </div>
    </DesktopShell>
  );
}
