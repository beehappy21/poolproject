<?php

namespace App\Support;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CommissionBaselineDayRunner
{
    private const SOURCE_TAG = 'commission-test-baseline';

    private const PRODUCT_DETAIL_CODE = 'COMMTEST1000';

    public static function nextPendingSettlementDate(): ?string
    {
        $row = DB::connection('poolproject')->selectOne(<<<'SQL'
            with approved_dates as (
                select distinct to_char("approvedAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as settlement_date
                from "Order"
                where "approvedAt" is not null
                  and "shippingAddressNote" like 'commission-test-baseline|%'
            )
            select min(approved_dates.settlement_date) as settlement_date
            from approved_dates
            left join "TeamSettlementBatch" team_batch
                on to_char(team_batch."settlementDate" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') = approved_dates.settlement_date
            left join "DailyPoolCycle" pool_cycle
                on to_char(pool_cycle."cycleDate" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') = approved_dates.settlement_date
            where team_batch.id is null
               or pool_cycle.id is null
        SQL);

        $value = is_object($row) ? ($row->settlement_date ?? null) : null;

        return is_string($value) && $value !== '' ? $value : null;
    }

    public static function nextSeedDate(): ?string
    {
        $batch = self::nextSeedBatch();

        return $batch['signupDate'] ?? null;
    }

    public static function nextActionDate(): ?string
    {
        return self::nextPendingSettlementDate() ?? self::nextSeedDate();
    }

    /**
     * @return array{
     *   workingDate:string,
     *   totalMemberCount:int,
     *   completedMemberCount:int,
     *   remainingMemberCount:int,
     *   canSeedNextMember:bool,
     *   canFinalizeDay:bool,
     *   isPendingSettlementDay:bool,
     *   nextMemberCode:?string,
     *   nextMemberName:?string
     * }|null
     */
    public static function currentDayStatus(): ?array
    {
        $pendingSettlementDate = self::nextPendingSettlementDate();
        $batch = self::resolveActiveBatch($pendingSettlementDate);
        if ($batch === null) {
            if ($pendingSettlementDate !== null) {
                $fallback = self::pendingSettlementFallbackStatus($pendingSettlementDate);
                if ($fallback !== null) {
                    return $fallback;
                }
            }

            return null;
        }

        $progress = self::batchProgress($batch, self::loadExistingOrders());
        $nextMember = $progress['nextPendingMember'];

        return [
            'workingDate' => (string) $batch['signupDate'],
            'totalMemberCount' => (int) $progress['totalMemberCount'],
            'completedMemberCount' => (int) $progress['completedMemberCount'],
            'remainingMemberCount' => (int) $progress['remainingMemberCount'],
            'canSeedNextMember' => $nextMember !== null,
            'canFinalizeDay' => (int) $progress['totalMemberCount'] > 0 && (int) $progress['remainingMemberCount'] === 0,
            'isPendingSettlementDay' => $pendingSettlementDate !== null,
            'nextMemberCode' => $nextMember['memberCode'] ?? null,
            'nextMemberName' => $nextMember['name'] ?? null,
        ];
    }

    /**
     * @return array{
     *   settlementDate:string,
     *   memberCode:string,
     *   memberName:string,
     *   orderId:string,
     *   orderNo:string,
     *   action:string
     * }
     */
    public static function processNextMember(BaoAdminApiClient $apiClient): array
    {
        $pendingSettlementDate = self::nextPendingSettlementDate();
        $batch = self::resolveActiveBatch($pendingSettlementDate);
        if ($batch === null) {
            if ($pendingSettlementDate !== null && self::countBaselineOrdersForSettlementDate($pendingSettlementDate) > 0) {
                throw new \RuntimeException('สมาชิกของวันที่ ' . $pendingSettlementDate . ' ครบแล้ว กรุณากดคำนวณเมื่อหมดวัน');
            }

            throw new \RuntimeException('ไม่พบสมาชิกถัดไปสำหรับ baseline แล้ว');
        }

        $progress = self::batchProgress($batch, self::loadExistingOrders());
        $member = $progress['nextPendingMember'];
        $existing = $progress['nextPendingExistingOrder'];

        if ($member === null) {
            throw new \RuntimeException(
                $pendingSettlementDate !== null
                    ? 'สมาชิกของวันที่ ' . $batch['signupDate'] . ' ครบแล้ว กรุณากดคำนวณเมื่อหมดวัน'
                    : 'ไม่พบสมาชิกถัดไปสำหรับ baseline แล้ว'
            );
        }

        $approvedAtIso = self::toBangkokSequencedIso(
            (string) $member['signupDate'],
            (int) ($member['daySequence'] ?? $member['sequence'] ?? 1)
        );

        if (is_array($existing) && ($existing['orderId'] ?? null) !== null) {
            self::prepareOrderForApprovedProcessing((string) $existing['orderId'], $approvedAtIso);
            $apiClient->internalRequest('POST', '/internal/bao/orders/' . $existing['orderId'] . '/process-approved');
            self::backfillOrderDates((string) $existing['orderId'], (string) $member['userId'], $approvedAtIso);

            return [
                'settlementDate' => (string) $batch['signupDate'],
                'memberCode' => (string) $member['memberCode'],
                'memberName' => (string) ($member['name'] ?? ''),
                'orderId' => (string) $existing['orderId'],
                'orderNo' => (string) ($existing['orderNo'] ?? ''),
                'action' => 'processed_existing_order',
            ];
        }

        $productDetailId = self::resolveProductDetailId();
        $tag = self::memberTag($member);

        /** @var array<string, mixed> $created */
        $created = $apiClient->internalRequest('POST', '/internal/bao/orders', [
            'userId' => (string) $member['userId'],
            'productDetailId' => $productDetailId,
            'quantity' => '1',
            'fulfillmentMethod' => 'branch_pickup',
            'pickupBranchName' => 'Commission Test Baseline',
            'pickupBranchNote' => $tag,
            'pickupRecipientName' => (string) ($member['name'] ?: $member['memberCode']),
            'pickupPhone' => '0800000000',
            'cashPaymentMethod' => 'bank_transfer',
        ]);

        $orderId = (string) ($created['orderId'] ?? '');
        if ($orderId === '') {
            throw new \RuntimeException('Order create succeeded but missing orderId.');
        }

        $apiClient->internalRequest('POST', '/internal/bao/orders/' . $orderId . '/approve');
        self::prepareOrderForApprovedProcessing($orderId, $approvedAtIso);
        $apiClient->internalRequest('POST', '/internal/bao/orders/' . $orderId . '/process-approved');
        self::backfillOrderDates($orderId, (string) $member['userId'], $approvedAtIso);

        return [
            'settlementDate' => (string) $batch['signupDate'],
            'memberCode' => (string) $member['memberCode'],
            'memberName' => (string) ($member['name'] ?? ''),
            'orderId' => $orderId,
            'orderNo' => (string) ($created['orderNo'] ?? ''),
            'action' => 'created_order',
        ];
    }

    /**
     * @return array{settlementDate:string, endOfDayResult:array<string,mixed>}
     */
    public static function finalizeCurrentDay(BaoAdminApiClient $apiClient): array
    {
        $pendingSettlementDate = self::nextPendingSettlementDate();
        if ($pendingSettlementDate === null) {
            throw new \RuntimeException('ยังไม่มีวันที่พร้อมปิดวันเพื่อคำนวณ end-of-day');
        }

        $batch = self::batchForDate($pendingSettlementDate);
        if ($batch !== null) {
            $progress = self::batchProgress($batch, self::loadExistingOrders());
            if (($progress['remainingMemberCount'] ?? 0) > 0) {
                $nextMemberCode = $progress['nextPendingMember']['memberCode'] ?? null;
                throw new \RuntimeException(
                    'ยังสร้างรายการไม่ครบสำหรับวันที่ '
                    . $pendingSettlementDate
                    . ' คงเหลือ '
                    . $progress['remainingMemberCount']
                    . ' รายการ'
                    . ($nextMemberCode ? ' (ถัดไป: ' . $nextMemberCode . ')' : '')
                );
            }
        } elseif (self::countBaselineOrdersForSettlementDate($pendingSettlementDate) === 0) {
            throw new \RuntimeException('ไม่พบข้อมูลสมาชิกหรือ order baseline ของวันที่ ' . $pendingSettlementDate);
        }

        /** @var array<string, mixed> $endOfDayResult */
        $endOfDayResult = $apiClient->internalRequest('POST', '/internal/bao/commissions/end-of-day/' . $pendingSettlementDate . '/process');

        return [
            'settlementDate' => $pendingSettlementDate,
            'endOfDayResult' => $endOfDayResult,
        ];
    }

    /**
     * @return array{settlementDate:string, seeded:bool, createdOrderCount:int, processedExistingOrderCount:int, reusedOrderCount:int, endOfDayResult:array<string,mixed>}
     */
    public static function runNextDay(BaoAdminApiClient $apiClient): array
    {
        $status = self::currentDayStatus();
        if ($status === null) {
            throw new \RuntimeException('ไม่พบวันถัดไปสำหรับสร้าง order baseline แล้ว');
        }

        $targetDate = $status['workingDate'];
        $createdOrderCount = 0;
        $processedExistingOrderCount = 0;

        while (true) {
            $currentStatus = self::currentDayStatus();
            if ($currentStatus === null || $currentStatus['workingDate'] !== $targetDate || !$currentStatus['canSeedNextMember']) {
                break;
            }

            $result = self::processNextMember($apiClient);
            if (($result['action'] ?? '') === 'processed_existing_order') {
                $processedExistingOrderCount++;
            } else {
                $createdOrderCount++;
            }
        }

        $finalized = self::finalizeCurrentDay($apiClient);

        return [
            'settlementDate' => $targetDate,
            'seeded' => true,
            'createdOrderCount' => $createdOrderCount,
            'processedExistingOrderCount' => $processedExistingOrderCount,
            'reusedOrderCount' => 0,
            'endOfDayResult' => $finalized['endOfDayResult'],
        ];
    }

    /**
     * @return array{signupDate:string, members:Collection<int, array<string, mixed>>}|null
     */
    private static function nextSeedBatch(): ?array
    {
        $members = self::loadMembers();
        if ($members->isEmpty()) {
            return null;
        }

        $existingTags = self::loadExistingOrders()->keys()->flip();

        /** @var Collection<string, Collection<int, array<string, mixed>>> $grouped */
        $grouped = $members->groupBy('signupDate');
        foreach ($grouped as $signupDate => $rows) {
            $hasMissing = $rows->contains(function (array $member) use ($existingTags): bool {
                return !$existingTags->has(self::memberTag($member));
            });

            if ($hasMissing) {
                return [
                    'signupDate' => (string) $signupDate,
                    'members' => $rows->values(),
                ];
            }
        }

        return null;
    }

    /**
     * @return array{signupDate:string, members:Collection<int, array<string, mixed>>}|null
     */
    private static function batchForDate(string $signupDate): ?array
    {
        $members = self::loadMembers()
            ->filter(static fn (array $member): bool => (string) $member['signupDate'] === $signupDate)
            ->values();

        if ($members->isEmpty()) {
            return null;
        }

        return [
            'signupDate' => $signupDate,
            'members' => $members,
        ];
    }

    /**
     * @param  ?string  $pendingSettlementDate
     * @return array{signupDate:string, members:Collection<int, array<string, mixed>>}|null
     */
    private static function resolveActiveBatch(?string $pendingSettlementDate = null): ?array
    {
        $pendingSettlementDate ??= self::nextPendingSettlementDate();

        return $pendingSettlementDate !== null
            ? self::batchForDate($pendingSettlementDate)
            : self::nextSeedBatch();
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function loadMembers(): Collection
    {
        $rows = DB::connection('poolproject')->select(<<<'SQL'
            select
                u.id::text as user_id,
                u."memberCode" as member_code,
                coalesce(u."name", '') as member_name,
                to_char(u."createdAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as signup_date,
                u."sponsorId"::text as sponsor_user_id
            from "User" u
            where u."isAdmin" = false
            order by
                to_char(u."createdAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') asc,
                u."memberCode" asc,
                u.id asc
        SQL);

        $members = collect($rows)->values()->map(static function (object $row, int $index): array {
            return [
                'originalOrder' => $index,
                'userId' => (string) $row->user_id,
                'memberCode' => (string) $row->member_code,
                'name' => (string) $row->member_name,
                'originalSignupDate' => (string) $row->signup_date,
                'sponsorUserId' => $row->sponsor_user_id ? (string) $row->sponsor_user_id : null,
            ];
        });

        return self::applyCommissionSequence($members);
    }

    /**
     * Re-sequence the baseline queue so sponsor cycles are always opened before
     * any downline order that depends on those cycles for direct commission.
     *
     * @param  Collection<int, array<string, mixed>>  $members
     * @return Collection<int, array<string, mixed>>
     */
    private static function applyCommissionSequence(Collection $members): Collection
    {
        if ($members->isEmpty()) {
            return collect();
        }

        $dateBuckets = [];
        foreach ($members as $member) {
            $date = (string) $member['originalSignupDate'];
            $dateBuckets[$date] = ($dateBuckets[$date] ?? 0) + 1;
        }

        $stableMembers = $members->values()->all();
        $memberByUserId = [];
        $childrenByUserId = [];
        $indegreeByUserId = [];

        foreach ($stableMembers as $member) {
            $userId = (string) $member['userId'];
            $memberByUserId[$userId] = $member;
            $childrenByUserId[$userId] = [];
            $indegreeByUserId[$userId] = 0;
        }

        foreach ($stableMembers as $member) {
            $sponsorUserId = $member['sponsorUserId'] ?? null;
            if (!is_string($sponsorUserId) || $sponsorUserId === '' || !isset($memberByUserId[$sponsorUserId])) {
                continue;
            }

            $childrenByUserId[$sponsorUserId][] = (string) $member['userId'];
            $indegreeByUserId[(string) $member['userId']]++;
        }

        $readyUserIds = array_keys(array_filter(
            $indegreeByUserId,
            static fn (int $indegree): bool => $indegree === 0
        ));

        usort($readyUserIds, static function (string $left, string $right) use ($memberByUserId): int {
            return ((int) $memberByUserId[$left]['originalOrder']) <=> ((int) $memberByUserId[$right]['originalOrder']);
        });

        $orderedMembers = [];

        while ($readyUserIds !== []) {
            $userId = array_shift($readyUserIds);
            if (!is_string($userId) || !isset($memberByUserId[$userId])) {
                continue;
            }

            $orderedMembers[] = $memberByUserId[$userId];
            foreach ($childrenByUserId[$userId] ?? [] as $childUserId) {
                $indegreeByUserId[$childUserId]--;
                if ($indegreeByUserId[$childUserId] === 0) {
                    $readyUserIds[] = $childUserId;
                }
            }

            usort($readyUserIds, static function (string $left, string $right) use ($memberByUserId): int {
                return ((int) $memberByUserId[$left]['originalOrder']) <=> ((int) $memberByUserId[$right]['originalOrder']);
            });
        }

        if (count($orderedMembers) < count($stableMembers)) {
            $orderedUserIds = array_fill_keys(
                array_map(static fn (array $member): string => (string) $member['userId'], $orderedMembers),
                true
            );

            foreach ($stableMembers as $member) {
                if (!isset($orderedUserIds[(string) $member['userId']])) {
                    $orderedMembers[] = $member;
                }
            }
        }

        $sequenced = [];
        $dateEntries = array_map(
            static fn (string $date, int $count): array => ['date' => $date, 'count' => $count],
            array_keys($dateBuckets),
            array_values($dateBuckets)
        );
        $dateIndex = 0;
        $slotUsage = 0;
        $daySequences = [];

        foreach ($orderedMembers as $index => $member) {
            while (
                isset($dateEntries[$dateIndex])
                && $slotUsage >= (int) $dateEntries[$dateIndex]['count']
            ) {
                $dateIndex++;
                $slotUsage = 0;
            }

            $assignedDate = isset($dateEntries[$dateIndex])
                ? (string) $dateEntries[$dateIndex]['date']
                : (string) $member['originalSignupDate'];

            $slotUsage++;
            $daySequences[$assignedDate] = ($daySequences[$assignedDate] ?? 0) + 1;

            $member['sequence'] = $index + 1;
            $member['daySequence'] = $daySequences[$assignedDate];
            $member['signupDate'] = $assignedDate;
            $sequenced[] = $member;
        }

        return collect($sequenced);
    }

    /**
     * @return Collection<string, array{orderId:string, orderNo:string}>
     */
    private static function loadExistingOrders(): Collection
    {
        $rows = DB::connection('poolproject')->select(
            'select o.id::text as order_id, o."orderNo" as order_no, coalesce(o."shippingAddressNote", \'\') as tag from "Order" o where o."shippingAddressNote" like ? order by o.id asc',
            [self::SOURCE_TAG . '|%']
        );

        $map = collect();
        foreach ($rows as $row) {
            $map->put((string) $row->tag, [
                'orderId' => (string) $row->order_id,
                'orderNo' => (string) $row->order_no,
            ]);
        }

        return $map;
    }

    private static function resolveProductDetailId(): string
    {
        $row = DB::connection('poolproject')->selectOne(
            'select id::text as id from "ProductDetail" where code = ? limit 1',
            [self::PRODUCT_DETAIL_CODE]
        );

        $id = is_object($row) ? ($row->id ?? null) : null;
        if (!is_string($id) || $id === '') {
            throw new \RuntimeException('ไม่พบสินค้า baseline code COMMTEST1000 สำหรับสร้าง order ทดสอบ');
        }

        return $id;
    }

    /**
     * @param  array<string, mixed>  $member
     */
    private static function memberTag(array $member): string
    {
        return sprintf(
            '%s|member=%s|signupDate=%s|seq=%s',
            self::SOURCE_TAG,
            (string) $member['memberCode'],
            (string) $member['signupDate'],
            (string) $member['sequence']
        );
    }

    private static function toBangkokSequencedIso(string $dateOnly, int $sequence): string
    {
        [$year, $month, $day] = array_map(static fn (string $value): int => (int) $value, explode('-', $dateOnly));
        $minuteOffset = max(0, $sequence - 1);
        $base = new \DateTimeImmutable(
            sprintf('%04d-%02d-%02d 05:00:00', $year, $month, $day),
            new \DateTimeZone('UTC')
        );

        return $base
            ->modify(sprintf('+%d minutes', $minuteOffset))
            ->format(\DateTimeInterface::ATOM);
    }

    private static function prepareOrderForApprovedProcessing(string $orderId, string $approvedAtIso): void
    {
        $quoted = self::sqlLiteral($approvedAtIso);
        $quotedOrderId = self::sqlLiteral($orderId);

        DB::connection('poolproject')->unprepared(<<<SQL
            update "Order"
            set "createdAt" = {$quoted}::timestamptz,
                "updatedAt" = {$quoted}::timestamptz,
                "paidAt" = coalesce("paidAt", {$quoted}::timestamptz),
                "approvedAt" = {$quoted}::timestamptz
            where id = {$quotedOrderId}::bigint;

            update "OrderItem"
            set "createdAt" = {$quoted}::timestamptz,
                "updatedAt" = {$quoted}::timestamptz
            where "orderId" = {$quotedOrderId}::bigint;
        SQL);
    }

    private static function backfillOrderDates(string $orderId, string $userId, string $approvedAtIso): void
    {
        $quoted = self::sqlLiteral($approvedAtIso);
        $quotedOrderId = self::sqlLiteral($orderId);
        $quotedUserId = self::sqlLiteral($userId);

        DB::connection('poolproject')->unprepared(<<<SQL
            update "Order"
            set "updatedAt" = {$quoted}::timestamptz
            where id = {$quotedOrderId}::bigint;

            update "OrderItem"
            set "updatedAt" = {$quoted}::timestamptz
            where "orderId" = {$quotedOrderId}::bigint;

            update "CommissionLedger"
            set "commissionDate" = date({$quoted}::timestamptz),
                "evaluationAt" = {$quoted}::timestamptz,
                "finalizeCheckedAt" = coalesce("finalizeCheckedAt", {$quoted}::timestamptz),
                "finalizedAt" = coalesce("finalizedAt", {$quoted}::timestamptz),
                "releasedToWithdrawableAt" = case
                  when "releasedToWithdrawableAt" is not null then {$quoted}::timestamptz
                  else null
                end,
                "createdAt" = {$quoted}::timestamptz,
                "updatedAt" = {$quoted}::timestamptz
            where "orderId" = {$quotedOrderId}::bigint;

            update "CompanyBonusLedger"
            set "createdAt" = {$quoted}::timestamptz
            where "sourceRefId" = {$quotedOrderId}::bigint;

            update "WalletTransaction"
            set "createdAt" = {$quoted}::timestamptz,
                "updatedAt" = {$quoted}::timestamptz
            where ("refType" = 'COMMISSION' and "refId" in (
              select id from "CommissionLedger" where "orderId" = {$quotedOrderId}::bigint
            ))
               or ("refType" = 'ORDER' and "refId" = {$quotedOrderId}::bigint);

            update "MatrixPayout"
            set "createdAt" = {$quoted}::timestamptz,
                "updatedAt" = {$quoted}::timestamptz
            where "sourceOrderId" = {$quotedOrderId}::bigint;

            update "MatrixAccumulationEvent"
            set "createdAt" = {$quoted}::timestamptz
            where "sourceOrderId" = {$quotedOrderId}::bigint;

            update "MemberPackageCycle"
            set "activatedAt" = {$quoted}::timestamptz,
                "activeUntil" = {$quoted}::timestamptz + ("activeUntil" - "activatedAt"),
                "createdAt" = {$quoted}::timestamptz,
                "updatedAt" = {$quoted}::timestamptz
            where id in (
              select mpc.id
              from "MemberPackageCycle" mpc
              where mpc."userId" = {$quotedUserId}::bigint
              order by mpc.id desc
              limit 1
            );
        SQL);
    }

    /**
     * @param  array<int, string>  $orderIds
     * @return Collection<string, bool>
     */
    private static function loadCommissionedOrderLookup(array $orderIds): Collection
    {
        $uniqueOrderIds = array_values(array_unique(array_filter($orderIds, static fn (?string $value): bool => is_string($value) && $value !== '')));
        if ($uniqueOrderIds === []) {
            return collect();
        }

        $placeholders = implode(', ', array_fill(0, count($uniqueOrderIds), '?::bigint'));
        $rows = DB::connection('poolproject')->select(
            'select distinct "orderId"::text as order_id from "CommissionLedger" where "orderId" in (' . $placeholders . ')',
            $uniqueOrderIds
        );

        $lookup = collect();
        foreach ($rows as $row) {
            $lookup->put((string) $row->order_id, true);
        }

        return $lookup;
    }

    /**
     * @param  array{signupDate:string, members:Collection<int, array<string, mixed>>}  $batch
     * @return array{
     *   totalMemberCount:int,
     *   completedMemberCount:int,
     *   remainingMemberCount:int,
     *   nextPendingMember:?array<string,mixed>,
     *   nextPendingExistingOrder:?array<string,string>
     * }
     */
    private static function batchProgress(array $batch, Collection $existingOrders): array
    {
        $members = $batch['members']->values();
        $orderIds = [];

        foreach ($members as $member) {
            $existing = $existingOrders->get(self::memberTag($member));
            if (is_array($existing) && isset($existing['orderId'])) {
                $orderIds[] = (string) $existing['orderId'];
            }
        }

        $commissionedOrders = self::loadCommissionedOrderLookup($orderIds);
        $completedMemberCount = 0;
        $nextPendingMember = null;
        $nextPendingExistingOrder = null;

        foreach ($members as $member) {
            $existing = $existingOrders->get(self::memberTag($member));
            $isComplete = is_array($existing)
                && isset($existing['orderId'])
                && $commissionedOrders->has((string) $existing['orderId']);

            if ($isComplete) {
                $completedMemberCount++;
                continue;
            }

            if ($nextPendingMember === null) {
                $nextPendingMember = $member;
                $nextPendingExistingOrder = is_array($existing) ? $existing : null;
            }
        }

        $totalMemberCount = $members->count();

        return [
            'totalMemberCount' => $totalMemberCount,
            'completedMemberCount' => $completedMemberCount,
            'remainingMemberCount' => max(0, $totalMemberCount - $completedMemberCount),
            'nextPendingMember' => $nextPendingMember,
            'nextPendingExistingOrder' => $nextPendingExistingOrder,
        ];
    }

    /**
     * @return array{
     *   workingDate:string,
     *   totalMemberCount:int,
     *   completedMemberCount:int,
     *   remainingMemberCount:int,
     *   canSeedNextMember:bool,
     *   canFinalizeDay:bool,
     *   isPendingSettlementDay:bool,
     *   nextMemberCode:?string,
     *   nextMemberName:?string
     * }|null
     */
    private static function pendingSettlementFallbackStatus(string $settlementDate): ?array
    {
        $orderCount = self::countBaselineOrdersForSettlementDate($settlementDate);
        if ($orderCount <= 0) {
            return null;
        }

        return [
            'workingDate' => $settlementDate,
            'totalMemberCount' => $orderCount,
            'completedMemberCount' => $orderCount,
            'remainingMemberCount' => 0,
            'canSeedNextMember' => false,
            'canFinalizeDay' => true,
            'isPendingSettlementDay' => true,
            'nextMemberCode' => null,
            'nextMemberName' => null,
        ];
    }

    private static function countBaselineOrdersForSettlementDate(string $settlementDate): int
    {
        $row = DB::connection('poolproject')->selectOne(
            <<<'SQL'
            select count(*)::int as aggregate
            from "Order"
            where "shippingAddressNote" like ?
              and "approvedAt" is not null
              and to_char("approvedAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') = ?
            SQL,
            [self::SOURCE_TAG . '|%', $settlementDate]
        );

        return is_object($row) ? (int) ($row->aggregate ?? 0) : 0;
    }

    private static function sqlLiteral(string $value): string
    {
        return "'" . str_replace(["\\", "'"], ["\\\\", "''"], $value) . "'";
    }
}
