import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Heart,
  Share2,
  Phone,
  Mail,
  MessageCircle,
  Check,
  CreditCard,
  Loader2,
  Shield,
  FileText,
  Clock3,
  Camera,
  Navigation,
  ExternalLink,
  Brain,
  Video,
  Users,
  AlertTriangle,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Navbar } from "../components/Navbar";
import { DiasporaPrice } from "../components/DiasporaPrice";
import { GhanaRoutePlanner } from "../components/GhanaRoutePlanner";
import { PropertyMap, type PropertyMapMarker } from "../components/PropertyMap";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useMobileShell } from "../mobile/MobileShellContext";
import { useAuth } from "../context/AuthContext";
import { listingService } from "../../lib/listing.service";
import { buildPublicMapUrl } from "../../lib/map-provider";
import { getPropertyCoverImage, getPropertyMediaItems } from "../../lib/property-media";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { dealCaseService } from "../../lib/dealcase.service";
import { fraudDetectionService } from "../../lib/fraud-detection.service";
import { messageService } from "../../lib/message.service";
import { communicationService } from "../../lib/communication.service";
import { organizationService } from "../../lib/organization.service";
import {
  PAYMENT_GATEWAY_OPTIONS,
  paymentService,
  type PaymentGatewayProvider,
} from "../../lib/payment.service";
import {
  analyticsService,
  propertyMediaReadinessService,
} from "../../lib/production-depth.service";
import { propertyViewingService } from "../../lib/property-viewing.service";
import {
  buildReferralQueryString,
  captureReferralContext,
  formatReferralChannel,
  hasReferralContext,
  readReferralContext,
} from "../../lib/referral-context";
import {
  appendReferralMetadata,
  trackReferralDealCaseCreated,
} from "../../lib/referral-attribution.service";
import { trustCenterService } from "../../lib/trust-center.service";
import { marketplaceReviewService } from "../../lib/marketplace-review.service";
import {
  calculateBuyerFinance,
  buildReviewSummary,
} from "../../lib/competitive-features.service";
import {
  buildCommunityPrompts,
  buildHumanReviewedFraudSignals,
  buildTrustExplanationSignals,
  calculateAgencyTrustScore,
} from "../../lib/competitive-operations.service";
import {
  buildAiConciergePrompts,
  buildBuyerNegotiationPlan,
  buildEscrowMilestones,
  buildInspectionChecklist,
  buildListingTrustScore,
  buildNeighborhoodIntelCards,
  buildRemoteBuyerReadiness,
  buildViewingPrepPlan,
  estimateClosingCosts,
  formatLabel,
  formatMoney,
  getNeighborhoodSnapshot,
} from "../features/expansion/feature-helpers";

const fallbackImages = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
  "https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
];

export function PropertyDetail() {
  const { isMobileShell } = useMobileShell();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  const [listing, setListing] = useState<any | null>(null);
  const [relatedListings, setRelatedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [viewingSubmitting, setViewingSubmitting] = useState(false);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showViewingForm, setShowViewingForm] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [trustLoading, setTrustLoading] = useState(false);
  const [trustSnapshot, setTrustSnapshot] = useState<any | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    fullName: user?.user_metadata?.full_name || "",
    email: user?.email || "",
    phone: "",
    message: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    provider: "paystack" as PaymentGatewayProvider,
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
  const [offerForm, setOfferForm] = useState({
    buyerName: user?.user_metadata?.full_name || "",
    buyerPhone: "",
    amount: "",
    financingStatus: "cash" as "cash" | "mortgage" | "structured" | "undecided",
    targetCloseDate: "",
    notes: "",
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
  const [reportForm, setReportForm] = useState({
    reason: "fake_listing",
    description: "",
  });
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    reviewText: "",
  });

  useEffect(() => {
    captureReferralContext(location.search);
  }, [location.search]);

  useEffect(() => {
    if (!id) return;

    const loadProperty = async () => {
      try {
        setLoading(true);
        const listingData = await listingService.getListingById(id);
        setListing(listingData);

        const nearby = await listingService.getPublicListings(8, 0);
        setRelatedListings(
          nearby.filter((item) => item.id !== listingData.id).slice(0, 3)
        );
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
    if (!listing?.price) return;

    setPaymentForm((current) => ({
      ...current,
      amount: current.amount || String(listing.price),
    }));
  }, [listing?.price]);

  useEffect(() => {
    if (!listing?.price || listing.listing_type !== "sale") return;

    setOfferForm((current) => ({
      ...current,
      amount: current.amount || String(Math.round(Number(listing.price) * 0.95)),
    }));
  }, [listing?.listing_type, listing?.price]);

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

        if (!cancelled) {
          setTrustSnapshot(snapshot);
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

  useEffect(() => {
    if (!listing?.id) {
      setReviews([]);
      return;
    }

    let cancelled = false;

    marketplaceReviewService
      .getApprovedReviewsForListing(listing.id)
      .then((items) => {
        if (!cancelled) {
          setReviews(items);
        }
      })
      .catch((error) => {
        console.error("Failed to load listing reviews:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [listing?.id]);

  const property = listing?.property;
  const organization = listing?.organization;
  const mediaItems = getPropertyMediaItems(property);
  const mediaReadiness = useMemo(
    () => propertyMediaReadinessService.buildReadiness(mediaItems),
    [mediaItems]
  );
  const uploadedImages = mediaItems.map(
    (media) => media.public_url || fallbackImages[0]
  );
  const images = uploadedImages.length > 0 ? uploadedImages : fallbackImages;
  const mediaPhotoCount = mediaReadiness.photos || images.length;
  const locationQuery = property
    ? [property.address, property.city, property.region, property.country].filter(Boolean).join(", ")
    : "";
  const hasPreciseCoordinates =
    typeof property?.latitude === "number" && typeof property?.longitude === "number";
  const propertyMapMarkers = useMemo<PropertyMapMarker[]>(
    () =>
      hasPreciseCoordinates
        ? [
            {
              id: String(listing?.id || "property"),
              latitude: Number(property?.latitude),
              longitude: Number(property?.longitude),
              label: property?.address || "Property",
              subtitle: [property?.city, property?.region].filter(Boolean).join(", "),
              caption: property?.ghana_post_gps
                ? `GhanaPostGPS ${property.ghana_post_gps}`
                : "Verified property coordinate",
              badge: "Listing",
            },
          ]
        : [],
    [
      hasPreciseCoordinates,
      listing?.id,
      property?.address,
      property?.city,
      property?.ghana_post_gps,
      property?.latitude,
      property?.longitude,
      property?.region,
    ]
  );
  const propertyMapUrl = buildPublicMapUrl({
    latitude: hasPreciseCoordinates ? property?.latitude : undefined,
    longitude: hasPreciseCoordinates ? property?.longitude : undefined,
    query: locationQuery,
  });
  const streetViewOpenUrl = hasPreciseCoordinates
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${property.latitude},${property.longitude}`
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
  const listingTrust = useMemo(
    () =>
      buildListingTrustScore({
        listing,
        property,
        organization,
        mediaCount: mediaItems.length || images.length,
        trustSnapshot,
      }),
    [images.length, listing, mediaItems.length, organization, property, trustSnapshot]
  );
  const conciergePrompts = useMemo(() => buildAiConciergePrompts(listing), [listing]);
  const neighborhoodIntelCards = useMemo(
    () => buildNeighborhoodIntelCards(property),
    [property]
  );
  const safePaymentMilestones = useMemo(
    () =>
      buildEscrowMilestones({
        listingType: listing?.listing_type,
        hasViewing: false,
        hasOffer: false,
        hasDocuments: Boolean(trustSnapshot?.publicDocumentCount),
        hasPayment: false,
        hasVerification:
          trustSnapshot?.organizationVerified ||
          ["verified", "approved"].includes(String(listing?.verification_status || "")),
      }),
    [
      listing?.listing_type,
      listing?.verification_status,
      trustSnapshot?.organizationVerified,
      trustSnapshot?.publicDocumentCount,
    ]
  );
  const selectedPaymentGateway =
    PAYMENT_GATEWAY_OPTIONS.find((option) => option.id === paymentForm.provider) ||
    PAYMENT_GATEWAY_OPTIONS[0];
  const closingCostEstimate = useMemo(
    () =>
      estimateClosingCosts({
        price: Number(listing?.price || 0),
        listingType: listing?.listing_type,
        inspectionFee: Number(listing?.inspection_fee_amount || 0),
      }),
    [listing?.inspection_fee_amount, listing?.listing_type, listing?.price]
  );
  const buyerFinance = useMemo(
    () =>
      calculateBuyerFinance({
        price: Number(listing?.price || 0),
        currency: listing?.currency || "GHS",
        monthlyRentEstimate:
          listing?.listing_type === "rental" ? Number(listing?.price || 0) : undefined,
      }),
    [listing?.currency, listing?.listing_type, listing?.price]
  );
  const reviewSummary = useMemo(() => buildReviewSummary({ reviews }), [reviews]);
  const trustExplanationSignals = useMemo(
    () =>
      buildTrustExplanationSignals({
        organizationVerified: organization?.verified,
        documentCount: trustSnapshot?.publicDocumentCount || 0,
        reviewScore: reviewSummary.averageRating,
        fraudFlags: listing?.fraud_flags_count || 0,
        paymentHistoryCount: trustSnapshot?.paymentHistoryCount || 0,
      }),
    [
      listing?.fraud_flags_count,
      organization?.verified,
      reviewSummary.averageRating,
      trustSnapshot?.paymentHistoryCount,
      trustSnapshot?.publicDocumentCount,
    ]
  );
  const agencyTrustScore = useMemo(
    () =>
      calculateAgencyTrustScore({
        organizationVerified: organization?.verified,
        documentCount: trustSnapshot?.publicDocumentCount || 0,
        reviewScore: reviewSummary.averageRating,
        fraudFlags: listing?.fraud_flags_count || 0,
        paymentHistoryCount: trustSnapshot?.paymentHistoryCount || 0,
      }),
    [
      listing?.fraud_flags_count,
      organization?.verified,
      reviewSummary.averageRating,
      trustSnapshot?.paymentHistoryCount,
      trustSnapshot?.publicDocumentCount,
    ]
  );
  const communityPrompts = useMemo(
    () =>
      buildCommunityPrompts({
        city: property?.city,
        region: property?.region,
        neighborhood: property?.neighborhood,
      }),
    [property?.city, property?.neighborhood, property?.region]
  );
  const humanReviewedFraudSignals = useMemo(
    () =>
      buildHumanReviewedFraudSignals({
        listingPrice: Number(listing?.price || 0),
        areaAveragePrice: null,
        mediaCount: mediaItems.length,
        organizationVerified: organization?.verified,
      }),
    [listing?.price, mediaItems.length, organization?.verified]
  );
  const remoteBuyerReadiness = useMemo(
    () =>
      buildRemoteBuyerReadiness({
        listing,
        property,
        mediaItems,
        trustSnapshot,
      }),
    [listing, mediaItems, property, trustSnapshot]
  );
  const inspectionChecklist = useMemo(
    () =>
      buildInspectionChecklist({
        listing,
        property,
        mediaItems,
      }),
    [listing, mediaItems, property]
  );
  const neighborhoodInsight = useMemo(
    () =>
      getNeighborhoodSnapshot(
        property
          ? {
              city: property.city,
              region: property.region,
              neighborhood: property.neighborhood,
            }
          : null
      ),
    [property]
  );
  const buyerNegotiationPlan = useMemo(
    () =>
      buildBuyerNegotiationPlan({
        listing,
        property,
        trustScore: listingTrust.score,
        readinessScore: remoteBuyerReadiness.score,
        mediaReadinessScore: mediaReadiness.score,
        closingReserve: closingCostEstimate.recommendedReserve,
        activeDemand: neighborhoodInsight?.demandLevel,
      }),
    [
      closingCostEstimate.recommendedReserve,
      listing,
      listingTrust.score,
      mediaReadiness.score,
      neighborhoodInsight?.demandLevel,
      property,
      remoteBuyerReadiness.score,
    ]
  );
  const viewingPrepPlan = useMemo(
    () =>
      buildViewingPrepPlan({
        listing,
        property,
        mediaItems,
        readinessScore: remoteBuyerReadiness.score,
      }),
    [listing, mediaItems, property, remoteBuyerReadiness.score]
  );

  const pageTitle = useMemo(() => {
    if (!property) return "Property";
    return `${property.address}, ${property.city}`;
  }, [property]);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedShareTitle = encodeURIComponent(pageTitle);
  const socialShareLinks = useMemo(
    () => [
      {
        label: "WhatsApp",
        href: `https://wa.me/?text=${encodedShareTitle}%20${encodedShareUrl}`,
      },
      {
        label: "Facebook",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`,
      },
      {
        label: "X",
        href: `https://twitter.com/intent/tweet?text=${encodedShareTitle}&url=${encodedShareUrl}`,
      },
    ],
    [encodedShareTitle, encodedShareUrl]
  );
  const currentPath = `${location.pathname}${location.search}`;
  const referralContext = useMemo(() => {
    const directContext = {
      ref: new URLSearchParams(location.search).get("ref"),
      channel: new URLSearchParams(location.search).get("channel"),
    };

    return hasReferralContext(directContext) ? directContext : readReferralContext();
  }, [location.search]);
  const referralQueryString = useMemo(
    () => buildReferralQueryString(referralContext),
    [referralContext]
  );

  const caseType = useMemo(() => {
    if (!listing) return "rental_application";
    if (listing.listing_type === "sale") return "purchase_offer";
    if (listing.listing_type === "lease") return "lease_application";
    return "rental_application";
  }, [listing]);

  const trackListingEvent = (
    eventType: string,
    metadata: Record<string, unknown> = {}
  ) => {
    if (!listing?.id) return;

    void analyticsService
      .trackEvent({
        userId: user?.id || null,
        organizationId: listing.organization_id || null,
        listingId: listing.id,
        eventType,
        source: isMobileShell ? "mobile" : "web",
        metadata: {
          path: currentPath,
          listingType: listing.listing_type,
          ...metadata,
        },
      })
      .catch((error) => {
        console.error(`Failed to track ${eventType}:`, error);
      });
  };

  useEffect(() => {
    if (!listing?.id) return;
    trackListingEvent("listing_view", {
      hasReferral: hasReferralContext(referralContext),
      mediaReadinessScore: mediaReadiness.score,
      trustScore: listingTrust.score,
    });
  }, [listing?.id, user?.id, isMobileShell]);

  const toggleSave = async () => {
    if (!user) {
      toast.error("Log in to save properties.");
      navigate("/login", { state: { from: currentPath } });
      return;
    }

    try {
      const result = await savedPropertyService.toggleSavedProperty(user.id, listing.id);
      setIsSaved(result.saved);
      trackListingEvent(result.saved ? "listing_saved" : "listing_unsaved");
      toast.success(result.saved ? "Property saved." : "Property removed from saved list.");
    } catch (error) {
      console.error("Failed to save property:", error);
      toast.error("Unable to update saved properties.");
    }
  };

  const ensureSavedProperty = async () => {
    if (isSaved) return true;

    if (!user) {
      toast.error("Log in to compare properties.");
      navigate("/login", { state: { from: currentPath } });
      return false;
    }

    try {
      const result = await savedPropertyService.toggleSavedProperty(user.id, listing.id);
      setIsSaved(result.saved);

      if (result.saved) {
        toast.success("Property saved for comparison.");
      }

      return result.saved;
    } catch (error) {
      console.error("Failed to save property for comparison:", error);
      toast.error("Unable to save this property for comparison.");
      return false;
    }
  };

  const handleSaveAndCompare = async () => {
    const saved = await ensureSavedProperty();
    if (saved) {
      trackListingEvent("compare_opened");
      navigate("/app/compare");
    }
  };

  const handleOpenBuyerTools = () => {
    if (!user) {
      toast.error("Log in to use buyer tools.");
      navigate("/login", { state: { from: currentPath } });
      return;
    }

    trackListingEvent("buyer_tools_opened");
    navigate("/app/buying-tools");
  };

  const handleInquiry = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Log in to contact the listing team.");
      navigate("/login", { state: { from: currentPath } });
      return;
    }

    if (!contactForm.message.trim()) {
      toast.error("Add a short message so the team knows what you need.");
      return;
    }

    try {
      setSubmitting(true);
      const caseMessage = appendReferralMetadata(contactForm.message, referralContext, {
        source: "property-detail-inquiry",
      });
      const dealCase = await dealCaseService.createDealCase({
        listing_id: listing.id,
        user_id: user.id,
        organization_id: listing.organization_id,
        case_type: caseType,
        message: caseMessage,
      });
      trackListingEvent("listing_inquiry_submitted", { dealCaseId: dealCase.id, caseType });

      trackReferralDealCaseCreated(referralContext, {
        dealCaseId: dealCase.id,
        caseType,
        listingId: listing.id,
        organizationId: listing.organization_id,
        source: "property-detail-inquiry",
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

  const handleOfferSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Log in to submit an offer.");
      navigate("/login", { state: { from: currentPath } });
      return;
    }

    const amount = Number(offerForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid offer amount in GHS.");
      return;
    }

    const askingPrice = Number(listing.price || 0);
    const offerPriority =
      askingPrice && amount >= askingPrice * 0.97
        ? "high"
        : askingPrice && amount >= askingPrice * 0.9
          ? "medium"
          : "low";
    const followUpAt = offerForm.targetCloseDate
      ? new Date(`${offerForm.targetCloseDate}T12:00:00`).toISOString()
      : null;
    const offerSummaryBase = [
      `Offer submitted for ${pageTitle}`,
      "",
      `Offer amount: GHS ${amount.toLocaleString()}`,
      `Financing: ${offerForm.financingStatus.replaceAll("_", " ")}`,
      `Target close date: ${offerForm.targetCloseDate || "Flexible"}`,
      `Buyer: ${offerForm.buyerName || user.user_metadata?.full_name || user.email}`,
      `Phone: ${offerForm.buyerPhone || "Not provided"}`,
      "",
      offerForm.notes.trim() || "No additional buyer note provided.",
    ].join("\n");
    const offerSummary = appendReferralMetadata(offerSummaryBase, referralContext, {
      source: "property-detail-offer",
    });

    try {
      setOfferSubmitting(true);
      const dealCase = await dealCaseService.createDealCase({
        listing_id: listing.id,
        user_id: user.id,
        organization_id: listing.organization_id,
        case_type: "purchase_offer",
        message: offerSummary,
        pipeline_stage: "negotiation",
        priority: offerPriority,
        next_follow_up_at: followUpAt,
      });
      trackListingEvent("listing_offer_submitted", {
        dealCaseId: dealCase.id,
        amount,
        financingStatus: offerForm.financingStatus,
      });

      trackReferralDealCaseCreated(referralContext, {
        dealCaseId: dealCase.id,
        caseType: "purchase_offer",
        listingId: listing.id,
        organizationId: listing.organization_id,
        source: "property-detail-offer",
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

          await messageService.sendMessage(
            sharedConversation.conversation_id,
            user.id,
            offerSummary
          );
        }
      } catch (conversationError) {
        console.error("Failed to create offer conversation:", conversationError);
      }

      try {
        await communicationService.createInAppNotification({
          userId: user.id,
          notificationType: "offer_sent",
          subject: `Offer sent for ${pageTitle}`,
          content: "The listing team can review your offer and respond inside your deal room.",
          actionUrl: "/app/deal-rooms",
        });
      } catch (notificationError) {
        console.error("Failed to create offer notification:", notificationError);
      }

      toast.success("Offer submitted to the listing team.");
      setOfferForm((current) => ({
        ...current,
        buyerPhone: "",
        notes: "",
      }));
      setShowOfferForm(false);
    } catch (error) {
      console.error("Failed to submit offer:", error);
      toast.error("Unable to submit your offer right now.");
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
      trackListingEvent("listing_shared");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Failed to share property:", error);
      toast.error("We couldn't share this property right now.");
    }
  };

  const handleReviewSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!user) {
      toast.error("Log in to review this property.");
      navigate("/login", { state: { from: currentPath } });
      return;
    }

    if (!reviewForm.reviewText.trim()) {
      toast.error("Add a short review before submitting.");
      return;
    }

    try {
      setReviewSubmitting(true);
      await marketplaceReviewService.submitReview({
        targetType: "listing",
        reviewerUserId: user.id,
        rating: reviewForm.rating,
        title: reviewForm.title,
        reviewText: reviewForm.reviewText,
        listingId: listing.id,
        organizationId: listing.organization_id,
      });
      setReviewForm({ rating: 5, title: "", reviewText: "" });
      toast.success("Review submitted for moderation.");
      trackListingEvent("listing_review_submitted", { rating: reviewForm.rating });
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast.error("We couldn't submit your review right now.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReviewReport = async (reviewId: string) => {
    if (!user) {
      toast.error("Log in to report a review.");
      navigate("/login", { state: { from: currentPath } });
      return;
    }

    try {
      await marketplaceReviewService.reportReview(
        reviewId,
        user.id,
        "Buyer reported this review for moderation."
      );
      toast.success("Review report sent to moderation.");
    } catch (error) {
      console.error("Failed to report review:", error);
      toast.error("We couldn't report this review right now.");
    }
  };

  const handleSecurePayment = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Log in before starting a secure payment.");
      navigate("/login", { state: { from: currentPath } });
      return;
    }

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount in GHS.");
      return;
    }

    try {
      setPaymentSubmitting(true);
      const result = await paymentService.initializePropertyPayment({
        listingId: listing.id,
        amount,
        provider: paymentForm.provider,
        purpose: paymentForm.purpose,
        customerName: paymentForm.customerName,
        customerPhone: paymentForm.customerPhone,
      });
      trackListingEvent("payment_checkout_started", {
        purpose: paymentForm.purpose,
        provider: paymentForm.provider,
        amount,
      });

      window.location.assign(result.authorizationUrl);
    } catch (error) {
      console.error("Failed to initialize payment:", error);
      toast.error(`Unable to start ${selectedPaymentGateway.label} checkout right now.`);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleViewingRequest = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Log in before booking a viewing.");
      navigate("/login", { state: { from: currentPath } });
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
      trackListingEvent("viewing_requested", {
        requestedDateTime: requestedDateTime.toISOString(),
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

  const handleReportListing = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Log in before reporting a listing.");
      navigate("/login", { state: { from: currentPath } });
      return;
    }

    if (!reportForm.description.trim()) {
      toast.error("Add a short note so the moderation team knows what to review.");
      return;
    }

    try {
      setReportSubmitting(true);
      await fraudDetectionService.reportFraud(
        user.id,
        "listing",
        listing.id,
        reportForm.reason,
        reportForm.description.trim(),
        {
          organizationId: listing.organization_id,
          listingId: listing.id,
          listingTitle: pageTitle,
        }
      );

      trackListingEvent("listing_reported", {
        reason: reportForm.reason,
      });
      toast.success("Thanks. The BaytMiftah moderation team will review this listing.");
      setReportForm({ reason: "fake_listing", description: "" });
      setShowReportForm(false);
    } catch (error) {
      console.error("Failed to report listing:", error);
      toast.error("We couldn't submit that report right now.");
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {!isMobileShell && <Navbar />}
        <div className={isMobileShell ? "pt-4 min-h-[40vh] flex items-center justify-center" : "pt-24 min-h-[60vh] flex items-center justify-center"}>
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!listing || !property) {
    return (
      <div className="min-h-screen bg-background">
        {!isMobileShell && <Navbar />}
        <div className={isMobileShell ? "pt-4 px-4 max-w-3xl mx-auto pb-32" : "pt-24 px-4 max-w-3xl mx-auto"}>
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-semibold mb-2">Property not found</h1>
            <p className="text-muted-foreground mb-6">
              This listing may have been removed or is no longer public.
            </p>
            <Link to="/search">
              <Button>Browse other properties</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32 px-4 max-w-7xl mx-auto" : "pt-24 pb-12 px-4 max-w-7xl mx-auto"}>
        <div className="mb-8">
          <div className="grid h-[320px] grid-cols-1 gap-4 sm:h-[420px] md:h-[500px] md:grid-cols-4">
            <div className="md:col-span-3 h-full relative overflow-hidden rounded-xl">
              <img src={images[currentImageIndex]} alt={pageTitle} className="w-full h-full object-cover" />
              <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
                {currentImageIndex + 1} / {images.length}
              </div>
            </div>
            <div className="hidden md:flex flex-col gap-4 h-full">
              {images.slice(1, 5).map((image, index) => (
                <button
                  key={image}
                  onClick={() => setCurrentImageIndex(index + 1)}
                  className="relative h-full overflow-hidden rounded-xl hover:opacity-80 transition-opacity"
                >
                  <img src={image} alt={`${pageTitle} ${index + 2}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={image}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  currentImageIndex === index ? "border-primary" : "border-transparent"
                }`}
              >
                <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  {hasReferralContext(referralContext) && (
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold text-accent">
                      <Shield className="w-3.5 h-3.5" />
                      Shared via {formatReferralChannel(referralContext.channel)}
                    </div>
                  )}
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-semibold sm:text-3xl">{pageTitle}</h1>
                    {organization?.verified && (
                      <div className="bg-accent text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                    {listingQualityScore !== null && listingQualityScore >= 75 && (
                      <div className="bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Trust {listingQualityScore}
                      </div>
                    )}
                    {reviewSummary.reviewCount > 0 && (
                      <div className="bg-secondary px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-primary text-primary" />
                        {reviewSummary.label}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <MapPin className="w-5 h-5" />
                    <span>
                      {property.address}, {property.city}, {property.region}, {property.country}
                    </span>
                  </div>
                  {locationMeta.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {locationMeta.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  <DiasporaPrice
                    amount={Number(listing.price || 0)}
                    currency={listing.currency || "GHS"}
                    suffix={
                      listing.listing_type === "rental"
                        ? "/month"
                        : listing.listing_type === "lease"
                          ? "/lease"
                          : ""
                    }
                    size="lg"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void handleShare()}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={toggleSave}>
                    <Heart className={`w-4 h-4 ${isSaved ? "fill-primary text-primary" : ""}`} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {socialShareLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-8 py-6 border-y border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Bed className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{property.bedrooms ?? "N/A"}</div>
                    <div className="text-sm text-muted-foreground">Bedrooms</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Bath className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{property.bathrooms ?? "N/A"}</div>
                    <div className="text-sm text-muted-foreground">Bathrooms</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center">
                    <Square className="w-6 h-6 text-chart-3" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{property.square_meters ? `${property.square_meters}m²` : "N/A"}</div>
                    <div className="text-sm text-muted-foreground">Size</div>
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
              <h2 className="text-2xl font-semibold mb-4">AI Concierge & Media</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-6">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Ask before you commit</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use these prompts to pressure-test price, risk, documents, and next steps with the listing team.
                  </p>
                  <div className="mt-5 space-y-3">
                    {conciergePrompts.slice(0, 4).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="w-full rounded-xl border border-border p-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
                        onClick={() => {
                          setShowContactForm(true);
                          setShowOfferForm(false);
                          setContactForm((current) => ({
                            ...current,
                            message: prompt,
                          }));
                        }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">3D tour, video, and floor-plan readiness</h3>
                  </div>
                  <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Remote review score</p>
                      <p className="text-lg font-semibold text-primary">{mediaReadiness.score}/100</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {mediaReadiness.readyItems} ready item(s), {mediaReadiness.pendingItems} processing.
                    </p>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {[
                      {
                        label: "Photo set",
                        value: `${mediaPhotoCount} image${mediaPhotoCount === 1 ? "" : "s"}`,
                        helper:
                          mediaReadiness.photos >= 5 || images.length >= 5
                            ? "Good remote-review coverage."
                            : "Ask the team for a fuller room-by-room gallery.",
                      },
                      {
                        label: "Video walkthrough",
                        value: mediaReadiness.videos > 0
                          ? "Available"
                          : "Request from team",
                        helper: "Useful for diaspora buyers and busy executives.",
                      },
                      {
                        label: "Floor plan",
                        value: mediaReadiness.floorPlans > 0
                          ? "Attached"
                          : "Not attached",
                        helper: "Ask for dimensions before comparing layouts.",
                      },
                      {
                        label: "Virtual tour",
                        value: mediaReadiness.virtualTours > 0 ? "Ready" : "Not attached",
                        helper: "Helpful for diaspora buyers and remote family review.",
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{item.label}</p>
                          <span className="text-sm text-primary">{item.value}</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Buyer Decision Brief</h2>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="p-6">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Closing Reserve</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    A practical buffer for legal review, inspection, agent support, and payment handoff.
                  </p>
                  <p className="mt-5 text-3xl font-semibold text-primary">
                    {formatMoney(closingCostEstimate.recommendedReserve, listing.currency || "GHS")}
                  </p>
                  <div className="mt-4 space-y-2">
                    {closingCostEstimate.lineItems.slice(0, 3).map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">
                          {formatMoney(item.amount, listing.currency || "GHS")}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between lg:flex-col">
                    <div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Offer Coach</h3>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        A buyer-first band based on trust, remote evidence, market pressure, and reserve costs.
                      </p>
                    </div>
                    <div className="w-fit rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary">
                      {buyerNegotiationPlan.confidence} - {buyerNegotiationPlan.leverage}
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2">
                    {[
                      { label: "Open", value: buyerNegotiationPlan.anchor },
                      { label: "Target", value: buyerNegotiationPlan.target },
                      { label: "Stretch", value: buyerNegotiationPlan.stretch },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                        <span>{item.label}</span>
                        <span className="font-medium">
                          {formatMoney(item.value, listing.currency || "GHS")}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 rounded-xl bg-secondary/30 p-3 text-sm text-muted-foreground">
                    {buyerNegotiationPlan.message}
                  </p>
                  <div className="mt-4 space-y-2">
                    {buyerNegotiationPlan.nextSteps.slice(0, 2).map((step) => (
                      <div key={step} className="flex gap-2 text-xs text-muted-foreground">
                        <Check className="mt-0.5 w-3 h-3 text-primary" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Remote Buyer Readiness</h3>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Checks whether this listing is safe enough for diaspora or out-of-town review.
                      </p>
                    </div>
                    <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-semibold text-primary">
                      {remoteBuyerReadiness.score}/100 {remoteBuyerReadiness.label}
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {remoteBuyerReadiness.checks.slice(0, 4).map((check) => (
                      <div key={check.label} className="rounded-xl border border-border p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Check
                            className={`w-4 h-4 ${
                              check.complete ? "text-accent" : "text-muted-foreground"
                            }`}
                          />
                          {check.label}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{check.helper}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 space-y-2">
                    {inspectionChecklist.slice(0, 3).map((item) => (
                      <div key={item.label} className="rounded-xl bg-secondary/30 px-3 py-2 text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground"> - {item.helper}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock3 className="w-4 h-4 text-primary" />
                      {viewingPrepPlan.mode} viewing prep
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{viewingPrepPlan.headline}</p>
                    <div className="mt-3 space-y-2">
                      {viewingPrepPlan.checklist.slice(0, 2).map((item) => (
                        <div key={item.label} className="text-xs">
                          <span className="font-medium">{item.label}</span>
                          <span className="text-muted-foreground"> - {item.helper}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Finance Snapshot</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Estimated mortgage",
                    value: formatMoney(buyerFinance.monthlyMortgage, buyerFinance.currency),
                    helper: "Based on 20% down, 12% annual rate, 15-year term.",
                  },
                  {
                    label: "Cash needed",
                    value: formatMoney(buyerFinance.cashNeeded, buyerFinance.currency),
                    helper: "Down payment plus estimated closing and review reserve.",
                  },
                  {
                    label: "Rent vs buy",
                    value:
                      buyerFinance.rentVsBuyDelta >= 0
                        ? `${formatMoney(buyerFinance.rentVsBuyDelta, buyerFinance.currency)} more/mo`
                        : `${formatMoney(Math.abs(buyerFinance.rentVsBuyDelta), buyerFinance.currency)} less/mo`,
                    helper: "Compares estimated ownership payment against local rent proxy.",
                  },
                  {
                    label: "Investment yield",
                    value: `${buyerFinance.netYieldPercent.toFixed(1)}% net`,
                    helper: `${buyerFinance.grossYieldPercent.toFixed(1)}% gross before estimated operating costs.`,
                  },
                ].map((item) => (
                  <Card key={item.label} className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-primary">{item.value}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
                  </Card>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{buyerFinance.disclaimer}</p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Verification & Trust</h2>
              <Card className="p-6 bg-primary/5 border-primary/15">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Built for verified transactions</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Payments run through approved gateways, while receipts and agreement records
                      can be tracked through the platform&apos;s verification layer.
                    </p>
                  </div>
                  <div className="ml-auto hidden rounded-xl border border-primary/20 bg-background px-4 py-3 text-right md:block">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Trust score</p>
                    <p className="text-2xl font-semibold text-primary">{listingTrust.score}/100</p>
                    <p className="text-xs text-muted-foreground">{listingTrust.label}</p>
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
                      <div className="rounded-xl border border-border bg-background p-4 md:hidden">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                          <Shield className="w-4 h-4 text-primary" />
                          Trust Score
                        </div>
                        <p className="text-lg font-semibold">{listingTrust.score}/100</p>
                        <p className="text-xs text-muted-foreground mt-1">{listingTrust.label}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium mb-2">
                          <Shield className="w-4 h-4 text-primary" />
                          Organization
                        </div>
                        <p className="text-lg font-semibold">
                          {trustSnapshot?.organizationVerified ? "Verified" : "Review Pending"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Workspace ownership and organization identity status.
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
                          {trustSnapshot?.receiptIntegrityEnabled ? "Receipt-ready" : "Standard"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed payments can be carried into receipt verification.
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
                          Photo, price, address, and document readiness checks.
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
                          {locationConfidence
                            ? `${locationConfidence} location confidence`
                            : "GhanaPostGPS and area confidence improve buyer safety."}
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
                          Internal checks can be promoted to public verification records.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                      {listingTrust.signals.map((signal) => (
                        <div
                          key={signal.label}
                          className="rounded-xl border border-border bg-background px-4 py-3 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Check
                              className={`w-4 h-4 ${
                                signal.complete ? "text-accent" : "text-muted-foreground"
                              }`}
                            />
                            <span className="font-medium">{signal.label}</span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              +{signal.weight}
                            </span>
                          </div>
                          <p className="mt-2 text-muted-foreground">{signal.helper}</p>
                        </div>
                      ))}
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
                        <h4 className="font-medium">Published verification records</h4>
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
                        Public verification documents have not been published for this listing yet.
                      </p>
                    )}
                  </>
                )}
              </Card>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Location</h2>
              <div className="grid gap-3 mb-5 md:grid-cols-4">
                {neighborhoodIntelCards.map((item) => (
                  <Card key={item.label} className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-2 font-semibold">{item.value}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
                  </Card>
                ))}
              </div>
              <Card className="overflow-hidden">
                <PropertyMap
                  markers={propertyMapMarkers}
                  selectedMarkerId={propertyMapMarkers[0]?.id}
                  heightClassName="h-80"
                  className="rounded-none border-0"
                  emptyStateTitle="Map discovery is live for this listing"
                  emptyStateDescription="The property can still open on the wider public map, but BaytMiftah needs a verified coordinate before it can pin this exact home."
                />
                <div className="border-t border-border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{locationQuery || "Location pending"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {hasPreciseCoordinates
                          ? "Pinned to a verified coordinate for map-first review."
                          : "Area-level map handoff is available while the coordinate pin is being verified."}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => window.open(propertyMapUrl, "_blank", "noopener,noreferrer")}
                    >
                      <MapPin className="w-4 h-4" />
                      Open Full Map
                    </Button>
                  </div>
                </div>
              </Card>
              <GhanaRoutePlanner
                destinationLat={property.latitude}
                destinationLng={property.longitude}
                destinationLabel={pageTitle}
              />

              <div className="grid gap-4 mt-6 md:grid-cols-2">
                <Card className="overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Arrival & Street-Level Check</h3>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Use the live map pin, route estimate, and optional street-level preview before
                      booking a viewing or making an offer.
                    </p>
                  </div>
                  <div className="grid gap-4 bg-secondary/20 p-5 md:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Street-view handoff
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {streetViewOpenUrl ? "Available" : "Awaiting precise pin"}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {streetViewOpenUrl
                          ? "Google Street View can open directly from the listing coordinate for a final arrival sense-check."
                          : "Street-level preview needs the final verified coordinate before we can deep-link into panorama mode."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Map pin status
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {hasPreciseCoordinates ? "Verified coordinate" : "Area map only"}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {hasPreciseCoordinates
                          ? "Remote buyers can compare the live pin with photos, trust records, and route planning."
                          : "The listing remains searchable by area while the team confirms the exact coordinate."}
                      </p>
                    </div>
                  </div>
                  <div className="p-5 flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        streetViewOpenUrl &&
                        window.open(streetViewOpenUrl, "_blank", "noopener,noreferrer")
                      }
                      disabled={!streetViewOpenUrl}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Street View
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(propertyMapUrl, "_blank", "noopener,noreferrer")}
                    >
                      <MapPin className="w-4 h-4" />
                      Open Map
                    </Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Remote Review Snapshot</h3>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Photo Coverage</p>
                      <p className="mt-2 text-lg font-semibold">{images.length} image{images.length === 1 ? "" : "s"}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {images.length >= 5
                          ? "Enough visual coverage for a stronger remote first pass."
                          : "A fuller room-by-room image set will improve remote review confidence."}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Location Signal</p>
                      <p className="mt-2 text-lg font-semibold">
                        {locationConfidence || (hasPreciseCoordinates ? "Verified coordinates" : "Map only")}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {property.ghana_post_gps
                          ? `GhanaPostGPS ${property.ghana_post_gps}`
                          : "Precise coordinates and GhanaPostGPS make street-level review easier."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                    <p>
                      Use the photo set, map, and trust records together before scheduling your physical inspection.
                    </p>
                    <p>
                      If you&apos;re buying remotely, keep the street-view check, offer notes, and signed documents in the same deal room.
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowViewingForm(true);
                        setShowOfferForm(false);
                      }}
                    >
                      <MapPin className="w-4 h-4" />
                      Book Viewing
                    </Button>
                    {listing.listing_type === "sale" && (
                      <Button
                        onClick={() => {
                          setShowOfferForm(true);
                          setShowViewingForm(false);
                        }}
                      >
                        <Shield className="w-4 h-4" />
                        Continue to Offer
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Trust Signals & Community</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-6">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Why this listing scores the way it does</h3>
                  </div>
                  <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Agency Trust Score</p>
                        <p className="mt-1 text-sm text-muted-foreground">{agencyTrustScore.label}</p>
                      </div>
                      <span className="text-3xl font-semibold text-primary">{agencyTrustScore.score}</span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{agencyTrustScore.disclosure}</p>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {trustExplanationSignals.map((signal) => (
                      <div key={signal.label} className="rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{signal.label}</p>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              signal.status === "positive"
                                ? "bg-accent/10 text-accent"
                                : signal.status === "review"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {signal.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{signal.helper}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Neighborhood Q&A readiness</h3>
                  </div>
                  <div className="mt-5 space-y-3">
                    {communityPrompts.map((prompt) => (
                      <div key={prompt.type} className="rounded-xl border border-border p-4">
                        <p className="font-medium">{prompt.title}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{prompt.prompt}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-xl border border-primary/15 bg-primary/5 p-4">
                    <p className="text-sm font-medium">Human-reviewed fraud signals</p>
                    <div className="mt-3 space-y-2">
                      {humanReviewedFraudSignals.map((signal) => (
                        <div key={signal.key} className="flex items-start gap-2 text-sm">
                          <AlertTriangle
                            className={`mt-0.5 h-4 w-4 ${
                              signal.active ? "text-destructive" : "text-muted-foreground"
                            }`}
                          />
                          <span className="text-muted-foreground">{signal.helper}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Reviews & Reputation</h2>
              <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-3 text-primary">
                      <Star className="w-5 h-5 fill-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">
                        {reviewSummary.reviewCount > 0
                          ? reviewSummary.averageRating.toFixed(1)
                          : "New"}
                      </p>
                      <p className="text-sm text-muted-foreground">{reviewSummary.label}</p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-xl border border-border p-4">
                    <p className="font-medium">Verified review signal</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {reviewSummary.verifiedCount} review{reviewSummary.verifiedCount === 1 ? "" : "s"} are linked to an inquiry, viewing, payment, or completed deal.
                    </p>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Reviews are moderated before public display. Abuse reports route to the admin queue.
                  </p>
                </Card>

                <Card className="p-6">
                  <form className="space-y-4" onSubmit={handleReviewSubmit}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-semibold">Submit a review</h3>
                        <p className="text-sm text-muted-foreground">
                          Share your viewing, inquiry, or transaction experience. It stays pending until approved.
                        </p>
                      </div>
                      <select
                        className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm"
                        value={reviewForm.rating}
                        onChange={(event) =>
                          setReviewForm((current) => ({
                            ...current,
                            rating: Number(event.target.value),
                          }))
                        }
                        aria-label="Review rating"
                      >
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <option key={rating} value={rating}>
                            {rating} star{rating === 1 ? "" : "s"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Review title"
                      value={reviewForm.title}
                      onChange={(event) =>
                        setReviewForm((current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder="Clear viewing process"
                    />
                    <div>
                      <label htmlFor="property-review-text" className="block mb-2 text-sm">
                        Review
                      </label>
                      <textarea
                        id="property-review-text"
                        className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        rows={4}
                        value={reviewForm.reviewText}
                        onChange={(event) =>
                          setReviewForm((current) => ({
                            ...current,
                            reviewText: event.target.value,
                          }))
                        }
                        placeholder="What happened, what felt trustworthy, and what should other buyers or renters know?"
                      />
                    </div>
                    <Button type="submit" disabled={reviewSubmitting}>
                      {reviewSubmitting ? "Submitting..." : "Submit for Moderation"}
                    </Button>
                  </form>

                  {reviews.length > 0 && (
                    <div className="mt-6 space-y-3 border-t border-border pt-5">
                      {reviews.slice(0, 3).map((review) => (
                        <div key={review.id} className="rounded-xl border border-border p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">{review.title || "Buyer review"}</p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-semibold">
                              <Star className="w-3 h-3 fill-primary text-primary" />
                              {review.rating}/5
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {review.review_text}
                          </p>
                          {review.verified && (
                            <p className="mt-2 text-xs font-medium text-primary">
                              Verified via {String(review.verified_source || "platform workflow")}
                            </p>
                          )}
                          <button
                            type="button"
                            className="mt-3 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                            onClick={() => void handleReviewReport(review.id)}
                          >
                            Report review
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-semibold text-primary">
                      {(organization?.name || "P").charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{organization?.name || "Property Team"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {listing.listing_type === "sale" ? "Sales" : "Leasing"} team
                    </p>
                    {organization?.verified && (
                      <div className="flex items-center gap-1 text-accent text-xs mt-1">
                        <Check className="w-3 h-3" />
                        Verified Organization
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => organization?.phone && window.open(`tel:${organization.phone}`)}
                >
                  <Phone className="w-5 h-5" />
                  Call Team
                </Button>
                <Button variant="outline" size="lg" className="w-full" onClick={() => setShowContactForm(true)}>
                  <MessageCircle className="w-5 h-5" />
                  Send Message
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => organization?.email && window.open(`mailto:${organization.email}`)}
                >
                  <Mail className="w-5 h-5" />
                  Email
                </Button>
              </div>

              {!showContactForm && (
                <Button variant="secondary" className="w-full" onClick={() => setShowContactForm(true)}>
                  Start Inquiry
                </Button>
              )}

              {listing.listing_type === "sale" && !showOfferForm && (
                <Button
                  className="w-full mt-3"
                  onClick={() => {
                    setShowOfferForm(true);
                    setShowContactForm(false);
                  }}
                >
                  <Shield className="w-4 h-4" />
                  Make Offer
                </Button>
              )}

              {!showViewingForm && (
                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => {
                    setShowViewingForm(true);
                    setShowOfferForm(false);
                  }}
                >
                  <MapPin className="w-4 h-4" />
                  Book Viewing
                </Button>
              )}

              {!showPaymentForm && (
                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => {
                    setShowPaymentForm(true);
                    setShowOfferForm(false);
                  }}
                >
                  <CreditCard className="w-4 h-4" />
                  Secure Property Payment
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => void handleSaveAndCompare()}
              >
                <Heart className={`w-4 h-4 ${isSaved ? "fill-primary text-primary" : ""}`} />
                Save & Compare
              </Button>

              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={handleOpenBuyerTools}
              >
                <FileText className="w-4 h-4" />
                Buyer Toolkit
              </Button>

              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => navigate("/app/concierge")}
              >
                <Brain className="w-4 h-4" />
                AI Concierge
              </Button>

              <Button
                variant="outline"
                className="w-full mt-3 border-amber-200 text-amber-700 hover:bg-amber-50"
                onClick={() => setShowReportForm((current) => !current)}
              >
                <AlertTriangle className="w-4 h-4" />
                Report Suspicious Listing
              </Button>

              {showReportForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="border-t border-border pt-6 mt-6"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Report this listing</h4>
                      <p className="text-sm text-muted-foreground">
                        Reports go to BaytMiftah admin moderation and help keep the marketplace clean.
                      </p>
                    </div>
                  </div>
                  <form className="space-y-4" onSubmit={handleReportListing}>
                    <div>
                      <label htmlFor="listing-report-reason" className="block mb-2 text-sm">
                        Reason
                      </label>
                      <select
                        id="listing-report-reason"
                        className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                        value={reportForm.reason}
                        onChange={(event) =>
                          setReportForm((current) => ({ ...current, reason: event.target.value }))
                        }
                      >
                        <option value="fake_listing">Fake listing</option>
                        <option value="duplicate_listing">Duplicate listing</option>
                        <option value="scam">Scam or suspicious payment request</option>
                        <option value="wrong_details">Wrong price, photos, or location</option>
                        <option value="unreachable_agent">Agent or landlord is unreachable</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="listing-report-description" className="block mb-2 text-sm">
                        What should we review?
                      </label>
                      <textarea
                        id="listing-report-description"
                        rows={4}
                        className="w-full rounded-lg border border-border bg-input-background px-4 py-3"
                        value={reportForm.description}
                        onChange={(event) =>
                          setReportForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Tell us what looks suspicious. Do not include private passwords or payment PINs."
                      />
                    </div>
                    <Button
                      size="lg"
                      className="w-full"
                      type="submit"
                      disabled={reportSubmitting}
                    >
                      {reportSubmitting ? "Submitting report..." : "Submit Report"}
                    </Button>
                  </form>
                </motion.div>
              )}

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
                      <textarea
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

              {showContactForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="border-t border-border pt-6 mt-6"
                >
                  <h4 className="font-semibold mb-4">Contact the Team</h4>
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
                    <div>
                      <label htmlFor="property-inquiry-message" className="block mb-2 text-sm">
                        Message
                      </label>
                      <textarea
                        id="property-inquiry-message"
                        className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        rows={4}
                        placeholder="I'm interested in this property and would like more details."
                        value={contactForm.message}
                        onChange={(e) => setContactForm((current) => ({ ...current, message: e.target.value }))}
                      />
                    </div>
                    <Button size="lg" className="w-full" type="submit" disabled={submitting}>
                      {submitting ? "Sending..." : "Send Inquiry"}
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
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Submit a Purchase Offer</h4>
                      <p className="text-sm text-muted-foreground">
                        Send your target price and closing timeline directly into the workspace negotiation pipeline.
                      </p>
                    </div>
                  </div>
                  <form className="space-y-4" onSubmit={handleOfferSubmit}>
                    <Input
                      label="Buyer Name"
                      placeholder="Ama Mensah"
                      value={offerForm.buyerName}
                      onChange={(e) =>
                        setOfferForm((current) => ({
                          ...current,
                          buyerName: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Offer Amount (GHS)"
                      type="number"
                      min="1"
                      step="0.01"
                      value={offerForm.amount}
                      onChange={(e) =>
                        setOfferForm((current) => ({
                          ...current,
                          amount: e.target.value,
                        }))
                      }
                    />
                    <div>
                      <label htmlFor="property-offer-financing" className="block mb-2 text-sm">
                        Financing
                      </label>
                      <select
                        id="property-offer-financing"
                        className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={offerForm.financingStatus}
                        onChange={(e) =>
                          setOfferForm((current) => ({
                            ...current,
                            financingStatus: e.target.value as typeof current.financingStatus,
                          }))
                        }
                      >
                        <option value="cash">Cash ready</option>
                        <option value="mortgage">Mortgage / financing</option>
                        <option value="structured">Structured payment</option>
                        <option value="undecided">Still deciding</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Phone"
                        type="tel"
                        placeholder="+233 24 123 4567"
                        value={offerForm.buyerPhone}
                        onChange={(e) =>
                          setOfferForm((current) => ({
                            ...current,
                            buyerPhone: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Target Close Date"
                        type="date"
                        value={offerForm.targetCloseDate}
                        onChange={(e) =>
                          setOfferForm((current) => ({
                            ...current,
                            targetCloseDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor="property-offer-notes" className="block mb-2 text-sm">
                        Offer Notes
                      </label>
                      <textarea
                        id="property-offer-notes"
                        className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        rows={4}
                        placeholder="Share any contingencies, document expectations, or payment structure notes."
                        value={offerForm.notes}
                        onChange={(e) =>
                          setOfferForm((current) => ({
                            ...current,
                            notes: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button size="lg" className="w-full" type="submit" disabled={offerSubmitting}>
                      {offerSubmitting ? "Submitting offer..." : "Submit Offer"}
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
                        Choose a checkout gateway, then pay with mobile money, card, bank transfer, or bank rails. After confirmation, your receipt is prepared for verification.
                      </p>
                    </div>
                  </div>
                  <form className="space-y-4" onSubmit={handleSecurePayment}>
                    <Input
                      label="Amount (GHS)"
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
                      <label htmlFor="property-payment-provider" className="block mb-2 text-sm">
                        Payment Gateway
                      </label>
                      <select
                        id="property-payment-provider"
                        className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={paymentForm.provider}
                        onChange={(e) =>
                          setPaymentForm((current) => ({
                            ...current,
                            provider: e.target.value as PaymentGatewayProvider,
                          }))
                        }
                      >
                        {PAYMENT_GATEWAY_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id} disabled={!option.enabled}>
                            {option.label}
                            {option.enabled ? "" : " (ops setup required)"}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {selectedPaymentGateway.helper}
                      </p>
                    </div>
                    <div>
                      <label htmlFor="property-payment-purpose" className="block mb-2 text-sm">
                        Payment Purpose
                      </label>
                      <select
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
                      </select>
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
                        ? `Redirecting to ${selectedPaymentGateway.label}...`
                        : `Continue to ${selectedPaymentGateway.label}`}
                    </Button>
                  </form>
                </motion.div>
              )}
            </Card>

            <Card className="p-6 mt-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Safe Payment Milestones
              </h4>
              <div className="space-y-3">
                {safePaymentMilestones.map((milestone) => (
                  <div key={milestone.label} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Check
                        className={`w-4 h-4 ${
                          milestone.complete ? "text-accent" : "text-muted-foreground"
                        }`}
                      />
                      <p className="text-sm font-medium">{milestone.label}</p>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{milestone.helper}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 mt-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Bring Your Buying Group
              </h4>
              <p className="text-sm text-muted-foreground">
                Invite family, a lawyer, or a local representative to review the shortlist and keep legal, viewing, and payment questions together.
              </p>
              <Link to="/app/groups">
                <Button variant="outline" className="mt-4 w-full">
                  Open Buying Group
                </Button>
              </Link>
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
                  <span>Confirm the listing team's identity before sharing documents.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>

        {relatedListings.length > 0 && (
          <div className="mt-16">
            <h2 className="text-3xl font-semibold mb-8">Similar Properties</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedListings.map((item) => (
                <Link key={item.id} to={`/property/${item.id}${referralQueryString}`}>
                  <Card hover className="overflow-hidden">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={getPropertyCoverImage(item.property)}
                        alt={item.property?.address || "Property"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2">{item.property?.address || "Property"}</h3>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>{item.property?.city}, {item.property?.region}</span>
                      </div>
                      <DiasporaPrice
                        amount={Number(item.price || 0)}
                        currency={item.currency || "GHS"}
                        suffix={item.listing_type === "rental" ? "/month" : ""}
                      />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
