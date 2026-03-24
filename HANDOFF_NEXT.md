# Project Handoff

Updated: 2026-03-24

## Current State

- Current branch: `main`
- Local `main` is synced with `origin/main`
- Latest merged PR: `#28`
- Latest merged commit on `main`: `a07a5e5`
- Working tree was clean when this handoff was prepared

Main local URLs:

- Stephub app: `http://127.0.0.1:3002`
- BAO admin: `http://127.0.0.1:8001/admin`
- API health: `http://127.0.0.1:3000/health`

Default local-start flow:

1. Run `npm run dev:up`
2. If ports/watchers look stale, run `npm run dev:restart`
3. Run `npm run dev:check`

Use this flow before reviewing UI regressions. It now brings up the app, BAO, API, DB, and seed data with the least manual setup.

## Latest Merged PRs

- PR #26: `Extend product-first storefront order flow`
- PR #27: `Restore Stephub home and product design`
- PR #28: `feat: align signup sponsor flow and popup onboarding with BAO`
  - https://github.com/beehappy21/poolproject/pull/28
  - merged into `main` as `a07a5e5`

## What PR #28 Added

Referral and signup:

- referral link generation now follows BAO `sponsorCode` behavior
- invalid `sponsorCode` now returns a clear Thai error:
  - `รหัสผู้แนะนำไม่ถูกต้อง`
- referral link now defaults to the real app URL:
  - `http://127.0.0.1:3002/SignUp?sponsorCode=...`

Signup popup and onboarding:

- signup creates a real member from `sponsorCode`
- popup shows generated `memberCode` and password
- popup now includes:
  - share action
  - change-password action
- new password is enforced at minimum 6 characters in UI and backend
- after popup, member continues to `Personal info`

Profile and member-facing onboarding:

- `Personal info` now works as the post-signup onboarding page
- member can update:
  - first name
  - last name
  - email
  - phone
- shipping addresses can now be added from `Personal info`
- profile screen shows referral link above personal info
- referral row is compact:
  - link
  - `C` button for copy
  - share icon button
- profile header now prefers member avatar and falls back to company logo

Commission / team UI:

- `Profile` links now point to:
  - `ทีมงาน / Team member`
  - `คอมมิชชั่น / Commission`
- `Team member` loads direct downline first, then lazy-loads deeper levels on click
- `Commission` has dashboard-first layout and placeholder/detail navigation for:
  - cashback
  - direct
  - unilevel
  - matrix
  - pool
- `SW Reentry` toggle state uses green/red button styling
- transfer/withdraw member flows have their own screens

BAO / settings:

- BAO can now manage commission app visibility settings
- BAO can now manage signup share-message text
- shared signup message is editable in BAO
- generated member code and password remain system-filled and are not BAO-editable

Local reliability:

- added standard local scripts:
  - [dev-up.sh](/Users/macbook/poolproject/scripts/dev-up.sh)
  - [dev-restart.sh](/Users/macbook/poolproject/scripts/dev-restart.sh)
  - [dev-check.sh](/Users/macbook/poolproject/scripts/dev-check.sh)
- Home now distinguishes:
  - true empty state
  - backend/data load failure
- API CORS was updated for local app ports used in current flow

## Important Files

Handoff-critical backend/API files:

- [main.ts](/Users/macbook/poolproject/apps/api/src/main.ts)
- [api.config.ts](/Users/macbook/poolproject/apps/api/src/config/api.config.ts)
- [admin-settings.controller.ts](/Users/macbook/poolproject/apps/api/src/admin-settings.controller.ts)
- [request.util.ts](/Users/macbook/poolproject/apps/api/src/http/request.util.ts)
- [auth.controller.ts](/Users/macbook/poolproject/packages/modules/auth/src/controllers/auth.controller.ts)
- [auth.repository.ts](/Users/macbook/poolproject/packages/modules/auth/src/repositories/auth.repository.ts)
- [auth.service.ts](/Users/macbook/poolproject/packages/modules/auth/src/services/auth.service.ts)
- [members.controller.ts](/Users/macbook/poolproject/packages/modules/members/src/controllers/members.controller.ts)
- [members.service.ts](/Users/macbook/poolproject/packages/modules/members/src/services/members.service.ts)
- [members.repository.ts](/Users/macbook/poolproject/packages/modules/members/src/repositories/members.repository.ts)
- [commission-settings.util.ts](/Users/macbook/poolproject/packages/shared/utils/src/commission-settings.util.ts)
- [signup-share-settings.util.ts](/Users/macbook/poolproject/packages/shared/utils/src/signup-share-settings.util.ts)
- [withdraw-request.util.ts](/Users/macbook/poolproject/packages/shared/utils/src/withdraw-request.util.ts)

Handoff-critical Stephub app files:

- [index.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/config/index.tsx)
- [BottomTabBar.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/navigation/BottomTabBar.tsx)
- [StackNavigator.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/navigation/StackNavigator.tsx)
- [SignIn.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/SignIn.tsx)
- [SignUp.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/SignUp.tsx)
- [EditProfile.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/EditProfile.tsx)
- [TeamMember.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/TeamMember.tsx)
- [Commission.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/Commission.tsx)
- [TransferSW.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/TransferSW.tsx)
- [WithdrawSW.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/WithdrawSW.tsx)
- [Home.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/tabs/Home.tsx)
- [Profile.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/tabs/Profile.tsx)

Handoff-critical BAO files:

- [CommissionSettingsController.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/CommissionSettingsController.php)
- [CommissionSettingsScreen.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Orchid/Screens/Commission/CommissionSettingsScreen.php)
- [PoolprojectSettingsStore.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Support/PoolprojectSettingsStore.php)
- [settings.blade.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/commission/settings.blade.php)
- [platform.php](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/routes/platform.php)

## What Was Verified

Build and local verification already done during PR #28 work:

- `npm run lint`
- `npm run build`
- Stephub app build
- real signup through `sponsorCode`
- invalid sponsor error behavior
- auto-login after signup
- password change flow
- login with changed password
- personal-info update
- shipping-address creation

Known verified local example:

- `TH0000013` works as the default sponsor/reference member in current local testing

## Current Product Direction

The next session should focus on:

1. UI polish on `Profile`, `Team member`, and `Commission`
2. deeper BAO-backed data wiring for those screens
3. keeping storefront stable while profile/member/commission work continues

For current priorities, treat `Shop` as lower priority than `Profile`, because current direction is member-facing UI and BAO-connected member tools first.

## Recommended Next Steps

Priority 1: Profile polish and BAO data wiring

- continue refining `Profile` layout
- make avatar/company-logo sourcing configurable from BAO instead of relying on a fallback asset
- confirm the referral/share row styling on real mobile sizes
- verify `Personal info` edit/save flow against real member data after fresh login

Priority 2: Team member UI

- refine tree styling to match the target reference more closely
- add clearer expand/collapse affordances
- confirm all downline data is coming from BAO-backed member data, not fallback assumptions

Priority 3: Commission UI first, data second

- keep current dashboard layout as the base
- continue UI polish first
- after UI is approved, wire real BAO/API totals for:
  - cashback
  - direct
  - unilevel
  - matrix
  - pool
- `Top leader` is currently a UI placeholder and still needs real ranking data
- `SW Reentry` still needs real backend action if the product decision is to make the toggle persist and lock funds server-side
- withdraw admin reporting still needs a BAO-facing review/export surface if this becomes production-facing

Priority 4: Signup/Referral production hardening

- decide whether popup credential sharing should also support richer mobile-native share behavior beyond current browser fallback
- verify signup popup and `Personal info` flow on mobile viewport
- verify whether address entry needs province/district/postcode structure instead of a single freeform line

## Quick Smoke Tests For The Next Session

1. Run `npm run dev:up`
2. Run `npm run dev:check`
3. Open `http://127.0.0.1:3002`
4. Sign in with a real member code
   - for local dev impersonation, `a1a1a1` still works in non-production
5. Open `Profile`
   - verify referral row
   - verify avatar/logo fallback
   - verify Team member / Commission entry points
6. Open `Team member`
   - verify root shows direct referrals first
   - expand one member and confirm next layer loads
7. Open `Commission`
   - verify dashboard cards
   - verify menu visibility matches BAO settings
8. Open BAO settings
   - verify commission app-visibility toggles
   - verify signup share-message settings

## Notes

- `app` should default to Stephub in future discussion
- BAO paths live under `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend`
- if the app looks empty again, first verify API/BAO health before assuming the latest UI was lost
- if you want this handoff tracked, commit `HANDOFF_NEXT.md` on the next PR
