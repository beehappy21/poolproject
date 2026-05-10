<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\LazyCollection;
use Illuminate\Support\Facades\DB;

class CommissionReportBuilder
{
    private const COMPANY_FALLBACK_MEMBER_CODE = 'COMPANY_FALLBACK';

    private const COMPANY_FALLBACK_NAME = 'บริษัท (Fallback)';

    private const DETAIL_DESCRIPTIONS = [
        'direct' => 'รายงานรายการคอมมิชชั่นตามสมาชิก ช่วงเวลา และสายแนะนำ',
        'team' => 'รายงานโบนัสทีมจากรายการ TEAM_2LEG และ TEAM_3LEG ที่จ่ายจริงในระบบ',
        'matching' => 'รายงานโบนัส matching จากรายการ MATCHING_L1 และ MATCHING_L2 ที่จ่ายจริงในระบบ',
        'pool' => 'รายงานพูลโบนัส โดยยึดสูตร PV approved รวมของวัน x % pool แล้วหารด้วยจำนวนสมาชิกที่ eligible ในวันนั้น',
    ];

    private const DETAIL_TITLES = [
        'direct' => 'รายงานโบนัสแนะนำ',
        'team' => 'รายงานโบนัสทีม',
        'matching' => 'รายงานโบนัส Matching',
        'pool' => 'รายงานพูลโบนัส',
    ];

    public static function normalizeMode(?string $mode): string
    {
        $mode = (string) ($mode ?? 'overview');

        return in_array($mode, ['overview', 'direct', 'team', 'matching', 'pool'], true) ? $mode : 'overview';
    }

    public static function filtersFromRequest(Request $request): array
    {
        return [
            'memberFrom' => trim((string) $request->input('member_from', '')),
            'memberTo' => trim((string) $request->input('member_to', '')),
            'dateFrom' => trim((string) $request->input('date_from', '')),
            'dateTo' => trim((string) $request->input('date_to', '')),
            'pageSize' => max(10, min(100, (int) $request->input('page_size', 25))),
        ];
    }

    public static function build(string $mode, array $filters): array
    {
        $mode = self::normalizeMode($mode);
        $baseQuery = self::baseLedgerQuery($filters);

        if ($mode === 'overview') {
            return self::buildOverview($filters, $baseQuery);
        }

        return self::buildDetail($mode, $filters, $baseQuery);
    }

    public static function buildScreen(string $mode, array $filters, int $page = 1): array
    {
        $mode = self::normalizeMode($mode);
        $page = max(1, $page);

        if ($mode === 'overview') {
            return self::buildPagedOverview($filters, $page);
        }

        return self::buildPagedDetail($mode, $filters, $page);
    }

    public static function nextPendingSettlementDate(): ?string
    {
        $row = DB::connection('poolproject')->selectOne(<<<'SQL'
            with approved_dates as (
                select distinct to_char("approvedAt" at time zone 'Asia/Bangkok', 'YYYY-MM-DD') as settlement_date
                from "Order"
                where "approvedAt" is not null
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

    private static function baseLedgerQuery(array $filters)
    {
        $query = DB::connection('poolproject')
            ->table(DB::raw('"CommissionLedger" as cl'))
            ->leftJoin(DB::raw('"User" as beneficiary'), function ($join) {
                $join->on(DB::raw('beneficiary."id"'), '=', DB::raw('cl."beneficiaryUserId"'));
            });

        self::applyBeneficiaryFilters($query, $filters, 'cl', 'beneficiary');

        return $query;
    }

    private static function applyBeneficiaryFilters($query, array $filters, string $tableAlias, string $beneficiaryAlias): void
    {
        if (($filters['memberFrom'] ?? '') !== '') {
            $query->whereRaw('(' . $beneficiaryAlias . '."memberCode" ilike ? or ' . $beneficiaryAlias . '."name" ilike ?)', [
                '%' . $filters['memberFrom'] . '%',
                '%' . $filters['memberFrom'] . '%',
            ]);
        }

        if (($filters['memberTo'] ?? '') !== '') {
            $query->whereRaw('(' . $beneficiaryAlias . '."memberCode" ilike ? or ' . $beneficiaryAlias . '."name" ilike ?)', [
                '%' . $filters['memberTo'] . '%',
                '%' . $filters['memberTo'] . '%',
            ]);
        }

        if (($filters['dateFrom'] ?? '') !== '') {
            $query->whereRaw('date(' . $tableAlias . '."createdAt") >= ?', [$filters['dateFrom']]);
        }

        if (($filters['dateTo'] ?? '') !== '') {
            $query->whereRaw('date(' . $tableAlias . '."createdAt") <= ?', [$filters['dateTo']]);
        }
    }

    private static function buildOverview(array $filters, $baseQuery): array
    {
        unset($baseQuery);

        $query = self::overviewRowsQuery($filters);
        $rows = (clone $query)
            ->orderByRaw('report_date desc')
            ->orderByRaw('beneficiary_member_code asc')
            ->get()
            ->map(fn ($row) => self::mapOverviewRow($row));

        $totalsRow = self::overviewTotalsRow($filters);
        $totals = self::mapOverviewTotals($totalsRow);

        return self::overviewPayload($rows, $totals, $rows->count());
    }

    private static function buildPagedOverview(array $filters, int $page): array
    {
        $query = self::overviewRowsQuery($filters);
        $offset = ($page - 1) * $filters['pageSize'];

        $rows = (clone $query)
            ->orderByRaw('report_date desc')
            ->orderByRaw('beneficiary_member_code asc')
            ->limit($filters['pageSize'])
            ->offset($offset)
            ->get()
            ->map(fn ($row) => self::mapOverviewRow($row));

        $totalsRow = self::overviewTotalsRow($filters);
        $totals = self::mapOverviewTotals($totalsRow);
        $totalCount = (int) ($totalsRow->total_count ?? 0);

        return [
            ...self::overviewPayload($rows, $totals, $totalCount),
            'totalCount' => $totalCount,
        ];
    }

    private static function buildDetail(string $mode, array $filters, $baseQuery): array
    {
        $title = self::DETAIL_TITLES[$mode] ?? self::DETAIL_TITLES['direct'];

        $detailQuery = self::ledgerDetailQuery($filters, self::ledgerCommissionTypesForMode($mode));

        $detailRows = (clone $detailQuery)
            ->selectRaw(
                'date(cl."createdAt") as report_date,
                beneficiary."memberCode" as beneficiary_member_code,
                beneficiary."name" as beneficiary_name,
                source."memberCode" as source_member_code,
                source."name" as source_name,
                coalesce(cl."levelNo", cl."tierNo") as level_no,
                cl."basePv" as base_pv,
                cl."rate" as rate,
                cl."commissionAmount" as amount'
            )
            ->orderByRaw('cl."createdAt" desc')
            ->orderByRaw('cl."id" desc')
            ->get()
            ->map(fn ($row) => [
                'reportDate' => (string) $row->report_date,
                'beneficiaryMemberCode' => $row->beneficiary_member_code ?: '-',
                'beneficiaryName' => $row->beneficiary_name ?: '-',
                'sourceMemberCode' => $row->source_member_code ?: '-',
                'sourceName' => $row->source_name ?: '-',
                'levelNo' => $row->level_no ?? '-',
                'basePv' => (string) $row->base_pv,
                'rate' => (string) $row->rate,
                'amount' => (string) $row->amount,
            ]);

        $totals = [
            'basePv' => (string) $detailRows->sum(fn (array $row) => (float) $row['basePv']),
            'amount' => (string) $detailRows->sum(fn (array $row) => (float) $row['amount']),
        ];

        if ($mode === 'pool') {
            $totals['avgRate'] = (string) round($detailRows->avg(fn (array $row) => (float) $row['rate']) ?: 0, 8);
        }

        $summaryCards = [
            ['label' => 'รายการที่พบ', 'value' => (string) $detailRows->count(), 'note' => 'จำนวนรายการหลังกรองทั้งหมด', 'format' => 'count'],
            ['label' => 'PV รวม', 'value' => $totals['basePv'], 'note' => 'PV ที่นำมาคำนวณทั้งหมด', 'format' => 'decimal'],
            ['label' => 'ยอดจ่ายรวม', 'value' => $totals['amount'], 'note' => 'ยอดคอมมิชชั่นหลังกรอง', 'format' => 'decimal'],
        ];

        if ($mode === 'pool') {
            $summaryCards[] = ['label' => 'อัตราพูลเฉลี่ย', 'value' => $totals['avgRate'], 'note' => 'อัตราที่ใช้คำนวณ pool จาก PV approved ของวันนั้น', 'format' => 'decimal'];
        }

        return [
            'title' => $title,
            'description' => self::DETAIL_DESCRIPTIONS[$mode] ?? self::DETAIL_DESCRIPTIONS['direct'],
            'rows' => $detailRows,
            'totals' => $totals,
            'summaryCards' => $summaryCards,
        ];
    }

    private static function buildPagedDetail(string $mode, array $filters, int $page): array
    {
        return self::buildPagedLedgerDetail($mode, $filters, $page);
    }

    private static function overviewRowsQuery(array $filters)
    {
        $union = self::overviewUnionQuery($filters);

        return DB::connection('poolproject')
            ->query()
            ->fromSub($union, 'overview_source')
            ->selectRaw(
                'report_date,
                beneficiary_member_code,
                beneficiary_name,
                coalesce(sum(direct_amount), 0) as direct_amount,
                coalesce(sum(team_amount), 0) as team_amount,
                coalesce(sum(matching_amount), 0) as matching_amount,
                coalesce(sum(pool_amount), 0) as pool_amount,
                coalesce(sum(total_amount), 0) as total_amount'
            )
            ->groupBy('report_date', 'beneficiary_member_code', 'beneficiary_name');
    }

    private static function overviewUnionQuery(array $filters)
    {
        return self::overviewCommissionSourceQuery($filters);
    }

    private static function overviewCommissionSourceQuery(array $filters)
    {
        return self::baseLedgerQuery($filters)
            ->selectRaw(
                'date(cl."createdAt") as report_date,
                coalesce(beneficiary."memberCode", \'' . self::COMPANY_FALLBACK_MEMBER_CODE . '\') as beneficiary_member_code,
                coalesce(beneficiary."name", \'' . self::COMPANY_FALLBACK_NAME . '\') as beneficiary_name,
                coalesce(sum(case when cl."commissionType" = \'DIRECT\' then cl."commissionAmount" else 0 end), 0) as direct_amount,
                coalesce(sum(case when cl."commissionType" in (\'TEAM_2LEG\', \'TEAM_3LEG\') then cl."commissionAmount" else 0 end), 0) as team_amount,
                coalesce(sum(case when cl."commissionType" in (\'MATCHING_L1\', \'MATCHING_L2\') then cl."commissionAmount" else 0 end), 0) as matching_amount,
                coalesce(sum(case when cl."commissionType" = \'POOL\' then cl."commissionAmount" else 0 end), 0) as pool_amount,
                coalesce(sum(cl."commissionAmount"), 0) as total_amount'
            )
            ->whereIn(DB::raw('cl."commissionType"'), ['DIRECT', 'TEAM_2LEG', 'TEAM_3LEG', 'MATCHING_L1', 'MATCHING_L2', 'POOL'])
            ->groupByRaw('date(cl."createdAt"), coalesce(beneficiary."memberCode", \'' . self::COMPANY_FALLBACK_MEMBER_CODE . '\'), coalesce(beneficiary."name", \'' . self::COMPANY_FALLBACK_NAME . '\')');
    }

    private static function overviewTotalsRow(array $filters): object
    {
        $row = DB::connection('poolproject')
            ->query()
            ->fromSub(self::overviewRowsQuery($filters), 'overview_rows')
            ->selectRaw(
                'count(*) as total_count,
                coalesce(sum(direct_amount), 0) as direct_amount,
                coalesce(sum(team_amount), 0) as team_amount,
                coalesce(sum(matching_amount), 0) as matching_amount,
                coalesce(sum(pool_amount), 0) as pool_amount,
                coalesce(sum(total_amount), 0) as total_amount'
            )
            ->first();

        return $row ?? (object) [
            'total_count' => 0,
            'direct_amount' => '0',
            'team_amount' => '0',
            'matching_amount' => '0',
            'pool_amount' => '0',
            'total_amount' => '0',
        ];
    }

    private static function mapOverviewRow(object $row): array
    {
        return [
            'reportDate' => (string) $row->report_date,
            'beneficiaryMemberCode' => $row->beneficiary_member_code ?: '-',
            'beneficiaryName' => $row->beneficiary_name ?: '-',
            'directAmount' => (string) $row->direct_amount,
            'teamAmount' => (string) $row->team_amount,
            'matchingAmount' => (string) $row->matching_amount,
            'poolAmount' => (string) $row->pool_amount,
            'totalAmount' => (string) $row->total_amount,
        ];
    }

    private static function mapOverviewTotals(object $row): array
    {
        return [
            'directAmount' => (string) ($row->direct_amount ?? '0'),
            'teamAmount' => (string) ($row->team_amount ?? '0'),
            'matchingAmount' => (string) ($row->matching_amount ?? '0'),
            'poolAmount' => (string) ($row->pool_amount ?? '0'),
            'totalAmount' => (string) ($row->total_amount ?? '0'),
        ];
    }

    private static function overviewPayload(Collection $rows, array $totals, int $totalCount): array
    {
        return [
            'title' => 'รายงานคอมมิชชั่น',
            'description' => 'รายงานคอมมิชชั่นรวมต่อสมาชิก แยกตาม direct, team, matching และ pool',
            'rows' => $rows,
            'totals' => $totals,
            'summaryCards' => [
                ['label' => 'รายการที่พบ', 'value' => (string) $totalCount, 'note' => 'จำนวนแถวหลังกรองทั้งหมด', 'format' => 'count'],
                ['label' => 'โบนัสแนะนำรวม', 'value' => $totals['directAmount'], 'note' => 'ยอด direct bonus', 'format' => 'decimal'],
                ['label' => 'โบนัสทีมรวม', 'value' => $totals['teamAmount'], 'note' => 'ยอด team bonus', 'format' => 'decimal'],
                ['label' => 'โบนัส Matching รวม', 'value' => $totals['matchingAmount'], 'note' => 'ยอด matching bonus', 'format' => 'decimal'],
                ['label' => 'พูลโบนัสรวม', 'value' => $totals['poolAmount'], 'note' => 'ยอด pool bonus', 'format' => 'decimal'],
                ['label' => 'ยอดรวมทั้งหมด', 'value' => $totals['totalAmount'], 'note' => 'รวมทุกประเภทคอมมิชชั่น', 'format' => 'decimal'],
            ],
        ];
    }
    private static function buildPagedLedgerDetail(string $mode, array $filters, int $page): array
    {
        $query = self::ledgerDetailQuery($filters, self::ledgerCommissionTypesForMode($mode));
        $offset = ($page - 1) * $filters['pageSize'];

        $rows = (clone $query)
            ->selectRaw(
                'date(cl."createdAt") as report_date,
                coalesce(beneficiary."memberCode", \'' . self::COMPANY_FALLBACK_MEMBER_CODE . '\') as beneficiary_member_code,
                coalesce(beneficiary."name", \'' . self::COMPANY_FALLBACK_NAME . '\') as beneficiary_name,
                source."memberCode" as source_member_code,
                source."name" as source_name,
                coalesce(cl."levelNo", cl."tierNo") as level_no,
                cl."basePv" as base_pv,
                cl."rate" as rate,
                cl."commissionAmount" as amount'
            )
            ->orderByRaw('cl."createdAt" desc')
            ->orderByRaw('cl."id" desc')
            ->limit($filters['pageSize'])
            ->offset($offset)
            ->get()
            ->map(fn ($row) => self::mapLedgerDetailRow($row));

        $totalsRow = (clone $query)
            ->selectRaw(
                'count(*) as total_count,
                coalesce(sum(cl."basePv"), 0) as total_base_pv,
                coalesce(sum(cl."commissionAmount"), 0) as total_amount,
                coalesce(avg(cl."rate"), 0) as avg_rate'
            )
            ->first();
        $totalsRow ??= (object) [
            'total_count' => 0,
            'total_base_pv' => '0',
            'total_amount' => '0',
            'avg_rate' => '0',
        ];

        $totalCount = (int) ($totalsRow->total_count ?? 0);
        $totals = [
            'basePv' => (string) ($totalsRow->total_base_pv ?? '0'),
            'amount' => (string) ($totalsRow->total_amount ?? '0'),
        ];

        if ($mode === 'pool') {
            $totals['avgRate'] = (string) ($totalsRow->avg_rate ?? '0');
        }

        $summaryCards = [
            ['label' => 'รายการที่พบ', 'value' => (string) $totalCount, 'note' => 'จำนวนรายการหลังกรองทั้งหมด', 'format' => 'count'],
            ['label' => 'PV รวม', 'value' => $totals['basePv'], 'note' => 'PV ที่นำมาคำนวณทั้งหมด', 'format' => 'decimal'],
            ['label' => 'ยอดจ่ายรวม', 'value' => $totals['amount'], 'note' => 'ยอดคอมมิชชั่นหลังกรอง', 'format' => 'decimal'],
        ];

        if ($mode === 'pool') {
            $summaryCards[] = ['label' => 'อัตราพูลเฉลี่ย', 'value' => $totals['avgRate'], 'note' => 'อัตราที่ใช้คำนวณ pool จาก PV approved ของวันนั้น', 'format' => 'decimal'];
        }

        return [
            'title' => self::DETAIL_TITLES[$mode] ?? self::DETAIL_TITLES['direct'],
            'description' => self::DETAIL_DESCRIPTIONS[$mode] ?? self::DETAIL_DESCRIPTIONS['direct'],
            'rows' => $rows,
            'totals' => $totals,
            'totalCount' => $totalCount,
            'summaryCards' => $summaryCards,
        ];
    }

    private static function ledgerDetailQuery(array $filters, array $commissionTypes)
    {
        return self::baseLedgerQuery($filters)
            ->leftJoin(DB::raw('"User" as source'), function ($join) {
                $join->on(DB::raw('source."id"'), '=', DB::raw('cl."sourceUserId"'));
            })
            ->whereIn(DB::raw('cl."commissionType"'), $commissionTypes);
    }

    private static function mapLedgerDetailRow(object $row): array
    {
        return [
            'reportDate' => (string) $row->report_date,
            'beneficiaryMemberCode' => $row->beneficiary_member_code ?: '-',
            'beneficiaryName' => $row->beneficiary_name ?: '-',
            'sourceMemberCode' => $row->source_member_code ?: '-',
            'sourceName' => $row->source_name ?: '-',
            'levelNo' => $row->level_no ?? '-',
            'basePv' => (string) $row->base_pv,
            'rate' => (string) $row->rate,
            'amount' => (string) $row->amount,
        ];
    }

    public static function exportRows(string $mode, array $filters): Collection
    {
        return self::build($mode, $filters)['rows'];
    }

    public static function exportMeta(string $mode, array $filters): array
    {
        $mode = self::normalizeMode($mode);

        if ($mode === 'overview') {
            $totalsRow = self::overviewTotalsRow($filters);
            $totals = self::mapOverviewTotals($totalsRow);

            return [
                'title' => 'รายงานคอมมิชชั่น',
                'description' => 'รายงานคอมมิชชั่นรวมต่อสมาชิก แยกตามประเภทโบนัสและช่วงเวลาที่เลือก',
                'totals' => $totals,
                'totalCount' => (int) ($totalsRow->total_count ?? 0),
            ];
        }

        $totalsRow = (clone self::ledgerDetailQuery($filters, self::ledgerCommissionTypesForMode($mode)))
            ->selectRaw(
                'count(*) as total_count,
                coalesce(sum(cl."basePv"), 0) as total_base_pv,
                coalesce(sum(cl."commissionAmount"), 0) as total_amount,
                coalesce(avg(cl."rate"), 0) as avg_rate'
            )
            ->first();
        $totalsRow ??= (object) [
            'total_count' => 0,
            'total_base_pv' => '0',
            'total_amount' => '0',
            'avg_rate' => '0',
        ];

        $totals = [
            'basePv' => (string) ($totalsRow->total_base_pv ?? '0'),
            'amount' => (string) ($totalsRow->total_amount ?? '0'),
        ];

        if ($mode === 'pool') {
            $totals['avgRate'] = (string) ($totalsRow->avg_rate ?? '0');
        }

        return [
            'title' => self::DETAIL_TITLES[$mode] ?? self::DETAIL_TITLES['direct'],
            'description' => self::DETAIL_DESCRIPTIONS[$mode] ?? self::DETAIL_DESCRIPTIONS['direct'],
            'totals' => $totals,
            'totalCount' => (int) ($totalsRow->total_count ?? 0),
        ];
    }

    public static function exportRowCursor(string $mode, array $filters): LazyCollection
    {
        $mode = self::normalizeMode($mode);

        if ($mode === 'overview') {
            return (clone self::overviewRowsQuery($filters))
                ->orderByRaw('report_date desc')
                ->orderByRaw('beneficiary_member_code asc')
                ->cursor()
                ->map(fn ($row) => self::mapOverviewRow($row));
        }

        return (clone self::ledgerDetailQuery($filters, self::ledgerCommissionTypesForMode($mode)))
            ->selectRaw(
                'date(cl."createdAt") as report_date,
                coalesce(beneficiary."memberCode", \'' . self::COMPANY_FALLBACK_MEMBER_CODE . '\') as beneficiary_member_code,
                coalesce(beneficiary."name", \'' . self::COMPANY_FALLBACK_NAME . '\') as beneficiary_name,
                source."memberCode" as source_member_code,
                source."name" as source_name,
                coalesce(cl."levelNo", cl."tierNo") as level_no,
                cl."basePv" as base_pv,
                cl."rate" as rate,
                cl."commissionAmount" as amount'
            )
            ->orderByRaw('cl."createdAt" desc')
            ->orderByRaw('cl."id" desc')
            ->cursor()
            ->map(fn ($row) => self::mapLedgerDetailRow($row));
    }

    private static function ledgerCommissionTypesForMode(string $mode): array
    {
        return match ($mode) {
            'direct' => ['DIRECT'],
            'team' => ['TEAM_2LEG', 'TEAM_3LEG'],
            'matching' => ['MATCHING_L1', 'MATCHING_L2'],
            'pool' => ['POOL'],
            default => ['DIRECT'],
        };
    }
}
