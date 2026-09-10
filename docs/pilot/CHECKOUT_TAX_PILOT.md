# Checkout tax — pilot scope

**Status:** Out of scope for pilot billing (2026-09-09)

## What the server charges

`initialize-payangels-payment` uses `resolveCheckoutAmountMinor`, which totals:

- Listing base price
- Platform fees from `revenue_rules`
- Minus validated promo discount

**Tax is not included** in the PayAngels charge amount for pilot.

## What the UI shows

`InAppCheckoutPage` may display jurisdiction tax as an **estimate only** (from client-side pricing helpers). Copy states that tax is not included in the charge.

## Post-pilot

Port minimal server-side tax rules (mirror `property-checkout-pricing.service.ts`) or integrate a tax provider before commercial launch in regulated jurisdictions.
