# Hero photography

Five self-hosted Unsplash stock photographs, licensed for commercial use under
https://unsplash.com/license (checked 2026-10-05). These are illustrative property
types, not BaytMiftah customers, managed inventory, or claims about where a photo
was taken. Apartment buildings, interiors, residential communities, contemporary
residences, and commercial architecture match the product's residential and
commercial portfolio positioning. The sample portfolio uses Ghana locations;
photographs are deliberately not represented as Ghana locations.

| Asset | Original source |
| --- | --- |
| residences | https://images.unsplash.com/photo-1460317442991-0ec209397118 |
| interior | https://images.unsplash.com/photo-1600607687939-ce8a6c25118c |
| community | https://images.unsplash.com/photo-1545324418-cc1a3fa10c00 |
| architecture | https://images.unsplash.com/photo-1613490493576-7fde63acd811 |
| commercial | https://images.unsplash.com/photo-1486406146926-c627a92ad1ab |

Rebuild with `node scripts/prepare-marketing-hero.mjs` (requires network).
Desktop variants: 1280 and 2200 pixels wide. Mobile: 780 × 1080 deliberate
portrait crops. All use consistent saturation and WebP encoding. Images are
covered by per-slide forest overlays; even an all-white source retains readable
text. First image is prioritized and preloaded on the marketing build. Subsequent
images load sequentially at low priority, and only decoded images can become
active. Failed images are disabled/skipped, with a solid forest fallback if all
images fail. The hero includes no live region for automatic changes.

Implemented service descriptions are checked against `src/lib/integrations.ts`
(payment checkout, email, web push). They require configuration; no provider logo,
partnership, geographic availability, or live-service claim is inferred.
