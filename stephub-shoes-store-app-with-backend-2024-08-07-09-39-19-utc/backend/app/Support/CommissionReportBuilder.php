<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\LazyCollection;
use Illuminate\Support\Facades\DB;

class CommissionReportBuilder
{
    private const DETAIL_DESCRIPTIONS = [
        'direct' => 'รายงานรายการคอมมิชชั่นตามสมาชิก ช่วงเวลา และสายแนะนำ',
        'unilevel' => 'รายงานรายการคอมมิชชั่นตามสมาชิก ช่วงเวลา และสายแนะนำ',
        'matrix' => 'รายงานโบนัสเมทริกซ์ แยกตามบอร์ด ชั้น และสมาชิกต้นทาง',
        'pool' => 'รายงานพูลโบนัส โดยยึดสูตร PV approved รวมของวัน x % pool แล้วหารด้วยจำนวนสมาชิกที่ eligible ในวันนั้น',
        'cashback' => 'รายงาน cash back จากยอด PV ซื้อส่วนตัวของสมาชิกที่ถูกอนุมัติ',
    ];

    private const DETAIL_TITLES = [
        'direct' => 'รายงานโบนัสแนะนำ',
        'unilevel' => 'รายงานยูนิลีเวลโบนัส',
        'matrix' => 'รายงานเมทริกซ์โบนัส',
        'pool' => 'รายงานพูลโบนัส',
        'cashback' => 'รายงาน Cash Back Bonus',
    ];

    public static function normalizeMode(?string $mode): string
    {
        $mode = (string) ($mode ?? 'overview');

        return in_array($mode, ['overview', 'direct', 'unilevel', 'matrix', 'pool', 'cashback'], true) ? $mode : 'overview';
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
        $matrixBaseQuery = self::baseMatrixQuery($filters);

        if ($mode === 'overview') {
            return self::buildOverview($filters, $baseQuery, $matrixBaseQuery);
        }

        return self::buildDetail($mode, $filters, $baseQuery, $matrixBaseQuery);
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

    private static function baseMatrixQuery(array $filters)
    {
        $query = DB::connection('poolproject')
            ->table(DB::raw('"MatrixPayout" as mp'))
            ->leftJoin(DB::raw('"User" as beneficiary'), function ($join) {
                $join->on(DB::raw('beneficiary."id"'), '=', DB::raw('mp."beneficiaryUserId"'));
            });

        self::applyBeneficiaryFilters($query, $filters, 'mp', 'beneficiary');

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

    private static function buildOverview(array $filters, $baseQuery, $matrixBaseQuery): array
    {
        unset($baseQuery, $matrixBaseQuery);

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

    private static function buildDetail(string $mode, array $filters, $baseQuery, $matrixBaseQuery): array
    {
        if ($mode === 'matrix') {
            $detailRows = (clone $matrixBaseQuery)
                ->leftJoin(DB::raw('"User" as source'), function ($join) {
                    $join->on(DB::raw('source."id"'), '=', DB::raw('mp."sourceUserId"'));
                })
                ->selectRaw(
                    'date(mp."createdAt") as report_date,
                    beneficiary."memberCode" as beneficiary_member_code,
                    beneficiary."name" as beneficiary_name,
                    source."memberCode" as source_member_code,
                    source."name" as source_name,
                    mp."boardNo" as board_no,
                    mp."levelNo" as level_no,
                    mp."basePv" as base_pv,
                    mp."rate" as rate,
                    mp."payoutAmount" as amount'
                )
                ->orderByRaw('mp."createdAt" desc')
                ->orderByRaw('mp."id" desc')
                ->get()
                ->map(fn ($row) => [
                    'reportDate' => (string) $row->report_date,
                    'beneficiaryMemberCode' => $row->beneficiary_member_code ?: '-',
                    'beneficiaryName' => $row->beneficiary_name ?: '-',
                    'sourceMemberCode' => $row->source_member_code ?: '-',
                    'sourceName' => $row->source_name ?: '-',
                    'boardNo' => $row->board_no ?? '-',
                    'boardLabel' => $row->board_no !== null ? 'Board ' . $row->board_no : '-',
                    'levelNo' => $row->level_no ?? '-',
                    'basePv' => (string) $row->base_pv,
                    'rate' => (string) $row->rate,
                    'amount' => (string) $row->amount,
                ]);

            $totals = [
                'basePv' => (string) $detailRows->sum(fn (array $row) => (float) $row['basePv']),
                'amount' => (string) $detailRows->sum(fn (array $row) => (float) $row['amount']),
                'boardCount' => (string) $detailRows
                    ->map(fn (array $row) => ($row['beneficiaryMemberCode'] ?? '-') . '|' . ($row['boardNo'] ?? '-'))
                    ->filter(fn (string $value) => !str_ends_with($value, '|-'))
                    ->unique()
                    ->count(),
            ];

            return [
                'title' => 'รายงานเมทริกซ์โบนัส',
                'description' => 'รายงานโบนัสเมทริกซ์ แยกตามบอร์ด ชั้น และสมาชิกต้นทาง',
                'rows' => $detailRows,
                'totals' => $totals,
                'summaryCards' => [
                    ['label' => 'รายการที่พบ', 'value' => (string) $detailRows->count(), 'note' => 'จำนวนรายการ matrix payout', 'format' => 'count'],
                    ['label' => 'จำนวนบอร์ด', 'value' => $totals['boardCount'], 'note' => 'จำนวนบอร์ดของสมาชิกที่มีรายการในผลลัพธ์นี้', 'format' => 'count'],
                    ['label' => 'PV รวม', 'value' => $totals['basePv'], 'note' => 'PV ที่นำมาคำนวณทั้งหมด', 'format' => 'decimal'],
                    ['label' => 'ยอดจ่ายรวม', 'value' => $totals['amount'], 'note' => 'จำนวนเงิน matrix ทั้งหมด', 'format' => 'decimal'],
                ],
            ];
        }

        $commissionType = match ($mode) {
            'direct' => 'DIRECT',
            'unilevel' => 'UNI',
            'pool' => 'POOL',
            'cashback' => 'CASHBACK',
            default => 'DIRECT',
        };
        $title = self::DETAIL_TITLES[$mode] ?? self::DETAIL_TITLES['direct'];

        $detailQuery = (clone $baseQuery)
            ->leftJoin(DB::raw('"User" as source'), function ($join) {
                $join->on(DB::raw('source."id"'), '=', DB::raw('cl."sourceUserId"'));
            })
            ->whereRaw('cl."commissionType" = ?', [$commissionType]);

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
        return $mode === 'matrix'
            ? self::buildPagedMatrixDetail($filters, $page)
            : self::buildPagedLedgerDetail($mode, $filters, $page);
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
                coalesce(sum(cashback_amount), 0) as cashback_amount,
                coalesce(sum(pool_amount), 0) as pool_amount,
                coalesce(sum(uni_amount), 0) as uni_amount,
                coalesce(sum(matrix_amount), 0) as matrix_amount,
                coalesce(sum(total_amount), 0) as total_amount'
            )
            ->groupBy('report_date', 'beneficiary_member_code', 'beneficiary_name');
    }

    private static function overviewUnionQuery(array $filters)
    {
        $commissionRows = self::overviewCommissionSourceQuery($filters);
        $matrixRows = self::overviewMatrixSourceQuery($filters);

        return $commissionRows->unionAll($matrixRows);
    }

    private static function overviewCommissionSourceQuery(array $filters)
    {
        return self::baseLedgerQuery($filters)
            ->selectRaw(
                'date(cl."createdAt") as report_date,
                coalesce(beneficiary."memberCode", \'-\') as beneficiary_member_code,
                coalesce(beneficiary."name", \'-\') as beneficiary_name,
                coalesce(sum(case when cl."commissionType" = \'DIRECT\' then cl."commissionAmount" else 0 end), 0) as direct_amount,
                coalesce(sum(case when cl."commissionType" = \'CASHBACK\' then cl."commissionAmount" else 0 end), 0) as cashback_amount,
                coalesce(sum(case when cl."commissionType" = \'POOL\' then cl."commissionAmount" else 0 end), 0) as pool_amount,
                coalesce(sum(case when cl."commissionType" = \'UNI\' then cl."commissionAmount" else 0 end), 0) as uni_amount,
                0 as matrix_amount,
                coalesce(sum(cl."commissionAmount"), 0) as total_amount'
            )
            ->groupByRaw('date(cl."createdAt"), coalesce(beneficiary."memberCode", \'-\'), coalesce(beneficiary."name", \'-\')');
    }

    private static function overviewMatrixSourceQuery(array $filters)
    {
        return self::baseMatrixQuery($filters)
            ->selectRaw(
                'date(mp."createdAt") as report_date,
                coalesce(beneficiary."memberCode", \'-\') as beneficiary_member_code,
                coalesce(beneficiary."name", \'-\') as beneficiary_name,
                0 as direct_amount,
                0 as cashback_amount,
                0 as pool_amount,
                0 as uni_amount,
                coalesce(sum(mp."payoutAmount"), 0) as matrix_amount,
                coalesce(sum(mp."payoutAmount"), 0) as total_amount'
            )
            ->groupByRaw('date(mp."createdAt"), coalesce(beneficiary."memberCode", \'-\'), coalesce(beneficiary."name", \'-\')');
    }

    private static function overviewTotalsRow(array $filters): object
    {
        $row = DB::connection('poolproject')
            ->query()
            ->fromSub(self::overviewRowsQuery($filters), 'overview_rows')
            ->selectRaw(
                'count(*) as total_count,
                coalesce(sum(direct_amount), 0) as direct_amount,
                coalesce(sum(cashback_amount), 0) as cashback_amount,
                coalesce(sum(pool_amount), 0) as pool_amount,
                coalesce(sum(uni_amount), 0) as uni_amount,
                coalesce(sum(matrix_amount), 0) as matrix_amount,
                coalesce(sum(total_amount), 0) as total_amount'
            )
            ->first();

        return $row ?? (object) [
            'total_count' => 0,
            'direct_amount' => '0',
            'cashback_amount' => '0',
            'pool_amount' => '0',
            'uni_amount' => '0',
            'matrix_amount' => '0',
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
            'cashbackAmount' => (string) $row->cashback_amount,
            'poolAmount' => (string) $row->pool_amount,
            'uniAmount' => (string) $row->uni_amount,
            'matrixAmount' => (string) $row->matrix_amount,
            'totalAmount' => (string) $row->total_amount,
        ];
    }

    private static function mapOverviewTotals(object $row): array
    {
        return [
            'directAmount' => (string) ($row->direct_amount ?? '0'),
            'cashbackAmount' => (string) ($row->cashback_amount ?? '0'),
            'poolAmount' => (string) ($row->pool_amount ?? '0'),
            'uniAmount' => (string) ($row->uni_amount ?? '0'),
            'matrixAmount' => (string) ($row->matrix_amount ?? '0'),
            'totalAmount' => (string) ($row->total_amount ?? '0'),
        ];
    }

    private static function overviewPayload(Collection $rows, array $totals, int $totalCount): array
    {
        return [
            'title' => 'รายงานคอมมิชชั่น',
            'description' => 'รายงานคอมมิชชั่นรวมต่อสมาชิก แยกตามประเภทโบนัสและช่วงเวลาที่เลือก',
            'rows' => $rows,
            'totals' => $totals,
            'summaryCards' => [
                ['label' => 'รายการที่พบ', 'value' => (string) $totalCount, 'note' => 'จำนวนแถวหลังกรองทั้งหมด', 'format' => 'count'],
                ['label' => 'โบนัสแนะนำรวม', 'value' => $totals['directAmount'], 'note' => 'ยอด direct bonus', 'format' => 'decimal'],
                ['label' => 'Cash back รวม', 'value' => $totals['cashbackAmount'], 'note' => 'ยอด cashback bonus', 'format' => 'decimal'],
                ['label' => 'ยูนิลีเวลรวม', 'value' => $totals['uniAmount'], 'note' => 'ยอด unilevel bonus', 'format' => 'decimal'],
                ['label' => 'เมทริกซ์รวม', 'value' => $totals['matrixAmount'], 'note' => 'ยอด matrix payout', 'format' => 'decimal'],
                ['label' => 'ยอดรวมทั้งหมด', 'value' => $totals['totalAmount'], 'note' => 'รวมทุกประเภทคอมมิชชั่น', 'format' => 'decimal'],
            ],
        ];
    }

    private static function buildPagedMatrixDetail(array $filters, int $page): array
    {
        $query = self::matrixDetailQuery($filters);
        $offset = ($page - 1) * $filters['pageSize'];

        $rows = (clone $query)
            ->selectRaw(
                'date(mp."createdAt") as report_date,
                beneficiary."memberCode" as beneficiary_member_code,
                beneficiary."name" as beneficiary_name,
                source."memberCode" as source_member_code,
                source."name" as source_name,
                mp."boardNo" as board_no,
                mp."levelNo" as level_no,
                mp."basePv" as base_pv,
                mp."rate" as rate,
                mp."payoutAmount" as amount'
            )
            ->orderByRaw('mp."createdAt" desc')
            ->orderByRaw('mp."id" desc')
            ->limit($filters['pageSize'])
            ->offset($offset)
            ->get()
            ->map(fn ($row) => self::mapMatrixDetailRow($row));

        $totalsRow = (clone $query)
            ->selectRaw(
                'count(*) as total_count,
                coalesce(sum(mp."basePv"), 0) as total_base_pv,
                coalesce(sum(mp."payoutAmount"), 0) as total_amount,
                count(distinct case
                    when mp."boardNo" is null then null
                    else concat(coalesce(beneficiary."memberCode", \'-\'), \'|\', mp."boardNo"::text)
                end) as board_count'
            )
            ->first();
        $totalsRow ??= (object) [
            'total_count' => 0,
            'total_base_pv' => '0',
            'total_amount' => '0',
            'board_count' => 0,
        ];

        $totalCount = (int) ($totalsRow->total_count ?? 0);
        $totals = [
            'basePv' => (string) ($totalsRow->total_base_pv ?? '0'),
            'amount' => (string) ($totalsRow->total_amount ?? '0'),
            'boardCount' => (string) ($totalsRow->board_count ?? '0'),
        ];

        return [
            'title' => self::DETAIL_TITLES['matrix'],
            'description' => self::DETAIL_DESCRIPTIONS['matrix'],
            'rows' => $rows,
            'totals' => $totals,
            'totalCount' => $totalCount,
            'summaryCards' => [
                ['label' => 'รายการที่พบ', 'value' => (string) $totalCount, 'note' => 'จำนวนรายการ matrix payout', 'format' => 'count'],
                ['label' => 'จำนวนบอร์ด', 'value' => $totals['boardCount'], 'note' => 'จำนวนบอร์ดของสมาชิกที่มีรายการในผลลัพธ์นี้', 'format' => 'count'],
                ['label' => 'PV รวม', 'value' => $totals['basePv'], 'note' => 'PV ที่นำมาคำนวณทั้งหมด', 'format' => 'decimal'],
                ['label' => 'ยอดจ่ายรวม', 'value' => $totals['amount'], 'note' => 'จำนวนเงิน matrix ทั้งหมด', 'format' => 'decimal'],
            ],
        ];
    }

    private static function buildPagedLedgerDetail(string $mode, array $filters, int $page): array
    {
        $commissionType = match ($mode) {
            'direct' => 'DIRECT',
            'unilevel' => 'UNI',
            'pool' => 'POOL',
            'cashback' => 'CASHBACK',
            default => 'DIRECT',
        };
        $query = self::ledgerDetailQuery($filters, $commissionType);
        $offset = ($page - 1) * $filters['pageSize'];

        $rows = (clone $query)
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

    private static function matrixDetailQuery(array $filters)
    {
        return self::baseMatrixQuery($filters)
            ->leftJoin(DB::raw('"User" as source'), function ($join) {
                $join->on(DB::raw('source."id"'), '=', DB::raw('mp."sourceUserId"'));
            });
    }

    private static function ledgerDetailQuery(array $filters, string $commissionType)
    {
        return self::baseLedgerQuery($filters)
            ->leftJoin(DB::raw('"User" as source'), function ($join) {
                $join->on(DB::raw('source."id"'), '=', DB::raw('cl."sourceUserId"'));
            })
            ->whereRaw('cl."commissionType" = ?', [$commissionType]);
    }

    private static function mapMatrixDetailRow(object $row): array
    {
        return [
            'reportDate' => (string) $row->report_date,
            'beneficiaryMemberCode' => $row->beneficiary_member_code ?: '-',
            'beneficiaryName' => $row->beneficiary_name ?: '-',
            'sourceMemberCode' => $row->source_member_code ?: '-',
            'sourceName' => $row->source_name ?: '-',
            'boardNo' => $row->board_no ?? '-',
            'boardLabel' => $row->board_no !== null ? 'Board ' . $row->board_no : '-',
            'levelNo' => $row->level_no ?? '-',
            'basePv' => (string) $row->base_pv,
            'rate' => (string) $row->rate,
            'amount' => (string) $row->amount,
        ];
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

        if ($mode === 'matrix') {
            $totalsRow = (clone self::matrixDetailQuery($filters))
                ->selectRaw(
                    'count(*) as total_count,
                    coalesce(sum(mp."basePv"), 0) as total_base_pv,
                    coalesce(sum(mp."payoutAmount"), 0) as total_amount,
                    count(distinct case
                        when mp."boardNo" is null then null
                        else concat(coalesce(beneficiary."memberCode", \'-\'), \'|\', mp."boardNo"::text)
                    end) as board_count'
                )
                ->first();
            $totalsRow ??= (object) [
                'total_count' => 0,
                'total_base_pv' => '0',
                'total_amount' => '0',
                'board_count' => 0,
            ];

            return [
                'title' => self::DETAIL_TITLES['matrix'],
                'description' => self::DETAIL_DESCRIPTIONS['matrix'],
                'totals' => [
                    'basePv' => (string) ($totalsRow->total_base_pv ?? '0'),
                    'amount' => (string) ($totalsRow->total_amount ?? '0'),
                    'boardCount' => (string) ($totalsRow->board_count ?? '0'),
                ],
                'totalCount' => (int) ($totalsRow->total_count ?? 0),
            ];
        }

        $commissionType = match ($mode) {
            'direct' => 'DIRECT',
            'unilevel' => 'UNI',
            'pool' => 'POOL',
            'cashback' => 'CASHBACK',
            default => 'DIRECT',
        };
        $totalsRow = (clone self::ledgerDetailQuery($filters, $commissionType))
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

        if ($mode === 'matrix') {
            return (clone self::matrixDetailQuery($filters))
                ->selectRaw(
                    'date(mp."createdAt") as report_date,
                    beneficiary."memberCode" as beneficiary_member_code,
                    beneficiary."name" as beneficiary_name,
                    source."memberCode" as source_member_code,
                    source."name" as source_name,
                    mp."boardNo" as board_no,
                    mp."levelNo" as level_no,
                    mp."basePv" as base_pv,
                    mp."rate" as rate,
                    mp."payoutAmount" as amount'
                )
                ->orderByRaw('mp."createdAt" desc')
                ->orderByRaw('mp."id" desc')
                ->cursor()
                ->map(fn ($row) => self::mapMatrixDetailRow($row));
        }

        $commissionType = match ($mode) {
            'direct' => 'DIRECT',
            'unilevel' => 'UNI',
            'pool' => 'POOL',
            default => 'DIRECT',
        };

        return (clone self::ledgerDetailQuery($filters, $commissionType))
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
            ->cursor()
            ->map(fn ($row) => self::mapLedgerDetailRow($row));
    }
}
