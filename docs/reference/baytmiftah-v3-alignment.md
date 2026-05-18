# BaytMiftah V3 Alignment

BaytMiftah is the permanent product name. The v3 real estate operating system specification is being used as the feature direction for BaytMiftah, a Ghana-first real estate operating system with four product pillars:

- Subscription SaaS workspace for agencies, landlords, and developers.
- Public marketplace for renters and buyers.
- Paystack-backed escrow with document gates and admin arbitration.
- Internal receipt/document integrity with SHA-256 hashes and admin audit logs.

The current codebase already contains a large portion of the operational platform. This document lines up the v3 specification with what exists today and adds the IoT access module while preserving BaytMiftah as the app name.

## Current App Fit

| V3 Module | Current Fit | Notes |
| --- | --- | --- |
| A. Authentication and Accounts | Phase 1 complete | Email auth, password reset, protected routes, 2FA verification, workspace RBAC, current session visibility, MFA status, and global remote logout are in place. |
| B. Organization Enrollment and SaaS Billing | Phase 1 complete | Organization onboarding, tier selection, Paystack subscription checkout, activation gating, invoices/history, grace/suspension states, and billing recovery screens are wired. |
| C. Agent Enrollment and Team Management | Phase 1 complete | Email invites, invite acceptance, role changes, roster, removal, pending invitations, and subscription seat-limit enforcement are implemented. |
| D. Listing Management | Phase 2 complete | Workspace listing creation, editing, media, visibility/status control, archive workflow, duplicate detection, and active listing cap enforcement are implemented. Phase 3 document gates remain separate. |
| E. Lead and Inquiry Management | Phase 2 complete | Public inquiries, auto-assignment, manager reassignment, lead status, internal workflow notes, lead timelines, reminders, and source tracking are covered in the workspace flow. |
| F. Viewing Workflow | Phase 2 complete | Viewing requests, approval/rejection, calendar, confirmations, status/outcome logging, rescheduling state, reminders infrastructure, and no-show tracking are implemented. |
| G. Messaging System | Phase 2 complete | Supabase-backed message threads, shared inboxes, unread state, organization assignment/takeover, notifications, and thread history are wired. |
| H. Escrow and Transaction Management | Phase 3 foundation started | Successful deposit/booking payments now create Paystack escrow records, document gates, admin review, payer confirmation, dispute, release, cancellation, refund, and hash-chained audit events. Production still needs live Paystack recipient setup per agency. |
| I. Public Marketplace | Phase 2 complete | Browse, advanced search including amenities, detail pages, save/favorite, agency profiles, share, reports, recently viewed behavior, buyer requests, projects, reviews, and sold records are available. |
| J. Notifications | Phase 2 complete | In-app notifications, email/push infrastructure, workspace alerts, admin alerts, billing notices, viewing reminders, and user preferences are wired for the Phase 1/2 flows. |
| K. Analytics and Reporting | Phase 2 complete | Workspace dashboard, listing performance, agent metrics, inquiry funnel signals, admin MRR/org/listing metrics, date filtering foundations, and reports are present. |
| L. Trust and Verification | Phase 3 foundation started | Organization verification, listing reports, moderation, suspension, fraud logs, escrow document hash verification, release/refund proof hashes, and internal audit events are implemented without external chain dependencies. |
| M. Document Management | Phase 3 foundation started | Private organization documents, versioning, signing, access controls, user/application docs, receipts, escrow document upload, admin review, rejection, approval, and SHA-256 verification records are wired. |
| N. Admin Panel | Phase 3 foundation started | Admin access uses `platform_admins`; overview, org verification/suspension, users, listings, fraud triage, escrow document review, dispute release/refund actions, billing status, roster, and audit feed are real screens. |

## Product Cleanup Priorities

1. Preserve BaytMiftah as the app name across UI, docs, email text, mobile shell, receipts, and notification copy.
2. Remove or hide post-MVP expansion surfaces until they are intentionally part of the roadmap.
3. Make Phase 1 the default workspace experience: organization onboarding, team, billing, verification, and admin baseline.
4. Keep property payments and Paystack escrow connected: successful deposits and booking fees become held escrow records with document gates and admin arbitration.
5. Remove external chain verification from the product entirely. Payments remain Paystack-based, and verification uses internal hashes/audit logs only.

## IoT Module O: Smart Property Access

IoT is a post-escrow operational layer that lets an owner, landlord, agency owner, or authorized manager grant a marketplace user access to smart systems in a specific property. It should be treated as a controlled access workflow, not a general smart-home dashboard.

Recommended phase: POST or Phase 4, after Phase 3 escrow is stable.

Reason: IoT access depends on verified identity, clear tenancy or viewing context, audit logging, and revocation. It should not ship before the trust and payment flow is reliable.

### IoT User Story

An owner, agency, or landlord opens a property in the workspace, selects connected devices, and grants a renter, buyer, tenant, guest, agent, or vendor temporary or ongoing access. The user receives access in their account and mobile app. Every grant, use, failed attempt, and revocation is logged.

### IoT Access Roles

| Actor | Can Do |
| --- | --- |
| Organization Owner | Register property devices, grant access, revoke access, view all logs, manage provider integration. |
| Manager | Grant and revoke access for assigned organization properties, view logs. |
| Agent | Request or grant limited access only when assigned to the listing or lead, depending on org policy. |
| Landlord | Grant access for properties they own or manage. |
| Tenant / Marketplace User | Use granted access within allowed time windows and device permissions. |
| Vendor | Use temporary maintenance access for assigned jobs only. |
| Platform Admin | View audit logs, freeze IoT access during disputes or security investigations. |

### IoT Device Types

| Device Type | MVP Access Mode |
| --- | --- |
| Smart lock | Temporary unlock, recurring tenant access, revoke immediately. |
| Gate access | Temporary entry code or remote open permission. |
| Smart meter | Read-only meter readings for tenant, landlord, or agency. |
| Camera | Avoid live camera control in MVP. Only allow access status, install record, or admin audit metadata unless legal review approves more. |
| Utility switch | Post-MVP. High risk because it can affect habitability and safety. |
| Intercom | Post-MVP. Useful but provider-specific. |

### IoT Feature Map

| # | Feature | Detail | Phase |
| --- | --- | --- | --- |
| O01 | Property IoT device registry | Owner/manager links devices to a property with device type, provider, serial, room/location, and status. | POST |
| O02 | Provider integration settings | Organization stores provider metadata and API status. Secrets stay server-side only. | POST |
| O03 | Access grant creation | Owner/manager grants access to a user for selected devices, time window, and permission scope. | POST |
| O04 | Temporary viewing access | Agent/manager grants one-time access for an approved viewing time window. | POST |
| O05 | Tenant access after escrow release | Access can be granted after funds are released or tenancy docs are approved. | POST |
| O06 | Vendor maintenance access | Vendor receives temporary smart lock or gate access tied to an aftercare job. | POST |
| O07 | User access wallet | Marketplace user sees active property access in `/app`, with device names, expiry, and access status. | POST |
| O08 | Mobile unlock flow | Mobile app unlock command requires app lock or fresh auth before sensitive actions. | POST |
| O09 | Access revocation | Owner/manager/admin can revoke access immediately. User is notified. | POST |
| O10 | Access schedule and expiry | Grants auto-expire at end date/time. Expired grants cannot trigger devices. | POST |
| O11 | Access audit log | Records grant, revoke, unlock, failed unlock, provider error, and expired events. | POST |
| O12 | Dispute freeze | Admin can freeze all IoT access for a property during dispute or investigation. | POST |
| O13 | Emergency lockout flag | Organization can disable all non-owner access for a property. | POST |
| O14 | Offline fallback note | App shows provider offline state and human support path. It must not promise unlock when provider is unreachable. | POST |

### How IoT Lines Up With Existing Code

| Existing System | IoT Use |
| --- | --- |
| `properties` | Each IoT device belongs to one property. |
| `listings` | Viewing access can be tied to a listing and scheduled viewing. |
| `organizations` | Provider settings and device ownership are organization-scoped. |
| `organization_members` | Owner, manager, and agent roles control who can grant or revoke access. |
| `deal_cases` | Tenant or buyer access can be tied to a deal/application context. |
| `property_viewings` | Temporary access can be scoped to confirmed viewing time windows. |
| `property_transactions` and future escrow ledger | Tenant handoff access can be gated by escrow release or admin approval. |
| `organization_documents` | Tenancy agreement or handoff docs can be required before access is enabled. |
| `maintenance_assignments` | Vendor access can be tied to aftercare and maintenance jobs. |
| `mobile_devices` and app lock | Sensitive unlock actions can require current mobile device identity and fresh local unlock. |
| `communicationService` | Notify users when access is granted, revoked, expiring, or blocked. |
| `analytics_events` and admin audit logs | Every grant and device action should be auditable. |

### Recommended Data Model

Tables to add when IoT moves into implementation:

- `property_iot_devices`: device registry per property.
- `property_iot_provider_connections`: organization-level provider connection status, no public secrets.
- `property_iot_access_grants`: who can access which property/devices, when, and why.
- `property_iot_access_events`: immutable event log for grants, revokes, device actions, provider errors, and expiries.
- `property_iot_access_requests`: optional workflow for a user, agent, or vendor to request access before approval.

Important RLS rules:

- Organization owners and managers can manage devices for their organization.
- Agents can only see or request access for assigned listings, leads, or viewings unless granted wider permission.
- Marketplace users can only see their own active and historical grants.
- Vendors can only see access tied to their assigned maintenance job.
- Admin service-role functions handle provider commands and write access events.

### IoT Product Rules

- Do not expose provider API keys or lock secrets to the browser.
- Do not store reusable raw door codes in public tables.
- Every device command must write an event row, whether it succeeds or fails.
- Every grant must have an explicit reason: viewing, tenancy, maintenance, owner, admin, or emergency.
- Camera access should be excluded from the first IoT release unless legal review approves it.
- A revoked or expired grant must fail closed.
- During an escrow dispute, only owner/admin emergency access remains active.

## IoT First Screen Placement

Workspace:

- Add `Smart Access` under workspace essentials once IoT starts.
- Property detail inside workspace should show device count, active grants, and last event.
- Aftercare should be able to create vendor access from a maintenance request.

User Dashboard:

- Add `Smart Access` under `/app/access`.
- Show active property access, expiry, last use, and support contact.
- Sensitive actions should route through mobile app lock or fresh auth.

Admin:

- Add IoT audit and freeze controls under `/admin/moderation` or `/admin/access`.
- During disputes, admins can freeze access per property, escrow, or user.

## Immediate Next Build Order

1. Phase 1 cleanup: keep BaytMiftah branding, hide nonessential expansion pages, finish subscription billing model.
2. Phase 2 cleanup: polish marketplace, leads, viewing, messaging, and listing moderation.
3. Phase 3 cleanup: convert payments into Paystack escrow with document gate, admin dispute tools, and internal audit records.
4. Phase 4 IoT: add smart property access after tenancy/viewing/escrow rules are stable.
