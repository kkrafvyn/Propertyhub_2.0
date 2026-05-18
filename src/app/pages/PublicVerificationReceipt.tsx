import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { CheckCircle2, Copy, FileCheck2, Loader2, Printer, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { supabaseAny as supabase } from "../../lib/supabase";

type PublicReceipt = {
  id: string;
  public_token: string;
  receipt_type: string;
  title: string;
  summary: string;
  payload: Record<string, any>;
  payload_hash: string;
  rsa_signature: string | null;
  public_key_id: string | null;
  created_at: string;
  expires_at: string | null;
};

function formatAmount(payload: Record<string, any>) {
  const amountMinor = Number(payload.amountMinor || 0);
  const currency = String(payload.currency || "GHS");

  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toLocaleString()}`;
  }
}

export function PublicVerificationReceipt() {
  const { token = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadReceipt = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: receiptError } = await supabase
          .from("public_verification_receipts")
          .select("*")
          .eq("public_token", token)
          .maybeSingle();

        if (receiptError) throw receiptError;

        if (!cancelled) {
          setReceipt((data as PublicReceipt | null) || null);
          if (!data) setError("This verification receipt was not found or is no longer available.");
        }
      } catch (loadError) {
        console.error("Failed to load verification receipt:", loadError);
        if (!cancelled) setError("We could not load this verification receipt right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadReceipt();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!receipt || !window.location.search.includes("print=1")) return;
    const timeout = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timeout);
  }, [receipt]);

  const handleCopyHash = async () => {
    if (!receipt?.payload_hash) return;
    await navigator.clipboard.writeText(receipt.payload_hash);
    toast.success("Verification hash copied.");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fffdf7,#f2eadc)]">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-28">
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-primary/5 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">BaytMiftah verification</p>
                  <h1 className="mt-1 text-3xl font-semibold">
                    {receipt?.title || "Public receipt"}
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  Print / Save PDF
                </Button>
                <Link to="/search">
                  <Button variant="outline">Browse Properties</Button>
                </Link>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-muted-foreground">
              <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-primary" />
              Loading verification receipt...
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <FileCheck2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Receipt unavailable</h2>
              <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{error}</p>
            </div>
          ) : receipt ? (
            <div className="space-y-6 p-6">
              <div className="rounded-2xl border border-accent/30 bg-accent/10 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-accent" />
                  <div>
                    <h2 className="font-semibold">Receipt record is available</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{receipt.summary}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount</p>
                  <p className="mt-1 text-2xl font-semibold">{formatAmount(receipt.payload)}</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Provider</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {String(receipt.payload.provider || "Payment").toUpperCase()}
                  </p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Receipt number
                  </p>
                  <p className="mt-1 font-semibold">{receipt.payload.receiptNumber || "N/A"}</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Issued</p>
                  <p className="mt-1 font-semibold">
                    {new Intl.DateTimeFormat("en-GH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(receipt.created_at))}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">Verification hash</p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {receipt.payload_hash}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => void handleCopyHash()}>
                    <Copy className="h-4 w-4" />
                    Copy Hash
                  </Button>
                </div>
              </div>

              {receipt.rsa_signature ? (
                <div className="rounded-2xl border border-border p-5">
                  <p className="font-semibold">Signature</p>
                  <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                    {receipt.rsa_signature}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Public key: {receipt.public_key_id || "BaytMiftah verification key"}. The
                    public verification key is available from the
                    <code className="mx-1 rounded bg-muted px-1 py-0.5">
                      public-verification-key
                    </code>
                    Edge Function.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      </main>
    </div>
  );
}
