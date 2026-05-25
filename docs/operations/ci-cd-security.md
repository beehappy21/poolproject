# CI/CD Security Checks

PR9 adds GitHub Actions checks for pull requests and pushes to `main`.

## Required Checks

The workflow in `.github/workflows/ci.yml` runs:

- `npm ci`
- `npm run prisma:validate`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run security:check-env`
- `npm run ci:shell-syntax`
- `npm run ci:audit`
- gitleaks secret scanning

`npm run smoke:health` is not part of CI because it requires a running API service. Keep it as an operational smoke command for deployed or locally booted environments.

The CI runtime uses Node `16.20.2` to match the current local/runtime compatibility target. Node 18 can be evaluated later, but this PR intentionally avoids changing the runtime baseline.

## Dependency Audit Policy

Blocking gate:

- `npm run ci:audit`
- currently runs `npm audit --audit-level=critical`

Current exception:

- `npm audit --audit-level=high` currently reports existing high-severity transitive advisories in packages such as Nest/Express/Multer-related dependencies.
- Several fixes require breaking major upgrades.
- CI still runs a non-blocking high-severity audit report so the findings remain visible.
- Follow-up dependency upgrade PR should move the blocking threshold from `critical` to `high`.

Do not suppress real dependency advisories through broad allowlists.

## Secret Scanning Policy

CI runs gitleaks using `.gitleaks.toml`.

Allowed values are limited to exact fake/example values already committed for env examples and local smoke scripts. Do not add path-wide allowlists for `.env` examples or docs because that can hide real leaks.

Run locally when gitleaks is installed:

```bash
npm run ci:secrets
```

If gitleaks finds a real secret:

- Do not merge the PR.
- Remove the secret from the commit.
- Rotate the leaked credential immediately.
- Check logs and audit trails for use of the exposed credential.
- If the secret is in Git history, rewrite history or follow the repository owner’s incident procedure.

## Shell Script Checks

CI runs syntax checks for operational scripts:

```bash
npm run ci:shell-syntax
```

This covers database backup/restore scripts and the health smoke script.

## Local Verification

Run:

```bash
npm run ci:verify
npm run ci:audit
npm run ci:audit:high
npm run ci:secrets
```

Notes:

- `ci:audit:high` is expected to fail until dependency upgrade follow-up is complete.
- `ci:secrets` requires gitleaks to be installed locally.

## Branch Protection For `main`

Recommended GitHub branch protection:

- Require pull requests before merging.
- Require at least one approving review.
- Require conversation resolution before merge.
- Require status checks to pass before merge.
- Required checks: `Build, Lint, Test, Env`, `Dependency Audit`, and `Secret Scan`.
- Block force pushes to `main`.
- Block branch deletion.
- Require branches to be up to date before merge if the team uses linear history.
- Consider signed commits as optional until the team confirms signing workflow support.

## Release Notes

This PR adds CI enforcement only. It does not deploy automatically and does not create a production go-live pack.

## Follow-Up TODOs

- Upgrade vulnerable dependencies and raise the blocking audit threshold to `high`.
- Add Docker image build/scanning after deployment packaging is finalized.
- Add branch protection in GitHub repository settings after this workflow is merged.
