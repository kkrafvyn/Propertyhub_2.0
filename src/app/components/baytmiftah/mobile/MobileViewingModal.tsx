import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { useTranslation } from "../../../i18n/LocaleContext";
import { getAvailability, requestViewing } from "../../../lib/baytmiftah/booking-service";
import { MobilePrimaryButton } from "../MobileUI";

export default function MobileViewingModal({
  listing,
  onClose,
  onBooked,
}: {
  listing: { id: string; title?: string; host?: string };
  onClose: () => void;
  onBooked?: (result: unknown) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<any[]>([]);
  const [slotId, setSlotId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!listing?.id) return;
    void getAvailability(listing.id).then(({ availability: rows }) => {
      const available = (rows || []).map((row: any) => ({
        id: row.id || row.available_date,
        date: row.available_date || row.date,
        time: row.time_slot || row.time || "10:00",
        available: row.available_spots ?? 1,
        slot_type: row.slot_type || "viewing",
      }));
      setSlots(available);
      if (available.length) {
        setSlotId(available[0].id);
        setDate(available[0].date);
      }
    });
  }, [listing?.id]);

  const hasSlots = slots.length > 0;
  const selectedSlot = slots.find((s) => s.id === slotId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasSlots && !slotId) {
      setMessage(t("property.pickDate"));
      return;
    }
    if (!hasSlots && !date) return;

    setLoading(true);
    setMessage("");
    const result = await requestViewing({
      listingId: listing.id,
      listingTitle: listing.title,
      preferredDate: selectedSlot?.date || date,
      preferredTime: selectedSlot?.time ?? undefined,
      notes,
    });
    setLoading(false);
    if ((result as { ok?: boolean })?.ok !== false) {
      onBooked?.(result);
      onClose();
      return;
    }
    setMessage((result as { message?: string })?.message || t("mobile.viewingError"));
  }

  if (!user) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-card sm:rounded-2xl">
          <h3 className="text-lg font-bold text-ink">{t("listing.requestViewing")}</h3>
          <p className="mt-2 text-sm text-ink-secondary">{t("mobile.viewingSignIn")}</p>
          <Link
            to="/login"
            className="mt-4 block w-full rounded-xl bg-mobile-forest py-3 text-center text-sm font-semibold text-white"
          >
            {t("auth.logIn")}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full py-2 text-sm font-semibold text-ink-secondary"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-card sm:rounded-2xl"
      >
        <h3 className="text-lg font-bold text-ink">{t("listing.requestViewing")}</h3>
        <p className="mt-1 truncate text-sm text-ink-secondary">{listing.title}</p>

        {hasSlots ? (
          <label className="mt-4 block text-sm font-semibold text-ink">
            {t("property.selectSlot")}
            <select
              required
              value={slotId}
              onChange={(e) => {
                const next = slots.find((s) => s.id === e.target.value);
                setSlotId(e.target.value);
                if (next) setDate(next.date);
              }}
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm"
            >
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date} · {s.time}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink-secondary">{t("property.noSlotsYet")}</p>
            <label className="mt-4 block text-sm font-semibold text-ink">
              {t("mobile.viewingDate")}
              <input
                required
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm"
              />
            </label>
          </>
        )}

        <label className="mt-3 block text-sm font-semibold text-ink">
          {t("mobile.viewingGuests")}
          <input
            type="number"
            min={1}
            max={20}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm"
          />
        </label>

        <label className="mt-3 block text-sm font-semibold text-ink">
          {t("mobile.viewingNotes")}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={t("mobile.viewingNotesPlaceholder")}
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm"
          />
        </label>

        {message && <p className="mt-3 text-sm text-red-600">{message}</p>}

        <MobilePrimaryButton
          type="submit"
          disabled={loading || (hasSlots && !slotId)}
          className="mt-4 w-full"
        >
          {loading ? t("mobile.viewingSending") : t("listing.requestViewing")}
        </MobilePrimaryButton>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-2 text-sm font-semibold text-ink-secondary"
        >
          {t("common.close")}
        </button>
      </form>
    </div>
  );
}
