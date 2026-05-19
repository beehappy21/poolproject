<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class CommissionBaselineRuntimeResetter
{
    private const SOURCE_TAG = 'commission-test-baseline';
    private const TX_STATE_TABLES = [
        '"Order"',
        '"OrderItem"',
        '"MemberPackageCycle"',
        '"CommissionLedger"',
        '"CompanyBonusLedger"',
        '"DailyPoolPayout"',
        '"DailyPoolEligibilitySnapshot"',
        '"DailyPoolCycle"',
        '"DailyCommissionCapUsage"',
        '"PoolSettlementBatchItem"',
        '"PoolSettlementBatch"',
        '"TeamSettlementBatchItem"',
        '"TeamSettlementBatch"',
        '"BuybackEvent"',
        '"UserBuybackProgress"',
        '"CapLedger"',
        '"CapBucket"',
        '"MatrixAccumulationEvent"',
        '"MatrixReorder"',
        '"MatrixHoldbackAccount"',
        '"MatrixPayout"',
        '"MatrixPosition"',
        '"MatrixBoard"',
        '"MatrixCycle"',
        '"WalletTopupRequest"',
        '"WithdrawRequest"',
        '"WalletTransaction"',
        '"PayoutBatchItem"',
        '"PayoutBatch"',
        '"PayoutHold"',
    ];
    private const RESET_SEQUENCES = [
        'public."Order_id_seq"',
        'public."OrderItem_id_seq"',
        'public."CommissionLedger_id_seq"',
        'public."CompanyBonusLedger_id_seq"',
        'public."DailyPoolPayout_id_seq"',
        'public."DailyPoolEligibilitySnapshot_id_seq"',
        'public."DailyPoolCycle_id_seq"',
        'public."DailyCommissionCapUsage_id_seq"',
        'public."PoolSettlementBatch_id_seq"',
        'public."PoolSettlementBatchItem_id_seq"',
        'public."TeamSettlementBatch_id_seq"',
        'public."TeamSettlementBatchItem_id_seq"',
        'public."WalletTransaction_id_seq"',
        'public."WalletTopupRequest_id_seq"',
        'public."WithdrawRequest_id_seq"',
        'public."CapBucket_id_seq"',
        'public."CapLedger_id_seq"',
        'public."BuybackEvent_id_seq"',
        'public."UserBuybackProgress_id_seq"',
        'public."MatrixCycle_id_seq"',
        'public."MatrixBoard_id_seq"',
        'public."MatrixPosition_id_seq"',
        'public."MatrixPayout_id_seq"',
        'public."MatrixHoldbackAccount_id_seq"',
        'public."MatrixReorder_id_seq"',
        'public."MatrixAccumulationEvent_id_seq"',
        'public."PayoutBatch_id_seq"',
        'public."PayoutBatchItem_id_seq"',
        'public."PayoutHold_id_seq"',
        'public."MemberPackageCycle_id_seq"',
    ];

    /**
     * @return array{
     *   baselineOrderCount:int,
     *   affectedUserCount:int,
     *   runtimeArtifactCount:int,
     *   transactionStateCount:int,
     *   walletNeedsReset:bool,
     *   preservedUserCount:int,
     *   preservedMemberProfileCount:int,
     *   nonBaselineOrderCount:int,
     *   canReset:bool
     * }
     */
    public static function status(): array
    {
        $baselineOrders = self::loadBaselineOrders();
        $targets = self::loadTargets($baselineOrders);
        $runtimeArtifactCount = self::runtimeArtifactCount();
        $transactionStateCount = self::transactionStateCount();
        $walletNeedsReset = self::walletNeedsReset();
        $preservedUserCount = self::countRows('"User"');
        $preservedMemberProfileCount = self::countRows('"MemberProfile"');

        return [
            'baselineOrderCount' => count($targets['baselineOrderIds']),
            'affectedUserCount' => count($targets['userIds']),
            'runtimeArtifactCount' => $runtimeArtifactCount,
            'transactionStateCount' => $transactionStateCount,
            'walletNeedsReset' => $walletNeedsReset,
            'preservedUserCount' => $preservedUserCount,
            'preservedMemberProfileCount' => $preservedMemberProfileCount,
            'nonBaselineOrderCount' => count($targets['nonBaselineOrderIds']),
            'canReset' => $runtimeArtifactCount > 0
                || $transactionStateCount > 0
                || $walletNeedsReset,
        ];
    }

    /**
     * @return array{
     *   deletedBaselineOrderCount:int,
     *   affectedUserCount:int,
     *   deletedRuntimeArtifactCount:int,
     *   deletedCommissionLedgerCount:int,
     *   deletedWalletTransactionCount:int,
     *   deletedTeamSettlementBatchCount:int,
     *   deletedPoolCycleCount:int,
     *   resetWalletCount:int,
     *   resetMatrixPvUserCount:int,
     *   preservedUserCount:int,
     *   preservedMemberProfileCount:int
     * }
     */
    public static function reset(): array
    {
        $baselineOrders = self::loadBaselineOrders();
        $targets = self::loadTargets($baselineOrders);
        $deletedBaselineOrderCount = self::countRows('"Order"');
        $deletedCommissionLedgerCount = self::countRows('"CommissionLedger"');
        $deletedWalletTransactionCount = self::countRows('"WalletTransaction"');
        $deletedTeamSettlementBatchCount = self::countRows('"TeamSettlementBatch"');
        $deletedPoolCycleCount = self::countRows('"DailyPoolCycle"');
        $resetWalletCount = self::walletResetCandidateCount();
        $resetMatrixPvUserCount = self::matrixPvResetCandidateCount();
        $walletNeedsReset = self::walletNeedsReset();
        $transactionStateCount = self::transactionStateCount();
        $preservedUserCount = self::countRows('"User"');
        $preservedMemberProfileCount = self::countRows('"MemberProfile"');

        self::applyGlobalCleanup();

        $deletedRuntimeArtifactCount = self::clearRuntimeArtifacts();

        if (
            $deletedBaselineOrderCount === 0
            && $transactionStateCount === 0
            && !$walletNeedsReset
            && $deletedRuntimeArtifactCount === 0
        ) {
            throw new \RuntimeException('ไม่พบ state ของ baseline test ที่พร้อมรีเซ็ต');
        }

        return [
            'deletedBaselineOrderCount' => $deletedBaselineOrderCount,
            'affectedUserCount' => count($targets['userIds']),
            'deletedRuntimeArtifactCount' => $deletedRuntimeArtifactCount,
            'deletedCommissionLedgerCount' => $deletedCommissionLedgerCount,
            'deletedWalletTransactionCount' => $deletedWalletTransactionCount,
            'deletedTeamSettlementBatchCount' => $deletedTeamSettlementBatchCount,
            'deletedPoolCycleCount' => $deletedPoolCycleCount,
            'resetWalletCount' => $resetWalletCount,
            'resetMatrixPvUserCount' => $resetMatrixPvUserCount,
            'preservedUserCount' => $preservedUserCount,
            'preservedMemberProfileCount' => $preservedMemberProfileCount,
        ];
    }

    /**
     * @return array<int, array{orderId:string,userId:string,orderNo:string,approvedDate:?string}>
     */
    private static function loadBaselineOrders(): array
    {
        $rows = DB::connection('poolproject')->select(
            <<<'SQL'
            select
              o.id::text as order_id,
              o."userId"::text as user_id,
              o."orderNo" as order_no,
              to_char((o."approvedAt" + interval '7 hour')::date, 'YYYY-MM-DD') as approved_date
            from "Order" o
            where o."shippingAddressNote" like ?
            order by o.id asc
            SQL,
            [self::SOURCE_TAG . '|%']
        );

        return array_map(static fn (object $row): array => [
            'orderId' => (string) $row->order_id,
            'userId' => (string) $row->user_id,
            'orderNo' => (string) $row->order_no,
            'approvedDate' => $row->approved_date ? (string) $row->approved_date : null,
        ], $rows);
    }

    /**
     * @param  array<int, array{orderId:string,userId:string,orderNo:string,approvedDate:?string}>  $baselineOrders
     * @return array<string, array<int, string>>
     */
    private static function loadTargets(array $baselineOrders): array
    {
        $baselineOrderIds = self::toIdList(array_column($baselineOrders, 'orderId'));
        $userIds = self::toIdList(array_column($baselineOrders, 'userId'));
        $approvedDates = array_values(array_unique(array_filter(array_column($baselineOrders, 'approvedDate'))));

        if ($userIds === []) {
            return [
                'baselineOrderIds' => [],
                'userIds' => [],
                'approvedDates' => [],
                'nonBaselineOrderIds' => [],
                'orderIds' => [],
                'orderItemIds' => [],
                'memberPackageCycleIds' => [],
                'commissionIds' => [],
                'companyBonusIds' => [],
                'walletTransactionIds' => [],
                'walletIds' => [],
                'capBucketIds' => [],
                'capLedgerIds' => [],
                'buybackEventIds' => [],
                'userBuybackProgressIds' => [],
                'dailyPoolCycleIds' => [],
                'dailyPoolEligibilitySnapshotIds' => [],
                'dailyPoolPayoutIds' => [],
                'dailyCommissionCapUsageIds' => [],
                'teamSettlementBatchIds' => [],
                'teamSettlementBatchItemIds' => [],
                'poolSettlementBatchIds' => [],
                'poolSettlementBatchItemIds' => [],
                'matrixCycleIds' => [],
                'matrixBoardIds' => [],
                'matrixPositionIds' => [],
                'matrixPayoutIds' => [],
                'matrixAccumulationEventIds' => [],
                'matrixHoldbackAccountIds' => [],
                'matrixReorderIds' => [],
                'impactedBoardIds' => [],
                'impactedCycleIds' => [],
            ];
        }

        $userIn = self::idIn($userIds);
        $orderIds = self::loadIds('"Order"', 'id', 'where "userId" in (' . $userIn . ')');
        $nonBaselineOrderIds = array_values(array_diff($orderIds, $baselineOrderIds));
        $orderIn = self::idIn($orderIds);

        $orderItemIds = $orderIn ? self::loadIds('"OrderItem"', 'id', 'where "orderId" in (' . $orderIn . ')') : [];
        $memberPackageCycleIds = self::loadIds('"MemberPackageCycle"', 'id', 'where "userId" in (' . $userIn . ')');
        $memberPackageCycleIn = self::idIn($memberPackageCycleIds);

        $commissionIds = self::loadIds(
            '"CommissionLedger"',
            'id',
            'where "sourceUserId" in (' . $userIn . ')'
            . ' or "beneficiaryUserId" in (' . $userIn . ')'
            . ' or ' . ($orderIn ? '"orderId" in (' . $orderIn . ')' : 'false')
            . ' or ' . ($memberPackageCycleIn ? '"beneficiaryCycleId" in (' . $memberPackageCycleIn . ')' : 'false')
        );
        $commissionIn = self::idIn($commissionIds);

        $companyBonusIds = $orderIn ? self::loadIds('"CompanyBonusLedger"', 'id', 'where "sourceRefId" in (' . $orderIn . ')') : [];
        $walletTransactionIds = self::loadIds(
            '"WalletTransaction"',
            'id',
            'where "userId" in (' . $userIn . ')'
            . ($commissionIn ? ' or ("refType" = \'COMMISSION\' and "refId" in (' . $commissionIn . '))' : '')
            . ($orderIn ? ' or ("refType" = \'ORDER\' and "refId" in (' . $orderIn . '))' : '')
            . ($orderIn ? ' or ("refType" = \'order\' and "refId" in (' . $orderIn . '))' : '')
        );
        $walletIds = self::loadIds('"Wallet"', 'id', 'where "userId" in (' . $userIn . ')');

        $capBucketIds = self::loadIds(
            '"CapBucket"',
            'id',
            'where "userId" in (' . $userIn . ')'
            . ' or ' . ($orderIn ? '"sourceOrderId" in (' . $orderIn . ')' : 'false')
            . ' or ' . ($memberPackageCycleIn ? '"memberPackageCycleId" in (' . $memberPackageCycleIn . ')' : 'false')
        );
        $capBucketIn = self::idIn($capBucketIds);
        $capLedgerIds = self::loadIds(
            '"CapLedger"',
            'id',
            'where "userId" in (' . $userIn . ')'
            . ' or ' . ($capBucketIn ? '"bucketId" in (' . $capBucketIn . ')' : 'false')
            . ' or ' . ($orderIn ? '"sourceOrderId" in (' . $orderIn . ')' : 'false')
            . ' or ' . ($orderIn ? '"relatedOrderId" in (' . $orderIn . ')' : 'false')
            . ' or ' . ($commissionIn ? '"relatedCommissionLedgerId" in (' . $commissionIn . ')' : 'false')
            . ' or ' . ($memberPackageCycleIn ? '"memberPackageCycleId" in (' . $memberPackageCycleIn . ')' : 'false')
        );

        $buybackEventIds = self::loadIds(
            '"BuybackEvent"',
            'id',
            'where "userId" in (' . $userIn . ')'
            . ' or ' . ($orderIn ? '"orderId" in (' . $orderIn . ')' : 'false')
        );
        $userBuybackProgressIds = self::loadIds('"UserBuybackProgress"', 'id', 'where "userId" in (' . $userIn . ')');

        $approvedDateIn = self::dateIn($approvedDates);
        $dailyPoolCycleIds = $approvedDateIn ? self::loadIds('"DailyPoolCycle"', 'id', 'where to_char("cycleDate", \'YYYY-MM-DD\') in (' . $approvedDateIn . ')') : [];
        $dailyPoolCycleIn = self::idIn($dailyPoolCycleIds);
        $dailyPoolEligibilitySnapshotIds = $dailyPoolCycleIn ? self::loadIds('"DailyPoolEligibilitySnapshot"', 'id', 'where "cycleId" in (' . $dailyPoolCycleIn . ')') : [];
        $dailyPoolPayoutIds = self::loadIds(
            '"DailyPoolPayout"',
            'id',
            'where ' . ($dailyPoolCycleIn ? '"cycleId" in (' . $dailyPoolCycleIn . ')' : 'false')
            . ' or ' . ($commissionIn ? '"commissionLedgerId" in (' . $commissionIn . ')' : 'false')
            . ' or ' . ($memberPackageCycleIn ? '"beneficiaryCycleId" in (' . $memberPackageCycleIn . ')' : 'false')
            . ' or "userId" in (' . $userIn . ')'
        );
        $dailyCommissionCapUsageIds = $approvedDateIn ? self::loadIds('"DailyCommissionCapUsage"', 'id', 'where "userId" in (' . $userIn . ') and to_char("capDate", \'YYYY-MM-DD\') in (' . $approvedDateIn . ')') : [];
        $teamSettlementBatchIds = $approvedDateIn ? self::loadIds('"TeamSettlementBatch"', 'id', 'where to_char("settlementDate", \'YYYY-MM-DD\') in (' . $approvedDateIn . ')') : [];
        $teamSettlementBatchIn = self::idIn($teamSettlementBatchIds);
        $teamSettlementBatchItemIds = $teamSettlementBatchIn ? self::loadIds('"TeamSettlementBatchItem"', 'id', 'where "batchId" in (' . $teamSettlementBatchIn . ') or "userId" in (' . $userIn . ')') : [];
        $poolSettlementBatchIds = $approvedDateIn ? self::loadIds('"PoolSettlementBatch"', 'id', 'where to_char("settlementDate", \'YYYY-MM-DD\') in (' . $approvedDateIn . ')') : [];
        $poolSettlementBatchIn = self::idIn($poolSettlementBatchIds);
        $poolSettlementBatchItemIds = $poolSettlementBatchIn ? self::loadIds('"PoolSettlementBatchItem"', 'id', 'where "batchId" in (' . $poolSettlementBatchIn . ') or "userId" in (' . $userIn . ')') : [];

        $matrixCycleIds = self::loadIds('"MatrixCycle"', 'id', 'where "userId" in (' . $userIn . ')');
        $matrixCycleIn = self::idIn($matrixCycleIds);
        $matrixBoardIds = $matrixCycleIn ? self::loadIds('"MatrixBoard"', 'id', 'where "cycleId" in (' . $matrixCycleIn . ')') : [];
        $matrixBoardIn = self::idIn($matrixBoardIds);
        $matrixPositionIds = self::loadIds(
            '"MatrixPosition"',
            'id',
            'where "sourceUserId" in (' . $userIn . ')'
            . ' or ' . ($orderIn ? '"sourceOrderId" in (' . $orderIn . ')' : 'false')
            . ' or ' . ($matrixBoardIn ? '"boardId" in (' . $matrixBoardIn . ')' : 'false')
        );
        $matrixPayoutIds = self::loadIds(
            '"MatrixPayout"',
            'id',
            'where "sourceUserId" in (' . $userIn . ')'
            . ' or "beneficiaryUserId" in (' . $userIn . ')'
            . ' or ' . ($orderIn ? '"sourceOrderId" in (' . $orderIn . ')' : 'false')
            . ' or ' . ($matrixCycleIn ? '"cycleId" in (' . $matrixCycleIn . ')' : 'false')
            . ' or ' . ($matrixBoardIn ? '"boardId" in (' . $matrixBoardIn . ')' : 'false')
        );
        $matrixAccumulationEventIds = self::loadIds(
            '"MatrixAccumulationEvent"',
            'id',
            'where "sourceUserId" in (' . $userIn . ')'
            . ' or ' . ($orderIn ? '"sourceOrderId" in (' . $orderIn . ')' : 'false')
            . ' or ' . ($matrixCycleIn ? '"cycleId" in (' . $matrixCycleIn . ')' : 'false')
            . ' or ' . ($matrixBoardIn ? '"boardId" in (' . $matrixBoardIn . ')' : 'false')
        );
        $matrixHoldbackAccountIds = self::loadIds('"MatrixHoldbackAccount"', 'id', 'where "userId" in (' . $userIn . ')');
        $matrixHoldbackAccountIn = self::idIn($matrixHoldbackAccountIds);
        $matrixReorderIds = self::loadIds(
            '"MatrixReorder"',
            'id',
            'where "userId" in (' . $userIn . ')'
            . ' or ' . ($matrixBoardIn ? '"triggerBoardId" in (' . $matrixBoardIn . ')' : 'false')
            . ' or ' . ($matrixHoldbackAccountIn ? '"holdbackAccountId" in (' . $matrixHoldbackAccountIn . ')' : 'false')
            . ' or ' . ($orderIn ? '"generatedOrderId" in (' . $orderIn . ')' : 'false')
        );

        $impactedBoardIds = self::queryIdList(
            'select distinct "boardId"::text as id from (
                select "boardId" from "MatrixPosition" where id in (' . (self::idIn($matrixPositionIds) ?: 'null') . ')
                union
                select "boardId" from "MatrixPayout" where id in (' . (self::idIn($matrixPayoutIds) ?: 'null') . ')
                union
                select "boardId" from "MatrixAccumulationEvent" where id in (' . (self::idIn($matrixAccumulationEventIds) ?: 'null') . ')
            ) impacted where "boardId" is not null order by id asc'
        );
        $impactedCycleIds = self::queryIdList(
            'select distinct "cycleId"::text as id from (
                select "cycleId" from "MatrixPayout" where id in (' . (self::idIn($matrixPayoutIds) ?: 'null') . ')
                union
                select "cycleId" from "MatrixAccumulationEvent" where id in (' . (self::idIn($matrixAccumulationEventIds) ?: 'null') . ')
                union
                select "cycleId" from "MatrixBoard" where id in (' . (self::idIn($impactedBoardIds) ?: 'null') . ')
            ) impacted where "cycleId" is not null order by id asc'
        );

        return [
            'baselineOrderIds' => $baselineOrderIds,
            'userIds' => $userIds,
            'approvedDates' => $approvedDates,
            'nonBaselineOrderIds' => $nonBaselineOrderIds,
            'orderIds' => $orderIds,
            'orderItemIds' => $orderItemIds,
            'memberPackageCycleIds' => $memberPackageCycleIds,
            'commissionIds' => $commissionIds,
            'companyBonusIds' => $companyBonusIds,
            'walletTransactionIds' => $walletTransactionIds,
            'walletIds' => $walletIds,
            'capBucketIds' => $capBucketIds,
            'capLedgerIds' => $capLedgerIds,
            'buybackEventIds' => $buybackEventIds,
            'userBuybackProgressIds' => $userBuybackProgressIds,
            'dailyPoolCycleIds' => $dailyPoolCycleIds,
            'dailyPoolEligibilitySnapshotIds' => $dailyPoolEligibilitySnapshotIds,
            'dailyPoolPayoutIds' => $dailyPoolPayoutIds,
            'dailyCommissionCapUsageIds' => $dailyCommissionCapUsageIds,
            'teamSettlementBatchIds' => $teamSettlementBatchIds,
            'teamSettlementBatchItemIds' => $teamSettlementBatchItemIds,
            'poolSettlementBatchIds' => $poolSettlementBatchIds,
            'poolSettlementBatchItemIds' => $poolSettlementBatchItemIds,
            'matrixCycleIds' => $matrixCycleIds,
            'matrixBoardIds' => $matrixBoardIds,
            'matrixPositionIds' => $matrixPositionIds,
            'matrixPayoutIds' => $matrixPayoutIds,
            'matrixAccumulationEventIds' => $matrixAccumulationEventIds,
            'matrixHoldbackAccountIds' => $matrixHoldbackAccountIds,
            'matrixReorderIds' => $matrixReorderIds,
            'impactedBoardIds' => $impactedBoardIds,
            'impactedCycleIds' => $impactedCycleIds,
        ];
    }

    /**
     * @param  array<string, array<int, string>>  $targets
     */
    private static function applyCleanup(array $targets): void
    {
        $survivingBoardIds = array_values(array_diff($targets['impactedBoardIds'], $targets['matrixBoardIds']));
        $survivingCycleIds = array_values(array_diff($targets['impactedCycleIds'], $targets['matrixCycleIds']));

        DB::connection('poolproject')->transaction(function () use ($targets, $survivingBoardIds, $survivingCycleIds): void {
            foreach ([
                ['"DailyPoolPayout"', $targets['dailyPoolPayoutIds']],
                ['"DailyPoolEligibilitySnapshot"', $targets['dailyPoolEligibilitySnapshotIds']],
                ['"DailyPoolCycle"', $targets['dailyPoolCycleIds']],
                ['"PoolSettlementBatchItem"', $targets['poolSettlementBatchItemIds']],
                ['"PoolSettlementBatch"', $targets['poolSettlementBatchIds']],
                ['"TeamSettlementBatchItem"', $targets['teamSettlementBatchItemIds']],
                ['"TeamSettlementBatch"', $targets['teamSettlementBatchIds']],
                ['"DailyCommissionCapUsage"', $targets['dailyCommissionCapUsageIds']],
                ['"CapLedger"', $targets['capLedgerIds']],
                ['"CapBucket"', $targets['capBucketIds']],
                ['"WalletTransaction"', $targets['walletTransactionIds']],
                ['"CompanyBonusLedger"', $targets['companyBonusIds']],
                ['"BuybackEvent"', $targets['buybackEventIds']],
                ['"UserBuybackProgress"', $targets['userBuybackProgressIds']],
                ['"MatrixReorder"', $targets['matrixReorderIds']],
                ['"MatrixPayout"', $targets['matrixPayoutIds']],
                ['"MatrixAccumulationEvent"', $targets['matrixAccumulationEventIds']],
                ['"MatrixPosition"', $targets['matrixPositionIds']],
                ['"MatrixBoard"', $targets['matrixBoardIds']],
                ['"MatrixHoldbackAccount"', $targets['matrixHoldbackAccountIds']],
                ['"MatrixCycle"', $targets['matrixCycleIds']],
                ['"CommissionLedger"', $targets['commissionIds']],
                ['"OrderItem"', $targets['orderItemIds']],
                ['"Order"', $targets['orderIds']],
                ['"MemberPackageCycle"', $targets['memberPackageCycleIds']],
                ['"Wallet"', $targets['walletIds']],
            ] as [$table, $ids]) {
                self::deleteIds((string) $table, $ids);
            }

            $userIn = self::idIn($targets['userIds']);
            if ($userIn) {
                DB::connection('poolproject')->statement(
                    'update "User" set "matrixPersonalPv" = 0 where id in (' . $userIn . ')'
                );
            }

            $boardIn = self::idIn($survivingBoardIds);
            if ($boardIn) {
                DB::connection('poolproject')->statement(
                    'update "MatrixBoard" board set
                        "accumulatedPv" = coalesce((
                          select sum(event."creditedPv") from "MatrixAccumulationEvent" event where event."boardId" = board.id
                        ), 0),
                        "filledSlots" = coalesce((
                          select count(*) from "MatrixPosition" position where position."boardId" = board.id and position."resetAt" is null
                        ), 0)
                    where board.id in (' . $boardIn . ')'
                );
            }

            $cycleIn = self::idIn($survivingCycleIds);
            if ($cycleIn) {
                DB::connection('poolproject')->statement(
                    'update "MatrixCycle" cycle set
                        "totalAccumulatedPv" = coalesce((
                          select sum(event."creditedPv") from "MatrixAccumulationEvent" event where event."cycleId" = cycle.id
                        ), 0)
                    where cycle.id in (' . $cycleIn . ')'
                );
            }
        });
    }

    private static function applyGlobalCleanup(): void
    {
        DB::connection('poolproject')->transaction(function (): void {
            foreach ([
                '"PayoutBatchItem"',
                '"PayoutBatch"',
                '"PayoutHold"',
                '"DailyPoolPayout"',
                '"DailyPoolEligibilitySnapshot"',
                '"DailyPoolCycle"',
                '"DailyCommissionCapUsage"',
                '"PoolSettlementBatchItem"',
                '"PoolSettlementBatch"',
                '"TeamSettlementBatchItem"',
                '"TeamSettlementBatch"',
                '"CompanyBonusLedger"',
                '"CommissionLedger"',
                '"BuybackEvent"',
                '"UserBuybackProgress"',
                '"CapLedger"',
                '"CapBucket"',
                '"MatrixAccumulationEvent"',
                '"MatrixReorder"',
                '"MatrixHoldbackAccount"',
                '"MatrixPayout"',
                '"MatrixPosition"',
                '"MatrixBoard"',
                '"MatrixCycle"',
                '"WalletTopupRequest"',
                '"WithdrawRequest"',
                '"WalletTransaction"',
                '"OrderItem"',
                '"Order"',
                '"MemberPackageCycle"',
            ] as $table) {
                DB::connection('poolproject')->statement('delete from ' . $table);
            }

            DB::connection('poolproject')->statement(
                <<<'SQL'
                update "Wallet"
                set "approvedBalance" = 0,
                    "heldBalance" = 0,
                    "withdrawableBalance" = 0,
                    "shoppingBalance" = 0,
                    "discountBalance" = 0,
                    "firmBalance" = 0,
                    "paidOutBalance" = 0,
                    "negativeOffsetBalance" = 0,
                    "payoutLockStatus" = 'UNLOCKED',
                    "payoutLockReason" = null,
                    "updatedAt" = now()
                SQL
            );

            DB::connection('poolproject')->statement(
                <<<'SQL'
                update "User"
                set "matrixPersonalPv" = 0,
                    "updatedAt" = now()
                where coalesce("matrixPersonalPv", 0) <> 0
                SQL
            );

            foreach (self::RESET_SEQUENCES as $sequence) {
                DB::connection('poolproject')->statement(
                    'alter sequence if exists ' . $sequence . ' restart with 1'
                );
            }
        });
    }

    private static function deleteIds(string $table, array $ids): void
    {
        $inClause = self::idIn($ids);
        if (!$inClause) {
            return;
        }

        DB::connection('poolproject')->statement('delete from ' . $table . ' where id in (' . $inClause . ')');
    }

    private static function clearRuntimeArtifacts(): int
    {
        $runtimeDir = dirname(base_path(), 2) . DIRECTORY_SEPARATOR . 'runtime';
        $deletedCount = 0;

        foreach ([
            'commission-test-baseline-plan.json',
            'commission-test-baseline-result.json',
            'commission-test-baseline-result.md',
        ] as $filename) {
            $path = $runtimeDir . DIRECTORY_SEPARATOR . $filename;
            if (!File::exists($path)) {
                continue;
            }

            File::delete($path);
            $deletedCount++;
        }

        return $deletedCount;
    }

    private static function runtimeArtifactCount(): int
    {
        $runtimeDir = dirname(base_path(), 2) . DIRECTORY_SEPARATOR . 'runtime';
        $count = 0;

        foreach ([
            'commission-test-baseline-plan.json',
            'commission-test-baseline-result.json',
            'commission-test-baseline-result.md',
        ] as $filename) {
            $path = $runtimeDir . DIRECTORY_SEPARATOR . $filename;
            if (File::exists($path)) {
                $count++;
            }
        }

        return $count;
    }

    private static function transactionStateCount(): int
    {
        $total = 0;

        foreach (self::TX_STATE_TABLES as $table) {
            $total += self::countRows($table);
        }

        return $total;
    }

    private static function walletNeedsReset(): bool
    {
        return self::walletResetCandidateCount() > 0;
    }

    private static function walletResetCandidateCount(): int
    {
        $row = DB::connection('poolproject')->selectOne(
            <<<'SQL'
            select count(*) as count
            from "Wallet"
            where coalesce("approvedBalance", 0) <> 0
               or coalesce("heldBalance", 0) <> 0
               or coalesce("withdrawableBalance", 0) <> 0
               or coalesce("shoppingBalance", 0) <> 0
               or coalesce("discountBalance", 0) <> 0
               or coalesce("firmBalance", 0) <> 0
               or coalesce("paidOutBalance", 0) <> 0
               or coalesce("negativeOffsetBalance", 0) <> 0
               or "payoutLockStatus" <> 'UNLOCKED'
               or "payoutLockReason" is not null
            SQL
        );

        return (int) ($row->count ?? 0);
    }

    private static function matrixPvResetCandidateCount(): int
    {
        $row = DB::connection('poolproject')->selectOne(
            <<<'SQL'
            select count(*) as count
            from "User"
            where coalesce("matrixPersonalPv", 0) <> 0
            SQL
        );

        return (int) ($row->count ?? 0);
    }

    private static function countRows(string $table): int
    {
        $row = DB::connection('poolproject')->selectOne('select count(*) as count from ' . $table);

        return (int) ($row->count ?? 0);
    }

    /**
     * @return array<int, string>
     */
    private static function loadIds(string $table, string $column, string $whereSql): array
    {
        return self::queryIdList(
            'select ' . $column . '::text as id from ' . $table . ' ' . $whereSql . ' order by ' . $column . ' asc'
        );
    }

    /**
     * @return array<int, string>
     */
    private static function queryIdList(string $sql): array
    {
        $rows = DB::connection('poolproject')->select($sql);

        return array_values(array_filter(array_map(
            static fn (object $row): string => (string) ($row->id ?? ''),
            $rows
        )));
    }

    /**
     * @param  array<int, mixed>  $values
     * @return array<int, string>
     */
    private static function toIdList(array $values): array
    {
        $normalized = [];
        foreach ($values as $value) {
            $text = is_scalar($value) ? (string) $value : '';
            if ($text !== '' && preg_match('/^\d+$/', $text)) {
                $normalized[$text] = $text;
            }
        }

        return array_values($normalized);
    }

    /**
     * @param  array<int, string>  $values
     */
    private static function idIn(array $values): ?string
    {
        $normalized = self::toIdList($values);

        return $normalized === [] ? null : implode(',', $normalized);
    }

    /**
     * @param  array<int, string>  $values
     */
    private static function dateIn(array $values): ?string
    {
        $normalized = [];
        foreach ($values as $value) {
            if (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                $normalized[$value] = "'" . $value . "'";
            }
        }

        return $normalized === [] ? null : implode(',', array_values($normalized));
    }
}
