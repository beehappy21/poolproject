# Decision Log

Minimal implementation-facing decision log for the current scaffold.

Source of truth:
- [design_update_locked_decisions.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/design_update_locked_decisions.md)

## Locked Decisions

### DL-01 Multiple Active Cycles
- A member may have multiple active package cycles at the same time.
- Member-level active means at least one receivable active cycle exists.
- Earning cap and earned total remain per-cycle.

### DL-02 Pool Funding Source
- Daily pool fund uses PV from approved orders only.

### DL-03 Pool Eligibility
- Pool eligibility requires:
  - member is active
  - member has at least 2 active direct referrals
- Same-day contribution is not required.

### DL-04 Approved Order Finality
- Approved orders are final in normal business flow.
- No normal refund path exists after approval.

### DL-05 Exceptional Reversal Negative Balance
- Exceptional post-approval reversal may create negative member wallet balance.
- Future earnings offset that negative balance.

### DL-06 Full-Block Earning Cap
- If a bonus item would exceed the assigned cycle cap, block the full item.
- Do not split partial payout.
- Blocked amount goes to company fallback.

### DL-07 Security and Anti-Abuse Expansion
- The platform design includes:
  - wallet binding history
  - wallet rebind controls
  - risk flags
  - payout hold and release workflow
  - manual review workflow
  - audit logs for financial and security-sensitive actions

## Scaffold Binding Note

These decisions are bound at scaffold level only.
Business logic is not implemented yet.
