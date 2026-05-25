# Audit Logging

PR6 standardizes API audit logging around structured JSONL events with safe redaction and bounded file writes.

## Event Schema

Audit events include:

- `timestamp`
- `eventType`
- `actorType`, `actorId`, `memberCode`, `role`
- `ipHash` and `ipMasked`
- `requestId`
- `route` and `method`
- `targetType` and `targetId`
- `outcome`: `success`, `failure`, `denied`, `limited`, or `locked`
- `reason` or `code`
- redacted `metadata`

Optional values may be `null` when the request context is not available.

## Redaction Policy

Audit metadata is deeply redacted before it is written. Sensitive key names are matched case-insensitively, including password fields, tokens, auth headers, cookies, LINE tokens, internal tokens, Redis/database URLs, HMAC secrets, and base64 upload fields.

Do not log raw request bodies by default. Add only targeted metadata that is needed for investigation, and never include passwords, bearer tokens, cookies, LINE ID/access tokens, internal tokens, or base64 file contents.

## Log Rotation

The default sink writes append-only JSONL to `logs/audit.jsonl`. File rotation is size-based and retains a bounded number of files, including the active log file.

Production configuration:

- `AUDIT_LOG_ENABLED=true`
- `AUDIT_LOG_DIR=logs`
- `AUDIT_LOG_FILE=audit.jsonl`
- `AUDIT_LOG_MAX_BYTES=10485760`
- `AUDIT_LOG_MAX_FILES=5`
- `AUDIT_LOG_CONSOLE=false`

If audit file writes fail, the app emits a sanitized console warning and continues business flow. This avoids turning temporary disk/log-volume issues into customer-facing API failures.

## Integrated Events

The centralized logger is used for:

- API mutation request audit entries
- login success
- login failure
- login lock and lock-hit events
- logout and logout-all
- rate-limit exceeded events
- rate-limit store failure on sensitive routes
- selected wallet/topup/withdraw/KYC admin actions

## Operations Notes

Local file audit logging is acceptable only with rotation and secure host-level retention. Follow-up monitoring should ship audit JSONL to centralized log storage with alerting for repeated `failure`, `denied`, `limited`, and `locked` outcomes.

## Follow-Up TODOs

- Expand business audit coverage across admin member management, orders, commissions, pool configuration, and package/product changes.
- Add centralized log shipping and alerting in the monitoring PR.
- Review whether request ids should be propagated to downstream BAO/worker calls.
