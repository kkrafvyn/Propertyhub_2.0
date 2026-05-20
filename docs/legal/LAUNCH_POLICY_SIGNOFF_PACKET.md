# BaytMiftah Launch Policy Signoff Packet

This packet lists the legal and policy surfaces that must be reviewed before public launch. It is an operational checklist, not legal advice.

## Required Policies

| Policy | Must cover | Owner | Status |
| --- | --- | --- | --- |
| Terms of Use | Account rules, marketplace use, agency workspace use, prohibited conduct, dispute limits, disclaimers | Legal/Product | Pending counsel review |
| Privacy Notice | Personal data, property documents, messages, payments metadata, device logs, cookies, retention, user rights | Legal/Security | Pending counsel review |
| Escrow Terms | Paystack/Stripe/Flutterwave roles, hold/release/refund rules, disputes, evidence, fees, timelines | Legal/Finance/Product | Pending counsel review |
| Refund Policy | Refund eligibility, cancellation windows, dispute outcomes, provider timing, chargebacks | Legal/Finance/Ops | Pending counsel review |
| KYC/AML Model | Identity checks, thresholds, sanctions/PEP screening, suspicious activity workflow, manual review | Legal/Trust/Safety | Pending counsel review |
| Property Verification Policy | Business docs, title/ownership docs, manual checks, limits of verification, false listing penalties | Legal/Ops/Product | Pending counsel review |
| AI and Investment Disclaimer | Informational estimates only, no financial advice, confidence labels, human review for high-risk outputs | Legal/Product/Data | Pending counsel review |
| IoT Smart Access Policy | Device owner duties, tenant consent, entry logs, emergency lockout, revocation, outage fallback | Legal/Ops/Engineering | Pending counsel review |
| Communications Consent | Email/SMS/WhatsApp opt-in, opt-out, frequency, critical notices, abuse handling | Legal/Ops/Engineering | Pending counsel review |
| Contributor and Referral Terms | Eligibility, fraud holds, payout approval, tax responsibility, content rights | Legal/Finance/Product | Pending counsel review |

## Data Protection Review

| Data category | Why collected | Protection rule | Launch decision |
| --- | --- | --- | --- |
| Account identity | Authentication and support | Supabase Auth, RLS, least privilege | Pending |
| Organization documents | Verification and compliance | Private storage, admin-only review, retention limit | Pending |
| Property documents | Listing/escrow verification | Private storage, watermark for renter review, hash record | Pending |
| Payment metadata | Reconciliation and receipts | No card data stored by BaytMiftah, provider tokens only | Pending |
| Messages and inquiries | Deal coordination and audit trail | Access limited to parties/org/admin where justified | Pending |
| Device/access logs | Smart access safety and audit | Metadata only, no camera footage stored by default | Pending |
| Ghana Card/liveness data | Identity verification, if enabled | Explicit consent, DPIA, manual fallback, vendor DPA | Pending |
| AI/investment inputs | Recommendations and scoring | Confidence labels, no automated high-stakes decisioning | Pending |

## Counsel Review Questions

1. Can BaytMiftah hold escrow funds through the intended provider/account structure, or must a regulated partner/bank account hold funds?
2. What exact wording is required to avoid implying guaranteed title verification?
3. What identity/KYC threshold applies before escrow, payouts, referrals, and high-value transactions?
4. What user consent is needed for Ghana Card OCR, liveness checks, fraud screening, and device/access logs?
5. Are weekly/daily rent plans or BNPL features regulated lending or payment services?
6. What retention period should apply to documents, messages, access logs, and payment evidence?
7. What dispute resolution timeline and evidence standard should apply to escrow disputes?
8. What disclaimers are required for AI price estimates, investment scores, neighborhood risk, safety, and flood data?
9. What emergency access obligations apply to smart locks, parking gates, warehouses, and office complexes?
10. What tax/accounting treatment applies to referral rewards, contributor payouts, and escrow fees?

## Signoff Table

| Policy area | Reviewer | Approved version/link | Decision | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| Terms of Use |  |  | Approved / Blocked |  |  |
| Privacy Notice |  |  | Approved / Blocked |  |  |
| Escrow Terms |  |  | Approved / Blocked |  |  |
| Refund Policy |  |  | Approved / Blocked |  |  |
| KYC/AML Model |  |  | Approved / Blocked |  |  |
| Property Verification |  |  | Approved / Blocked |  |  |
| AI/Investment |  |  | Approved / Blocked |  |  |
| IoT Smart Access |  |  | Approved / Blocked |  |  |
| Communications Consent |  |  | Approved / Blocked |  |  |
| Referral/Contributor |  |  | Approved / Blocked |  |  |
