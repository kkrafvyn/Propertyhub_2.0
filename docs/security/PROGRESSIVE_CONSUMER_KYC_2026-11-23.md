# BaytMiftah — Progressive consumer verification

**Decision:** A consumer can create an account and use core marketplace functionality without uploading identity documents. KYC must **not** be part of the consumer signup process or an immediate onboarding modal.

## Consumer journey
1. **Register:** email/Google/Apple signup creates a regular consumer account. No identity-document prerequisite.
2. **Use immediately:** browse/search listings, view 3D tours, save properties, send enquiries and messages, and request viewings. Use ordinary abuse controls such as rate limits, reporting and blocked-user enforcement.
3. **Optional reminder:** after seven days, show a dismissible identity verification invitation on the consumer overview and wallet pages. This is a reminder only; do not lock the account based on age.
4. **Just-in-time verification:** when making formal purchase offers, entering legally binding transactions or starting market-specific bookings where KYC is configured/required, explain the exact reason and link to the verification workflow. Preserve the user's in-progress work.
5. **Pending and verified accounts:** show the accurate status. Do not claim funds are held in escrow, guarantee an approval time, or promise that KYC alone grants unlimited access.

## Workspace journey
Landlord, agent and organization workspaces are not granted at signup. Applicants enter through the workspace enrollment process, submit KYC evidence, then await a platform reviewer. Only an approved application can create a company/personal workspace and owner membership. Access for team members requires a valid organization membership.

## Authorization and risk controls
- Do not rely on user-editable Supabase `user_metadata` for roles.
- KYC status alone does not confer workspace access.
- No time-based automatic blocking: the seven-day timer is only for **an optional reminder**.
- Existing server-side jurisdictional checks for booking and transactional KYC remain authoritative. Changing legal/payment requirements requires a separate review.
- RLS, provider verification, antifraud and payment safeguards remain in place.

## Tests and release
Run `npm test` and verify with a new unverified consumer: signup → search → listing → enquiry → save → inbox must work with no KYC; workspace enrollment must still require KYC/review; regulated checkout must request verification when the applicable policy requires it. Test seven-day copy and the pending/verified states.

No production migration/deployment is performed by this change.
