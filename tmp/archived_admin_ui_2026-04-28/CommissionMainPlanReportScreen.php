<?php

namespace App\Orchid\Screens\Commission;

use App\Support\CommissionReportBuilder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Layout;

class CommissionMainPlanReportScreen extends Screen
{
    public function query(Request $request): iterable
    {
        $mode = 'overview';
        $filters = CommissionReportBuilder::filtersFromRequest($request);
        $page = max(1, (int) $request->input('page', 1));
        $report = CommissionReportBuilder::buildScreen($mode, $filters, $page);
        $reportTotals = $report['totals'];
        $items = $report['rows']->values()->all();
        $total = (int) ($report['totalCount'] ?? count($items));
        $mainPlanLiveSummary = $this->buildMainPlanLiveSummary($filters);

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
            'commissionReportTotals' => $reportTotals,
            'commissionReportSummaryCards' => $report['summaryCards'],
            'commissionMainPlanLiveSummaryCards' => $mainPlanLiveSummary['cards'],
            'commissionMainPlanMeta' => [
                'calcStart' => 'approved_at',
                'scope' => 'Direct / Pool / Matrix',
                'routeIsolation' => 'Uses copied BAO main-plan report only',
                'latestApprovedAt' => $mainPlanLiveSummary['latestApprovedAt'],
            ],
            'commissionNav' => CommissionSettingsScreen::commissionNav('report'),
            'commissionSection' => [
                'title' => 'รายงานคอมมิชชั่นแผนหลัก',
                'eyebrow' => 'Commission Main Plan Report',
                'description' => 'รายงานชุดใหม่สำหรับงาน commission main plan โดยแยกจากหน้า report เดิมและใช้เป็นพื้นที่เตรียมงานรอบนี้',
                'accent' => '#0f766e',
            ],
            'reportMode' => $mode,
        ];
    }

    public function name(): ?string
    {
        return 'รายงานคอมมิชชั่นแผนหลัก';
    }

    public function description(): ?string
    {
        return 'รายงาน BAO ชุดใหม่สำหรับ main commission plan';
    }

    public function commandBar(): iterable
    {
        return [];
    }

    public function layout(): iterable
    {
        return [
            Layout::view('commission.main-plan-report'),
        ];
    }

    private function buildMainPlanLiveSummary(array $filters): array
    {
        $countedCommissionStatuses = ['APPROVED', 'HELD', 'WITHDRAWABLE', 'RESERVED_FOR_PAYOUT', 'PAID_OUT'];
        $countedMatrixStatuses = ['PENDING', 'APPROVED', 'PAID'];
        $countedPoolStatuses = ['APPROVED', 'HELD', 'WITHDRAWABLE', 'RESERVED_FOR_PAYOUT', 'PAID_OUT'];

        $ledgerSummary = DB::connection('poolproject')
            ->table(DB::raw('"CommissionLedger" as cl'))
            ->leftJoin(DB::raw('"User" as beneficiary'), DB::raw('beneficiary."id"'), '=', DB::raw('cl."beneficiaryUserId"'))
            ->whereIn('cl.commissionType', ['DIRECT', 'UNI', 'CASHBACK'])
            ->when(($filters['memberFrom'] ?? '') !== '', function ($query) use ($filters) {
                $needle = '%' . $filters['memberFrom'] . '%';
                $query->whereRaw('(beneficiary."memberCode" ilike ? or beneficiary."name" ilike ?)', [$needle, $needle]);
            })
            ->when(($filters['memberTo'] ?? '') !== '', function ($query) use ($filters) {
                $needle = '%' . $filters['memberTo'] . '%';
                $query->whereRaw('(beneficiary."memberCode" ilike ? or beneficiary."name" ilike ?)', [$needle, $needle]);
            })
            ->when(($filters['dateFrom'] ?? '') !== '', function ($query) use ($filters) {
                $query->whereRaw('date(cl."createdAt") >= ?', [$filters['dateFrom']]);
            })
            ->when(($filters['dateTo'] ?? '') !== '', function ($query) use ($filters) {
                $query->whereRaw('date(cl."createdAt") <= ?', [$filters['dateTo']]);
            })
            ->selectRaw('
                count(*) as total_entries,
                sum(case when cl."status" in (?, ?, ?, ?, ?) then 1 else 0 end) as approved_entries,
                sum(case when cl."status" = ? then 1 else 0 end) as fallback_entries,
                coalesce(sum(case when cl."status" in (?, ?, ?, ?, ?) then cl."commissionAmount" else 0 end), 0) as approved_amount,
                max(case when cl."status" in (?, ?, ?, ?, ?) then cl."createdAt" else null end) as latest_activity_at
            ', [
                ...$countedCommissionStatuses,
                'FALLBACK',
                ...$countedCommissionStatuses,
                ...$countedCommissionStatuses,
            ])
            ->first();

        $matrixSummary = DB::connection('poolproject')
            ->table(DB::raw('"MatrixPayout" as mp'))
            ->leftJoin(DB::raw('"User" as beneficiary'), DB::raw('beneficiary."id"'), '=', DB::raw('mp."beneficiaryUserId"'))
            ->when(($filters['memberFrom'] ?? '') !== '', function ($query) use ($filters) {
                $needle = '%' . $filters['memberFrom'] . '%';
                $query->whereRaw('(beneficiary."memberCode" ilike ? or beneficiary."name" ilike ?)', [$needle, $needle]);
            })
            ->when(($filters['memberTo'] ?? '') !== '', function ($query) use ($filters) {
                $needle = '%' . $filters['memberTo'] . '%';
                $query->whereRaw('(beneficiary."memberCode" ilike ? or beneficiary."name" ilike ?)', [$needle, $needle]);
            })
            ->when(($filters['dateFrom'] ?? '') !== '', function ($query) use ($filters) {
                $query->whereRaw('date(mp."createdAt") >= ?', [$filters['dateFrom']]);
            })
            ->when(($filters['dateTo'] ?? '') !== '', function ($query) use ($filters) {
                $query->whereRaw('date(mp."createdAt") <= ?', [$filters['dateTo']]);
            })
            ->selectRaw('
                count(*) as payout_count,
                coalesce(sum(case when mp."status" in (?, ?, ?) then mp."payoutAmount" else 0 end), 0) as payout_amount,
                max(case when mp."status" in (?, ?, ?) then mp."createdAt" else null end) as latest_activity_at
            ', [
                ...$countedMatrixStatuses,
                ...$countedMatrixStatuses,
            ])
            ->first();

        $poolSummary = DB::connection('poolproject')
            ->table(DB::raw('"DailyPoolPayout" as dpp'))
            ->leftJoin(DB::raw('"User" as beneficiary'), DB::raw('beneficiary."id"'), '=', DB::raw('dpp."userId"'))
            ->when(($filters['memberFrom'] ?? '') !== '', function ($query) use ($filters) {
                $needle = '%' . $filters['memberFrom'] . '%';
                $query->whereRaw('(beneficiary."memberCode" ilike ? or beneficiary."name" ilike ?)', [$needle, $needle]);
            })
            ->when(($filters['memberTo'] ?? '') !== '', function ($query) use ($filters) {
                $needle = '%' . $filters['memberTo'] . '%';
                $query->whereRaw('(beneficiary."memberCode" ilike ? or beneficiary."name" ilike ?)', [$needle, $needle]);
            })
            ->when(($filters['dateFrom'] ?? '') !== '', function ($query) use ($filters) {
                $query->whereRaw('date(dpp."createdAt") >= ?', [$filters['dateFrom']]);
            })
            ->when(($filters['dateTo'] ?? '') !== '', function ($query) use ($filters) {
                $query->whereRaw('date(dpp."createdAt") <= ?', [$filters['dateTo']]);
            })
            ->selectRaw('
                count(*) as payout_count,
                coalesce(sum(case when dpp."status" in (?, ?, ?, ?, ?) then dpp."payoutAmount" else 0 end), 0) as payout_amount,
                max(case when dpp."status" in (?, ?, ?, ?, ?) then dpp."createdAt" else null end) as latest_activity_at
            ', [
                ...$countedPoolStatuses,
                ...$countedPoolStatuses,
            ])
            ->first();

        $fallbackSummary = DB::connection('poolproject')
            ->table(DB::raw('"CompanyBonusLedger" as cbl'))
            ->when(($filters['dateFrom'] ?? '') !== '', function ($query) use ($filters) {
                $query->whereRaw('date(cbl."createdAt") >= ?', [$filters['dateFrom']]);
            })
            ->when(($filters['dateTo'] ?? '') !== '', function ($query) use ($filters) {
                $query->whereRaw('date(cbl."createdAt") <= ?', [$filters['dateTo']]);
            })
            ->selectRaw('count(*) as fallback_count, coalesce(sum(cbl."amount"), 0) as fallback_amount')
            ->first();

        $latestApprovedAt = collect([
            $ledgerSummary?->latest_activity_at,
            $matrixSummary?->latest_activity_at,
            $poolSummary?->latest_activity_at,
        ])
            ->filter()
            ->map(fn ($value) => Carbon::parse($value))
            ->sortDesc()
            ->first();

        return [
            'latestApprovedAt' => $latestApprovedAt?->format('Y-m-d H:i:s') ?? '-',
            'cards' => [
                [
                    'label' => 'Ledger จริง',
                    'value' => (string) ($ledgerSummary->approved_amount ?? 0),
                    'note' => 'รวม Direct / Unilevel / Cashback ที่นับในแผนหลัก',
                    'format' => 'decimal',
                ],
                [
                    'label' => 'Matrix จริง',
                    'value' => (string) ($matrixSummary->payout_amount ?? 0),
                    'note' => 'รวม matrix payout จากชุดข้อมูลจริงของสมาชิก',
                    'format' => 'decimal',
                ],
                [
                    'label' => 'Pool จริง',
                    'value' => (string) ($poolSummary->payout_amount ?? 0),
                    'note' => 'รวม pool payout จริงตามรอบที่ถูกสร้างแล้ว',
                    'format' => 'decimal',
                ],
                [
                    'label' => 'Fallback บริษัท',
                    'value' => (string) ($fallbackSummary->fallback_amount ?? 0),
                    'note' => 'ยอด fallback ที่ถูกบันทึกเข้าบริษัทในช่วงที่กรอง',
                    'format' => 'decimal',
                ],
                [
                    'label' => 'Approved Entries',
                    'value' => (string) ($ledgerSummary->approved_entries ?? 0),
                    'note' => 'จำนวนรายการ ledger ที่ยังนับอยู่จริง',
                    'format' => 'count',
                ],
                [
                    'label' => 'Latest Approved',
                    'value' => $latestApprovedAt?->format('Y-m-d H:i:s') ?? '-',
                    'note' => 'เวลาล่าสุดของรายการหลักที่เข้าเงื่อนไขคำนวณ',
                    'format' => 'text',
                ],
            ],
        ];
    }
}
