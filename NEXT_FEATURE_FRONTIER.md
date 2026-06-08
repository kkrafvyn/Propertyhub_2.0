# BaytMiftah Next Feature Frontier

Assuming the current production-readiness list is complete, the next step is to move from marketplace operations into intelligence, liquidity, and network effects.

## High-Impact Next Features

- AI buyer concierge that learns saved searches, budgets, viewing behavior, and recommends matching listings. Code-side shell added; real learning still needs production event data.
- Agency operating system with task assignment, SLA timers, lead routing, commission splits, and team performance.
- Property data graph that links owners, agencies, listings, documents, valuations, trust signals, bookings, and transactions. Code-side shell added.
- Dynamic pricing for rentals and short stays using occupancy, seasonality, nearby demand, and channel performance. Function shell added.
- Owner portal for performance reporting, documents, calendar approvals, payments, and maintenance updates. Code-side shell added.
- Buyer/renter verification passport with identity, affordability checks, document vault, and reusable offer packets. Code-side shell added.
- Developer launch room for off-plan projects, unit releases, reservation deposits, buyer waitlists, and construction progress. Code-side shell added.
- Neighborhood intelligence pages with livability, flood risk, commute, schools, utilities, and comparable sales. Code-side shell added.
- Channel manager partnerships for real-time Booking.com, Airbnb, Vrbo, and PMS sync.
- Fraud intelligence layer with reason-code explanations, entity-link analysis, duplicate listing detection, and escalation workflows.
- WhatsApp-native agent workflows: lead capture, viewing scheduling, document collection, reminders, and post-viewing feedback.
- Revenue ops dashboard for subscriptions, boosts, payment conversion, agency expansion, and churn signals. Code-side shell added.
- Public SEO inventory pages for agencies, neighborhoods, developments, and verified properties.
- Mobile PWA offline mode for agents doing field visits and property inspections.
- Inspection app for media capture, verification checklist, geotagged photos, owner signatures, and condition reports. Code-side shell added.
- Data room sharing for high-value transactions with expiring links, watermarking, audit trails, and viewer analytics.
- Open API / partner portal for agencies, developers, lenders, insurers, and valuation partners. Code-side shell added.

## Still Needed For These To Be Real

- Production event pipelines for saved searches, listing views, bookings, offers, payments, and channel calendars.
- Provider integrations for identity checks, affordability checks, e-sign, WhatsApp, push, maps/geocoding, and valuation data.
- Admin workflows for issuing partner API keys, reviewing usage, rotating keys, and revoking access.
- Real AI prompts/evaluations once the event and property graph data is available in Supabase.

## Platform Bets

1. Build a trusted property identity layer for Ghana first, then expand by country.
2. Own the transaction workflow, not only the listing discovery surface.
3. Make calendar and channel sync reliable enough that agencies treat BaytMiftah as their source of truth.
4. Turn trust, verification, and documents into product advantages buyers can feel.
5. Use AI for workflow acceleration, but keep final trust decisions auditable by humans.
