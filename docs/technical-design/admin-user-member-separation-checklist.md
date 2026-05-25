# AdminUser / Member Separation Checklist

## Goal

- Separate BAO administrator accounts from member accounts at the root table level.
- Stop relying on `User.isAdmin` as the long-term domain split.
- Keep BAO admin auth, roles, audit logs, and admin-only screens isolated from member network data.

## Current State

- BAO administrators authenticate against Laravel/Orchid `users`.
- Business members, sponsor tree, wallets, orders, and commissions still use the shared business `User` model in Prisma.
- Several BAO screens still read member data directly from the business `User` table.
- Reset scripts and maintenance flows still treat `User.isAdmin = true` as the divider.
- As of `2026-05-23`, BAO `superadmin` can manage admin `username` and set admin passwords from the `Admins` screen, but dashboard login still authenticates by `email + password`.

## Latest Implementation Snapshot

- admin credential management landed in BAO local code:
  - `username` column added to Laravel/Orchid `users`
  - `superadmin` can edit admin `username`
  - `superadmin` can set admin password directly from the admin edit screen
- this is a tactical improvement for BAO admin operations, not the final `AdminUser` domain split
- current auth is intentionally unchanged to reduce risk during ongoing promotion/UAT work
- next architectural work should not assume that `username` login already exists

## Decisions To Lock First

- Confirm `AdminUser` and `Member` become separate top-level entities.
- Confirm sponsor tree belongs only to `Member`.
- Confirm BAO auth remains on its own admin account table and never joins the member network tree.
- Confirm audit fields that represent a backoffice actor move to `adminUserId`.
- Confirm shared login is not required during the cutover. If it is, define an explicit bridge such as `AuthIdentity`.

## Discovery Checklist

- Inventory every module that reads or writes `User.isAdmin`.
- Inventory every table with a foreign key to the member-side `User`.
- Inventory every BAO screen that edits members through the shared `User` table.
- Inventory scripts, seeds, imports, and resets that assume admin and member still live together.
- Inventory auth payloads and DTOs that expose `isAdmin`.

## Target Schema Checklist

- Add `AdminUser` for BAO administrators only.
- Add `Member` for network members only.
- Keep `MemberProfile` as the extension table for member business details.
- Move sponsor tree ownership to `Member.sponsorMemberId`.
- Move member runtime tables to `memberId`.
- Move admin actor references such as audit logs and approvals to `adminUserId`.
- Define whether any bridge table is needed for shared authentication or legacy references.

## Implementation Phases

### Phase 1: Compatibility Layer

- Add repository and service abstractions so new code stops querying `User.isAdmin` directly.
- Freeze new feature work from adding more mixed `User` dependencies.
- Add a verification checklist for BAO admin login, member login, order creation, and commission posting.

### Phase 2: New Tables

- Create `AdminUser`.
- Create `Member`.
- Add nullable new foreign keys in dependent tables.
- Keep legacy columns in place during this phase.

### Phase 3: Backfill

- Copy current BAO admins into `AdminUser`.
- Copy current members into `Member`.
- Backfill sponsor links to `Member.sponsorMemberId`.
- Backfill runtime tables to `memberId`.
- Backfill admin actor fields to `adminUserId`.

### Phase 4: Dual Read / Dual Write

- Write both legacy and new keys while traffic continues.
- Read from the new structure first and fallback only where needed.
- Validate order, commission, wallet, cycle-cap, KYC, and withdrawal flows during this phase.

### Phase 5: Cutover

- Switch auth and BAO admin management fully to `AdminUser`.
- Switch member APIs, WAP, sponsor tree, and commission engine fully to `Member`.
- Remove direct `User.isAdmin` checks from runtime code.

### Phase 6: Cleanup

- Remove fallback reads and legacy dual-write code.
- Drop obsolete foreign keys and columns.
- Remove scripts that still assume mixed admin/member rows.

## Verification Checklist

- BAO super admin can create, edit, disable, and rotate admin credentials.
- BAO role and permission checks still work.
- Member registration still creates only member-side records.
- Sponsor tree and genealogy queries no longer include admins.
- Order, wallet, commission, and cycle-cap flows work with only `Member` relations.
- Audit logs point to `AdminUser`.
- Local reset and seed scripts preserve only real admin accounts and member data is isolated cleanly.

## Rollback Plan

- Keep full database backups before each phase that changes schema or backfills data.
- Keep legacy foreign keys until verification passes for the full cutover.
- Roll back by toggling reads back to legacy columns before dropping any old relations.
- Do not remove `User.isAdmin` code paths until production verification is complete.

## Immediate Next Work

- Add a dependency map for every `User.isAdmin` call site.
- Decide whether BAO admin auth stays on Laravel `users` or is renamed to `admin_users`.
- Decide whether login should remain `email`-based during the migration window or move to `email or username` before the full split.
- Define the migration order for sponsor tree, orders, commissions, wallets, and audit logs.
- Prepare a dry-run migration plan for local before any UAT schema cutover.
