# Property Hub Ecosystem Roadmap

This roadmap turns Property Hub into a complete property operating system. The first UI surface is live in the app at `/ecosystem`; backend modules should continue to use Supabase Edge Functions only.

## Phase 1: Revenue And Trust

- Premium monetization: featured listings, agency plans, developer plans.
- Financial services: mortgage marketplace, rent financing, property insurance.
- Legal services: digital contracts and e-signature routing.

Suggested Edge Functions:

- `billing`
- `financial-services`
- `contracts`

Suggested tables:

- `subscription_plans`
- `subscriptions`
- `featured_listing_campaigns`
- `mortgage_offers`
- `rent_finance_applications`
- `insurance_policies`
- `legal_documents`
- `signature_requests`

## Phase 2: Operations

- Maintenance marketplace and ticketing.
- Construction marketplace, build cost calculator, and project tracking.
- Developer project management and unit inventory.
- Property management company workflows.

Suggested Edge Functions:

- `maintenance`
- `construction`
- `developer-projects`
- `property-management`

Suggested tables:

- `service_providers`
- `service_bookings`
- `maintenance_tickets`
- `construction_quotes`
- `build_cost_estimates`
- `development_projects`
- `project_milestones`
- `project_units`
- `tenant_records`

## Phase 3: Intelligence

- AI property assistant.
- AI valuation.
- AI investment analysis.
- AI listing generator.
- Market intelligence dashboard.
- Full agency CRM.

Suggested Edge Functions:

- `ai-assistant`
- `valuations`
- `investment-analysis`
- `market-intelligence`
- `agency-crm`

Suggested tables:

- `saved_searches`
- `ai_search_sessions`
- `valuation_reports`
- `investment_reports`
- `generated_listing_content`
- `market_metrics`
- `crm_pipeline_stages`
- `crm_activities`

## Phase 4: Media And Experience

- Virtual tours.
- AR viewing.
- Drone media.
- Neighborhood pages.
- Community reviews.
- Relocation and utilities.

Suggested Edge Functions:

- `property-media`
- `neighborhoods`
- `reviews`
- `relocation`

Suggested tables:

- `virtual_tours`
- `tour_scenes`
- `ar_assets`
- `drone_media`
- `neighborhood_profiles`
- `community_reviews`
- `moving_requests`
- `utility_setup_requests`

## Phase 5: Smart Buildings And Estates

- Smart apartment buildings.
- Smart estates.
- Visitor management.
- Shared amenities and utilities.

Suggested Edge Functions:

- `smart-buildings`
- `visitor-management`
- `estate-operations`

Suggested tables:

- `buildings`
- `building_areas`
- `estate_gates`
- `visitor_passes`
- `shared_amenities`
- `utility_meters`

## Authorization Rules

- Smart-property access remains permission-based through device/property sharing, not a user role.
- Agency operations use `agency_owner`, `agency_manager`, `agency_agent`, and `agency_support`.
- Platform moderation and global settings use `platform_admin` and `super_admin`.
- Financial/legal/investment modules must store audit logs for user decisions, partner handoffs, and document state changes.

## Current UI Coverage

The ecosystem workspace now exposes:

- Financial Services
- Construction Ecosystem
- Maintenance Ecosystem
- AI Suite
- Advanced Property Viewing
- Legal Services
- Relocation Services
- Community Intelligence
- Commercial Real Estate
- Business Intelligence
- Smart Building Expansion
- Premium Monetization
