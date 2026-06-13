-- Moderation RLS + reseed marketplace listings (idempotent)

alter table public.listings add column if not exists submitted_by uuid references auth.users(id);

-- Moderators can read pending/rejected listings (in addition to public active + own rows)
drop policy if exists "Moderators read all listing statuses" on public.listings;
create policy "Moderators read all listing statuses"
  on public.listings for select
  using (
    status = 'active'
    or auth.uid() = submitted_by
    or exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('agency_owner', 'agency_manager', 'platform_admin')
    )
  );

drop policy if exists "Moderators can update listings" on public.listings;
create policy "Moderators can update listings"
  on public.listings for update
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid()
        and up.role in ('agency_owner', 'agency_manager', 'platform_admin')
    )
  );

-- Reseed active marketplace listings
insert into public.listings (
  id, title, location, type, listing_type, price, price_label, rating,
  bedrooms, bathrooms, sqft, featured, verified, image, photos, host, description, amenities, lat, lng, status
) values
(
  'cantonments-sky-villa', 'Cantonments Sky Villa', 'Cantonments, Accra', 'apartment', 'rent',
  125000, 'GHS 125,000 / month', 4.98, 5, 4, 4200, true, true,
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Gold Coast Realty', 'Premium residence in Cantonments with concierge access and verified documentation.',
  '["Concierge","City view","Parking","24/7 security"]'::jsonb, 5.556, -0.182, 'active'
),
(
  'airport-residential-townhouse', 'Airport Residential Townhouse', 'Airport Residential, Accra', 'house', 'sale',
  6850000, 'GHS 6,850,000', 4.91, 4, 4, 3450, false, true,
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Anchorstone Properties', 'Secure townhouse near airport corridors with full ownership packet.',
  '["Private parking","Staff quarters","Garden"]'::jsonb, 5.605, -0.168, 'active'
),
(
  'east-legon-family-home', 'East Legon Family Home', 'East Legon, Accra', 'house', 'rent',
  58000, 'GHS 58,000 / month', 4.86, 4, 3, 3000, true, true,
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Miftah Homes', 'Family-ready East Legon home with strong security and backup utilities.',
  '["Family lounge","Security post","Solar backup"]'::jsonb, 5.635, -0.15, 'active'
),
(
  'osu-office-suite', 'Osu Arc Office Suite', 'Osu, Accra', 'office', 'lease',
  42000, 'GHS 42,000 / month', 4.79, 0, 2, 2150, false, true,
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Cedar Commercial', 'Central office suite with verified commercial lease terms.',
  '["Fiber ready","Reception","Parking"]'::jsonb, 5.555, -0.176, 'active'
),
(
  'labone-penthouse', 'Labone Penthouse', 'Labone, Accra', 'apartment', 'sale',
  4200000, 'GHS 4,200,000', 4.94, 3, 3, 2800, true, true,
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Prime Accra Estates', 'Top-floor penthouse with panoramic views and verified title.',
  '["Rooftop access","Smart locks","Elevator"]'::jsonb, 5.565, -0.175, 'active'
),
(
  'ridge-commercial-block', 'Ridge Commercial Block', 'Ridge, Accra', 'office', 'lease',
  95000, 'GHS 95,000 / month', 4.82, 0, 4, 4800, false, false,
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Ridge Capital', 'Multi-floor commercial block for corporate HQ or institutional tenants.',
  '["Multiple floors","Backup power","Elevator"]'::jsonb, 5.57, -0.195, 'active'
)
on conflict (id) do update set
  title = excluded.title,
  location = excluded.location,
  price = excluded.price,
  price_label = excluded.price_label,
  featured = excluded.featured,
  verified = excluded.verified,
  lat = excluded.lat,
  lng = excluded.lng,
  photos = excluded.photos,
  amenities = excluded.amenities,
  status = excluded.status,
  updated_at = now();
