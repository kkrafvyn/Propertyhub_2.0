# BaytMiftah Data Retention Policy

This policy is an engineering baseline and requires Ghana counsel and customer-contract review before launch.

| Data class | Baseline retention | Handling |
|---|---:|---|
| User/account records | Account life + legal/financial hold | Delete/anonymize only after obligations and holds clear |
| Messages and tickets | 24 months after closure | Restrict by tenant and role |
| Documents and media | Contract/lifecycle period + 12 months | Private storage and signed access |
| Payments and financial records | 7 years or applicable legal period | Append-only; never silently rewrite |
| AI request/action logs | 12 months | Minimize PII; restrict access |
| Audit logs | 7 years | Append-only, privileged access |
| Security logs | 12 months | Restricted operations access |
| Backups | 35 days rolling plus approved monthly copies | Encrypted, isolated credentials |

## Legal hold

A legal hold must identify the matter, owner, data classes, affected tenant/users, start date, and release approval. Deletion jobs must exclude held records and produce an auditable result.

## Current gap

Retention enforcement, legal-hold tables, and deletion evidence are not fully implemented in the repository.
