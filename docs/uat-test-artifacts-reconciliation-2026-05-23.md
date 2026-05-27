# UAT Test Artifact Reconciliation 2026-05-23

## Summary

- `local` and `UAT` are currently aligned for runtime transaction cleanup.
- The remaining mismatch is master data caused by test artifacts.
- The member mismatch comes from `UAT` test members only.
- The catalog mismatch comes from `local` test catalog only.

## Current Counts

- Members
  - `local`: `210`
  - `UAT`: `267`
  - difference: `57` extra test members on `UAT`
- Products
  - `local`: `8`
  - `UAT`: `6`
  - difference: `2` extra test products on `local`
- ProductDetails
  - `local`: `9`
  - `UAT`: `7`
  - difference: `2` extra test product details on `local`
- Packages
  - `local`: `3`
  - `UAT`: `1`
  - difference: `2` extra test packages on `local`

## Test Members Present Only On UAT

### PV / Cycle-Cap Scenario Members (`44`)

- `UTPV100A-135251`
- `UTPV100A-135422`
- `UTPV100A-140522`
- `UTPV100A-154503`
- `UTPV100A-154548`
- `UTPV100A-154659`
- `UTPV200A-135251`
- `UTPV200A-135422`
- `UTPV200A-140522`
- `UTPV200A-154503`
- `UTPV200A-154548`
- `UTPV200A-154659`
- `UTPV200P100-135251`
- `UTPV200P100-135422`
- `UTPV200P100-140522`
- `UTPV200P100-154503`
- `UTPV200P100-154548`
- `UTPV200P100-154659`
- `UTPV2X100-135251`
- `UTPV2X100-135422`
- `UTPV2X100-140522`
- `UTPV2X100-154503`
- `UTPV2X100-154548`
- `UTPV2X100-154659`
- `UTPVPCHD-140522`
- `UTPVPCHD-154503`
- `UTPVPCHD-154548`
- `UTPVPCHD-154659`
- `UTPVPROMO-140522`
- `UTPVPROMO-154503`
- `UTPVPROMO-154548`
- `UTPVPROMO-154659`
- `UTPVRC100-154503`
- `UTPVRC100-154548`
- `UTPVRC100-154659`
- `UTPVRC200-154503`
- `UTPVRC200-154548`
- `UTPVRC200-154659`
- `UTPVRE100-154503`
- `UTPVRE100-154548`
- `UTPVRE100-154659`
- `UTPVRE200-154503`
- `UTPVRE200-154548`
- `UTPVRE200-154659`

### Referral / Placement Scenario Members (`13`)

- `UTREFS121129`
- `UTREFS121129L1`
- `UTREFS121129M1`
- `UTREFS121129R1`
- `UTREFS121232`
- `UTREFS121232A0`
- `UTREFS121232A1`
- `UTREFS121232L1`
- `UTREFS121232LX`
- `UTREFS121232M1`
- `UTREFS121232MX`
- `UTREFS121232R1`
- `UTREFS121232RX`

## Test Catalog Present Only On Local

### Products (`2`)

- `COMMTESTPROD`
- `COMMTESTPROD650`

### ProductDetails (`2`)

- `COMMTEST1000`
- `COMMTEST650`

### Packages (`2`)

- `COMMTESTPKG1000`
- `COMMTESTPKG650`

## Why They Differ

- `UAT` still keeps scenario-generated members created by:
  - [scripts/uat_pv_cycle_cap_scenarios.sh](/Users/macbook/poolproject/scripts/uat_pv_cycle_cap_scenarios.sh:266)
  - [scripts/uat_referral_signup_scenarios.sh](/Users/macbook/poolproject/scripts/uat_referral_signup_scenarios.sh:296)
- `local` still keeps test catalog used by baseline and promotion smoke flows:
  - [scripts/sql/upsert_commtest_catalog.sql](/Users/macbook/poolproject/scripts/sql/upsert_commtest_catalog.sql:4)
  - [scripts/seed_member003_test_baseline.js](/Users/macbook/poolproject/scripts/seed_member003_test_baseline.js:26)

## Prepared Cleanup Direction

- Remove the `57` `UTPV*` / `UTREFS*` members from `UAT`
- Remove or ignore the `COMMTEST*` catalog on `local`, depending on whether local smoke scripts still need it

## Will Local And UAT Match After Cleanup?

- If you remove only the `57` test members from `UAT`:
  - member counts will match
  - catalog counts will still not match
- If you also remove the `COMMTEST*` catalog from `local`:
  - `members`, `products`, `productDetails`, and `packages` will match by count and by key set

## Important Caveat

- This check compared key sets and counts only:
  - `memberCode`
  - `Product.code`
  - `ProductDetail.code`
  - `Package.code`
- Shared rows may still differ in non-key business fields and should be field-diffed separately before any final sync sign-off.
