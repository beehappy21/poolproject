# Commission Main Implementation Plan

Updated: 2026-04-05

This is the lean implementation breakdown for the new main commission rollout.

## Rule

- use the new main plan spec as the primary source of truth
- continue new WAP work only in [CommissionMainPlan.tsx](/Users/macbook/poolproject/stephub-shoes-store-app-with-backend-2024-08-07-09-39-19-utc/stephub/src/screens/CommissionMainPlan.tsx)
- continue new BAO report work only in the copied main-plan report files
- do not change older commission screens or older BAO report files unless explicitly approved

## Phase 1. Read and display readiness

- main plan spec finalized
- test plan prepared
- WAP screen copied
- BAO report scaffold copied
- smoke route checks prepared

## Phase 2. Runtime read model

- add or adapt read queries for approved-only commission state
- expose reversal and negative balance detail
- expose matrix overlap display and single-count payout explanation

## Phase 3. BAO main-plan report

- wire copied BAO screen to its own route
- keep copied view isolated from the old report page
- add main-plan specific summary text and filters

## Phase 4. WAP main-plan screen

- adapt copied WAP screen to new payload sections
- show approved-order basis
- show negative balance traceability
- show matrix board progression for the new rules

## Phase 5. Validation

- run direct, pool, and matrix smoke checks
- run BAO main-plan page smoke
- run WAP route smoke
- run mobile regression checklist on the copied route
