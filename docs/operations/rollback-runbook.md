# Rollback Runbook

Rollback is a safety procedure, not a blame procedure. Prefer a controlled rollback over improvising under pressure.

## When To Roll Back

- API is unavailable after deploy and cannot be recovered quickly.
- `/health/ready` fails because of the new release.
- Login, order, wallet, or payment flows are broken.
- Error rate or latency exceeds launch thresholds.
- A security regression is found in the deployed release.
- A config mistake cannot be corrected safely in place.

## App Rollback Steps

1. Announce rollback start and assign a single coordinator.
2. Identify the previous known-good commit or production tag.
3. Deploy the previous app artifact or image.
4. Restore the previous runtime configuration if the release changed config.
5. Restart API and worker services.
6. Run `npm run smoke:production`.
7. Watch `/health/ready`, logs, and business flow checks for at least 30 minutes.

## Database Guidance

Do not blindly restore the database as part of an app rollback. Database restore is destructive and may discard real customer/order/payment data written after the backup.

Use database restore only when:

- A migration corrupted data or schema in a way that cannot be forward-fixed.
- The business owner approves the data loss window.
- The restore target, backup file, and RPO impact are explicitly confirmed.
- `docs/operations/backup-and-restore.md` restore procedures are followed.

When schema migrations are involved, prefer a forward migration or compatibility fix if it preserves production data.

## Config Rollback

- Revert only the config keys changed by the failed deploy.
- Never paste or print secret values in incident notes.
- Re-run `npm run security:check-env` after config rollback.
- Restart services only after the config file or secret store is confirmed.

## Redis And Session Considerations

- App rollback may invalidate or change session compatibility if auth/session code changed.
- Redis-backed sessions and rate-limit keys should normally remain in place.
- Do not flush Redis unless the incident owner confirms the impact on active sessions, brute-force locks, and rate-limit state.
- If Redis keys must be cleared, record the exact key prefix and reason.

## Smoke Tests After Rollback

Run:

```bash
npm run smoke:production
```

Then manually confirm member login, admin login, product/package listing, order creation, payment proof/slip handling, admin order review, and wallet flows as applicable.

## Communications Checklist

- Rollback started.
- User impact summary.
- Rollback target commit/tag.
- Database restore decision and RPO impact if applicable.
- Rollback completed.
- Smoke result.
- Monitoring status.
- Follow-up owner and next update time.

## Incident Record Checklist

- Timeline.
- Trigger and detection source.
- Root cause hypothesis.
- Rollback commands or deployment actions.
- Data impact.
- Customer impact.
- Secrets exposure assessment.
- Follow-up fixes and owners.
