# Alternate marketing home layouts

Production traffic uses [`MarketingEditorialHome`](./MarketingEditorialHome.tsx) exported as [`MarketingHome`](./MarketingHome.tsx).

These files are retained for design exploration and local comparison only—they are **not** wired to public routes:

- [`MarketingLaunchHome.tsx`](./MarketingLaunchHome.tsx) — product-led launch layout
- [`MarketingHomeLegacy.tsx`](./MarketingHomeLegacy.tsx) — scroll-cinematic legacy composition

Do not import them from routing or `MarketingSiteFrame` without an explicit feature flag and QA sign-off.
