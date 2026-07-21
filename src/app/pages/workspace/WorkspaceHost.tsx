import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Home, MessageCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { bookingService } from "../../../lib/booking.service";
import { hostSettingsService } from "../../../lib/host-settings.service";
import { listingService } from "../../../lib/listing.service";
import { paymentService } from "../../../lib/payment.service";
import { walletService } from "../../../lib/wallet.service";

function formatMoney(amountMinor?: number | null, currency = "GHS") {
  return walletService.formatWalletAmount(amountMinor, currency);
}

export function WorkspaceHost({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedListingId, setSelectedListingId] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [availabilityRows, setAvailabilityRows] = useState<any[]>([]);
  const [hostSettings, setHostSettings] = useState<any>(null);
  const [houseRules, setHouseRules] = useState("");
  const [checkInInstructions, setCheckInInstructions] = useState("");
  const [cleaningNotes, setCleaningNotes] = useState("");
  const [baseNightly, setBaseNightly] = useState("");
  const [bookingMode, setBookingMode] = useState<"instant" | "request">("instant");
  const [savingSettings, setSavingSettings] = useState(false);
  const [hostReviewRating, setHostReviewRating] = useState<Record<string, number>>({});

  const shortStayListings = useMemo(
    () => listings.filter((listing) => listing.listing_type === "short_stay"),
    [listings]
  );

  const loadHostData = async () => {
    try {
      setLoading(true);
      const [listingRows, bookingRows] = await Promise.all([
        listingService.getOrganizationListings(organizationId),
        bookingService.getOrganizationBookings(organizationId),
      ]);
      setListings(listingRows || []);
      setBookings(bookingRows || []);
      const firstShortStay = (listingRows || []).find(
        (listing) => listing.listing_type === "short_stay"
      );
      if (firstShortStay && !selectedListingId) {
        setSelectedListingId(firstShortStay.id);
      }
    } catch (error) {
      console.error("Failed to load host workspace:", error);
      toast.error("Unable to load host data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHostData();
  }, [organizationId]);

  useEffect(() => {
    if (!selectedListingId) {
      setAvailabilityRows([]);
      setHostSettings(null);
      return;
    }

    void bookingService
      .getListingAvailability(selectedListingId)
      .then(setAvailabilityRows)
      .catch(() => setAvailabilityRows([]));

    void hostSettingsService
      .getListingSettings(selectedListingId)
      .then((settings) => {
        setHostSettings(settings);
        setHouseRules(settings?.house_rules || "");
        setCheckInInstructions(settings?.check_in_instructions || "");
        setCleaningNotes(settings?.cleaning_notes || "");
        setBaseNightly(
          settings?.base_nightly_minor ? String(settings.base_nightly_minor / 100) : ""
        );
        setBookingMode(settings?.booking_mode === "request" ? "request" : "instant");
      })
      .catch(() => {
        setHostSettings(null);
        setHouseRules("");
        setCheckInInstructions("");
        setCleaningNotes("");
        setBaseNightly("");
      });
  }, [selectedListingId]);

  const saveAvailability = async () => {
    if (!selectedListingId || !availabilityDate) {
      toast.error("Choose a listing and date.");
      return;
    }

    try {
      await bookingService.upsertAvailability({
        listingId: selectedListingId,
        availableDate: availabilityDate,
        isAvailable,
        priceOverrideMinor: priceOverride ? Math.round(Number(priceOverride) * 100) : null,
      });
      toast.success("Availability saved.");
      const rows = await bookingService.getListingAvailability(selectedListingId);
      setAvailabilityRows(rows);
      setAvailabilityDate("");
      setPriceOverride("");
    } catch (error) {
      console.error(error);
      toast.error("Unable to save availability.");
    }
  };

  const saveHostSettings = async () => {
    if (!selectedListingId) return;

    try {
      setSavingSettings(true);
      const saved = await hostSettingsService.upsertListingSettings({
        listingId: selectedListingId,
        organizationId,
        houseRules,
        checkInInstructions,
        cleaningNotes,
        baseNightlyMinor: baseNightly ? Math.round(Number(baseNightly) * 100) : null,
        bookingMode,
      });
      setHostSettings(saved);
      toast.success("Host settings saved.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to save host settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const cancelBookingAsHost = async (booking: any) => {
    try {
      if (booking.transaction_id) {
        await paymentService.initiatePropertyRefund({
          transactionId: booking.transaction_id,
          amount: Math.round(Number(booking.total_minor) * 0.85) / 100,
          reason: "Host cancelled reservation",
          customerNote: "Host cancelled reservation",
        });
      }
      await bookingService.updateBookingStatus(booking.id, "cancelled");
      toast.success("Booking cancelled and refund initiated.");
      await loadHostData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to cancel booking.");
    }
  };

  const submitHostReview = async (bookingId: string, guestUserId: string, hostUserId: string) => {
    try {
      await bookingService.submitReview({
        bookingId,
        reviewerUserId: hostUserId,
        reviewerRole: "host",
        rating: hostReviewRating[bookingId] || 5,
        comment: "Host review",
      });
      toast.success("Guest review submitted.");
      await loadHostData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to submit review.");
    }
  };

  const updateBookingStatus = async (
    bookingId: string,
    status: "confirmed" | "cancelled" | "completed"
  ) => {
    try {
      if (status === "confirmed") {
        await bookingService.confirmBooking(bookingId);
      } else {
        await bookingService.updateBookingStatus(bookingId, status);
      }
      toast.success(`Booking marked ${status}.`);
      await loadHostData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update booking.");
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading host workspace...</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Host Workspace</h1>
        <p className="text-muted-foreground">
          Availability, pricing, guest messaging prep, house rules, check-in, and reservations.
        </p>
      </div>

      {shortStayListings.length === 0 ? (
        <Card className="p-8 text-center">
          <Home className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            Create a listing with type <strong>Short Stay</strong> to start hosting.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Listing settings</h2>
            <select
              className="w-full rounded-lg border border-border px-3 py-2"
              value={selectedListingId}
              onChange={(event) => setSelectedListingId(event.target.value)}
            >
              {shortStayListings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.property?.address || listing.id}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm">
                Booking mode
                <select
                  className="w-full mt-2 rounded-lg border border-border px-3 py-2"
                  value={bookingMode}
                  onChange={(event) =>
                    setBookingMode(event.target.value as "instant" | "request")
                  }
                >
                  <option value="instant">Instant book (Paystack checkout)</option>
                  <option value="request">Request to book (host approves)</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                value={baseNightly}
                onChange={(event) => setBaseNightly(event.target.value)}
                placeholder="Base nightly rate (GHS)"
              />
              <Input
                value={checkInInstructions}
                onChange={(event) => setCheckInInstructions(event.target.value)}
                placeholder="Check-in instructions"
              />
            </div>
            <textarea
              className="w-full min-h-24 rounded-lg border border-border px-3 py-2"
              value={houseRules}
              onChange={(event) => setHouseRules(event.target.value)}
              placeholder="House rules"
            />
            <textarea
              className="w-full min-h-24 rounded-lg border border-border px-3 py-2"
              value={cleaningNotes}
              onChange={(event) => setCleaningNotes(event.target.value)}
              placeholder="Cleaning notes between stays"
            />
            <Button onClick={() => void saveHostSettings()} disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save host settings"}
            </Button>
            {hostSettings ? (
              <p className="text-xs text-muted-foreground">
                Guest messaging and payouts continue through Messages and Wallet.
              </p>
            ) : null}
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Availability</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                type="date"
                value={availabilityDate}
                onChange={(event) => setAvailabilityDate(event.target.value)}
              />
              <Input
                value={priceOverride}
                onChange={(event) => setPriceOverride(event.target.value)}
                placeholder="Optional nightly override (GHS)"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(event) => setIsAvailable(event.target.checked)}
                />
                Available on this date
              </label>
            </div>
            <Button onClick={() => void saveAvailability()}>Save availability</Button>
            <div className="space-y-2">
              {availabilityRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No custom availability yet.</p>
              ) : (
                availabilityRows.slice(0, 14).map((row) => (
                  <div key={row.id} className="flex items-center justify-between text-sm">
                    <span>{row.available_date}</span>
                    <Badge variant={row.is_available ? "default" : "outline"}>
                      {row.is_available ? "Open" : "Blocked"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Reservations</h2>
            </div>
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reservations yet.</p>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-semibold">
                          {booking.listing?.property?.address || "Short stay booking"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.guest?.full_name || booking.guest?.email} · {booking.check_in} to{" "}
                          {booking.check_out}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          {formatMoney(booking.total_minor, booking.currency)}
                        </p>
                        {booking.guest_note ? (
                          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            {booking.guest_note}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="capitalize">
                          {booking.status}
                        </Badge>
                        {booking.status === "pending" && (
                          <Button size="sm" onClick={() => void updateBookingStatus(booking.id, "confirmed")}>
                            Confirm
                          </Button>
                        )}
                        {booking.status === "confirmed" && (
                          <Button size="sm" variant="outline" onClick={() => void updateBookingStatus(booking.id, "completed")}>
                            Mark completed
                          </Button>
                        )}
                        {booking.status !== "cancelled" && booking.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void cancelBookingAsHost(booking)}
                          >
                            Cancel & refund
                          </Button>
                        )}
                        {booking.status === "completed" && user ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void submitHostReview(booking.id, booking.guest_user_id, user.id)
                            }
                          >
                            Review guest
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
