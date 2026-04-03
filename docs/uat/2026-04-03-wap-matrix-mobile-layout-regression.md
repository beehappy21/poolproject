# WAP Matrix Mobile Layout Regression

Use this checklist before merging any change that touches [Commission.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Commission.tsx) matrix rendering.

## Approved mobile layout

- Matrix boards are grouped by `roundNo`
- `Round 1` and `Round 2` render in separate row containers
- `B1R2` must appear on the row below `Round 1`, not inline with `Round 1`
- The cycle summary header above the round rows is hidden
  - Do not reintroduce text like `รอบ 1 / กระดาน 3 / ปัจจุบัน Board 2`
- Rows are left-aligned
- If a row has 2 visible boards, keep them left-aligned at normal card width
- If a row has 3 visible boards on mobile, the cards should fill the row width evenly
- Locked boards are hidden from the WAP matrix row layout

## Regression checkpoint

Use `TH0000013` on the UAT stack after the first-day replay checkpoint.

Expected state:
- `Round 1` row shows `Board 1` and `Board 2`
- `Round 2` row shows `Board 1`
- `Round 2` is rendered below `Round 1`
- No duplicate cycle summary header appears above the rows

## Runtime verification

1. Start the public UAT stack on the Mac server.
2. Open `https://wap.blifehealthy.com/Commission`
3. Login with `TH0000013`
4. Confirm the mobile layout matches the approved state above

## Rule

Do not change this layout based on code cleanup alone.
If business wants a different layout, update this file in the same change as the code.
