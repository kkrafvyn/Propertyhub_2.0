import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { leaseScreeningService } from "../../lib/lease-screening.service";

export function PublicLeaseApplication() {
  const estateId = window.location.pathname.split("/").pop() || "";
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", householdSize: "1", employment: "" });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await leaseScreeningService.submitApplication({
        estateId,
        applicantName: form.name,
        applicantEmail: form.email,
        applicantPhone: form.phone,
        householdSize: Number(form.householdSize),
        employmentSummary: form.employment,
      });
      setSubmitted(true);
    } catch (error: any) {
      toast.error(error?.message || "Unable to submit application.");
    }
  };

  if (submitted) return <Card className="mx-auto mt-16 max-w-xl p-8 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /><h1 className="mt-4 text-2xl font-semibold">Application received</h1><p className="mt-2 text-muted-foreground">Your application is queued for review. Keep your confirmation email for reference.</p></Card>;

  return <Card className="mx-auto mt-10 max-w-xl p-6"><h1 className="text-2xl font-semibold">Apply to rent</h1><p className="mt-1 text-sm text-muted-foreground">Submit your details for property and screening review.</p><form className="mt-6 space-y-4" onSubmit={submit}><Input required placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><Input required type="email" placeholder="Email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><Input placeholder="Phone number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /><Input required min="1" step="1" type="number" placeholder="Household size" value={form.householdSize} onChange={(event) => setForm({ ...form, householdSize: event.target.value })} /><textarea className="min-h-24 w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm" placeholder="Employment or income summary" value={form.employment} onChange={(event) => setForm({ ...form, employment: event.target.value })} /><Button type="submit">Submit application</Button></form></Card>;
}