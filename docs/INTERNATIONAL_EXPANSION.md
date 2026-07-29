# International Expansion Plan

BaytMiftah launches **Ghana-first** and expands across **West Africa**, then **pan-African** and **global diaspora** markets using the same REOS platform with localized payments, compliance, and content.

## Vision

> **One platform, many markets** — consumers and agencies get the same BaytMiftah experience whether they are in Accra, Lagos, Nairobi, or London looking for property back home.

## Expansion waves

### Wave 1 — Ghana (live)

| Item | Status |
|---|---|
| Market | Accra, Kumasi, Tema, regional cities |
| Currency | GHS (primary) |
| Payments | Paystack (live) |
| Language | English + 11 onboarding locales |
| Compliance | Ghana Post GPS, local KYC patterns |
| Domain | baytmiftah.com |

### Wave 2 — West Africa (6–12 months)

| Country | Currency | Payments | Priority |
|---|---|---|---|
| **Nigeria** | NGN | Paystack | P0 — largest market |
| **Côte d'Ivoire** | XOF | Paystack / mobile money | P1 |
| **Senegal** | XOF | Paystack | P1 |
| **Sierra Leone** | SLL | Paystack | P2 |
| **Liberia** | LRD | Stripe + local partners | P2 |

**Product work per market:**

- Location onboarding presets (city, currency, listing modes)
- Payment routing by property country (already partially built)
- French locale completion (CI, SN)
- Agency verification workflows per jurisdiction
- Local phone OTP providers

### Wave 3 — East & Southern Africa (12–18 months)

| Country | Currency | Payments |
|---|---|---|
| Kenya | KES | M-Pesa (Paystack supports) |
| South Africa | ZAR | Stripe + Paystack |
| Rwanda | RWF | Stripe |
| Tanzania | TZS | Mobile money partners |

**Infrastructure:** Consider AWS `af-south-1` (Cape Town) region per [AWS_MIGRATION_PLAN.md](./AWS_MIGRATION_PLAN.md).

### Wave 4 — Diaspora & gateway cities (18–24 months)

| Market | Use case |
|---|---|
| UK, US, UAE | Diaspora buying/renting in West Africa |
| France | Francophone Africa corridor |

**Product work:**

- Stripe as primary card rail
- Multi-currency wallets and FX display (exchange rate service exists)
- Remote KYC for overseas buyers
- International MLS syndication (optional)

## Localization checklist (per new country)

- [ ] `MarketContext` default city and listing mode
- [ ] Currency in `currency.service.ts`
- [ ] Payment provider routing in `payment-routing.ts`
- [ ] i18n locale file (or partial chrome)
- [ ] Legal pages (terms, privacy) — jurisdiction review
- [ ] Phone country code in auth
- [ ] Verified agency onboarding criteria
- [ ] Tax / receipt format for payments
- [ ] Marketing landing page for market

## Go-to-market by segment

| Segment | Ghana | West Africa | Global |
|---|---|---|---|
| Consumers | Social, SEO, referrals | Partner with local portals | Diaspora campaigns |
| Agencies | Direct sales, associations | Franchise agency networks | — |
| Landlords | Self-serve workspace | Property manager partnerships | — |
| Enterprise | White-label pilots | Bank & telco partnerships | — |

## Metrics for market readiness

Before launching a new country:

| Metric | Target |
|---|---|
| Verified agency partners | ≥ 10 |
| Live listings | ≥ 500 |
| Payment success rate | ≥ 95% |
| Support response SLA | < 24h |
| Legal review | Complete |

## Regulatory considerations

| Area | Approach |
|---|---|
| Data protection | Ghana DPA; align with Nigeria NDPA, Kenya DPA per market |
| Real estate licensing | Display agency license fields; admin verification |
| Payments | PCI via Paystack/Stripe; no card data on our servers |
| Short-stay regulation | Host KYC; local tax disclosure fields (planned) |
| AML/KYC | Tiered verification for high-value transactions |

## Technical enablers (already built)

- Multi-currency service (16+ currencies)
- 12+ language i18n framework
- Location onboarding (`MarketContext`)
- International payment routing
- Workspace multi-org (agencies per country)
- Role-based access for distributed teams

## Revenue by region (projected mix)

| Region | Year 1 | Year 3 |
|---|---|---|
| Ghana | 100% | 40% |
| West Africa | — | 45% |
| East / Southern Africa | — | 10% |
| Diaspora / international | — | 5% |

---

*Expansion is gated on payment rails, agency supply, and legal review — not code alone.*
