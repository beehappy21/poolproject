# UAT Referral Placement Scenario Check

Updated: 2026-05-19

## Goal

Verify the latest referral-placement runtime rule on UAT:

- before the sponsor has directs in all `LEFT / MIDDLE / RIGHT`, placement must be forced to `AUTO`
- the bootstrap phase must fill any missing top-side leg first
- after unlock, explicit `LEFT / MIDDLE / RIGHT` links must place new members into the chosen top branch
- after unlock, `AUTO` must prefer:
  - a branch with no approved-PV score first
  - otherwise the branch with the lowest approved-PV score

## Runtime Script

- [scripts/uat_referral_signup_scenarios.sh](/Users/macbook/poolproject/scripts/uat_referral_signup_scenarios.sh:1)
- raw UAT runtime log:
  - `~/poolproject/runtime/referral-signup-uat-20260519-121232.log`

## Test Method

- The public signup endpoint on UAT is in strict LINE verification mode, so this scenario suite exercised the same backend `createMember` runtime path through `PrismaMembersRepository.createMember()` inside the running API container.
- This validates the actual placement engine used by signup without depending on a live LINE id token.

## Test Sponsor

- sponsor root: `UTREFS121232`

This isolated sponsor was created under the existing root sponsor so the new downline placement logic could be tested without mutating older business members.

## Results

### 1. Bootstrap ignores explicit branch requests until all 3 top-side legs exist

Created in order:

- `UTREFS121232L1` with requested placement `RIGHT`
- `UTREFS121232M1` with requested placement `RIGHT`
- `UTREFS121232R1` with requested placement `LEFT`

Observed direct layout under sponsor:

- `UTREFS121232L1 -> LEFT`
- `UTREFS121232M1 -> MIDDLE`
- `UTREFS121232R1 -> RIGHT`

Conclusion:

- pass
- during bootstrap, runtime forced `AUTO` behavior and filled missing top-side legs in `LEFT / MIDDLE / RIGHT` order

### 2. Explicit `LEFT` after unlock

Created:

- `UTREFS121232LX` with requested placement `LEFT`

Observed:

- direct parent in the `LEFT` branch: `UTREFS121232L1`
- resolved top branch relative to sponsor: `LEFT`

Conclusion:

- pass

### 3. Explicit `MIDDLE` after unlock

Created:

- `UTREFS121232MX` with requested placement `MIDDLE`

Observed:

- direct parent in the `MIDDLE` branch: `UTREFS121232M1`
- resolved top branch relative to sponsor: `MIDDLE`

Conclusion:

- pass

### 4. Explicit `RIGHT` after unlock

Created:

- `UTREFS121232RX` with requested placement `RIGHT`

Observed:

- direct parent in the `RIGHT` branch: `UTREFS121232R1`
- resolved top branch relative to sponsor: `RIGHT`

Conclusion:

- pass

### 5. `AUTO` prefers the branch with no approved-PV score

Seed orders before this step:

- `LEFT` branch: `200 PV`
- `MIDDLE` branch: `100 PV`
- `RIGHT` branch: `0 PV`

Created:

- `UTREFS121232A0` with requested placement `AUTO`

Observed:

- resolved top branch relative to sponsor: `RIGHT`

Conclusion:

- pass
- `AUTO` picked the branch with no approved-PV score first

### 6. `AUTO` prefers the branch with the lowest approved-PV score after all branches have scores

Additional seed order:

- `RIGHT` branch: `+200 PV`

Approved-PV totals before this step:

- `LEFT = 200 PV`
- `MIDDLE = 100 PV`
- `RIGHT = 200 PV`

Created:

- `UTREFS121232A1` with requested placement `AUTO`

Observed:

- resolved top branch relative to sponsor: `MIDDLE`

Conclusion:

- pass
- `AUTO` picked the lowest approved-PV branch once every branch had a score

## Final UAT Conclusion

The latest referral-placement rule passed on UAT:

- bootstrap phase forces `AUTO`
- bootstrap fills missing `LEFT / MIDDLE / RIGHT` legs first
- explicit branch links work after unlock
- `AUTO` after unlock uses branch approved-PV score priority exactly as required
