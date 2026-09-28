# BaytMiftah Legal Coverage Matrix

This document tracks the major legal and compliance risk areas covered by the BaytMiftah legal framework. The intent is to keep technical controls, public policy, operational procedures, and jurisdiction overlays aligned without implying global legal certainty.

## Status legend

- not_started
- informational_only
- partially_implemented
- implemented_unverified
- counsel_review_required
- production_ready

## Coverage summary

| id | category | risk | public policy | status | counsel review |
| --- | --- | --- | --- | --- | --- |
| minor-capacity | account eligibility | legal capacity and age restrictions | age-minor-protection | implemented_unverified | required |
| biometric-processing | identity & KYC | document and biometric data handling | biometric-identity-data | implemented_unverified | required |
| tenant-screening | screening & decision support | applicant and tenant screening | tenant-screening | partially_implemented | required |
| ai-decision-support | AI oversight | AI recommendations and high-impact decisions | ai-automated-decisions | partially_implemented | required |
| marketing-consent | communications | marketing and communications consent | communications-marketing | partially_implemented | required |
| privacy-rights | privacy | rights requests and deletion controls | privacy-rights | implemented_unverified | required |
| data-retention | data governance | retention and legal holds | data-retention | partially_implemented | required |
| smart-access | physical security | visitor passes and smart-access control | smart-access-security | partially_implemented | required |
| developer-API | integration | API misuse and downstream handling | developer-api-terms | partially_implemented | required |
| valuation-estimates | market intelligence | valuation and yield disclaimers | valuation-disclaimer | partially_implemented | required |

## Core policy bundle notes

- The public legal structure remains a framework, not a certificate of legal compliance.
- Jurisdiction-specific addenda are stored in the legal catalog and should be reviewed before production expansion.
- Transaction-specific disclosures, evidence recording, and code controls must remain aligned with the public policy language.
- Any material policy change should trigger a legal version bump and re-acceptance where the product demands new consent or disclosure.

## Jurisdiction status

The default jurisdiction registry intentionally does not say every market is globally production-ready. The main statuses are:

- Ghana: production-ready baseline, with deployment-specific review still recommended for certain workflows
- Nigeria, US, EU, GB, UAE, CA, AU, IN: counsel_review_required
- Kenya and South Africa: informational_only

## Implementation notes

The legal-policies catalogue is structured to support:

1. public legal policies
2. transaction-specific disclosures
3. consent/acceptance evidence
4. server-side enforcement
5. internal operating procedures
6. jurisdiction-specific addenda

This is a technical and policy framework, not a worldwide legal compliance certification.
