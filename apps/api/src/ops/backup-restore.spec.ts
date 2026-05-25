import assert from "node:assert/strict";
import { accessSync, constants, readFileSync } from "node:fs";
import test from "node:test";

const scripts = [
  "scripts/ops/db-backup.sh",
  "scripts/ops/db-restore.sh",
  "scripts/ops/db-backup-retention.sh",
  "scripts/ops/db-restore-drill.sh",
];

test("backup and restore scripts exist and are executable", () => {
  for (const script of scripts) {
    accessSync(script, constants.X_OK);
  }
});

test("scripts do not print database URLs or enable shell tracing", () => {
  for (const script of scripts) {
    const source = readFileSync(script, "utf8");

    assert.doesNotMatch(source, /set -x/);
    assert.doesNotMatch(source, /echo\s+["']?\$[{]?(DATABASE_URL|BACKUP_DATABASE_URL|RESTORE_DATABASE_URL|DRILL_DATABASE_URL)/);
    assert.doesNotMatch(source, /printf\s+["'][^"']*%s[^"']*["']\s+["']?\$[{]?(DATABASE_URL|BACKUP_DATABASE_URL|RESTORE_DATABASE_URL|DRILL_DATABASE_URL)/);
  }
});

test("retention cleanup is bounded to expected backup filename pattern", () => {
  const source = readFileSync("scripts/ops/db-backup-retention.sh", "utf8");

  assert.match(source, /BACKUP_PREFIX-\?\?\?\?\?\?\?\?-\?\?\?\?\?\?\.sql/);
  assert.match(source, /find "\$BACKUP_DIR" -type f/);
  assert.match(source, /rm -f -- "\$file"/);
  assert.doesNotMatch(source, /rm -rf/);
});

test("restore requires explicit target confirmation", () => {
  const source = readFileSync("scripts/ops/db-restore.sh", "utf8");

  assert.match(source, /RESTORE_TARGET_ENV/);
  assert.match(source, /CONFIRM_RESTORE_TARGET/);
  assert.match(source, /FORCE_RESTORE/);
  assert.match(source, /CONFIRM_PRODUCTION_RESTORE/);
  assert.match(source, /drop schema if exists public cascade/);
});

test("package scripts expose backup restore retention and drill commands", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

  assert.equal(packageJson.scripts["ops:backup:db"], "bash scripts/ops/db-backup.sh");
  assert.equal(packageJson.scripts["ops:restore:db"], "bash scripts/ops/db-restore.sh");
  assert.equal(packageJson.scripts["ops:backup:retention"], "bash scripts/ops/db-backup-retention.sh");
  assert.equal(packageJson.scripts["ops:restore:drill"], "bash scripts/ops/db-restore-drill.sh");
});

test("backup documentation covers restore drill and RPO RTO", () => {
  const source = readFileSync("docs/operations/backup-and-restore.md", "utf8");

  assert.match(source, /restore drill/i);
  assert.match(source, /RPO/i);
  assert.match(source, /RTO/i);
  assert.match(source, /sensitive customer/i);
});
