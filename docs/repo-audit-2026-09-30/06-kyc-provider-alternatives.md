# KYC provider alternatives and wiring review

Date: 2026-09-30

## Finding

The Smile Identity integration performs server-side Ghana Card data checks, but it is not a complete biometric flow. The application previously displayed a simulated 99.4% liveness/facial match after a timer. No selfie was sent to Smile Identity or linked to the submission. That simulation has been removed.

Provider routing also previously used the jurisdiction selected in the browser. It now uses the `provider_engine` assigned by the server-side jurisdiction policy. AI screening is attempted separately, so a provider outage no longer prevents the manual-review pre-screen from running.

## Shortlist

| Provider | Best fit | Ghana evidence | Recommendation |
| --- | --- | --- | --- |
| Youverify | Ghana-first identity matching and African coverage | Official Ghana eIDV and Ghana Card/NIA material | Strong Ghana-first alternative; validate NIA authorization, webhook signing, retention, and sandbox results |
| Dojah | Lightweight Ghana Card API | Official Ghana Card endpoint accepts a Ghana Card ID | Strong Ghana-first alternative; confirm biometric/liveness bundle and production data-source contract |
| Sumsub | Multi-country document, liveness, AML, and case workflow | Official changelog documents Ghana non-document verification with ID number plus liveness | Preferred global fallback |
| Prembly | Embeddable web/mobile verification | Document capture, biometric/liveness, and AML; Ghana database coverage needs written confirmation | Good SDK-led alternative |
| Trulioo | Global data/document verification | Some Ghana identity sources are listed, but Ghana Card/NIA support is not explicit | Secondary candidate after written confirmation |
| Veriff | Global document plus selfie verification | General workflow documented; Ghana authoritative database coverage unconfirmed | Conditional candidate |
| Entrust/Onfido | Global document verification | Identity Enhanced country list marks Ghana unsupported | Not a primary Ghana database-backed option |

## Recommended routing

1. Run a Ghana Card proof of concept with Youverify and Dojah alongside Smile Identity.
2. Use Sumsub as the leading international document/biometric fallback candidate.
3. Keep manual compliance review as final authority for unavailable, conflicting, or low-confidence checks.
4. Never treat the internal AI document screen as conclusive identity verification.
5. Require explicit consent before biometric data is sent to a second provider during failover.

## Provider acceptance test

- Valid Ghana Card with exact and slightly mismatched names.
- Invalid, expired, or unavailable identity number.
- Replayed selfie, printed photo, screen replay, and low-light liveness attempts.
- Invalid webhook signature, duplicate callback, delayed callback, and out-of-order states.
- Provider outage and timeout without accidental approval.
- Deletion/export request, retention period, processing region, and subprocessors.
- Auditable reason codes without retaining unnecessary raw provider payloads.

## Target architecture

Implement a provider-neutral server adapter with `startVerification`, `verifyWebhook`, `normalizeResult`, and `configured` operations. Route by server-owned jurisdiction policy and required capabilities (`authoritative_id_match`, `document_authenticity`, `liveness`, `aml_screening`) instead of provider name in the browser. Store normalized decisions and reason codes; keep raw biometric material out of the primary application database when a provider-hosted flow is available.

## Sources

- [Youverify Ghana eIDV API](https://doc.youverify.co/api-reference-sdk/api-reference/quick-check/know-your-customer-services-kyc/id-data-matching-eidv/ghana)
- [Dojah Ghana Card API](https://docs.dojah.io/api-reference/individual-verification/ghana/ghana-card)
- [Sumsub supported documents and countries](https://docs.sumsub.com/docs/supported-documents-and-countries)
- [Sumsub Ghana non-document verification](https://docs.sumsub.com/changelog/june-2023)
- [Prembly React SDK](https://docs.prembly.com/docs/web-react)
- [Prembly advanced features](https://docs.prembly.com/docs/advanced-features)
- [Trulioo supported national IDs](https://developer.trulioo.com/reference/national-ids-supported-types-2)
- [Entrust/Onfido supported countries](https://documentation.onfido.com/guide/supported-applicant-countries/)
- [Veriff document and selfie verification](https://devdocs.veriff.com/docs/document-selfie-idv)
