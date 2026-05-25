# UAT Grace Locked Dashboard Demo

Date:

- 2026-05-19

Purpose:

- prove what the member-facing `Commission` page shows after the round threshold is reached and commission becomes held during the `3`-day grace window
- confirm the new dashboard field `commissionRoundProgress.lockedDuringGraceAmount` is populated from runtime data on UAT

Runtime:

- `dailyCommissionCapAmount = 10000`
- `buybackThresholdAmount = 10000`
- `buybackRepurchasePv = 0`
- `buybackGraceDays = 3`

Members:

- parent: `UTPVLOCK-134839`
- child: `UTPVLOCKC-134839`

Timeline:

1. `2026-05-17 10:10 +07`
   - parent bought `COMMTEST1000`
   - order `0000268`
2. `2026-05-17 10:11 +07`
   - child bought `COMMTEST1000 x50`
   - order `0000269`
   - parent received `5000` direct commission
3. `2026-05-18 10:11 +07`
   - child bought `COMMTEST1000 x50`
   - order `0000270`
   - parent reached round threshold `10000`
   - parent moved into `HELD_PENDING_REPURCHASE`
   - wallet posting for the new `5000` was marked `holdRequired: true`
4. `2026-05-19 10:11 +07`
   - child bought `COMMTEST1000 x25`
   - order `0000271`
   - dashboard was fetched while the parent was still inside grace and before repurchase

Observed dashboard payload:

- `commissionRoundProgress.amount = 10000`
- `commissionRoundProgress.threshold = 10000`
- `commissionRoundProgress.completed = true`
- `commissionRoundProgress.thresholdReachedAt = 2026-05-18T03:11:00.000Z`
- `commissionRoundProgress.graceExpiresAt = 2026-05-21T03:11:00.000Z`
- `commissionRoundProgress.lockedDuringGraceAmount = 5000`

Observed wallet state:

- `approvedBalance = 10000`
- `heldBalance = 5000`
- `withdrawableBalance = 5000`

Observed held commission breakdown:

- `DIRECT | HELD | HELD_PENDING_REPURCHASE | 5000.00000000`

What the WAP page should show from this payload:

- `ครบรอบแล้ว ซื้อซ้ำใน 2 วัน`
- `ยอดล็อกระหว่างรอ 5,000 บาท`

Conclusion:

- UAT runtime now exposes the held grace amount correctly through `GET /auth/dashboard`
- the member can see the round is completed and can also see the locked commission waiting for repurchase
- the locked amount remains informational until qualifying repurchase releases it; it does not become the opening accumulated amount of the next round

Artifacts:

- server-side run log: `~/poolproject/runtime/grace-locked-dashboard-uat-20260519-134839.log`
- helper script: [scripts/uat_grace_locked_dashboard_demo.sh](/Users/macbook/poolproject/scripts/uat_grace_locked_dashboard_demo.sh)
