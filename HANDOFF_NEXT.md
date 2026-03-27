# Project Handoff

Updated: 2026-03-27

## Current State

- Current workspace: `/Users/macbook/poolproject`
- App URL: `http://127.0.0.1:3002`
- BAO URL: `http://127.0.0.1:8001/admin`
- API health: `http://127.0.0.1:3000/health`
- This handoff reflects the latest local wallet work after the recent BAO/app merges

## What We Finished This Round

BAO / admin:

- Added a left-sidebar `Wallet` dropdown menu in BAO
- Added sub menu:
  - `Wallet Top-up Requests`
  - `Top Up Wallet`
- Added BAO screens for:
  - wallet top-up request list
  - wallet top-up request detail
  - manual wallet top-up by admin
- Added slip review view inside BAO wallet request detail
- Fixed BAO wallet menu visibility so superadmin can see the wallet menu in the sidebar
- Fixed BAO manual top-up default payment method to use a real allowed method:
  - `manual_bank`

App:

- Added member-facing `TopupWallet` screen
- Added profile menu entry:
  - `เติม Wallet / Top up wallet`
- Added route/export wiring for `TopupWallet`
- Added top-up request history display in app
- Added current shopping-wallet balance display in app top-up screen
- Added auto-refresh of wallet-related data when the app regains focus
- Added a prominent `ยอด SW ทั้งหมด` summary block on the `Commission` page
- Made the `SW` tile and the new summary block navigate to `TopupWallet`

API / shared behavior:

- Extended wallet top-up slip input to accept `data:image/...` in addition to normal URL input
- This now matches the same practical pattern we already use in KYC-style image flows

## Important Files Touched

Backend / BAO:

- [PlatformProvider.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/PlatformProvider.php)
- [AdminPermissions.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/AdminPermissions.php)
- [platform.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/routes/platform.php)
- [WalletTopupRequest.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Models/WalletTopupRequest.php)
- [BaoAdminApiClient.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/BaoAdminApiClient.php)
- [WalletTopupRequestListScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Wallet/WalletTopupRequestListScreen.php)
- [WalletTopupRequestDetailScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Wallet/WalletTopupRequestDetailScreen.php)
- [WalletManualTopupScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Wallet/WalletManualTopupScreen.php)
- [topup-detail-images.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/wallet/topup-detail-images.blade.php)
- [topup-report-summary.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/wallet/topup-report-summary.blade.php)

App:

- [TopupWallet.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/TopupWallet.tsx)
- [Commission.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Commission.tsx)
- [Profile.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/tabs/Profile.tsx)
- [StackNavigator.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/navigation/StackNavigator.tsx)
- [index.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/index.tsx)
- [index.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/config/index.tsx)

API:

- [auth.controller.ts](/Users/macbook/poolproject/packages/modules/auth/src/controllers/auth.controller.ts)
- [wallets.controller.ts](/Users/macbook/poolproject/packages/modules/wallets/src/controllers/wallets.controller.ts)

## What Was Verified

- `php -l` passed on the new/edited BAO wallet PHP files
- `npm run build` passed for the Stephub app after the wallet UI changes
- `npm run build` passed at repo root for the API side when the wallet slip handling was updated
- BAO sidebar now shows the `Wallet` dropdown locally
- BAO manual wallet top-up was tested and then fixed so it can top up successfully using an allowed payment method

## Current Product Status

The wallet slice is now functional enough to continue from UI polish instead of backend scaffolding:

- admin can top up wallet from BAO
- admin can review wallet top-up requests and slips in BAO
- member can open wallet top-up in app
- member can submit a top-up request with slip
- app now surfaces SW more clearly on the `Commission` screen

## Next Session Priority

Primary next step:

- continue designing and polishing the app wallet experience

Specifically, come back to the app and keep working on wallet UI:

1. improve the `TopupWallet` page layout and visual hierarchy
2. decide whether `Commission` should remain the main SW summary screen or whether wallet needs its own dedicated dashboard page
3. improve wallet terminology consistency across:
   - `SW`
   - `Top up wallet`
   - `TransferSW`
   - `WithdrawSW`
4. refine how approved top-ups appear to the member:
   - clearer approved/rejected state
   - clearer balance-change feedback
5. decide whether `Withdrawals` should also move under the BAO `Wallet` section for cleaner admin grouping
6. optionally add more wallet summary blocks in app:
   - available SW
   - pending top-up amount
   - last approved top-up

## Good Restart Checklist

1. Run `npm run dev:up`
2. Run `npm run dev:check`
3. Open BAO at `http://127.0.0.1:8001/admin`
4. Open app at `http://127.0.0.1:3002`
5. Check BAO wallet menu:
   - `Wallet`
   - `Wallet Top-up Requests`
   - `Top Up Wallet`
6. Check app wallet pages:
   - `Commission`
   - `TopupWallet`
   - `TransferSW`
   - `WithdrawSW`

## Notes

- For future discussion, `app` should still default to Stephub unless stated otherwise
- The next meaningful slice is not backend plumbing anymore; it is wallet UI/UX polish in the app
- If this handoff is meant to persist, include [HANDOFF_NEXT.md](/Users/macbook/poolproject/HANDOFF_NEXT.md) in the next wallet PR
