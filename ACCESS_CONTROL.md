# BaytMiftah Access Control

## Identity and scope

Every sensitive action must resolve: authenticated user -> organization -> role -> permission -> resource -> action. UI visibility is not authorization.

## Role boundaries

Customer organization administrators manage only their organization. BaytMiftah platform administrators are separately identified by the platform-admin boundary and must not be granted merely by customer role or frontend metadata.

## Privileged controls

Platform admin and sensitive workspace flows require MFA assurance. Sensitive changes should require reauthentication, record actor/reason/result, and support session revocation. Temporary elevation and break-glass access require identity, reason, approval where appropriate, start time, expiry, and audit evidence.

## Current implementation

Protected routes, platform-admin checks, workspace MFA gates, organization membership checks, role-based bank-feed controls, and server-side Edge Function checks exist. Complete reauthentication, break-glass, temporary elevation, and session/device administration remain incomplete.
