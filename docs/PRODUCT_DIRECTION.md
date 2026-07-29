# BaytMiftah Product Direction

BaytMiftah is a focused Real Estate Operating System for property discovery, renting, leasing, short-stay bookings, transactions, property management, smart buildings, agency operations, and financial services — built to scale from **Ghana across West Africa and globally**.

**Mission:** Become the trusted digital infrastructure for every property transaction in emerging markets.

**Investment analytics are out of scope for the consumer product.** Investor-grade ROI, cap rate, portfolio, and appreciation tooling may return later as an enterprise or premium add-on.

## Consumer Role

**Consumer = Buy + Rent + Lease + Short Stay**

Primary capabilities:

- Buy, rent, and lease property
- Book short stays
- Manage bookings
- Make offers
- Pay rent
- Request maintenance
- Store documents
- Access smart property features

Legacy aliases: `buyer`, `renter` (if present in older data or integrations).

## Consumer Navigation

### Mobile bottom navigation

| Tab | Purpose |
| --- | --- |
| Home | Discovery feed and quick search |
| Explore | Full search and filters |
| Saved | Favorites and saved searches |
| Messages | Conversations with agents and owners |
| Profile | Account, payments, workspace entry, settings |

### Contextual tabs (shown when relevant)

**When booking (short stay)**

- Trips
- Reservations
- Calendar

**When renting**

- Leases
- Payments
- Maintenance

**When buying**

- Offers
- Transactions
- Documents

## Role Structure (13 Roles)

| Category | Roles |
| --- | --- |
| Consumer | `consumer` (`buyer`, `renter` legacy aliases) |
| Real Estate Professionals | `independent_agent`, `agency_agent`, `agency_manager`, `agency_owner` |
| Property Operations | `property_owner`, `property_manager` |
| Platform | `developer`, `enterprise_operator`, `platform_moderator`, `platform_admin` |

Current workspace membership roles (`owner`, `manager`, `agent`, `analyst`) map to agency operations until the expanded role model is migrated.

## Removed From Consumer Scope

Routes (do not ship in consumer app):

- `/investment`
- `/investment/portfolio`
- `/investment/roi`

Navigation items (do not ship in consumer app):

- ROI Calculator
- Cap Rate Analysis
- Cash Flow Forecasting
- Investment Portfolio Tracking
- Investment Scoring
- Appreciation Forecasting

## Highest-Priority Build Queue

1. **Wallet System** — balances, deposits, payouts ✅ MVP (ledger, escrow pending, payout requests)
2. **Escrow System** — milestone releases, disputes ✅ MVP (hold on deposit/installment, workspace release RPC)
3. **Tenant Portal** — lease, payments, maintenance ✅ MVP (`/app/leases`, `/app/maintenance`, auto-lease on rent)
4. **Host Workspace** — availability, reservations ✅ MVP (`/workspace/:slug/host`, short-stay booking flow)
5. **Contextual consumer tabs** ✅ MVP (booking/renting/buying nav on web + mobile)

## Important Next Wave

- Mortgage marketplace
- Insurance marketplace
- Vendor marketplace
- KYC verification

## Growth Features

- Reputation system
- Subscription billing (Pro & enterprise)
- API platform
- AI enhancements (pricing, maintenance, fraud)

## Module Completion Estimate

| Module | Status |
| --- | --- |
| Marketplace | 90% |
| Consumer Experience | 90% |
| Agent CRM | 85% |
| Agency ERP | 80% |
| Property Management | 75% |
| Smart Property | 65% |
| Financial Services | 60% |
| Developer Platform | 70% |
| Enterprise Platform | 60% |
| Trust & Compliance | 80% |
| Mobile Platform | 90% |

## Strategic Focus

Without the investment module, the product stays centered on:

1. Finding property
2. Renting, leasing, and booking stays
3. Completing transactions with escrow and wallets
4. Managing property and buildings
5. Running agency operations
6. Delivering adjacent financial services

## International expansion

See [INTERNATIONAL_EXPANSION.md](./INTERNATIONAL_EXPANSION.md) for the country rollout plan:

- **Wave 1:** Ghana (live)
- **Wave 2:** Nigeria, Côte d'Ivoire, Senegal (West Africa)
- **Wave 3:** Kenya, South Africa (East & Southern Africa)
- **Wave 4:** UK, US, UAE diaspora markets

## Infrastructure roadmap

Current stack: **Vercel + Supabase** (optimal for launch velocity).

Future: progressive migration to **AWS** when scale, compliance, or enterprise contracts require it. See [AWS_MIGRATION_PLAN.md](./AWS_MIGRATION_PLAN.md).

## AI strategy

BaytMiftah AI is integrated product-wide with **guided help** (no keys required) and **smart mode** when `OPENAI_API_KEY` is added. Future: regional models on AWS Bedrock. See [AI_INTEGRATION.md](./AI_INTEGRATION.md).
