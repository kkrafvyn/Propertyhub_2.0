import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { assertFutureViewing, buildViewingCalendar } from "../../../lib/viewing-calendar";
import { openListingConversation } from "../../lib/baytmiftah/messaging-service";
export function ViewingActions({ viewing }: { viewing: any }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [preferred, setPreferred] = useState("");
  const [busy, setBusy] = useState(false);
  const active = ["requested", "confirmed", "rescheduled"].includes(viewing.status);
  const confirmed = ["confirmed", "rescheduled"].includes(viewing.status) && viewing.confirmed_datetime;
  const download = () => {
    try {
      const file = buildViewingCalendar({ id: viewing.id, title: "BaytMiftah property viewing", location: viewing.listing?.property?.address || "Confirm location with your property team", start: viewing.confirmed_datetime, duration: viewing.duration_minutes });
      const url = URL.createObjectURL(new Blob([file], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = "baytmiftah-viewing.ics"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Open the calendar file to add the viewing and one-hour reminder.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create calendar event."); }
  };
  const requestChange = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const date = assertFutureViewing(preferred);
      setBusy(true);
      const result = await openListingConversation({ listingId: viewing.listing_id, listingTitle: viewing.listing?.property?.address, initialMessage: `Please change viewing ${viewing.id} to ${date.toISOString()} (${date.toLocaleString()}). Please confirm whether this time is available. The original appointment remains until confirmed.` });
      navigate(`/app/messages?conversation=${encodeURIComponent(result.conversationId)}`);
      toast.success("Time-change request sent to the property team.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not send the request."); }
    finally { setBusy(false); }
  };
  return <div className="mt-4 space-y-3 border-t border-surface-border pt-4">
    <div className="flex flex-wrap gap-2">
      {confirmed && <Button variant="outline" onClick={download}>Add to calendar</Button>}
      {active && <Button variant="outline" onClick={() => setEditing(!editing)} aria-expanded={editing}>Request a different time</Button>}
    </div>
    {editing && <form onSubmit={requestChange} className="space-y-3">
      <label className="block text-sm font-medium">Preferred date and time<input type="datetime-local" required value={preferred} onChange={(event) => setPreferred(event.target.value)} className="mt-2 block min-h-11 w-full rounded-lg border border-surface-border bg-surface px-3 text-ink" /></label>
      <p className="text-xs text-ink-secondary">Times use your device’s time zone. The property team must confirm the change.</p>
      <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send time-change request"}</Button>
    </form>}
    {viewing.status === "requested" && <p className="text-xs text-ink-secondary">Awaiting confirmation from the property team. This is your preferred time, not a confirmed slot.</p>}
  </div>;
}
