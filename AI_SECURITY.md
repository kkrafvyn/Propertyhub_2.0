# BaytMiftah AI Security

## Allowed model

AI receives untrusted user/external content as data, not instructions. System policy, authorization, tool definitions, and tool output remain separate.

## Tool execution

AI actions must use explicit allowlisted tools such as search property, draft message, summarize lease, schedule inspection, or create ticket. Each tool must independently check authenticated user, organization, role, permission, resource, and action, then write an audit event.

## High-risk actions

Refunds, bank-account changes, privilege changes, contract/eviction actions, bulk exports, and material financial changes require recommendation -> human approval -> execution -> audit.

## Data minimization

Redact unnecessary PII and confidential financial data before external LLM calls. Configure provider retention and document consent/processing terms.

## Current gap

The Edge Function boundary and product-level AI guidance exist, but a complete allowlist, prompt-injection regression suite, PII redaction proof, and complete action audit coverage are not yet verified.
