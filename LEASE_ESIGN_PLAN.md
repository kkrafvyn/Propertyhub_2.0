# Lease E-Sign & Templates — Implementation Plan

**Goal:** Close the loop from jurisdiction rules → generated lease document → legally binding e-signature.

---

## Phase 1 — Document body on envelopes ✅ (this session)

| Step | Deliverable |
|------|-------------|
| DB | `document_body` + `metadata` on `esignature_requests`; RPC returns body for public signing |
| Templates | `lease-template.service.ts` — residential / commercial / short-stay presets per property jurisdiction |
| Generator | `lease-esignature.service.ts` — `prepareLeaseEnvelope()`, `sendLeaseForSigning()` |
| eSign API | `eSignatureService.createRequest({ documentBody, metadata })` |
| UI | Workspace Leases → **Send for e-signature**; Public sign page shows full clause text |
| Tests | Template build + envelope prep unit tests |

---

## Phase 2 — Document Center + audit gate ✅ (expanded)

| Step | Deliverable |
|------|-------------|
| Subdivision addenda | `subdivision-clause-addenda.ts` — 22 packs (Ejari, AST, Lagos, CA AB 1482, …) |
| Audit gate | `lease-audit-gate.ts` — min score 50, manager override |
| Document Center | `lease-document-archive.service.ts` — draft on send, signed on completion |
| Tenant portal | `tenant-esignature.service.ts` + **Sign lease online** in consumer leases |
| DocuSign hint | Metadata tab hint when `VITE_DOCUSIGN_INTEGRATION_KEY` set |

---

## Phase 3 — Commercial launch ✅

- Counsel sign-off per jurisdiction (`jurisdiction_lease_counsel_signoffs` + International Markets UI)
- Tenant portal: pending signature badge on nav + `/app/sign/:token` deep links + email/in-app notify on send
- Revenue: `revenue_jurisdiction_events` — e-sign sent/completed attributed by jurisdiction (Revenue Dashboard)
- Auto addenda for **50+ subdivisions** (curated 22 + auto-generated from overlays)
- DocuSign envelope draft builder when integration key configured

---

## Phase 4 — Reach & reminders ✅

| Step | Deliverable |
|------|-------------|
| SMS | Signing link SMS on send via `sendLeaseSigningSms` (Arkesel/Twilio edge) |
| Addenda | **44 curated** packs + auto fallback (50+ total subdivisions) |
| DocuSign API | `create-docusign-envelope` edge function — real API when `DOCUSIGN_ACCESS_TOKEN` set |
| Reminders | `reminder_count` / `last_reminder_at`; automation-dispatcher job; manual **Remind** in eSignature Hub |
| Deep links | Canonical public signing at `/sign/:token` |

---

## Phase 5 — Co-sign, PDF & WhatsApp signing ✅

| Step | Deliverable |
|------|-------------|
| Co-sign | Multi-signer envelopes (tenant → landlord); `handleLeaseSigningProgress()` notifies landlord on partial sign |
| Public sign UI | `PublicSignDocument.tsx` — signing order, partial vs completed states |
| PDF | `lease-pdf-export.service.ts` — Print / Save HTML on lease clause panel |
| WhatsApp sign | RPC `get_pending_lease_sign_for_phone`; group bot command **6** / `/bm sign` |
| Outbound WA | `send-whatsapp` edge on initial send, co-sign, manual + cron reminders |
| Group bot live data | RPCs `get_whatsapp_bot_context`, gate pass, maintenance, manager escalation |

---

## Phase 6 — Codebase complete ✅

All lease e-sign and WhatsApp bot flows are implemented in-repo. Production delivery requires provider credentials only (WhatsApp Cloud, SMS, email, DocuSign, PayAngels).

---

*BaytMiftah REOS — property rules → document → signature in one flow.*
