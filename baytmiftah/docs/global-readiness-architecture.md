# Global Readiness Architecture

Property Hub's global layer decides what the platform can show, collect, require, and allow in each country. It should be implemented with Supabase Edge Functions as the policy boundary, not direct browser table access.

## Core Edge Functions

- `global-context`: detects country, currency, language, units, privacy regime, and available market modules.
- `country-rules`: reads country rules and returns listing, transaction, KYC, tax, and document requirements.
- `compliance-checks`: validates listing publication, offers, contracts, payments, and IoT access grants.
- `privacy-requests`: handles consent, data export, deletion, and cookie preferences.
- `payments-router`: selects gateways, calculates taxes, stores escrow state, and records provider handoffs.
- `legal-documents`: generates contracts, stores legal documents, and manages e-signature status.
- `identity-verification`: manages KYC, agency licenses, and trust scoring.
- `localization`: returns language, RTL, units, and local real estate terminology.
- `data-residency`: maps country and user data class to the allowed storage region.

## Suggested Tables

### Country And Compliance

- `countries`
- `country_rule_profiles`
- `country_listing_rules`
- `country_transaction_rules`
- `country_document_requirements`
- `country_tax_rules`
- `country_ownership_restrictions`
- `regulatory_workflows`
- `regulatory_workflow_steps`
- `compliance_checks`
- `compliance_audit_events`

### Privacy

- `privacy_regimes`
- `user_consents`
- `cookie_preferences`
- `data_export_requests`
- `data_deletion_requests`
- `data_processing_logs`

### Payments And Currency

- `currencies`
- `exchange_rates`
- `payment_providers`
- `payment_provider_country_rules`
- `payment_intents`
- `escrow_accounts`
- `escrow_events`
- `tax_calculations`

### Legal

- `legal_templates`
- `legal_documents`
- `signature_requests`
- `signature_events`
- `document_vault_items`

### Identity And Trust

- `kyc_profiles`
- `identity_documents`
- `face_verification_checks`
- `license_verifications`
- `trust_scores`
- `trust_score_events`

### Localization

- `locale_profiles`
- `country_terminology`
- `unit_preferences`
- `translated_content`

### Data Residency And Regions

- `deployment_regions`
- `country_region_rules`
- `data_residency_policies`
- `regional_storage_routes`

## Country Rule Profile Shape

Each country should resolve to one active profile:

```json
{
  "country_code": "GH",
  "currency": "GHS",
  "fallback_currency": "USD",
  "language": "en-GH",
  "measurement_system": "metric",
  "privacy_regime": "baseline",
  "required_listing_documents": ["land_title", "ownership_proof"],
  "required_agency_documents": ["business_registration", "tax_id"],
  "foreign_ownership": {
    "allowed": true,
    "restrictions": ["land_type_review"]
  },
  "taxes": ["stamp_duty", "property_transfer_tax"],
  "payments": ["mobile_money", "paystack", "flutterwave"],
  "legal_workflows": ["sale_agreement", "lease_agreement"],
  "data_region": "africa"
}
```

## Publication Flow

1. Browser sends listing draft to `marketplace`.
2. `marketplace` calls `country-rules` or shared policy helpers.
3. Required documents and country-specific fields are checked.
4. `compliance-checks` records pass/fail results.
5. If passed, listing status becomes `submitted` or `listed`.
6. If failed, listing remains draft with missing requirements.

## Payment Flow

1. User starts a payment or escrow action.
2. `payments-router` resolves country, currency, provider, tax rules, and escrow requirement.
3. Provider handoff is recorded in `payment_intents`.
4. Escrow events are written when funds are held, released, disputed, or refunded.
5. Audit events link payment state to listing/offer/contract records.

## Legal Flow

1. Contract request includes country, transaction type, parties, property, and deal terms.
2. `legal-documents` selects a country template.
3. Generated document is stored in the legal vault.
4. E-signature requests are created.
5. Signature events and final document hash are written to the audit trail.

## Privacy Flow

1. User consent is recorded per purpose and region.
2. Export/delete requests are created through `privacy-requests`.
3. Edge Functions validate identity and allowed scope.
4. Fulfillment events are logged for audit.

## Data Residency Rule

Every table that stores sensitive personal/legal/financial documents should carry:

- `country_code`
- `data_region`
- `retention_policy`
- `legal_basis`

The app can start with one Supabase project, but the data model should support regional project routing before EU/US expansion.

## Launch Order

1. Ghana baseline: country rules, land documents, mobile money, GHS/USD.
2. Africa expansion: Nigeria, Kenya, South Africa payment and privacy profiles.
3. EU/UK: GDPR, EPC, council tax terminology, EU data residency.
4. US: MLS, state licensing, HOA terminology, CCPA.
5. UAE: foreign ownership zones, developer approvals, service-charge terminology.
