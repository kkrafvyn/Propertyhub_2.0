-- Enforce date exclusivity in PostgreSQL, including competing transactions and updates.
-- Existing overlaps are reported as a migration failure; no reservations are deleted.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
SET LOCAL search_path=public,extensions;
ALTER TABLE public.short_stay_bookings ADD CONSTRAINT short_stay_valid_dates CHECK(check_out>check_in);
ALTER TABLE public.short_stay_bookings ADD CONSTRAINT short_stay_no_overlapping_reservations
 EXCLUDE USING gist(listing_id WITH =,daterange(check_in,check_out,'[)') WITH &&)
 WHERE(status IN('pending','confirmed'));
NOTIFY pgrst,'reload schema';
