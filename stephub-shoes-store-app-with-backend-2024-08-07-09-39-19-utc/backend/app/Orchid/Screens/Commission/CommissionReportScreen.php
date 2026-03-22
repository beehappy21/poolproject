<?php

namespace App\Orchid\Screens\Commission;

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
            'commissionNav' => CommissionSettingsScreen::commissionNav('report'),
            'commissionSection' => [
                'title' => $report['title'],
                'eyebrow' => $report['title'],
                'description' => $report['description'],
                'accent' => '#2563eb',
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
}
