<?php

namespace App\Orchid\Screens\Commission;

use App\Support\CommissionBaselineDayRunner;
use App\Support\CommissionBaselineRuntimeResetter;
use App\Support\CommissionReportBuilder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Layout;

class CommissionReportScreen extends Screen
{
    private function resolveMode(Request $request): string
    {
        return CommissionReportBuilder::normalizeMode((string) ($request->route('reportMode') ?? 'overview'));
    }

    public function query(Request $request): iterable
    {
        $mode = $this->resolveMode($request);
        $filters = CommissionReportBuilder::filtersFromRequest($request);
        $page = max(1, (int) $request->input('page', 1));
        $report = CommissionReportBuilder::buildScreen($mode, $filters, $page);
        $reportTotals = $report['totals'];
        $items = $report['rows']->values()->all();
        $total = (int) ($report['totalCount'] ?? count($items));
        $modeMeta = $this->modeMeta($mode);
        $baselineDayStatus = CommissionBaselineDayRunner::currentDayStatus();
        $baselineResetStatus = CommissionBaselineRuntimeResetter::status();

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
            'baselineDayStatus' => $baselineDayStatus,
            'baselineResetStatus' => $baselineResetStatus,
            'nextPendingSettlementDate' => $baselineDayStatus['workingDate'] ?? CommissionBaselineDayRunner::nextActionDate(),
            'commissionNav' => CommissionSettingsScreen::commissionNav($mode, $request->except('page')),
            'commissionSection' => [
                'title' => $report['title'],
                'eyebrow' => $modeMeta['eyebrow'],
                'description' => $report['description'],
                'accent' => $modeMeta['accent'],
            ],
            'reportMode' => $mode,
        ];
    }

    public function name(): ?string
    {
        return 'รายงานคอมมิชชั่น';
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

    private function modeMeta(string $mode): array
    {
        return match ($mode) {
            'direct' => ['eyebrow' => 'Direct Bonus Report', 'accent' => '#0f766e'],
            'team' => ['eyebrow' => 'Team Bonus Report', 'accent' => '#ea580c'],
            'matching' => ['eyebrow' => 'Matching Bonus Report', 'accent' => '#7c3aed'],
            'pool' => ['eyebrow' => 'Pool Bonus Report', 'accent' => '#0284c7'],
            default => ['eyebrow' => 'Commission Report', 'accent' => '#2563eb'],
        };
    }
}
