# Postgres Backup and Restore

CircuitFlow stores users, sessions, projects, and LangGraph checkpoints in Postgres when `DATABASE_URL` is configured. Application code cannot guarantee a provider’s backup retention policy, so production operators must enable managed backups or run the repository scripts from a trusted scheduler.

## Backup

Run the following from a machine with the PostgreSQL client tools installed:

```bash
DATABASE_URL='postgresql://...' BACKUP_DIR=/secure/circuitflow-backups RETENTION_DAYS=14 ./scripts/backup-postgres.sh
```

The script creates a custom-format dump and a SHA-256 sidecar, uses restrictive file permissions, and deletes local files older than the configured retention window. Store the resulting files in encrypted, access-controlled storage. Do not commit the `backups/` directory or print `DATABASE_URL` in logs.

A practical production schedule is daily backups, with one weekly copy retained off-provider and periodic restore tests into a non-production database.

## Restore

Restore is intentionally destructive and requires an explicit confirmation:

```bash
DATABASE_URL='postgresql://target...' \
BACKUP_FILE=/secure/circuitflow-backups/circuitflow-20261028T000000Z.dump \
CONFIRM_RESTORE=YES ./scripts/restore-postgres.sh
```

Before restoring, stop or drain design-run traffic and confirm the target database. After restoring, verify `/health`, `/ready`, `/api/agents/status`, authentication, project listing, one project reload, and one small design smoke test. Keep the previous Render deployment available for rollback until these checks pass.

## Current limitation

The repository provides the backup and restore tooling, but it does not create a provider-side schedule automatically. Render’s managed Postgres plan, an external cron runner, or a cloud scheduler must be configured separately according to the required retention and recovery-point objectives.
