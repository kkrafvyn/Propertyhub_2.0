# Ghana Regulatory Readiness Checklist For BaytMiftah

Last updated: May 18, 2026

This is an operational checklist, not legal advice. BaytMiftah should treat it as a pre-launch control list for counsel, finance, compliance, and engineering to review together before public launch or live escrow operations.

## Scope

BaytMiftah touches five regulated or sensitive areas in Ghana:

| Area | Why It Matters |
| --- | --- |
| Real estate listings and tenancy workflows | Property ads, ownership documents, tenancy documents, buyer/renter claims, and dispute handling can create consumer and fraud risk. |
| Payments and escrow-like flows | Deposits, subscriptions, refunds, payouts, and payment routing must stay within approved payment processor and banking arrangements. |
| Personal data and identity verification | Accounts, Ghana Card/TIN checks, documents, location, biometrics, messages, and fraud signals are personal data. |
| Communications | Email, SMS, WhatsApp, push, and future USSD flows need consent, opt-out, provider controls, and audit trails. |
| IoT smart property access | Lock codes, entry logs, device access, tenant keys, and revocation flows create safety, privacy, and support obligations. |

## Official Sources To Track

| Topic | Primary Source |
| --- | --- |
| Data protection | Data Protection Commission compliance guidance: https://dataprotection.org.gh/compliance/ |
| Data Protection Act | Data Protection Act, 2012, Act 843: https://dataprotection.org.gh/wp-content/uploads/2025/05/Data-Protection-Act-2012-Act-843.pdf |
| Payment systems | Bank of Ghana Payment Systems and Services Act, 2019, Act 987: https://www.bog.gov.gh/payment-systems-and-services-act-2019-act-987/ |
| Land law | Land Act, 2020, Act 1036: https://mlnr.gov.gh/wp-content/uploads/2024/07/LAND-ACT-2020-ACT-1036-1.pdf |
| AML/CFT | Anti-Money Laundering Act, 2020, Act 1044: https://fic.gov.gh/AML%20ACT%202020%20%28ACT%201044%29.pdf |
| Cybersecurity | Cyber Security Authority resources and Cybersecurity Act, 2020, Act 1038: https://www.csa.gov.gh/resources.php |
| SMS short codes | National Communications Authority numbering guidance: https://nca.org.gh/numbering/ |
| Tax identification | Ghana Revenue Authority TIN guidance: https://gra.gov.gh/tin/ |
| VAT | Ghana Revenue Authority VAT guidance: https://gra.gov.gh/domestic-tax/tax-types/vat/ |

## Launch Blockers To Resolve With Counsel

| Blocker | Required Decision |
| --- | --- |
| Legal operating model | Confirm BaytMiftah is acting as SaaS marketplace, payment facilitator through processors, escrow coordinator, agent of neither party, or another legally precise role. |
| Live deposit holding | Confirm whether deposits can be held through payment processor master account, bank account, trust/escrow account, or another approved structure. Do not hold funds outside approved processor/bank arrangements. |
| Payment processor contracts | Review Paystack, Stripe, Flutterwave, and any local PSP agreements for escrow-like use, refunds, chargebacks, payout timing, customer support, and prohibited businesses. |
| KYC/AML obligations | Confirm which user classes require identity checks, transaction monitoring, sanctions/PEP screening, suspicious activity escalation, and records retention. |
| Data controller/processor registration | Confirm Data Protection Commission registration category, data protection supervisor/DPO assignment, DPIA needs, and breach reporting process. |
| Property verification disclaimer | Confirm exact wording for title, ownership, tenancy, valuation, and agency verification disclaimers. BaytMiftah should not imply government title guarantee unless an official verification was actually performed. |
| Biometric features | Complete a DPIA and explicit consent flow before face recognition, liveness, or biometric fraud prevention goes live. |
| SMS/USSD flows | Confirm short code, VAS provider, consent, opt-out, and transactional message rules before SMS booking or marketing campaigns launch. |
| Payment plans/BNPL | Confirm whether weekly/daily payment plans, rent financing, or property BNPL require a licensed lender/fintech partner. |
| IoT access liability | Confirm terms for lock failures, wrong access code delivery, emergency access, tenant revocation, entry logs, and supported device brands. |

## Product Controls Already Present Locally

| Control | Repo Status |
| --- | --- |
| RBAC and protected workspace routes | Implemented through workspace membership and route guards. |
| Platform admin table | Implemented through `platform_admins`; admin access is not based on user-editable metadata. |
| Payment abstraction | Implemented through server-side payment helpers and gateway adapters. |
| Gateway fallback | Implemented for property checkout initialization: selected gateway first, then configured fallback gateways by currency. |
| Signed webhooks | Implemented for Paystack and Stripe through the unified webhook router; Flutterwave has its own signed webhook path. |
| Escrow state machine | Implemented locally with held, document-review, confirmation, release, dispute, refund, and cancellation flows. |
| Internal integrity log | Implemented without external chain dependencies using payload hashes, previous hashes, chain hashes, optional RSA signatures, and update/delete rejection. |
| Document gates | Implemented for escrow document upload, admin review, watermark metadata, and renter review. |
| Public receipts | Implemented as tokenized verification pages with printable receipt support. |
| Fraud/moderation foundation | Implemented through reports, review cases, admin dashboard, listing checks, and audit events. |
| Mobile/offline foundation | Implemented through mobile shell, offline queue, document scanning, and sync helpers. |
| Public map discovery controls | Implemented through live tile-map search, coordinate-verification badges, and Ghana overview fallback when precise pins are missing. |
| Smart access foundation | Implemented through provider-neutral device registry, grants, commands, audits, and revocation. |

## Controls Still Needed Before Public Launch

| Control | Owner |
| --- | --- |
| Counsel-approved Terms, Privacy Policy, escrow terms, refund policy, and marketplace disclaimers | Legal |
| DPC registration and DPIA for identity, documents, fraud scoring, AI recommendations, and biometrics | Legal/Ops |
| Production processor onboarding for Paystack, Stripe, Flutterwave, and local PSP fallback | Finance/Ops |
| Processor sandbox evidence for subscriptions, escrow collection, fallback checkout, payout, refund, dispute, and duplicate webhook handling | Engineering/Ops |
| Payment incident runbook for provider outage, duplicate charge, partial refund, payout failure, and chargeback | Finance/Ops |
| AML/KYC policy matched to the final operating model | Legal/Ops |
| Identity verification vendor selection for Ghana Card/TIN/liveness, with consent and data retention rules | Ops/Engineering |
| Official registry verification SOP for business registration, property title evidence, landlord authority, and agency mandate | Legal/Ops |
| SMS/USSD provider onboarding, short code approval, templates, STOP/opt-out handling, and message logs | Ops/Engineering |
| Security headers, production CSP, dependency monitoring, incident response plan, and vulnerability disclosure path | Engineering |
| Production backup, restore, and audit-log anchoring runbook | Engineering |
| IoT supported-device policy, device credential vaulting, emergency override process, and tenant access termination SOP | Ops/Engineering |

## Feature-Specific Compliance Notes

| Feature | Compliance Rule Of Thumb |
| --- | --- |
| Hyperlocal flood, power, water, safety, and transport scores | Publish sources and confidence level. Mark estimates clearly. Do not imply official safety certification unless sourced from an official authority. |
| Ghana Card and face verification | Use explicit consent, data minimization, vendor review, liveness/biometric DPIA, and a manual fallback for users who cannot complete biometric checks. |
| AI investment score | Treat as informational, not financial advice. Show methodology, confidence, and risk warnings. Avoid guaranteed return language. |
| Weekly or daily rent payment plans | Route through licensed partners if financing or credit is involved. Show total cost, fees, late-payment rules, and cancellation terms before payment. |
| Land Registry or Lands Commission checks | Show the exact verification source, timestamp, document/reference used, and unresolved gaps. Keep "not a title guarantee" language visible. |
| Community chats and emergency alerts | Add moderation, abuse reporting, privacy rules, and limits on sensitive accusations or personal data sharing. |
| Referral rewards | Add anti-fraud checks, eligibility rules, payout thresholds, tax treatment, and dispute handling. |
| User-generated paid content | Add contributor terms, review workflow, content ownership, takedown, and payout compliance. |
| Smart locks and unattended viewing | Time-limit codes, log issuance/revocation, show safety disclaimers, provide human fallback, and avoid exposing provider credentials in the frontend. |

## Evidence Folder Checklist

Before launch, keep these documents in a controlled internal folder:

| Evidence | Status |
| --- | --- |
| Company registration and organisational TIN evidence | Pending |
| Data Protection Commission registration/certificate | Pending |
| Final Terms, Privacy Policy, Escrow Terms, Refund Policy, and Acceptable Use Policy | Pending |
| Payment processor contracts and allowed-use confirmations | Pending |
| KYC/AML policy and vendor contracts | Pending |
| DPA/DPIA records for identity, biometrics, AI, and fraud monitoring | Pending |
| Security assessment and remediation evidence | Pending |
| Processor sandbox test evidence | Pending |
| SMS/USSD approval or provider agreement | Pending |
| IoT device provider agreements and support policy | Pending |
| Incident response and breach notification runbooks | Pending |

## Engineering Guardrails

| Guardrail | Requirement |
| --- | --- |
| No secrets in frontend | Payment, identity, SMS, IoT, and RSA private keys must remain in server env/vault only. |
| No unsigned webhooks | Reject payment or identity callbacks unless provider signatures validate. |
| No user-editable authorization | Do not use user metadata for admin, org role, or verification authorization. |
| No irreversible automated decisions | Fraud, AI scores, and identity checks should allow human review and appeal. |
| No external chain dependency | Trust proof remains internal hashes, signed receipts, processor records, and official registry references. |
| No title guarantee wording | Use "verified evidence reviewed" or counsel-approved wording unless a legal title opinion exists. |
