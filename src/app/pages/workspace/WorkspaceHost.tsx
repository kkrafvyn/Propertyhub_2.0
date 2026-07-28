import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Home, MessageCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import ChatThread from "../../components/baytmiftah/chat/ChatThread";
import { bookingService } from "../../../lib/booking.service";
import { hostSettingsService } from "../../../lib/host-settings.service";
import { listingService } from "../../../lib/listing.service";
import { messageService } from "../../../lib/message.service";
import { organizationWalletService } from "../../../lib/organization-wallet.service";
import { paymentService } from "../../../lib/payment.service";
import { walletService } from "../../../lib/wallet.service";

function formatMoney(amountMinor?: number | null, currency = "GHS") {
  return walletService.formatWalletAmount(amountMinor, currency);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildMonthDays(monthOffset: number) {
  const today = new Date();
  const anchor = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const days: Array<{ date: Date | null; key: string }> = [];

  for (let i = 0; i < startPad; i += 1) {
    days.push({ date: null, key: `pad-start-${i}` });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    days.push({ date, key: toDateKey(date) });
  }

  return { days, label: anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
}

export function WorkspaceHost({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [walletLedger, setWalletLedger] = useState<any[]>([]);
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
  const [hostReviewComment, setHostReviewComment] = useState<Record<string, string>>({});
  const [monthOffset, setMonthOffset] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeGuestName, setActiveGuestName] = useState("");
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);

  const shortStayListings = useMemo(
    () => listings.filter((listing) => listing.listing_type === "short_stay"),
    [listings]
  );

  const listingBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => !selectedListingId || booking.listing_id === selectedListingId
      ),
    [bookings, selectedListingId]
  );

  const calendar = useMemo(() => buildMonthDays(monthOffset), [monthOffset]);

  const calendarStatusByDay = useMemo(() => {
    const map: Record<string, "booked" | "blocked" | "open"> = {};

    for (const row of availabilityRows) {
      if (row.is_available === false) {
        map[row.available_date] = "blocked";
      } else if (!map[row.available_date]) {
        map[row.available_date] = "open";
      }
    }

    for (const booking of listingBookings) {
      if (!["pending", "confirmed", "completed"].includes(booking.status)) continue;
      const start = new Date(`${booking.check_in}T00:00:00`);
      const end = new Date(`${booking.check_out}T00:00:00`);
      for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
        map[toDateKey(cursor)] = "booked";
      }
    }

    return map;
  }, [availabilityRows, listingBookings]);

  const cleaningSchedule = useMemo(() => {
    const sorted = [...listingBookings]
      .filter((booking) => ["confirmed", "completed"].includes(booking.status))
      .sort((a, b) => a.check_out.localeCompare(b.check_out));

    return sorted.map((booking, index) => {
      const nextBooking = sorted[index + 1];
      return {
        booking,
        checkoutDate: booking.check_out,
        nextCheckIn: nextBooking?.check_in || null,
        guestName: booking.guest?.full_name || booking.guest?.email || "Guest",
        address: booking.listing?.property?.address || "Property",
      };
    });
  }, [listingBookings]);

  const loadHostData = async () => {
    try {
      setLoading(true);
      const [listingRows, bookingRows, reviewRows, payoutRows, ledgerRows] = await Promise.all([
        listingService.getOrganizationListings(organizationId),
        bookingService.getOrganizationBookings(organizationId),
        bookingService.getOrganizationBookingReviews(organizationId),
        organizationWalletService.getOrganizationPayoutRequests(organizationId),
        organizationWalletService.getOrganizationLedger(organizationId),
      ]);
      setListings(listingRows || []);
      setBookings(bookingRows || []);
      setReviews(reviewRows || []);
      setPayoutRequests(payoutRows || []);
      setWalletLedger(ledgerRows || []);
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

  const openGuestChat = async (booking: any) => {
    if (!user?.id || !booking.guest_user_id) return;

    try {
      setOpeningChatId(booking.id);
      const shared = await messageService.createOrGetOrganizationConversation({
        organizationId,
        leadUserId: booking.guest_user_id,
        internalParticipantId: user.id,
        createdBy: user.id,
      });
      setActiveConversationId(shared.conversation_id);
      setActiveGuestName(booking.guest?.full_name || booking.guest?.email || "Guest");
    } catch (error) {
      console.error(error);
      toast.error("Unable to open guest conversation.");
    } finally {
      setOpeningChatId(null);
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
        comment: hostReviewComment[bookingId] || "Host review",
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
        const booking = bookings.find((row) => row.id === bookingId);
        if (booking?.booking_mode === "request" && !booking.transaction_id) {
          await bookingService.approveBookingRequest(bookingId);
        } else {
          await bookingService.confirmBooking(bookingId);
        }
      } else if (status === "completed") {
        await bookingService.checkOutGuest(bookingId);
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
          Calendar, guest messaging, cleaning turnovers, payouts, and review management.
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
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Calendar</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setMonthOffset((value) => value - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMonthOffset((value) => value + 1)}>
                  Next
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{calendar.label}</p>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendar.days.map((entry) => {
                if (!entry.date) {
                  return <div key={entry.key} className="h-12" />;
                }

                const status = calendarStatusByDay[entry.key] || "open";
                const tone =
                  status === "booked"
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : status === "blocked"
                      ? "bg-muted border-border text-muted-foreground line-through"
                      : "bg-background border-border";

                return (
                  <div
                    key={entry.key}
                    className={`h-12 rounded-lg border px-1 py-2 text-xs ${tone}`}
                  >
                    <div className="font-medium">{entry.date.getDate()}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Open</span>
              <span>Booked</span>
              <span>Blocked</span>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Availability overrides</h2>
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
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Cleaning schedule</h2>
            {cleaningNotes ? (
              <p className="text-sm text-muted-foreground">Notes: {cleaningNotes}</p>
            ) : null}
            {cleaningSchedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">No turnovers scheduled yet.</p>
            ) : (
              cleaningSchedule.slice(0, 8).map((item) => (
                <div key={item.booking.id} className="rounded-lg border border-border p-4">
                  <p className="font-medium">{item.address}</p>
                  <p className="text-sm text-muted-foreground">
                    Checkout {item.checkoutDate}
                    {item.nextCheckIn ? ` · Next check-in ${item.nextCheckIn}` : " · No next booking yet"}
                  </p>
                  <p className="text-sm text-muted-foreground">Guest: {item.guestName}</p>
                </div>
              ))
            )}
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Reservations</h2>
              </div>
              <div className="space-y-4">
                {listingBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reservations yet.</p>
                ) : (
                  listingBookings.map((booking) => {
                    const existingHostReview = reviews.find(
                      (review) =>
                        review.booking_id === booking.id && review.reviewer_role === "host"
                    );

                    return (
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void openGuestChat(booking)}
                              disabled={openingChatId === booking.id}
                            >
                              {openingChatId === booking.id ? "Opening..." : "Message guest"}
                            </Button>
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
                          </div>
                        </div>

                        {booking.status === "completed" && user && !existingHostReview ? (
                          <div className="mt-4 rounded-lg border border-border p-4 space-y-3">
                            <p className="text-sm font-medium">Review guest</p>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  className="p-1"
                                  onClick={() =>
                                    setHostReviewRating((current) => ({
                                      ...current,
                                      [booking.id]: value,
                                    }))
                                  }
                                >
                                  <Star
                                    className={`w-5 h-5 ${
                                      (hostReviewRating[booking.id] || 0) >= value
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                            <Input
                              value={hostReviewComment[booking.id] || ""}
                              onChange={(event) =>
                                setHostReviewComment((current) => ({
                                  ...current,
                                  [booking.id]: event.target.value,
                                }))
                              }
                              placeholder="Review comment"
                            />
                            <Button
                              size="sm"
                              onClick={() =>
                                void submitHostReview(booking.id, booking.guest_user_id, user.id)
                              }
                            >
                              Submit review
                            </Button>
                          </div>
                        ) : existingHostReview ? (
                          <p className="text-sm text-muted-foreground mt-3">
                            Your review: {existingHostReview.rating}/5
                            {existingHostReview.comment ? ` — ${existingHostReview.comment}` : ""}
                          </p>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Guest messaging</h2>
              {activeConversationId ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Chat with {activeGuestName}</p>
                  <ChatThread conversationId={activeConversationId} mode="agent" className="min-h-[420px]" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Open a reservation and tap Message guest to chat here.
                </p>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Payout history</h2>
              {payoutRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payout requests yet.</p>
              ) : (
                payoutRequests.slice(0, 8).map((request) => (
                  <div key={request.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">
                        {formatMoney(request.amount_minor, request.currency)}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()} · {request.payout_destination}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {request.status}
                    </Badge>
                  </div>
                ))
              )}
            </Card>

            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Wallet activity</h2>
              {walletLedger.length === 0 ? (
                <p className="text-sm text-muted-foreground">No wallet entries yet.</p>
              ) : (
                walletLedger.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium capitalize">{entry.entry_type?.replace(/_/g, " ")}</p>
                      <p className="text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span>{formatMoney(entry.amount_minor, entry.currency)}</span>
                  </div>
                ))
              )}
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No guest or host reviews yet.</p>
            ) : (
              reviews.slice(0, 10).map((review) => (
                <div key={review.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium capitalize">
                        {review.reviewer_role} review · {review.rating}/5
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {review.booking?.listing?.property?.address || "Booking"} ·{" "}
                        {review.booking?.guest?.full_name || review.booking?.guest?.email || "Guest"}
                      </p>
                      {review.comment ? (
                        <p className="text-sm mt-2">{review.comment}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline">
                      {new Date(review.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </div>
  );
}
