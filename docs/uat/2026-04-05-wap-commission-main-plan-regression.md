# WAP Commission Main Plan Regression

Use this checklist for the copied WAP commission screen used by the new main commission plan.

This checklist exists to protect the copied screen from regressions without requiring further edits to the older screen.

## Screen boundary

- old screen: [Commission.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Commission.tsx)
- new copied screen: [CommissionMainPlan.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/CommissionMainPlan.tsx)
- new route: `/CommissionMainPlan`

## Approved baseline

- New work for commission display should use the copied screen only.
- The old screen should remain unchanged unless separately approved.
- Matrix round rows must stay grouped by round on mobile.
- Locked boards must remain hidden.
- Commission history, matrix payouts, and pool payouts must still render.
- The screen must still respect commission visibility settings from runtime.

## Regression checkpoints

### Route access

- Open `https://wap.blifehealthy.com/CommissionMainPlan`
- Confirm the page loads after login
- Confirm the old route `/Commission` still works and is unchanged

### Summary cards

- Cashback card loads
- Direct card loads
- Unilevel card loads
- Matrix card loads
- Pool card loads

### Matrix mobile layout

- Round rows remain separated
- `Round 2` appears below `Round 1`
- Hidden boards remain hidden
- No duplicated summary header appears above the board rows unless intentionally added in this new workstream

### Data sections

- Commission history table renders
- Matrix payout table renders
- Pool payout table renders
- Wallet totals still render

### Action behavior

- Refresh state still loads correctly
- Reentry-related actions still work only if enabled by runtime rules
- No console-breaking runtime error appears while loading the screen

## Runtime verification

1. Start the WAP stack.
2. Login with a member that already has commission and matrix data.
3. Open `/CommissionMainPlan`.
4. Compare key layout behavior with the old `/Commission` route.
5. Confirm future edits are applied only to the copied screen unless explicitly approved.
