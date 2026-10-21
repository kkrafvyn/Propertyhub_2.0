import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Card } from "../../components/ui/Card";
import { Button, buttonVariants } from "../../components/ui/Button";
import { ActivityTimeline } from "../../components/ux";
import { dealCaseService } from "../../../lib/dealcase.service";
import { documentCenterService } from "../../../lib/document-center.service";
import { inquiryWorkflowService } from "../../../lib/inquiry-workflow.service";
import { purchaseWorkflowService } from "../../../lib/purchase-workflow.service";
import { propertyViewingService } from "../../../lib/property-viewing.service";
import { bookingService } from "../../../lib/booking.service";
import { resolveBookingPaymentAction } from "../../../lib/booking-payment-action";
import { CONSUMER_ROUTES, propertyPath } from "../../lib/consumer-routes";
import {
  buildBookingTimeline,
  buildInquiryTimeline,
  buildPurchaseTimeline,
} from "../../lib/workflow-timeline";
import { useAuth } from "../../context/AuthContext";

export function ConsumerJourneyPage() {
  const { dealCaseId } = useParams();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dealCase, setDealCase] = useState<any | null>(null);
  const [booking, setBooking] = useState<any | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [counterOffers, setCounterOffers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    if (bookingId) {
      void bookingService.getGuestBookings(user.id).then((rows) => {
        setBooking(rows.find((row) => row.id === bookingId) || null);
      });
      return;
    }

    if (!dealCaseId) return;

    void (async () => {
      const row = await dealCaseService.getDealCaseById(dealCaseId);
      setDealCase(row);
      if (row.case_type === "purchase_offer") {
        setCounterOffers(await purchaseWorkflowService.getCounterOffers(row.id));
      }
      if (row.case_type === "property_inquiry") {
        const viewings = await propertyViewingService.getUserViewings(user.id);
        setViewing(viewings.find((v) => v.deal_case_id === row.id) || null);
      }
      const allDocs = await documentCenterService.getUserDocuments(user.id);
      setDocuments(allDocs.filter((doc) => doc.deal_case_id === row.id));
    })().catch((error) => {
      console.error(error);
      toast.error("Unable to load journey.");
    });
  }, [bookingId, dealCaseId, user?.id]);

  const timeline = useMemo(() => {
    if (booking) return buildBookingTimeline(booking);
    if (!dealCase) return [];
    if (dealCase.case_type === "property_inquiry") {
      return buildInquiryTimeline(dealCase, viewing);
    }
    if (dealCase.case_type === "purchase_offer") {
      return buildPurchaseTimeline(dealCase, undefined, { counterOffers });
    }
    return buildInquiryTimeline(dealCase, viewing);
  }, [booking, counterOffers, dealCase, viewing]);

  const paymentAction = booking
    ? resolveBookingPaymentAction({
        id: booking.id,
        listing_id: booking.listing_id,
        status: booking.status,
        booking_mode: booking.booking_mode,
        transaction_id: booking.transaction_id,
        total_minor: booking.total_minor,
        currency: booking.currency,
        check_in: booking.check_in,
      })
    : null;

  const promoteInquiry = async () => {
    if (!dealCase || !user?.id) return;
    try {
      setBusy(true);
      const created = await inquiryWorkflowService.startApplicationFromInquiry({
        inquiryDealCaseId: dealCase.id,
        userId: user.id,
      });
      toast.success("Application started.");
      navigate(CONSUMER_ROUTES.journey(created.id));
    } catch (error) {
      console.error(error);
      toast.error("Unable to start application.");
    } finally {
      setBusy(false);
    }
  };

  const title =
    booking?.listing?.property?.address ||
    dealCase?.listing?.property?.address ||
    "Your property journey";

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Track your stage, next action, and documents in one place.
          </p>
        </div>
        <Link
          to={CONSUMER_ROUTES.applications}
          className={buttonVariants({ variant: "outline", size: "md" })}
        >
          Back to applications
        </Link>
      </div>

      <Card className="p-5 space-y-4">
        <ActivityTimeline steps={timeline} />
        {paymentAction && paymentAction.kind !== "none" ? (
          <Button
            disabled={paymentAction.disabled}
            onClick={() => paymentAction.checkoutPath && navigate(paymentAction.checkoutPath)}
          >
            {paymentAction.label}
          </Button>
        ) : null}
        {dealCase?.case_type === "property_inquiry" ? (
          <div className="flex flex-wrap gap-2">
            <Link
              to={`${propertyPath(dealCase.listing_id)}#viewing`}
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              Schedule viewing
            </Link>
            <Button disabled={busy} onClick={() => void promoteInquiry()}>
              Start application
            </Button>
          </div>
        ) : null}
      </Card>

      {documents.length > 0 ? (
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Documents</h2>
          <ul className="space-y-2 text-sm">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3">
                <span>{doc.title || doc.document_type || "Document"}</span>
                <span className="text-muted-foreground capitalize">{doc.status || "pending"}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
