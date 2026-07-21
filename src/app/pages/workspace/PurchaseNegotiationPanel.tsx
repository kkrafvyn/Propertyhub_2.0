import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { purchaseWorkflowService } from "../../../lib/purchase-workflow.service";
import { walletService } from "../../../lib/wallet.service";

function formatMoney(amountMinor?: number | null, currency = "GHS") {
  return walletService.formatWalletAmount(amountMinor, currency);
}

export function PurchaseNegotiationPanel({
  dealCase,
  userId,
}: {
  dealCase: any;
  userId: string;
}) {
  const [counterOffers, setCounterOffers] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const rows = await purchaseWorkflowService.getCounterOffers(dealCase.id);
      setCounterOffers(rows);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOffers();
  }, [dealCase.id]);

  const submitSellerOffer = async () => {
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      toast.error("Enter a valid counter-offer amount.");
      return;
    }

    try {
      await purchaseWorkflowService.submitCounterOffer({
        dealCaseId: dealCase.id,
        userId,
        role: "seller",
        amountMinor,
        currency: dealCase.listing?.currency || "GHS",
        message: message.trim() || undefined,
      });
      toast.success("Seller counter-offer sent.");
      setAmount("");
      setMessage("");
      await loadOffers();
    } catch (error) {
      console.error(error);
      toast.error("Unable to submit counter-offer.");
    }
  };

  const respond = async (offerId: string, status: "accepted" | "rejected") => {
    try {
      await purchaseWorkflowService.respondToCounterOffer(offerId, status, dealCase.id);
      toast.success(`Counter-offer ${status}.`);
      await loadOffers();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update counter-offer.");
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <h3 className="font-semibold">Purchase negotiation</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading counter-offers...</p>
      ) : counterOffers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No counter-offers yet.</p>
      ) : (
        <div className="space-y-2">
          {counterOffers.map((offer) => (
            <div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {offer.offered_by_role}: {formatMoney(offer.amount_minor, offer.currency)}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {offer.status}
                </Badge>
                {offer.status === "pending" && offer.offered_by_role === "buyer" ? (
                  <>
                    <Button size="sm" onClick={() => void respond(offer.id, "accepted")}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void respond(offer.id, "rejected")}>
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Seller counter (GHS)" />
        <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional note" />
        <Button size="sm" onClick={() => void submitSellerOffer()}>
          Send counter-offer
        </Button>
      </div>
    </div>
  );
}
