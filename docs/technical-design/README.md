# Technical Design

Minimal design binding for the current scaffold.

Source of truth:
- [design_update_locked_decisions.md](/Users/macbook/poolproject/docs/web3-ecommerce-design/design_update_locked_decisions.md)

## Design Binding

High-level ownership in the current scaffold:
- cycle allocation: `packages/modules/commissions`
- qualification: `packages/modules/qualification`
- pool funding: `packages/modules/pool`
- wallet negative balance: `packages/modules/wallets`
- payout hold: `packages/modules/risk` and `packages/modules/wallets`
- risk flags: `packages/modules/risk`

Supporting infrastructure:
- shared Prisma provider: `packages/infrastructure/src/prisma`
- shared queue integration point: `packages/infrastructure/src/queues`
- API app shell: `apps/api`
- worker app shell: `apps/worker`

## Bonus-to-Cycle Allocation (Draft Rule)

Default draft rule:
- assign each payable bonus item to the oldest eligible active cycle first
- tie-break by lowest cycle id
- if no eligible cycle can absorb the full item, route to company fallback

Status:
- `REQUIRES BUSINESS CONFIRMATION`

## Scope Note

This file binds decisions to module boundaries only.
It does not duplicate the planning pack and does not define runtime business logic.
