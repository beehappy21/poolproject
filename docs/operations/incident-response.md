# Incident Response Runbook

Use this runbook during production incidents. Keep updates short, factual, and timestamped. Never paste secrets, tokens, database URLs, Redis URLs, session tokens, LINE tokens, cookies, or base64 uploads into incident notes.

## API Down

- Detection: uptime alert, `/health/live` failure, load balancer 5xx.
- Immediate action: confirm process status and recent deploy/config changes.
- Diagnosis: check app logs, container status, port binding, CPU, memory, and reverse proxy logs.
- Containment: rollback the app if the issue correlates with a deploy.
- Recovery: restart or redeploy the known-good version, then run smoke tests.
- Follow-up: add the missing alert, test, or runbook step that would have caught it earlier.

## Database Down

- Detection: `/health/ready` database check fails, Prisma connection errors, query failures.
- Immediate action: pause deploys and avoid destructive maintenance.
- Diagnosis: verify DB host availability, credentials, network, pool exhaustion, and disk.
- Containment: reduce traffic if needed and protect write paths.
- Recovery: restore DB service, validate with readiness and business smoke checks.
- Follow-up: review DB monitoring, backup freshness, and connection pool settings.

## Redis Down

- Detection: `/health/ready` Redis check fails, session/rate-limit errors.
- Immediate action: keep production in fail-safe mode; do not switch to in-memory fallback.
- Diagnosis: check Redis availability, credentials, network, memory, and eviction.
- Containment: communicate login/session impact and rate-limit behavior.
- Recovery: restore Redis, confirm sessions/rate limits work, and run smoke tests.
- Follow-up: review Redis monitoring, persistence, and capacity.

## Login Failures Spike

- Detection: audit events, auth failure metrics, customer reports.
- Immediate action: confirm whether failures are legitimate traffic, brute force, or a release regression.
- Diagnosis: inspect sanitized audit logs by request id, IP hash, and outcome.
- Containment: keep brute-force protections enabled and avoid revealing account existence.
- Recovery: fix config or rollback if a release caused the spike.
- Follow-up: review alert thresholds and auth UX.

## Brute-Force Locks Spike

- Detection: lock audit events increase sharply.
- Immediate action: confirm affected identifiers and IP hashes without exposing PII.
- Diagnosis: compare traffic sources, login identifiers, and rate-limit events.
- Containment: block abusive network sources upstream if needed.
- Recovery: keep locks until the attack subsides; only manually unlock with owner approval.
- Follow-up: adjust thresholds only after evidence review.

## Rate Limits Spike

- Detection: rate-limit exceeded audit events or customer reports.
- Immediate action: identify affected route profile and IP hashes.
- Diagnosis: compare normal traffic, bot traffic, deploy changes, and route classification.
- Containment: tune upstream controls or temporarily increase limits only with approval.
- Recovery: confirm legitimate users can complete critical flows.
- Follow-up: document route profile changes and add tests if classification was wrong.

## Audit Log Write Failures

- Detection: sanitized console warnings, readiness degradation if configured, disk alerts.
- Immediate action: check disk, permissions, and audit log directory.
- Diagnosis: inspect file rotation settings and retained file count.
- Containment: free disk space or restore permissions without deleting required evidence.
- Recovery: confirm audit events write as JSONL and rotation resumes.
- Follow-up: prioritize centralized log shipping.

## Disk Full Or Log Growth

- Detection: disk alert, write failures, audit rotation warnings.
- Immediate action: stop nonessential writes and identify large files.
- Diagnosis: inspect audit logs, backup directories, app logs, and runtime artifacts.
- Containment: archive or remove only safe, approved files.
- Recovery: restore disk headroom and verify app health.
- Follow-up: adjust retention, monitoring, and log shipping.

## Suspected Secret Leak

- Detection: gitleaks finding, accidental paste, suspicious access, exposed env file.
- Immediate action: treat the secret as compromised.
- Diagnosis: identify scope, systems touched, and last known safe rotation time.
- Containment: revoke and rotate the secret immediately.
- Recovery: redeploy with new secret and verify dependent services.
- Follow-up: audit access logs, update allowlists only for fake examples, and document rotation.

## Backup Failure

- Detection: failed backup job, missing backup file, retention or restore drill failure.
- Immediate action: do not run risky deploys until backup health is restored.
- Diagnosis: check `pg_dump`, credentials, disk, permissions, and network.
- Containment: take a manual backup if possible.
- Recovery: run backup and restore drill validation.
- Follow-up: improve backup alerting and schedule reliability.

## Bad Deployment

- Detection: errors begin after deploy, smoke checks fail, customer impact starts.
- Immediate action: freeze additional changes and assign rollback owner.
- Diagnosis: compare deploy diff, config changes, migrations, and logs.
- Containment: rollback app or config according to `rollback-runbook.md`.
- Recovery: run production smoke tests and watch the first 30-60 minutes.
- Follow-up: add a regression test or preflight check.

## Data Corruption Or Mistaken Admin Action

- Detection: business report, inconsistent order/wallet/commission data, audit event review.
- Immediate action: stop the affected workflow if continuing would worsen damage.
- Diagnosis: identify affected records, actor, timestamp, and source action.
- Containment: disable or restrict the risky operation if needed.
- Recovery: prefer targeted data repair over full restore when possible. Full restore requires owner approval and RPO acceptance.
- Follow-up: expand business audit coverage and add approval controls where needed.
