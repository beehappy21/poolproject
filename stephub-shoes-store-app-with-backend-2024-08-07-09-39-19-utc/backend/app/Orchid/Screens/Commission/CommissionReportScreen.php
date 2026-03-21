<?php

namespace App\Orchid\Screens\Commission;

use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Layout;

class CommissionReportScreen extends Screen
{
    private function resolveMode(Request $request): string
    {
        $mode = (string) ($request->route('reportMode') ?? 'overview');

        return in_array($mode, ['overview', 'direct', 'unilevel', 'matrix', 'pool'], true) ? $mode : 'overview';
    }

    public function query(Request $request): iterable
    {
        $mode = $this->resolveMode($request);
        $filters = [
            'memberFrom' => trim((string) $request->input('member_from', '')),
            'memberTo' => trim((string) $request->input('member_to', '')),
            'dateFrom' => trim((string) $request->input('date_from', '')),
            'dateTo' => trim((string) $request->input('date_to', '')),
            'pageSize' => max(10, min(100, (int) $request->input('page_size', 25))),
        ];

        $baseQuery = DB::connection('poolproject')
            ->table(DB::raw('"CommissionLedger" as cl'))
            ->leftJoin(DB::raw('"User" as beneficiary'), function ($join) {
                $join->on(DB::raw('beneficiary."id"'), '=', DB::raw('cl."beneficiaryUserId"'));
            });

        $matrixBaseQuery = DB::connection('poolproject')
            ->table(DB::raw('"MatrixPayout" as mp'))
            ->leftJoin(DB::raw('"User" as beneficiary'), function ($join) {
                $join->on(DB::raw('beneficiary."id"'), '=', DB::raw('mp."beneficiaryUserId"'));
            });

        if ($filters['memberFrom'] !== '') {
            $baseQuery->whereRaw('(beneficiary."memberCode" ilike ? or beneficiary."name" ilike ?)', [
                '%' . $filters['memberFrom'] . '%',
                '%' . $filters['memberFrom'] . '%',
            ]);
            $matrixBaseQuery->whereRaw('(beneficiary."memberCode" ilike ? or beneficiary."name" ilike ?)', [
                '%' . $filters['memberFrom'] . '%',
                '%' . $filters['memberFrom'] . '%',
            ]);
        }

        if ($filters['memberTo'] !== '') {
            $baseQuery->whereRaw('(beneficiary."memberCode" ilike ? or beneficiary."name" ilike ?)', [
                '%' . $filters['memberTo'] . '%',
                '%' . $filters['memberTo'] . '%',
            ]);
            $matrixBaseQuery->whereRaw('(beneficiary."memberCode" ilike ? or beneficiary."name" ilike ?)', [
                '%' . $filters['memberTo'] . '%',
                '%' . $filters['memberTo'] . '%',
            ]);
        }

        if ($filters['dateFrom'] !== '') {
            $baseQuery->whereRaw('date(cl."createdAt") >= ?', [$filters['dateFrom']]);
            $matrixBaseQuery->whereRaw('date(mp."createdAt") >= ?', [$filters['dateFrom']]);
        }

        if ($filters['dateTo'] !== '') {
            $baseQuery->whereRaw('date(cl."createdAt") <= ?', [$filters['dateTo']]);
            $matrixBaseQuery->whereRaw('date(mp."createdAt") <= ?', [$filters['dateTo']]);
        }

        $page = max(1, (int) $request->input('page', 1));
        if ($mode === 'overview') {
            $groupedQuery = (clone $baseQuery)
                ->selectRaw("
                    date(cl.\"createdAt\") as report_date,
                    beneficiary.\"memberCode\" as beneficiary_member_code,
                    beneficiary.\"name\" as beneficiary_name,
                    coalesce(sum(case when cl.\"commissionType\" = 'DIRECT' then cl.\"commissionAmount\" else 0 end), 0) as direct_amount,
                    coalesce(sum(case when cl.\"commissionType\" = 'POOL' then cl.\"commissionAmount\" else 0 end), 0) as pool_amount,
                    coalesce(sum(case when cl.\"commissionType\" = 'UNI' then cl.\"commissionAmount\" else 0 end), 0) as uni_amount,
                    coalesce(sum(cl.\"commissionAmount\"), 0) as total_amount
                ")
                ->groupByRaw('date(cl."createdAt"), beneficiary."memberCode", beneficiary."name"');

            $matrixGroupedQuery = (clone $matrixBaseQuery)
                ->selectRaw("
                    date(mp.\"createdAt\") as report_date,
                    beneficiary.\"memberCode\" as beneficiary_member_code,
                    beneficiary.\"name\" as beneficiary_name,
                    coalesce(sum(mp.\"payoutAmount\"), 0) as matrix_amount
                ")
                ->groupByRaw('date(mp."createdAt"), beneficiary."memberCode", beneficiary."name"');

            $commissionRows = $groupedQuery->get();
            $matrixRows = $matrixGroupedQuery->get();
            $merged = [];

            foreach ($commissionRows as $row) {
                $key = implode('|', [
                    (string) $row->report_date,
                    (string) ($row->beneficiary_member_code ?: '-'),
                    (string) ($row->beneficiary_name ?: '-'),
                ]);

                $merged[$key] = [
                    'reportDate' => (string) $row->report_date,
                    'beneficiaryMemberCode' => $row->beneficiary_member_code ?: '-',
                    'beneficiaryName' => $row->beneficiary_name ?: '-',
                    'directAmount' => (string) $row->direct_amount,
                    'poolAmount' => (string) $row->pool_amount,
                    'uniAmount' => (string) $row->uni_amount,
                    'matrixAmount' => '0',
                    'totalAmount' => (string) $row->total_amount,
                ];
            }

            foreach ($matrixRows as $row) {
                $key = implode('|', [
                    (string) $row->report_date,
                    (string) ($row->beneficiary_member_code ?: '-'),
                    (string) ($row->beneficiary_name ?: '-'),
                ]);

                if (!isset($merged[$key])) {
                    $merged[$key] = [
                        'reportDate' => (string) $row->report_date,
                        'beneficiaryMemberCode' => $row->beneficiary_member_code ?: '-',
                        'beneficiaryName' => $row->beneficiary_name ?: '-',
                        'directAmount' => '0',
                        'poolAmount' => '0',
                        'uniAmount' => '0',
                        'matrixAmount' => (string) $row->matrix_amount,
                        'totalAmount' => (string) $row->matrix_amount,
                    ];
                } else {
                    $merged[$key]['matrixAmount'] = (string) $row->matrix_amount;
                    $merged[$key]['totalAmount'] = (string) ((float) $merged[$key]['totalAmount'] + (float) $row->matrix_amount);
                }
            }

            $itemsCollection = collect(array_values($merged))
                ->sortBy([
                    ['reportDate', 'desc'],
                    ['beneficiaryMemberCode', 'asc'],
                ])
                ->values();

            $total = $itemsCollection->count();
            $items = $itemsCollection
                ->slice(($page - 1) * $filters['pageSize'], $filters['pageSize'])
                ->values()
                ->all();
        } else {
            if ($mode === 'matrix') {
                $title = 'Matrix Bonus';
                $detailQuery = (clone $matrixBaseQuery)
                    ->leftJoin(DB::raw('"User" as source'), function ($join) {
                        $join->on(DB::raw('source."id"'), '=', DB::raw('mp."sourceUserId"'));
                    });

                $detailRows = (clone $detailQuery)
                    ->selectRaw("
                        date(mp.\"createdAt\") as report_date,
                        beneficiary.\"memberCode\" as beneficiary_member_code,
                        beneficiary.\"name\" as beneficiary_name,
                        source.\"memberCode\" as source_member_code,
                        source.\"name\" as source_name,
                        mp.\"levelNo\" as level_no,
                        mp.\"basePv\" as base_pv,
                        mp.\"rate\" as rate,
                        mp.\"payoutAmount\" as amount
                    ")
                    ->orderByRaw('mp."createdAt" desc')
                    ->orderByRaw('mp."id" desc')
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
            } else {
                $commissionType = match ($mode) {
                    'direct' => 'DIRECT',
                    'unilevel' => 'UNI',
                    'pool' => 'POOL',
                    default => 'DIRECT',
                };
                $title = match ($mode) {
                    'direct' => 'Direct Bonus',
                    'unilevel' => 'Unilevel Bonus',
                    'pool' => 'Pool Bonus',
                    default => 'Direct Bonus',
                };

                $detailQuery = (clone $baseQuery)
                    ->leftJoin(DB::raw('"User" as source'), function ($join) {
                        $join->on(DB::raw('source."id"'), '=', DB::raw('cl."sourceUserId"'));
                    })
                    ->whereRaw('cl."commissionType" = ?', [$commissionType]);

                $detailRows = (clone $detailQuery)
                    ->selectRaw("
                        date(cl.\"createdAt\") as report_date,
                        beneficiary.\"memberCode\" as beneficiary_member_code,
                        beneficiary.\"name\" as beneficiary_name,
                        source.\"memberCode\" as source_member_code,
                        source.\"name\" as source_name,
                        coalesce(cl.\"levelNo\", cl.\"tierNo\") as level_no,
                        cl.\"basePv\" as base_pv,
                        cl.\"rate\" as rate,
                        cl.\"commissionAmount\" as amount
                    ")
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
            }

            $total = $detailRows->count();
            $items = $detailRows
                ->slice(($page - 1) * $filters['pageSize'], $filters['pageSize'])
                ->values()
                ->all();
        }

        $paginator = new LengthAwarePaginator(
            $items,
            $total,
            $filters['pageSize'],
            $page,
            [
                'path' => url()->current(),
                'query' => $request->query(),
            ]
        );

        return [
            'filters' => $filters,
            'commissionReportRows' => $paginator,
            'commissionNav' => CommissionSettingsScreen::commissionNav('report'),
            'commissionSection' => [
                'title' => $mode === 'overview' ? 'Commission Report' : $title,
                'eyebrow' => $mode === 'overview' ? 'Commission Report' : $title,
                'description' => $mode === 'overview'
                    ? 'รายงานคอมมิชชั่นรวมต่อสมาชิก แยกตามประเภทโบนัสและช่วงเวลาที่เลือก'
                    : 'รายงานรายการคอมมิชชั่นตามสมาชิก ช่วงเวลา และสายแนะนำ',
                'accent' => '#2563eb',
            ],
            'reportMode' => $mode,
        ];
    }

    public function name(): ?string
    {
        return 'Commission Report';
    }

    public function description(): ?string
    {
        return 'รายงานคอมมิชชั่นตามสมาชิก ประเภทคอม และช่วงเวลา';
    }

    public function commandBar(): iterable
    {
        return [];
    }

    public function layout(): iterable
    {
        return [
            Layout::view('commission.report'),
        ];
    }
}
