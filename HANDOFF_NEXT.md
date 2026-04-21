Handoff Next

Updated: 2026-04-21 09:50 +07
Branch: `main`

Current Baseline

- Latest baseline commit before this round: `1c28d369`
- Commit message: `fix(receipt): add pdf handoff baseline across api bao wap`
- Push status: local changes only, not pushed yet

Current Goal

Keep the receipt flow stable on WAP while documenting the current PDF-first experiments. The receipt now works functionally, but the mobile PDF presentation is still not acceptable.

What Was Completed In This Round

- Reworked BAO receipt template to follow the company tax-invoice sample more closely.
- Embedded the receipt in an A4-oriented layout and changed BAO PDF generation from `A5` to `A4`.
- Added preview scaling logic so the HTML receipt page can shrink to fit narrower screens.
- Tried multiple mobile-fit approaches for the preview frame:
  - fixed A4 sheet size
  - `min-height` vs fixed `height`
  - centering with flex
  - centering with computed `margin-left`
  - scaling from `top center` and from `top left`
  - shrinking the sheet to the printable area after `@page` margins
- Deployed the BAO receipt updates to UAT multiple times and confirmed `poolproject-uat-bao-1` returned to `healthy` after each rebuild.

What Changed In Code

- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/OrderDocumentController.php`
  - changed BAO PDF paper size from `a5` to `a4`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/order/documents/receipt.blade.php`
  - replaced the earlier compact receipt with the new invoice-style template
  - added A4 page sizing
  - added screen-preview scaling logic
  - added frame sizing experiments for mobile

Current UAT State

- Receipt opens successfully as PDF on UAT.
- Thai text still renders correctly.
- BAO is healthy after the latest deploy.
- The current mobile result is still visually broken even after the latest scaling changes.

Important Findings From Real Device Testing

- The problem is no longer “receipt does not open”.
- The remaining problem is specifically the mobile rendering/preview of the A4 PDF-style layout.
- On real mobile Safari / in-app browser testing, the latest attempts still show the same core issues:
  - the right side of the sheet is still clipped
  - the document content still spills awkwardly toward a second page / lower section
  - scaling behavior is inconsistent between desktop preview and real mobile rendering
- This means the current strategy of forcing an A4 page and then visually shrinking it in-browser is still not robust enough for phone viewing.

What Was Tried But Did Not Solve It

1. Switching BAO PDF output from `A5` to `A4`
2. Locking the preview sheet to A4 width/height
3. Using `min-height` instead of fixed height
4. Centering with flex on the outer frame
5. Centering with explicit `margin-left` after scale
6. Shrinking the visual sheet to the printable area after page margins

Recommended Next Step

Do not continue spending time tuning the current “A4 sheet scaled down for mobile preview” approach unless there is a strong business reason to keep it.

Best next options:

- Option A: keep PDF for export/print only, and restore a mobile-first HTML receipt view for WAP
- Option B: if PDF-first is mandatory, redesign the PDF specifically for narrow mobile reading instead of shrinking a desktop/A4 invoice

My recommendation is Option A.

Why:

- real-device testing keeps failing in the same way
- browser PDF/viewer behavior on phones is too inconsistent
- WAP’s main use case is on phones, so HTML-first is the safer UX

Useful UAT Commands

```bash
ssh nc-user@202.94.169.245
cd /home/nc-user/poolproject
docker compose -f deploy/compose/docker-compose.yml build bao
docker compose -f deploy/compose/docker-compose.yml up -d bao
docker ps --format 'table {{.Names}}\t{{.Status}}'
docker logs --tail 200 poolproject-uat-bao-1
```

Useful Notes About UAT

- UAT source tree is not a git checkout.
- Files were copied directly to:
  - `/home/nc-user/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/OrderDocumentController.php`
  - `/home/nc-user/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/order/documents/receipt.blade.php`
- One backup created during this round:
  - `/home/nc-user/poolproject/backups/receipt-hotfix-20260421-092750`

Files To Start With Next Time

- `HANDOFF_NEXT.md`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/app/Http/Controllers/Platform/OrderDocumentController.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/backend/resources/views/order/documents/receipt.blade.php`
- `stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/OrderHistory.tsx`

Current Recommendation To The Next Person

Treat the current commit as a documented experiment checkpoint, not as a finished UX solution.
