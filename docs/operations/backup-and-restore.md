# Backup And Restore

PR8 adds production-oriented PostgreSQL backup, restore, retention, and restore drill procedures.

## Strategy

- Database backups are created with `pg_dump`.
- Backup files are timestamped as `poolproject-YYYYMMDD-HHMMSS.sql.gz` by default.
- Backups are compressed with `gzip` by default.
- The default local directory is `backups/postgres`.
- Retention defaults to `30` days.
- Backup encryption is documented as a follow-up unless storage-level encryption or an external backup vault is already provided.

Backups contain sensitive customer, order, wallet, commission, authentication, and operational data. Treat every backup file as production secret material.

## Environment

Backup:

- `BACKUP_DATABASE_URL`, preferred database URL for backup jobs
- `DATABASE_URL`, fallback database URL
- `BACKUP_DIR`, default `backups/postgres`
- `BACKUP_PREFIX`, default `poolproject`
- `BACKUP_COMPRESS`, default `true`
- `BACKUP_RETENTION_DAYS`, default `30`

Restore:

- `RESTORE_DATABASE_URL`, preferred restore target
- `DATABASE_URL`, fallback restore target
- `RESTORE_TARGET_ENV=staging|production`
- `CONFIRM_RESTORE_TARGET`, must match `RESTORE_TARGET_ENV`
- `FORCE_RESTORE=true`
- `CONFIRM_PRODUCTION_RESTORE=true`, required only for production

Restore drill:

- `DRILL_DATABASE_URL`, staging/test database URL used by the drill
- `BACKUP_DIR`
- `BACKUP_PREFIX`

Never print or paste database URLs into incident channels or logs.

## Backup

Run:

```bash
BACKUP_DATABASE_URL=postgresql://... npm run ops:backup:db
```

The script writes a sanitized summary only:

- backup file path
- size in bytes
- compression setting

It does not print database credentials.

## Retention Cleanup

Dry run:

```bash
DRY_RUN=true BACKUP_RETENTION_DAYS=30 npm run ops:backup:retention
```

Apply:

```bash
BACKUP_RETENTION_DAYS=30 npm run ops:backup:retention
```

Retention cleanup only deletes files matching the expected backup pattern:

- `poolproject-YYYYMMDD-HHMMSS.sql`
- `poolproject-YYYYMMDD-HHMMSS.sql.gz`

It does not delete arbitrary files in the backup directory.

## Restore To Staging

Use staging for routine recovery tests and before any production restore.

```bash
RESTORE_DATABASE_URL=postgresql://... \
RESTORE_TARGET_ENV=staging \
CONFIRM_RESTORE_TARGET=staging \
FORCE_RESTORE=true \
npm run ops:restore:db -- backups/postgres/poolproject-YYYYMMDD-HHMMSS.sql.gz
```

The restore script is destructive: it drops and recreates the `public` schema before loading the backup.

## Restore To Production

Production restore should be rare and should happen only after an incident commander approves the target and rollback plan.

```bash
RESTORE_DATABASE_URL=postgresql://... \
RESTORE_TARGET_ENV=production \
CONFIRM_RESTORE_TARGET=production \
FORCE_RESTORE=true \
CONFIRM_PRODUCTION_RESTORE=true \
npm run ops:restore:db -- backups/postgres/poolproject-YYYYMMDD-HHMMSS.sql.gz
```

Before production restore:

- Freeze writes or put the application in maintenance mode if available.
- Take a fresh pre-restore backup.
- Confirm the exact backup timestamp.
- Confirm expected data loss window.
- Confirm who owns customer communication.
- Confirm Redis/session invalidation expectations after restore.

After production restore:

- Run `/health/ready`.
- Run selected business smoke checks.
- Review audit logs for restore-window administrative activity.
- Keep the pre-restore backup until the incident is closed.

## Restore Drill

Run the latest-backup drill against staging/test only:

```bash
DRILL_DATABASE_URL=postgresql://... npm run ops:restore:drill
```

Restore drill checklist:

- Confirm the latest backup file is discovered.
- Restore completes without printing credentials.
- Validation query returns successfully.
- `/health/ready` is healthy after the target app points at the restored database.
- Business smoke checks cover login, catalog read, order read, wallet read, and commission read where practical.
- Record backup timestamp, restore start/end time, validation result, and any manual fixes.

Recommended frequency:

- Automated backup: at least daily.
- Retention cleanup: daily after backup.
- Restore drill: monthly before go-live, then at least quarterly.

## RPO And RTO Targets

Initial targets:

- RPO: `24 hours` with daily backups.
- RTO: `2 hours` for staging restore, `4 hours` for production restore while manual validation is required.

Tighten RPO by increasing backup frequency after production traffic and order volume justify it.

## Suggested Schedule

Cron example:

```cron
15 18 * * * cd /srv/poolproject && BACKUP_DATABASE_URL=... npm run ops:backup:db
45 18 * * * cd /srv/poolproject && BACKUP_RETENTION_DAYS=30 npm run ops:backup:retention
```

Use a service account with minimum required database privileges for backup.

## Monitoring

Alert on:

- backup job failure
- backup file missing for more than `26` hours
- backup file size unexpectedly small
- retention cleanup failure
- restore drill failure
- backup disk usage above `80%`

## Incident Procedure: Failed Backup

1. Check whether `pg_dump` is installed and available.
2. Check database reachability without printing the URL.
3. Confirm available disk space in `BACKUP_DIR`.
4. Run a manual backup with sanitized output.
5. If backup still fails, pause risky deploys and notify the incident channel.

## Follow-Up TODOs

- Add encrypted off-host backup storage.
- Add automated backup freshness monitoring once the monitoring stack exists.
- Add point-in-time recovery if production RPO must be shorter than backup frequency.
- Add a full application-level post-restore smoke suite.
