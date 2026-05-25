# Special Commission Privilege Cycle

Date:

- 2026-05-19

Purpose:

- allow admin to grant a member one special receivable commission cycle without creating a real order
- keep the grant auditable and visible in BAO

Business rule:

- the admin grant opens one additional cycle only
- the granted cycle behaves like a normal runtime `MemberPackageCycle`
- commission calculation still follows the normal cycle-selection and cap-allocation flow
- if the member already has an older receivable active cycle, the granted cycle is queued behind it

Supported grant types:

- `SPECIAL_100_PV`
  - `accumulatedPv = 100`
  - `earningCap = 5000`
  - `purchaseBase = 650`
  - `cycleCapTier = BELOW_200_PV`
- `SPECIAL_200_PV`
  - `accumulatedPv = 200`
  - `earningCap = 10000`
  - `purchaseBase = 1000`
  - `cycleCapTier = AT_LEAST_200_PV`

Implementation:

- runtime creation happens through `MembersService.grantSpecialCommissionCycle()`
- BAO uses internal endpoint:
  - `POST /internal/bao/members/special-commission-cycle`
- the grant is stored in:
  - `SpecialCommissionCycleGrant`
- BAO menu:
  - `Commission Report > สิทธิ์พิเศษ`

Audit fields stored:

- target member
- linked cycle id
- cycle number
- grant code
- granted PV
- purchase base
- earning cap
- reason
- note
- granted-by admin name/email
- activated timestamp

Notes:

- this feature does not fabricate an order
- the member becomes eligible through the granted cycle itself
- the grant history exists so operators can later explain why a member received commission without a self-purchase order
