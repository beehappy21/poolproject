# Phase 1 Service Review

Date: 2026-04-06

Scope:
- `packages/modules/orders/src/services/orders.service.ts`
- `packages/modules/orders/src/repositories/orders.repository.ts`
- `packages/modules/wallets/src/repositories/wallets.repository.ts`
- `packages/modules/matrix/src/services/matrix.service.ts`
- `packages/modules/pool/src/services/pool.service.ts`
- `prisma/schema.prisma`

## Findings

### 1. High: approved-order cancellation reverses only stock and selected wallet effects

Evidence:
- `canCancelOrderStatus()` allows cancellation while an order is still `APPROVED` as long as it is not shipped or delivered.
- `PrismaOrdersRepository.cancelOrder()` restores stock and reverses selected wallet transactions, then marks the order `CANCELLED` and `VOIDED`.
- `OrdersService.handleApprovedOrder()` triggers commission, matrix, pool funding, and wallet credit side effects during approval.
- No matching reversal flow was found in `commissions`, `matrix`, or `pool` modules.

Impact:
- An approved order can be voided while commission, matrix, or pool side effects remain posted.
- Financial and qualification state can diverge from the final order state.

Key references:
- `packages/modules/orders/src/repositories/orders.repository.ts:110`
- `packages/modules/orders/src/repositories/orders.repository.ts:2251`
- `packages/modules/orders/src/services/orders.service.ts:570`

### 2. High: wallet posting idempotency is not enforced by the database

Evidence:
- `recordWalletPosting()` checks for an existing posted transaction before opening its write transaction.
- The balance update and transaction insert happen later inside a separate transaction.
- `WalletTransaction` has indexes but no unique constraint covering the logical idempotency key.

Impact:
- Concurrent workers can both miss the pre-check and post the same wallet effect twice.
- This can produce double credit or double debit under retries or multi-instance execution.

Key references:
- `packages/modules/wallets/src/repositories/wallets.repository.ts:360`
- `prisma/schema.prisma:939`

### 3. High: approved-order orchestration has no durable lock or cross-service consistency boundary

Evidence:
- `handleApprovedOrder()` performs commission, matrix, pool, and wallet side effects sequentially across multiple services.
- `withApprovedOrderLock()` uses an in-memory map, which only protects a single process.
- The retry branch uses existing commission rows as a proxy for partial completion and still reruns matrix and wallet side effects.

Impact:
- A crash or retry between steps can leave the order half-processed.
- Another worker or process can repeat downstream effects because the lock is not shared.

Key references:
- `packages/modules/orders/src/services/orders.service.ts:570`
- `packages/modules/orders/src/services/orders.service.ts:600`
- `packages/modules/orders/src/services/orders.service.ts:666`

### 4. High: matrix source handling has race windows around carry PV accumulation and reset

Evidence:
- `handleApprovedOrderMatrixSource()` uses `hasAccumulationForOrder()` as a guard, then performs carry PV updates, qualification checks, cycle creation, and a later reset of personal PV.
- These operations are not wrapped in one transaction.
- `MatrixAccumulationEvent` has no uniqueness constraint tied to source order identity.

Impact:
- Concurrent approved orders for the same user can double-consume carry PV, miss carry PV, or create duplicated accumulation events.
- Matrix state can drift from the actual approved-order history.

Key references:
- `packages/modules/matrix/src/services/matrix.service.ts:176`
- `packages/modules/matrix/src/services/matrix.service.ts:199`
- `packages/modules/matrix/src/services/matrix.service.ts:231`
- `prisma/schema.prisma:1206`

### 5. Medium: matrix auto-order audit deduplication is application-only

Evidence:
- `createMatrixAutoOrderAuditOrder()` uses `approvalBatchRef` and `findFirst()` to detect an existing audit order before creating a new one.
- `Order.approvalBatchRef` is not unique in the schema.

Impact:
- Parallel triggers for the same matrix event can still create duplicate audit orders.
- The current guard is best-effort only.

Key references:
- `packages/modules/orders/src/repositories/orders.repository.ts:1918`
- `prisma/schema.prisma:741`

## Deferred Recommendations

Keep these for the next hardening pass:

1. Add database-enforced idempotency keys.
   - Wallet postings: unique logical key for `(userId, txType, refType, refId, status)` or an equivalent immutable business key.
   - Matrix accumulation: unique protection for order-derived source events.
   - Matrix auto-order audit: unique constraint on `approvalBatchRef` if that is the intended dedupe key.

2. Define a strict cancellation policy for approved orders.
   - Either fully reverse commission, matrix, pool, and wallet side effects.
   - Or disallow cancellation after approval and require a separate exceptional reversal workflow.

3. Replace process-local approval locking with a durable orchestration boundary.
   - Examples: database lock per order, step ledger, outbox, or resumable job state machine.

4. Add concurrency-focused tests.
   - Duplicate approval processing for the same order.
   - Concurrent wallet posting for the same reference.
   - Concurrent matrix approvals for the same source user.

## Notes

- This was a static code review only.
- No runtime load or concurrency test was executed in this pass.
