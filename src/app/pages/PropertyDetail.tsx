import { Textarea } from "@/app/components/ui/textarea";
import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Heart,
  Share2,
  Phone,
  Video as VideoIcon,
  Mail,
  MessageCircle,
  Check,
  CreditCard,
  Loader2,
  Shield,
  ShieldCheck,
  FileText,
  Clock3,
  HandCoins,
  ChevronLeft,
  ChevronRight,
  Images,
  Maximize2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { DesktopShell } from "../components/baytmiftah/DesktopShell";
import { ShareListingButton } from "../components/baytmiftah/ShareListingButton";
import { SimilarListings } from "../components/baytmiftah/SimilarListings";
import { mapListingToCard } from "../components/baytmiftah/listing-mappers";
import MessageHostButton from "../components/baytmiftah/chat/MessageHostButton";
import StayBookingCard from "../components/baytmiftah/StayBookingCard";
import ListingReviews from "../components/baytmiftah/ListingReviews";
import { GhanaRoutePlanner } from "../components/GhanaRoutePlanner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { FormRow } from "../components/ux";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import { useCall } from "../context/CallContext";
import { isVideoCallsEnabledForApp } from "../../lib/app-feature-gates";
import { usePlatformFeatures } from "../context/PlatformFeaturesContext";
import { listingService } from "../../lib/listing.service";
import { getPropertyCoverImage, getPropertyImageGallery } from "../../lib/property-media";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { dealCaseService } from "../../lib/dealcase.service";
import { messageService } from "../../lib/message.service";
import { communicationService } from "../../lib/communication.service";
import { organizationService } from "../../lib/organization.service";
import { paymentService } from "../../lib/payment.service";
import { hostSettingsService } from "../../lib/host-settings.service";
import { propertyViewingService } from "../../lib/property-viewing.service";
import { trustCenterService } from "../../lib/trust-center.service";
import { ComplianceDisclosurePanel } from "../components/compliance/ComplianceDisclosurePanel";
import { PropertyJurisdictionBadge } from "../components/compliance/PropertyJurisdictionBadge";
import { realEstateComplianceService } from "../../lib/real-estate-compliance.service";
import { ConsumerTrustBadges } from "../components/ConsumerTrustBadges";
import { ListingTrustStrip } from "../components/ListingTrustStrip";
import { MarketplaceDisclaimerStrip } from "../components/legal/MarketplaceDisclaimerStrip";
import { TrustBadge } from "../components/legal/TrustBadge";
import { TRUST_LABELS } from "../../lib/legal-disclaimers";
import { monitoring } from "../../lib/monitoring";
import { useMyKyc } from "../hooks/useMyKyc";
import { canSubmitOffer } from "../lib/baytmiftah/kyc";
import { canBookStay } from "../../lib/kyc-gate.service";
import KycBanner from "../components/baytmiftah/KycBanner";
import { CONSUMER_ROUTES } from "../lib/consumer-routes";
import { buildCheckoutPath } from "../lib/checkout-navigation";
import { clientIntegrations } from "../../lib/integrations";
import {
  resolvePaymentContextFromListing,
} from "../../lib/payment-routing.service";
import { geointelligenceService } from "../../lib/geointelligence.service";
import { trackRecentlyViewed } from "../../lib/recently-viewed";
import {
  clearJourneyDraft,
  readJourneyDraft,
  saveJourneyDraft,
} from "../../lib/journey-draft-storage";

export function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { kyc } = useMyKyc();
  const { startCall } = useCall();
  const { flags: platformFeatures } = usePlatformFeatures();
  const videoTourEnabled = isVideoCallsEnabledForApp(platformFeatures);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [listing, setListing] = useState<any | null>(null);
  const [relatedListings, setRelatedListings] = useState<any[]>([]);
  const [nearbyServices, setNearbyServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [viewingSubmitting, setViewingSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showViewingForm, setShowViewingForm] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerForm, setOfferForm] = useState({
    amount: "",
    message: "",
  });
  const [trustLoading, setTrustLoading] = useState(false);
  const [trustSnapshot, setTrustSnapshot] = useState<any | null>(null);
  const [trustBadges, setTrustBadges] = useState<any[]>([]);
  const [contactForm, setContactForm] = useState({
    fullName: user?.user_metadata?.full_name || "",
    email: user?.email || "",
    phone: "",
    message: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    purpose: "deposit" as
      | "deposit"
      | "rent"
      | "lease_fee"
      | "inspection_fee"
      | "booking_fee"
      | "purchase_installment"
      | "other",
    customerName: user?.user_metadata?.full_name || "",
    customerPhone: "",
  });
  const [viewingForm, setViewingForm] = useState(() => {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);

    return {
      requestedDate: nextDay.toISOString().slice(0, 10),
      requestedTime: "10:00",
      contactPhone: "",
      requesterNote: "",
    };
  });
  const [hostBookingMode, setHostBookingMode] = useState<"instant" | "request">("instant");

  useEffect(() => {
    if (!listing?.id) return;
    const inquiryDraft = readJourneyDraft<{
      fullName?: string;
      email?: string;
      phone?: string;
      message?: string;
    }>(listing.id, "inquiry");
    if (inquiryDraft) {
      setContactForm((current) => ({ ...current, ...inquiryDraft }));
      setShowContactForm(true);
    }
    const offerDraft = readJourneyDraft<{ amount?: string; message?: string }>(listing.id, "offer");
    if (offerDraft) {
      setOfferForm((current) => ({ ...current, ...offerDraft }));
      setShowOfferForm(true);
    }
  }, [listing?.id]);

  useEffect(() => {
    if (!id) return;

    const loadProperty = async () => {
      try {
        setLoading(true);
        const listingData = await listingService.getListingById(id);
        setListing(listingData);
        trackRecentlyViewed(id);

        const [similar, services] = await Promise.all([
          listingService.getSimilarListings(id, 4),
          listingData.property?.id
            ? geointelligenceService.getNearbyServices(listingData.property.id).catch(() => [])
            : Promise.resolve([]),
        ]);
        setRelatedListings(similar);
        setNearbyServices(services || []);
      } catch (error) {
        console.error("Failed to load property:", error);
        toast.error("Unable to load this property right now.");
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id]);

  useEffect(() => {
    if (!user || !listing?.id) {
      setIsSaved(false);
      return;
    }

    savedPropertyService
      .isPropertySaved(user.id, listing.id)
      .then(setIsSaved)
      .catch((error) => {
        console.error("Failed to check saved property:", error);
      });
  }, [listing?.id, user]);

  useEffect(() => {
    if (!listing?.id || listing.listing_type !== "short_stay") {
      setHostBookingMode("instant");
      return;
    }

    void hostSettingsService
      .getListingSettings(listing.id)
      .then((settings) => setHostBookingMode(settings?.booking_mode === "request" ? "request" : "instant"))
      .catch(() => setHostBookingMode("instant"));
  }, [listing?.id, listing?.listing_type]);

  useEffect(() => {
    if (!listing?.price) return;

    setPaymentForm((current) => ({
      ...current,
      amount: current.amount || String(listing.price),
    }));
  }, [listing?.price]);

  useEffect(() => {
    if (!listing?.id || !listing.organization_id) {
      setTrustSnapshot(null);
      return;
    }

    let cancelled = false;

    const loadTrustSnapshot = async () => {
      try {
        setTrustLoading(true);
        const snapshot = await trustCenterService.getListingTrustSnapshot(
          listing.id,
          listing.organization_id
        );
        const badges = await trustCenterService.getConsumerTrustBadges({
          listingId: listing.id,
          organizationId: listing.organization_id,
          organizationVerified: listing.organization?.verified,
          qualityScore: listing.quality_score,
        });

        if (!cancelled) {
          setTrustSnapshot(snapshot);
          setTrustBadges(badges);
        }
      } catch (error) {
        console.error("Failed to load trust snapshot:", error);
      } finally {
        if (!cancelled) {
          setTrustLoading(false);
        }
      }
    };

    void loadTrustSnapshot();

    return () => {
      cancelled = true;
    };
  }, [listing?.id, listing?.organization_id]);

  const property = listing?.property;
  const organization = listing?.organization;
  const paymentContext = useMemo(
    () => (listing ? resolvePaymentContextFromListing(listing) : null),
    [listing]
  );
  const paymentCurrency = paymentContext?.currency || listing?.currency || "USD";
  const images = getPropertyImageGallery(property);

  useEffect(() => {
    if (!showAllPhotos) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAllPhotos(false);
      if (e.key === "ArrowLeft") setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      if (e.key === "ArrowRight") setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAllPhotos, images.length]);
  const locationQuery = property
    ? [property.address, property.city, property.region, property.country].filter(Boolean).join(", ")
    : "";
  const mapEmbedUrl = locationQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(locationQuery)}&output=embed`
    : "";
  const listingQualityScore =
    typeof listing?.quality_score === "number" ? Math.round(listing.quality_score) : null;
  const listingVerificationStatus = listing?.verification_status
    ? String(listing.verification_status).replaceAll("_", " ")
    : "review pending";
  const locationConfidence =
    typeof property?.location_confidence === "number"
      ? `${Math.round(property.location_confidence)}%`
      : null;
  const locationMeta = [
    property?.neighborhood,
    property?.ghana_post_gps ? `GhanaPostGPS ${property.ghana_post_gps}` : null,
  ].filter((item): item is string => Boolean(item));

  const pageTitle = useMemo(() => {
    if (!property) return "Property";
    return `${property.address}, ${property.city}`;
  }, [property]);

  const jurisdictionId = useMemo(
    () =>
      realEstateComplianceService.resolveFromProperty({
        country: property?.country,
        region: property?.region,
        city: property?.city,
      }),
    [property?.country, property?.region, property?.city]
  );
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const toggleSave = async () => {
    if (!user) {
      toast.error("Log in to save properties.");
      navigate("/login", { state: { from: `/property/${id}` } });
      return;
    }

    try {
      const result = await savedPropertyService.toggleSavedProperty(user.id, listing.id);
      setIsSaved(result.saved);
      toast.success(result.saved ? "Property saved." : "Property removed from saved list.");
    } catch (error) {
      console.error("Failed to save property:", error);
      toast.error("Unable to update saved properties.");
    }
  };

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      saveJourneyDraft(listing.id, "inquiry", contactForm);
      toast.error("Log in to contact the listing team.");
      navigate("/login", { state: { from: `/property/${id}` } });
      return;
    }

    if (!contactForm.message.trim()) {
      toast.error("Add a short message so the team knows what you need.");
      return;
    }

    try {
      setSubmitting(true);
      const dealCase = await dealCaseService.createDealCase({
        listing_id: listing.id,
        user_id: user.id,
        organization_id: listing.organization_id,
        case_type: "property_inquiry",
        pipeline_stage: "new_inquiry",
        message: contactForm.message,
      });

      try {
        const workspaceOrganization = await organizationService.getOrganizationById(
          listing.organization_id
        );

        if (workspaceOrganization.owner_id && workspaceOrganization.owner_id !== user.id) {
          const sharedConversation = await messageService.createOrGetOrganizationConversation({
            organizationId: listing.organization_id,
            leadUserId: user.id,
            internalParticipantId: workspaceOrganization.owner_id,
            createdBy: user.id,
            dealCaseId: dealCase.id,
          });

          const inquirySummary = [
            `New inquiry about ${pageTitle}`,
            "",
            contactForm.message.trim(),
            "",
            `From: ${contactForm.fullName || user.user_metadata?.full_name || user.email}`,
            `Email: ${contactForm.email || user.email || "Not provided"}`,
            `Phone: ${contactForm.phone || "Not provided"}`,
          ].join("\n");

          await messageService.sendMessage(
            sharedConversation.conversation_id,
            user.id,
            inquirySummary
          );
        }
      } catch (conversationError) {
        console.error("Failed to create inquiry conversation:", conversationError);
      }

      try {
        await communicationService.createInAppNotification({
          userId: user.id,
          notificationType: "inquiry_sent",
          subject: `Inquiry sent for ${pageTitle}`,
          content: "The listing team can reply in your messages whenever they respond.",
          actionUrl: "/app/messages",
        });
      } catch (notificationError) {
        console.error("Failed to create inquiry notification:", notificationError);
      }

      clearJourneyDraft(listing.id, "inquiry");
      toast.success("Your inquiry has been sent.");
      setContactForm((current) => ({ ...current, message: "" }));
      setShowContactForm(false);
    } catch (error) {
      console.error("Failed to submit inquiry:", error);
      toast.error("Unable to send your inquiry right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMakeOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !listing) {
      if (listing?.id) saveJourneyDraft(listing.id, "offer", offerForm);
      toast.error("Log in before submitting an offer.");
      navigate("/login", { state: { from: `/property/${id}` } });
      return;
    }

    if (!canSubmitOffer(kyc)) {
      saveJourneyDraft(listing.id, "offer", offerForm);
      toast.error("Complete identity verification before submitting an offer.");
      navigate(CONSUMER_ROUTES.kyc);
      return;
    }

    const amount = Number(offerForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid offer amount.");
      return;
    }

    try {
      setOfferSubmitting(true);
      const dealCase = await dealCaseService.createDealCase({
        listing_id: listing.id,
        user_id: user.id,
        organization_id: listing.organization_id,
        case_type: "purchase_offer",
        message: offerForm.message.trim() || "Purchase offer submitted from property page.",
        pipeline_stage: "negotiation",
      });
      const { purchaseWorkflowService } = await import("../../lib/purchase-workflow.service");
      await purchaseWorkflowService.submitCounterOffer({
        dealCaseId: dealCase.id,
        userId: user.id,
        role: "buyer",
        amountMinor: Math.round(amount * 100),
        currency: paymentCurrency,
        message: offerForm.message.trim() || undefined,
      });
      clearJourneyDraft(listing.id, "offer");
      monitoring.trackWorkflowStep("purchase", "offer_submitted", { listingId: listing.id });
      toast.success("Offer submitted. Track progress in My BaytMiftah.");
      setShowOfferForm(false);
      navigate("/app/applications");
    } catch (error) {
      console.error(error);
      monitoring.captureError(error, "property_offer");
      toast.error("Unable to submit offer.");
    } finally {
      setOfferSubmitting(false);
    }
  };

  const handleShare = async () => {
    const payload = {
      title: pageTitle,
      text: `Take a look at ${pageTitle} on BaytMiftah.`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Property link copied to your clipboard.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Failed to share property:", error);
      toast.error("We couldn't share this property right now.");
    }
  };

  const handleSecurePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Log in before starting checkout.");
      navigate("/login", { state: { from: `/property/${id}` } });
      return;
    }

    if (!paymentContext || !clientIntegrations.payangels.checkoutReady) {
      toast.error(
        `Checkout for properties in ${paymentContext?.propertyLabel || "this market"} is not available yet.`
      );
      return;
    }

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(`Enter a valid payment amount in ${paymentCurrency}.`);
      return;
    }

    try {
      setPaymentSubmitting(true);
      navigate(
        buildCheckoutPath({
          listingId: listing.id,
          amount,
          purpose: paymentForm.purpose,
          returnTo: `/property/${listing.id}`,
          customerName: paymentForm.customerName,
          customerPhone: paymentForm.customerPhone,
        }),
      );
    } catch (error) {
      console.error("Failed to initialize payment:", error);
      toast.error("Unable to start checkout right now.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleViewingRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Log in before booking a viewing.");
      navigate("/login", { state: { from: `/property/${id}` } });
      return;
    }

    if (!viewingForm.requestedDate || !viewingForm.requestedTime) {
      toast.error("Choose a preferred date and time.");
      return;
    }

    const requestedDateTime = new Date(
      `${viewingForm.requestedDate}T${viewingForm.requestedTime}:00`
    );

    if (Number.isNaN(requestedDateTime.getTime()) || requestedDateTime.getTime() <= Date.now()) {
      toast.error("Choose a future time for your viewing.");
      return;
    }

    try {
      setViewingSubmitting(true);
      await propertyViewingService.requestViewing({
        userId: user.id,
        listingId: listing.id,
        propertyId: property.id,
        organizationId: listing.organization_id,
        listingType: listing.listing_type,
        requestedDateTime: requestedDateTime.toISOString(),
        requesterNote: viewingForm.requesterNote,
        contactPhone: viewingForm.contactPhone,
        contactEmail: user.email || undefined,
      });

      toast.success("Viewing request sent. The team can confirm it from their workspace.");
      setViewingForm((current) => ({
        ...current,
        contactPhone: "",
        requesterNote: "",
      }));
      setShowViewingForm(false);
      setShowContactForm(false);
    } catch (error) {
      console.error("Failed to request viewing:", error);
      toast.error("We couldn't schedule that viewing right now.");
    } finally {
      setViewingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DesktopShell minimal>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-ink" />
        </div>
      </DesktopShell>
    );
  }

  if (!listing || !property) {
    return (
      <DesktopShell minimal>
        <div className="max-w-3xl mx-auto">
          <Card className="p-8 text-center panel-card">
            <h1 className="text-2xl font-semibold mb-2 text-ink">Property not found</h1>
            <p className="text-ink-secondary mb-6">
              This listing may have been removed or is no longer public.
            </p>
            <Link to="/search">
              <Button>Browse other properties</Button>
            </Link>
          </Card>
        </div>
      </DesktopShell>
    );
  }

  return (
    <DesktopShell minimal>
      <div className="pb-12">
        {/* Architectural Bento Photo Gallery */}
        <div className="mb-8">
          {images.length >= 5 ? (
            <div className="hidden lg:grid grid-cols-4 grid-rows-2 gap-3 h-[480px] xl:h-[530px] rounded-3xl overflow-hidden relative">
              {/* Focal Hero Photo */}
              <div
                onClick={() => { setCurrentImageIndex(0); setShowAllPhotos(true); }}
                className="col-span-2 row-span-2 relative group overflow-hidden cursor-pointer bg-surface-subtle"
              >
                <img
                  src={images[0]}
                  alt={pageTitle}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-medium text-white border border-white/20">
                  <Maximize2 className="w-3 h-3" />
                  <span>Click to expand</span>
                </div>
              </div>

              {/* Photos 1, 2, 3, 4 in 2x2 grid on right */}
              {images.slice(1, 5).map((image, index) => {
                const photoIdx = index + 1;
                const isLast = index === 3;
                return (
                  <div
                    key={image}
                    onClick={() => { setCurrentImageIndex(photoIdx); setShowAllPhotos(true); }}
                    className="col-span-1 row-span-1 relative group overflow-hidden cursor-pointer bg-surface-subtle"
                  >
                    <img
                      src={image}
                      alt={`${pageTitle} ${photoIdx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                    {isLast && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowAllPhotos(true); }}
                        className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-black/65 hover:bg-black/80 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-white shadow-lg transition-all active:scale-95 cursor-pointer"
                      >
                        <Images className="w-3.5 h-3.5" />
                        <span>All {images.length} photos</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-3xl h-[380px] sm:h-[460px] bg-surface-subtle">
              <img
                src={images[currentImageIndex] || images[0]}
                alt={pageTitle}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 right-4 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/15">
                {currentImageIndex + 1} / {images.length}
              </div>
            </div>
          )}

          {/* Mobile / Tablet Gallery Carousel */}
          <div className="lg:hidden relative overflow-hidden rounded-2xl aspect-[4/3] sm:aspect-[16/9] bg-surface-subtle mt-2">
            <img
              src={images[currentImageIndex]}
              alt={pageTitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/15">
              {currentImageIndex + 1} / {images.length}
            </div>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Strip */}
          <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {images.map((image, index) => (
              <button
                key={image}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  currentImageIndex === index
                    ? "border-primary shadow-xs scale-105"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <Dialog open={showAllPhotos} onOpenChange={setShowAllPhotos}>
          <DialogContent
            className="motion-safe-only fixed inset-0 top-0 left-0 z-[var(--z-overlay-gallery)] flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-black/95 p-0 text-white shadow-none sm:max-w-none [&>button:last-child]:hidden"
          >
            <DialogTitle className="sr-only">
              Photo gallery {currentImageIndex + 1} of {images.length}
            </DialogTitle>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">
                  {currentImageIndex + 1} / {images.length}
                </span>
                <span className="text-xs text-white/60 truncate max-w-md hidden sm:inline">
                  {pageTitle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAllPhotos(false)}
                className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>
            <div className="relative flex flex-1 items-center justify-center p-4 min-h-0">
              <img
                src={images[currentImageIndex]}
                alt={`${pageTitle} ${currentImageIndex + 1}`}
                className="max-h-[78vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    className="absolute left-6 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition backdrop-blur-md cursor-pointer"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-6 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition backdrop-blur-md cursor-pointer"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 px-4 py-3 overflow-x-auto border-t border-white/10 max-h-24">
              {images.map((img, idx) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                    currentImageIndex === idx ? "border-primary scale-105" : "border-transparent opacity-50 hover:opacity-90"
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      {listing.listing_type === "rental" ? "Rental Property" : listing.listing_type === "lease" ? "Commercial Lease" : listing.listing_type === "short_stay" ? "Short Stay & Vacation" : "Property For Sale"}
                    </span>
                    {organization?.verified && (
                      <TrustBadge
                        label={TRUST_LABELS.platform_reviewed_agency.short}
                        disclaimer={TRUST_LABELS.platform_reviewed_agency.disclaimer}
                        className="shrink-0"
                      />
                    )}
                    {listingQualityScore !== null && listingQualityScore >= 75 && (
                      <TrustBadge
                        label={`${TRUST_LABELS.listing_quality_score.short}: ${listingQualityScore}/100`}
                        disclaimer={TRUST_LABELS.listing_quality_score.disclaimer}
                        className="shrink-0"
                      />
                    )}
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.15] mb-3">
                    {pageTitle}
                  </h1>
                  {property ? (
                    <div className="mb-3">
                      <PropertyJurisdictionBadge
                        property={{
                          country: property.country,
                          region: property.region,
                          city: property.city,
                          subdivision_code: property.subdivision_code,
                          currency: listing?.currency,
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 text-muted-foreground mb-4 flex-wrap">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground break-words">
                      {property.address}, {property.city}, {property.region}, {property.country}
                    </span>
                    {property.ghana_post_gps && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-surface-subtle border border-surface-border text-foreground shrink-0">
                        {property.ghana_post_gps}
                      </span>
                    )}
                  </div>
                  {locationMeta.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {locationMeta.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-baseline gap-2 pt-2">
                    <span className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-primary">
                      <span className="text-2xl sm:text-3xl font-normal text-muted-foreground mr-1">{paymentCurrency}</span>
                      {listing.price.toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {listing.listing_type === "rental" ? "/ month" : listing.listing_type === "lease" ? "/ lease term" : listing.listing_type === "short_stay" ? "/ night" : "total price"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ShareListingButton listing={mapListingToCard(listing)} variant="icon" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSave}
                    className={`rounded-2xl transition-all duration-300 ${
                      isSaved
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 scale-105"
                        : "hover:border-primary/40 hover:scale-105"
                    }`}
                    aria-label={isSaved ? "Remove from saved" : "Save property"}
                  >
                    <Heart className={`w-4 h-4 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Luxury Spec Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 py-6 border-y border-surface-border my-6">
                <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-surface-subtle/70 border border-surface-border/80 shadow-xs hover:border-primary/30 transition-colors">
                  <div className="metric-halo metric-halo-primary">
                    <Bed className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground">{property.bedrooms ?? "N/A"}</div>
                    <div className="text-xs font-medium text-muted-foreground">Bedrooms</div>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-surface-subtle/70 border border-surface-border/80 shadow-xs hover:border-emerald-500/30 transition-colors">
                  <div className="metric-halo metric-halo-emerald">
                    <Bath className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground">{property.bathrooms ?? "N/A"}</div>
                    <div className="text-xs font-medium text-muted-foreground">Bathrooms</div>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-surface-subtle/70 border border-surface-border/80 shadow-xs hover:border-amber-500/30 transition-colors">
                  <div className="metric-halo metric-halo-amber">
                    <Square className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground">{property.square_meters ? `${property.square_meters}m²` : "N/A"}</div>
                    <div className="text-xs font-medium text-muted-foreground">Property Size</div>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-surface-subtle/70 border border-surface-border/80 shadow-xs hover:border-terracotta/30 transition-colors">
                  <div className="metric-halo metric-halo-terracotta">
                    <ShieldCheck className="w-5 h-5 text-terracotta" />
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground capitalize truncate">
                      {listing.listing_type || "Verified"}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">Contract Type</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                {property.description || "No detailed description has been added for this property yet."}
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Amenities</h2>
              {property.amenities?.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {property.amenities.map((amenity: string) => (
                    <div key={amenity} className="flex items-center gap-2 text-foreground">
                      <div className="w-5 h-5 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-accent" />
                      </div>
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No amenities have been added yet.</p>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Trust signals (informational)</h2>
              <Card className="p-6 bg-primary/5 border-primary/15">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Platform trust signals</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Payments for this listing are processed by a third-party payment provider ({paymentCurrency}).
                      Labels below describe platform checks only — not legal title, property condition, or
                      investment suitability.
                    </p>
                    {!trustLoading && trustBadges.length > 0 ? (
                      <div className="mt-4">
                        <ConsumerTrustBadges badges={trustBadges} />
                      </div>
                    ) : null}
                  </div>
                </div>

                {trustLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading trust signals...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                      <div className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                          <Shield className="w-4 h-4 text-primary" />
                          Organization
                        </div>
                        <p className="text-lg font-semibold">
                          {trustSnapshot?.organizationVerified
                            ? TRUST_LABELS.platform_reviewed_agency.short
                            : "Review pending"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {TRUST_LABELS.platform_reviewed_agency.disclaimer}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Public Documents
                        </div>
                        <p className="text-lg font-semibold">
                          {trustSnapshot?.publicDocumentCount || 0}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Publicly shared offer letters, agreements, or verification records.
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          Payment Trail
                        </div>
                        <p className="text-lg font-semibold">
                          {trustSnapshot?.securePaymentsEnabled ? "Receipt-ready" : "Standard"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {TRUST_LABELS.licensed_payment_partner.disclaimer}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                      <div className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                          <Check className="w-4 h-4 text-primary" />
                          Listing Quality
                        </div>
                        <p className="text-lg font-semibold">
                          {listingQualityScore !== null ? `${listingQualityScore}/100` : "Not scored"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {TRUST_LABELS.listing_quality_score.disclaimer}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          Ghana Address
                        </div>
                        <p className="text-lg font-semibold">
                          {property.ghana_post_gps || locationConfidence || "Pending"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Location metadata only. Always inspect the property in person.
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                          <Clock3 className="w-4 h-4 text-primary" />
                          Listing Review
                        </div>
                        <p className="text-lg font-semibold capitalize">
                          {listingVerificationStatus}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Internal workflow status only — not a legal or title certification.
                        </p>
                      </div>
                    </div>

                    {trustSnapshot?.trustHighlights?.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                        {trustSnapshot.trustHighlights.map((highlight: string) => (
                          <div
                            key={highlight}
                            className="rounded-xl border border-border/80 bg-background px-4 py-3 text-sm text-muted-foreground flex gap-2"
                          >
                            <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                            <span>{highlight}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {trustSnapshot?.publicDocuments?.length ? (
                      <div className="space-y-3">
                        <h4 className="font-medium">Documents shared by listing party</h4>
                        {trustSnapshot.publicDocuments.map((document: any) => (
                          <div
                            key={document.id}
                            className="rounded-xl border border-border bg-background px-4 py-3"
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="font-medium">{document.title}</p>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
                                  {String(document.document_type || "document").replaceAll("_", " ")}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock3 className="w-3.5 h-3.5" />
                                {document.signed_at
                                  ? `Signed ${new Date(document.signed_at).toLocaleDateString()}`
                                  : `Status: ${String(document.status || "draft").replaceAll("_", " ")}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No documents have been shared publicly for this listing yet.
                      </p>
                    )}
                    <div className="mt-5 border-t border-border pt-4">
                      <MarketplaceDisclaimerStrip compact />
                    </div>
                  </>
                )}
              </Card>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Location</h2>
              <Card className="overflow-hidden">
                {mapEmbedUrl ? (
                  <>
                    <iframe
                      title={`Map for ${pageTitle}`}
                      src={mapEmbedUrl}
                      className="w-full h-80 border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="p-4 border-t border-border flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm text-muted-foreground">{locationQuery}</p>
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                      >
                        <MapPin className="w-4 h-4" />
                        Open in Maps
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="h-80 bg-secondary flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="w-12 h-12 mx-auto mb-2" />
                      <p>Location details are still being prepared</p>
                    </div>
                  </div>
                )}
              </Card>
              <GhanaRoutePlanner
                destinationLat={property.latitude}
                destinationLng={property.longitude}
                destinationLabel={pageTitle}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            {listing.listing_type === "short_stay" && (
              <div className="app-surface-card rounded-2xl p-4 mb-4">
                <StayBookingCard
                  listing={{
                    id: listing.id,
                    price: listing.price,
                    priceLabel: `${paymentCurrency} ${listing.price.toLocaleString()}`,
                    currency: paymentCurrency,
                    instantBook: hostBookingMode !== "request",
                    jurisdictionId,
                    checkoutReady: paymentContext ? clientIntegrations.payangels.checkoutReady : true,
                    organizationId: organization?.id,
                    organizationVerified: organization?.verified,
                    qualityScore: listing.quality_score,
                  }}
                />
              </div>
            )}
            <Card variant="glass" className="p-6 lg:p-7 sticky top-24 rounded-3xl border border-surface-border/80 shadow-glass-card bg-surface/90 backdrop-blur-md">
              {/* Price & Escrow Guarantee Header */}
              <div className="flex items-center justify-between gap-3 mb-5 pb-5 border-b border-surface-border/60">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    {listing.listing_type === "rental" ? "Monthly Rent" : listing.listing_type === "lease" ? "Lease Value" : listing.listing_type === "short_stay" ? "Nightly Rate" : "Asking Price"}
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-primary">
                    <span className="text-xl font-normal text-muted-foreground mr-1">{paymentCurrency}</span>
                    {listing.price.toLocaleString()}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Escrow Protected</span>
                </div>
              </div>

              {/* Primary Call-to-Actions */}
              <div className="space-y-3 mb-6">
                {listing.listing_type === "short_stay" ? (
                  <Button
                    className="w-full font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all py-3.5"
                    onClick={() =>
                      document.getElementById("stay-booking")?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  >
                    Reserve Short Stay
                  </Button>
                ) : (
                  <>
                    {listing.listing_type === "sale" ? (
                      <Button
                        className="w-full font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all py-3.5 flex items-center justify-center gap-2"
                        onClick={() => setShowOfferForm(true)}
                      >
                        <HandCoins className="w-4 h-4" />
                        Make an Offer
                      </Button>
                    ) : (
                      <Button
                        className="w-full font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all py-3.5 flex items-center justify-center gap-2"
                        onClick={() => setShowContactForm(true)}
                      >
                        <FileText className="w-4 h-4" />
                        Apply for Lease
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      className="w-full font-semibold rounded-2xl hover:border-primary/40 hover:bg-surface-subtle transition-all py-3 flex items-center justify-center gap-2"
                      onClick={() => setShowViewingForm(true)}
                    >
                      <MapPin className="w-4 h-4 text-primary" />
                      Schedule Viewing
                    </Button>

                    <Link to={`/app/workspace-access?claimListing=${listing.id}`}>
                      <Button
                        variant="outline"
                        className="w-full font-semibold rounded-2xl hover:border-amber-500/40 hover:bg-amber-500/5 transition-all py-3"
                      >
                        Claim this property
                      </Button>
                    </Link>
                  </>
                )}

                {/* Secure Checkout Option */}
                <Button
                  variant="outline"
                  className="w-full rounded-2xl text-xs font-semibold hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2 text-foreground"
                  onClick={() => setShowPaymentForm(true)}
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                  Pay Deposit via PayAngels Escrow
                </Button>
              </div>

              {/* Host & Agency Details */}
              <div className="p-4 rounded-2xl bg-surface-subtle/70 border border-surface-border/70 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0 shadow-xs">
                    {(organization?.name || "P").charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {organization?.name || "Property Team"}
                      </h3>
                      {organization?.verified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          <Check className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {listing.listing_type === "sale" ? "Licensed Sales Brokerage" : "Official Leasing Representative"}
                    </p>
                  </div>
                </div>
              </div>

              {listing.organization_id ? (
                <ListingTrustStrip
                  className="mb-5"
                  listingId={listing.id}
                  organizationId={listing.organization_id}
                  organizationVerified={organization?.verified}
                  qualityScore={listing.quality_score}
                />
              ) : null}

              {/* Direct Communication Grid (Voice, Video, In-App Chat, Email) */}
              <div className="space-y-2 mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Connect Directly
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-surface-border hover:border-emerald-500/40 hover:bg-emerald-500/5 text-foreground flex items-center justify-center gap-1.5 text-xs font-medium"
                    onClick={() => {
                      void startCall(
                        {
                          name: organization?.name || "Listing Host & Agent",
                          role: "Listing Agent",
                        },
                        "voice",
                        {
                          listingId: listing.id,
                          listingTitle: pageTitle,
                        }
                      );
                    }}
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    Voice Call
                  </Button>
                  {videoTourEnabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-surface-border hover:border-teal-500/40 hover:bg-teal-500/5 text-foreground flex items-center justify-center gap-1.5 text-xs font-medium"
                      onClick={() => {
                        void startCall(
                          {
                            name: organization?.name || "Listing Host & Agent",
                            role: "Listing Agent",
                          },
                          "video",
                          {
                            listingId: listing.id,
                            listingTitle: pageTitle,
                          }
                        );
                      }}
                    >
                      <VideoIcon className="w-3.5 h-3.5 text-teal-500" />
                      Live Tour
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Start inquiry"
                    className="rounded-xl border-surface-border hover:border-primary/40 hover:bg-primary/5 text-foreground flex items-center justify-center gap-1.5 text-xs font-medium"
                    onClick={() => setShowContactForm(true)}
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-primary" />
                    Start inquiry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-surface-border hover:border-surface-border/80 text-foreground flex items-center justify-center gap-1.5 text-xs font-medium"
                    onClick={() => organization?.email && window.open(`mailto:${organization.email}`)}
                  >
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    Email
                  </Button>
                </div>

                {listing.listing_type === "sale" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-primary mt-1"
                    onClick={() => navigate("/app/mortgage")}
                  >
                    <Shield className="w-3.5 h-3.5 mr-1 text-primary" />
                    Estimate Monthly Mortgage Payment
                  </Button>
                )}
              </div>

              {showViewingForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="border-t border-border pt-6 mt-6"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Book a Viewing</h4>
                      <p className="text-sm text-muted-foreground">
                        Pick a preferred slot and the workspace team can confirm, reschedule, or
                        follow up from their pipeline.
                      </p>
                    </div>
                  </div>
                  <form className="space-y-4" onSubmit={handleViewingRequest}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Preferred Date"
                        type="date"
                        value={viewingForm.requestedDate}
                        onChange={(e) =>
                          setViewingForm((current) => ({
                            ...current,
                            requestedDate: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Preferred Time"
                        type="time"
                        value={viewingForm.requestedTime}
                        onChange={(e) =>
                          setViewingForm((current) => ({
                            ...current,
                            requestedTime: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Input
                      label="Phone"
                      type="tel"
                      placeholder="+233 24 123 4567"
                      value={viewingForm.contactPhone}
                      onChange={(e) =>
                        setViewingForm((current) => ({
                          ...current,
                          contactPhone: e.target.value,
                        }))
                      }
                    />
                    <div>
                      <label htmlFor="property-viewing-note" className="block mb-2 text-sm">
                        Note
                      </label>
                      <Textarea
                        id="property-viewing-note"
                        className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        rows={4}
                        placeholder="Any preferred time window, gate instructions, or questions for the team."
                        value={viewingForm.requesterNote}
                        onChange={(e) =>
                          setViewingForm((current) => ({
                            ...current,
                            requesterNote: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button
                      size="lg"
                      className="w-full"
                      type="submit"
                      disabled={viewingSubmitting}
                    >
                      {viewingSubmitting ? "Sending request..." : "Request Viewing"}
                    </Button>
                  </form>
                </motion.div>
              )}

              {showOfferForm && listing.listing_type === "sale" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="border-t border-border pt-6 mt-6"
                >
                  <h4 className="font-semibold mb-4">Make an offer</h4>
                  {!canSubmitOffer(kyc) ? <KycBanner kyc={kyc} /> : null}
                  <form className="space-y-4" onSubmit={handleMakeOffer}>
                    <Input
                      label={`Offer amount (${paymentCurrency})`}
                      type="number"
                      value={offerForm.amount}
                      onChange={(event) =>
                        setOfferForm((current) => ({ ...current, amount: event.target.value }))
                      }
                      placeholder={String(listing.price || "")}
                    />
                    <Textarea
                      className="w-full min-h-24 rounded-lg border border-border px-4 py-3"
                      placeholder="Optional terms or message for the seller"
                      value={offerForm.message}
                      onChange={(event) =>
                        setOfferForm((current) => ({ ...current, message: event.target.value }))
                      }
                    />
                    <Button size="lg" className="w-full" type="submit" disabled={offerSubmitting}>
                      {offerSubmitting ? "Submitting..." : "Submit offer"}
                    </Button>
                  </form>
                </motion.div>
              )}

              {showContactForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="app-surface-card rounded-2xl p-5 mt-6 motion-safe-only"
                >
                  <h4 className="app-page-title text-lg mb-4">Contact the Team</h4>
                  <form className="space-y-4" onSubmit={handleInquiry}>
                    <Input
                      label="Full Name"
                      placeholder="John Doe"
                      value={contactForm.fullName}
                      onChange={(e) => setContactForm((current) => ({ ...current, fullName: e.target.value }))}
                    />
                    <Input
                      label="Email"
                      type="email"
                      placeholder="john@example.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm((current) => ({ ...current, email: e.target.value }))}
                    />
                    <Input
                      label="Phone"
                      type="tel"
                      placeholder="+233 24 123 4567"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm((current) => ({ ...current, phone: e.target.value }))}
                    />
                    <FormRow htmlFor="property-inquiry-message" label="Message">
                      <Textarea
                        id="property-inquiry-message"
                        className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        rows={4}
                        placeholder="I'm interested in this property and would like more details."
                        value={contactForm.message}
                        onChange={(e) => setContactForm((current) => ({ ...current, message: e.target.value }))}
                      />
                    </FormRow>
                    <Button size="lg" className="w-full" type="submit" disabled={submitting}>
                      {submitting ? "Sending..." : "Send Inquiry"}
                    </Button>
                  </form>
                </motion.div>
              )}

              {showPaymentForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="border-t border-border pt-6 mt-6"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Secure Payment</h4>
                      <p className="text-sm text-muted-foreground">
                        {paymentContext
                          ? `Pay with mobile money, card, or bank transfer in ${paymentCurrency}.`
                          : "Pay with mobile money, card, or bank transfer."}{" "}
                        After confirmation, your receipt is prepared for verification.
                      </p>
                    </div>
                  </div>
                  <form className="space-y-4" onSubmit={handleSecurePayment}>
                    <Input
                      label={`Amount (${paymentCurrency})`}
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="5000"
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm((current) => ({ ...current, amount: e.target.value }))
                      }
                    />
                    <div>
                      <label htmlFor="property-payment-purpose" className="block mb-2 text-sm">
                        Payment Purpose
                      </label>
                      <NativeSelectControl
                        id="property-payment-purpose"
                        className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={paymentForm.purpose}
                        onChange={(e) =>
                          setPaymentForm((current) => ({
                            ...current,
                            purpose: e.target.value as typeof current.purpose,
                          }))
                        }
                      >
                        <option value="deposit">Deposit</option>
                        <option value="rent">Rent</option>
                        <option value="lease_fee">Lease Fee</option>
                        <option value="inspection_fee">Inspection Fee</option>
                        <option value="booking_fee">Booking Fee</option>
                        <option value="purchase_installment">Purchase Installment</option>
                        <option value="other">Other</option>
                      </NativeSelectControl>
                    </div>
                    <Input
                      label="Payer Name"
                      placeholder="John Doe"
                      value={paymentForm.customerName}
                      onChange={(e) =>
                        setPaymentForm((current) => ({
                          ...current,
                          customerName: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Phone"
                      type="tel"
                      placeholder="+233 24 123 4567"
                      value={paymentForm.customerPhone}
                      onChange={(e) =>
                        setPaymentForm((current) => ({
                          ...current,
                          customerPhone: e.target.value,
                        }))
                      }
                    />
                    <Button
                      size="lg"
                      className="w-full"
                      type="submit"
                      disabled={paymentSubmitting}
                    >
                      {paymentSubmitting
                        ? "Redirecting to checkout..."
                        : "Continue to checkout"}
                    </Button>
                  </form>
                </motion.div>
              )}
            </Card>

            <Card className="p-6 mt-6 bg-accent/5 border-accent/20">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Check className="w-5 h-5 text-accent" />
                Safety Tips
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <span>Always view a property before making a payment.</span>
                </li>
                <li className="flex gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <span>Use the in-app workflow so your inquiry is tracked.</span>
                </li>
                <li className="flex gap-2">
                  <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <span>Confirm the listing team’s identity before sharing documents.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>

        {relatedListings.length > 0 && (
          <SimilarListings
            listings={relatedListings.map(mapListingToCard)}
            currentId={listing.id}
          />
        )}

        {nearbyServices.length > 0 && (
          <Card className="mt-8 p-6">
            <h2 className="mb-4 text-xl font-semibold text-ink">Nearby amenities</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nearbyServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-surface-border p-4"
                >
                  <div>
                    <p className="font-medium text-ink">{service.service_name}</p>
                    <p className="text-sm capitalize text-muted-foreground">
                      {String(service.service_type || "service").replace(/_/g, " ")}
                    </p>
                  </div>
                  {service.distance_meters ? (
                    <span className="text-sm text-muted-foreground">
                      {service.distance_meters < 1000
                        ? `${service.distance_meters} m`
                        : `${(service.distance_meters / 1000).toFixed(1)} km`}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-8">
          <ComplianceDisclosurePanel
            jurisdictionId={jurisdictionId}
            listingType={listing.listing_type}
            property={{
              country: property?.country,
              region: property?.region,
              city: property?.city,
              subdivision_code: property?.subdivision_code,
            }}
          />
        </div>

        <ListingReviews listingId={listing.id} />
      </div>
    </DesktopShell>
  );
}
