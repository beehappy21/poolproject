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
     * @return array{settlementDate:string, seeded:bool, createdOrderCount:int, processedExistingOrderCount:int, reusedOrderCount:int, endOfDayResult:array<string,mixed>}
     */
    public static function runNextDay(BaoAdminApiClient $apiClient): array
    {
        $pendingSettlementDate = self::nextPendingSettlementDate();
        $batch = $pendingSettlementDate !== null
            ? self::batchForDate($pendingSettlementDate)
            : self::nextSeedBatch();
        if ($batch === null) {
            throw new \RuntimeException('ไม่พบวันถัดไปสำหรับสร้าง order baseline แล้ว');
        }

        $productDetailId = self::resolveProductDetailId();
        $existingOrders = self::loadExistingOrders();
        $createdOrderCount = 0;
        $processedExistingOrderCount = 0;
        $reusedOrderCount = 0;

        foreach ($batch['members'] as $member) {
            $tag = self::memberTag($member);
            $approvedAtIso = self::toBangkokNoonIso((string) $member['signupDate']);
            $existing = $existingOrders->get($tag);

            if (is_array($existing) && ($existing['orderId'] ?? null) !== null) {
                self::prepareOrderForApprovedProcessing((string) $existing['orderId'], $approvedAtIso);
                self::backfillOrderDates((string) $existing['orderId'], (string) $member['userId'], $approvedAtIso);
                if (!self::orderHasCommissionRows((string) $existing['orderId'])) {
                    $apiClient->internalRequest('POST', '/internal/bao/orders/' . $existing['orderId'] . '/process-approved');
                    self::backfillOrderDates((string) $existing['orderId'], (string) $member['userId'], $approvedAtIso);
                    $processedExistingOrderCount++;
                } else {
                    $reusedOrderCount++;
                }
                continue;
            }

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
            $createdOrderCount++;
        }

        $settlementDate = (string) $batch['signupDate'];
        /** @var array<string, mixed> $endOfDayResult */
        $endOfDayResult = $apiClient->internalRequest('POST', '/internal/bao/commissions/end-of-day/' . $settlementDate . '/process');

        return [
            'settlementDate' => $settlementDate,
            'seeded' => $pendingSettlementDate === null,
            'createdOrderCount' => $createdOrderCount,
            'processedExistingOrderCount' => $processedExistingOrderCount,
            'reusedOrderCount' => $reusedOrderCount,
            'endOfDayResult' => $endOfDayResult,
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
     * @return Collection<int, array<string, mixed>>
     */
    private static function loadMembers(): Collection
    {
        $rows = DB::connection('poolproject')->select(<<<'SQL'
            select
                u.id::text as user_id,
                u."memberCode" as member_code,
                coalesce(u."name", '') as member_name,
                to_char(u."createdAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as signup_date
            from "User" u
            where u."isAdmin" = false
            order by
                to_char(u."createdAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') asc,
                u."memberCode" asc,
                u.id asc
        SQL);

        return collect($rows)->values()->map(static function (object $row, int $index): array {
            return [
                'sequence' => $index + 1,
                'userId' => (string) $row->user_id,
                'memberCode' => (string) $row->member_code,
                'name' => (string) $row->member_name,
                'signupDate' => (string) $row->signup_date,
            ];
        });
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

    private static function toBangkokNoonIso(string $dateOnly): string
    {
        [$year, $month, $day] = array_map(static fn (string $value): int => (int) $value, explode('-', $dateOnly));

        return (new \DateTimeImmutable(sprintf('%04d-%02d-%02d 05:00:00', $year, $month, $day), new \DateTimeZone('UTC')))
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

    private static function orderHasCommissionRows(string $orderId): bool
    {
        $row = DB::connection('poolproject')->selectOne(
            'select exists(select 1 from "CommissionLedger" where "orderId" = ?::bigint) as has_rows',
            [$orderId]
        );

        return is_object($row) && (bool) ($row->has_rows ?? false);
    }

    private static function sqlLiteral(string $value): string
    {
        return "'" . str_replace(["\\", "'"], ["\\\\", "''"], $value) . "'";
    }
}
