import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Button, buttonVariants } from "../../components/ui/Button";
import {
  ActivityTimeline,
  ConsumerHubChrome,
  OperationalQueryState,
  PageHeader,
  PageLayout,
  SectionHeader,
} from "../../components/ux";
import KycBanner from "../../components/baytmiftah/KycBanner";
import { PropertyContextCard } from "../../components/messaging/ContextCards";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { dealCaseService } from "../../../lib/dealcase.service";
import { documentCenterService } from "../../../lib/document-center.service";
import { inquiryWorkflowService } from "../../../lib/inquiry-workflow.service";
import { purchaseWorkflowService } from "../../../lib/purchase-workflow.service";
import { propertyViewingService } from "../../../lib/property-viewing.service";
import { bookingService } from "../../../lib/booking.service";
import { resolveBookingPaymentAction } from "../../../lib/booking-payment-action";
import { CONSUMER_ROUTES, propertyPath } from "../../lib/consumer-routes";
import { CONSUMER_PAGE_CONFIG } from "../../lib/consumer-page-config";
import {
  buildBookingTimeline,
  buildInquiryTimeline,
  buildPurchaseTimeline,
} from "../../lib/workflow-timeline";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/LocaleContext";

const pageConfig = CONSUMER_PAGE_CONFIG.journey;

export function ConsumerJourneyPage() {
  const { dealCaseId } = useParams();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [dealCase, setDealCase] = useState<any | null>(null);
  const [booking, setBooking] = useState<any | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [counterOffers, setCounterOffers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadJourney = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    setDealCase(null);
    setBooking(null);
    setViewing(null);
    setDocuments([]);
    setCounterOffers([]);

    try {
      if (bookingId) {
        const rows = await bookingService.getGuestBookings(user.id);
        const match = rows.find((row) => row.id === bookingId) || null;
        setBooking(match);
        setNotFound(!match);
        return;
      }

      if (!dealCaseId) {
        setNotFound(true);
        return;
      }

      const row = await dealCaseService.getDealCaseById(dealCaseId);
      if (!row) {
        setNotFound(true);
        return;
      }

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
    } catch (error) {
      console.error(error);
      setLoadError(t("consumerJourney.loadError"));
      toast.error(t("consumerJourney.loadError"));
    } finally {
      setLoading(false);
    }
  }, [bookingId, dealCaseId, t, user?.id]);

  useEffect(() => {
    void loadJourney();
  }, [loadJourney]);

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
      toast.success(t("consumerJourney.startApplicationSuccess"));
      navigate(CONSUMER_ROUTES.journey(created.id));
    } catch (error) {
      console.error(error);
      toast.error(t("consumerJourney.startApplicationError"));
    } finally {
      setBusy(false);
    }
  };

  const propertyTitle =
    booking?.listing?.property?.address ||
    dealCase?.listing?.property?.address ||
    null;

  const headerTitle = propertyTitle || t("consumerJourney.pageTitle");

  const queryPhase = loadError
    ? "error"
    : loading
      ? "loading"
      : notFound
        ? "empty"
        : "ready";

  const listingMeta = booking?.listing || dealCase?.listing;
  const listingId = listingMeta?.id || dealCase?.listing_id;

  return (
    <PageLayout variant="consumer" maxWidthClassName="max-w-3xl">
      <PageMeta
        title={headerTitle}
        description={t("consumerJourney.pageDescription")}
      />
      <ConsumerHubChrome activeSection="applications">
      <PageHeader
        title={headerTitle}
        description={t("consumerJourney.pageDescription")}
        breadcrumbs={pageConfig.breadcrumb}
        actions={
          <Link
            to={CONSUMER_ROUTES.applications}
            className={buttonVariants({ variant: "outline", size: "md" })}
          >
            {t("consumerJourney.backToApplications")}
          </Link>
        }
      />

      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void loadJourney()}
        retryLabel={t("consumerJourney.retry")}
        emptyTitle={t("consumerJourney.notFoundTitle")}
        emptyDescription={t("consumerJourney.notFoundDescription")}
        emptyActionLabel={pageConfig.emptyActionLabel}
        emptyActionHref={pageConfig.emptyActionHref}
      >
        <div className="space-y-6">
          {(booking || paymentAction) && profile ? (
            <KycBanner kyc={profile} />
          ) : null}
          {listingMeta ? (
            <div className="max-w-md">
              <PropertyContextCard
                metadata={{
                  propertyName: listingMeta.property?.address || headerTitle,
                  address: listingMeta.property?.address,
                  listingId: listingId || listingMeta.id,
                }}
                onAction={(action) => {
                  if (action === "view_property" && listingId) {
                    navigate(propertyPath(String(listingId)));
                  }
                }}
              />
            </div>
          ) : null}
          <div className="app-surface-card rounded-2xl p-5 sm:p-6 space-y-4">
            <ActivityTimeline embedded steps={timeline} />
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
                  {t("consumerJourney.scheduleViewing")}
                </Link>
                <Button disabled={busy} onClick={() => void promoteInquiry()}>
                  {t("consumerJourney.startApplication")}
                </Button>
              </div>
            ) : null}
          </div>

          {documents.length > 0 ? (
            <div className="app-surface-card rounded-2xl p-5 sm:p-6 space-y-3">
              <SectionHeader title={t("consumerJourney.documentsTitle")} />
              <ul className="space-y-2 text-sm">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3">
                    <span>{doc.title || doc.document_type || t("consumerJourney.documentFallback")}</span>
                    <span className="text-muted-foreground capitalize">{doc.status || "pending"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </OperationalQueryState>
      </ConsumerHubChrome>
    </PageLayout>
  );
}
