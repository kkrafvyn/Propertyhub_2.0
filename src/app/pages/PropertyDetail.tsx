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
  Mail,
  MessageCircle,
  Check,
  CreditCard,
  Loader2,
  Shield,
  FileText,
  Clock3,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Navbar } from "../components/Navbar";
import { GhanaRoutePlanner } from "../components/GhanaRoutePlanner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { listingService } from "../../lib/listing.service";
import { getPropertyCoverImage, getPropertyMediaItems } from "../../lib/property-media";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { dealCaseService } from "../../lib/dealcase.service";
import { messageService } from "../../lib/message.service";
import { communicationService } from "../../lib/communication.service";
import { organizationService } from "../../lib/organization.service";
import { paymentService } from "../../lib/payment.service";
import { propertyViewingService } from "../../lib/property-viewing.service";
import { trustCenterService } from "../../lib/trust-center.service";

const fallbackImages = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
  "https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
];

export function PropertyDetail() {
  const { id } = useParams();
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
  const [isSaved, setIsSaved] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showViewingForm, setShowViewingForm] = useState(false);
  const [trustLoading, setTrustLoading] = useState(false);
  const [trustSnapshot, setTrustSnapshot] = useState<any | null>(null);
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

  const property = listing?.property;
  const organization = listing?.organization;
  const uploadedImages = getPropertyMediaItems(property).map(
    (media) => media.public_url || fallbackImages[0]
  );
  const images = uploadedImages.length > 0 ? uploadedImages : fallbackImages;
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
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const caseType = useMemo(() => {
    if (!listing) return "rental_application";
    if (listing.listing_type === "sale") return "purchase_offer";
    if (listing.listing_type === "lease") return "lease_application";
    return "rental_application";
  }, [listing]);

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
        case_type: caseType,
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

  const handleShare = async () => {
    const payload = {
      title: pageTitle,
      text: `Take a look at ${pageTitle} on Property Hub.`,
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
      toast.error("Log in before starting a secure payment.");
      navigate("/login", { state: { from: `/property/${id}` } });
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
        purpose: paymentForm.purpose,
        customerName: paymentForm.customerName,
        customerPhone: paymentForm.customerPhone,
      });

      window.location.assign(result.authorizationUrl);
    } catch (error) {
      console.error("Failed to initialize payment:", error);
      toast.error("Unable to start the Paystack checkout right now.");
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!listing || !property) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4 max-w-3xl mx-auto">
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
      <Navbar />

      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[500px]">
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
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-semibold">{pageTitle}</h1>
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
                  <div className="text-4xl font-semibold text-primary">
                    GHS {listing.price.toLocaleString()}
                    <span className="text-lg text-muted-foreground ml-2">
                      {listing.listing_type === "rental" ? "/month" : listing.listing_type === "lease" ? "/lease" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void handleShare()}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={toggleSave}>
                    <Heart className={`w-4 h-4 ${isSaved ? "fill-primary text-primary" : ""}`} />
                  </Button>
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
              <h2 className="text-2xl font-semibold mb-4">Verification & Trust</h2>
              <Card className="p-6 bg-primary/5 border-primary/15">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Built for verified transactions</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Payments run through Paystack, while receipts and agreement records can be
                      tracked through the platform&apos;s verification layer.
                    </p>
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
                          {trustSnapshot?.blockchainProofEnabled ? "Receipt-ready" : "Standard"}
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

              {!showViewingForm && (
                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => setShowViewingForm(true)}
                >
                  <MapPin className="w-4 h-4" />
                  Book Viewing
                </Button>
              )}

              {!showPaymentForm && (
                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => setShowPaymentForm(true)}
                >
                  <CreditCard className="w-4 h-4" />
                  Secure Payment via Paystack
                </Button>
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
                        Pay with MTN MoMo, Telecel Cash, AT Money, card, or bank transfer through Paystack. After confirmation, your receipt is prepared for verification.
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
                      {paymentSubmitting ? "Redirecting to Paystack..." : "Continue to Paystack"}
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
          <div className="mt-16">
            <h2 className="text-3xl font-semibold mb-8">Similar Properties</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedListings.map((item) => (
                <Link key={item.id} to={`/property/${item.id}`}>
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
                      <div className="text-2xl font-semibold text-primary">
                        GHS {item.price.toLocaleString()}
                        {item.listing_type === "rental" ? "/month" : ""}
                      </div>
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
