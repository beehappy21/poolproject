<?php

namespace App\Orchid\Screens\Withdraw;

use App\Models\WithdrawRequest;
use App\Support\BaoAdminApiClient;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class WithdrawRequestListScreen extends Screen
{
    public function __construct(private readonly BaoAdminApiClient $apiClient)
    {
    }

    public function query(Request $request): iterable
    {
        $cycleOptions = WithdrawRequest::query()
            ->selectRaw('DATE((date_trunc(\'week\', "requestedAt") + interval \'6 days\')) as cycle_end')
            ->distinct()
            ->orderByDesc('cycle_end')
            ->pluck('cycle_end')
            ->filter()
            ->map(fn ($cycleEnd) => [
                'value' => (string) $cycleEnd,
                'label' => $this->formatCycleLabel((string) $cycleEnd),
            ])
            ->values()
            ->all();

        $selectedCycleEnd = trim((string) $request->input('cycle_end', ''));
        if ($selectedCycleEnd === '' && count($cycleOptions) > 0) {
            $selectedCycleEnd = (string) ($cycleOptions[0]['value'] ?? '');
        }

        $baseQuery = WithdrawRequest::query()
            ->with('member')
            ->orderByDesc('requestedAt')
            ->orderByDesc('id');

        if ($selectedCycleEnd !== '') {
            $baseQuery->whereRaw(
                'DATE((date_trunc(\'week\', "requestedAt") + interval \'6 days\')) = ?',
                [$selectedCycleEnd],
            );
        }

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $baseQuery->where(function ($query) use ($search) {
                $query
                    ->where('bankName', 'ilike', '%' . $search . '%')
                    ->orWhere('accountName', 'ilike', '%' . $search . '%')
                    ->orWhere('accountNumber', 'ilike', '%' . $search . '%')
                    ->orWhereHas('member', function ($memberQuery) use ($search) {
                        $memberQuery
                            ->where('memberCode', 'ilike', '%' . $search . '%')
                            ->orWhere('name', 'ilike', '%' . $search . '%');
                    });
            });
        }

        $status = strtolower(trim((string) $request->input('status', '')));
        if ($status !== '') {
            $baseQuery->where('status', strtoupper($status));
        }

        $summaryQuery = clone $baseQuery;
        $totalAmount = (float) ((clone $summaryQuery)->sum('amount'));
        $totalTaxAmount = (float) ((clone $baseQuery)->sum('taxAmount'));

        return [
            'filters' => [
                'search' => $search,
                'status' => $status,
                'cycle_end' => $selectedCycleEnd,
            ],
            'cycles' => $cycleOptions,
            'summary' => [
                'totalRequests' => (int) $summaryQuery->count(),
                'totalAmount' => $totalAmount,
                'totalNetAmount' => max($totalAmount - $totalTaxAmount, 0),
            ],
            'withdrawRequests' => $baseQuery->paginate(20),
        ];
    }

    public function name(): ?string
    {
        return 'รายงานแจ้งถอนเงิน';
    }

    public function description(): ?string
    {
        return 'ติดตามรายการแจ้งถอน อนุมัติ และส่งออกเอกสารโอนเงิน';
    }

    public function commandBar(): iterable
    {
        $query = request()->query();

        return [
            Link::make('CSV')
                ->icon('bs.download')
                ->route('platform.withdraw.export', array_merge($query, ['format' => 'csv'])),
            Link::make('Excel')
                ->icon('bs.file-earmark-spreadsheet')
                ->route('platform.withdraw.export', array_merge($query, ['format' => 'xlsx'])),
            Link::make('PDF')
                ->icon('bs.file-earmark-pdf')
                ->route('platform.withdraw.export', array_merge($query, ['format' => 'pdf'])),
            Link::make('เอกสารโอนเงิน')
                ->icon('bs-bank')
                ->route('platform.withdraw.export', array_merge($query, ['format' => 'xlsx', 'template' => 'bank'])),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::view('withdraw.report-summary'),
            Layout::table('withdrawRequests', [
                TD::make('id', 'ลำดับ')
                    ->render(fn (WithdrawRequest $request) => '#' . $request->id),
                TD::make('member_code', 'รหัสสมาชิก')
                    ->render(function (WithdrawRequest $request) {
                        $memberCode = (string) optional($request->member)->memberCode;
                        $url = route('platform.withdraw.detail', $request->id);

                        return '<a href="' . e($url) . '">' . e($memberCode ?: '-') . '</a>';
                    }),
                TD::make('member_name', 'ชื่อสมาชิก')
                    ->render(fn (WithdrawRequest $request) => e((string) optional($request->member)->name ?: '-')),
                TD::make('accountName', 'ชื่อบัญชี')
                    ->render(fn (WithdrawRequest $request) => e((string) $request->accountName)),
                TD::make('accountNumber', 'เลขบัญชี')
                    ->render(fn (WithdrawRequest $request) => e((string) $request->accountNumber)),
                TD::make('report_amount', 'จำนวนเงิน')
                    ->align(TD::ALIGN_RIGHT)
                    ->render(fn (WithdrawRequest $request) => number_format(max((float) $request->amount - (float) $request->taxAmount, 0), 2) . ' บาท'),
                TD::make('status', 'สถานะ')
                    ->render(fn (WithdrawRequest $request) => e(strtolower((string) $request->status))),
                TD::make('actions', 'ดำเนินการ')
                    ->align(TD::ALIGN_CENTER)
                    ->render(fn (WithdrawRequest $request) => Button::make('ยกเลิกคืนเงิน')
                        ->icon('bs.arrow-counterclockwise')
                        ->confirm('ยืนยันยกเลิกรายการถอนนี้และคืนเงินกลับบัญชี SW?')
                        ->method('cancelRequest')
                        ->parameters([
                            'withdrawRequest' => $request->id,
                        ])
                        ->canSee(in_array((string) $request->status, ['PENDING', 'APPROVED', 'EXPORTED'], true))),
            ]),
        ];
    }

    public function cancelRequest(Request $request)
    {
        $payload = $request->validate([
            'withdrawRequest' => ['required'],
        ]);

        try {
            $this->apiClient->request('POST', '/wallets/withdraw-requests/'.(string) $payload['withdrawRequest'].'/cancel', [
                'reason' => 'Cancelled from BAO weekly withdraw report',
            ]);
        } catch (\Throwable $exception) {
            Alert::error($exception->getMessage());

            return redirect()->route('platform.withdraw.list', request()->query());
        }

        Alert::info('ยกเลิกรายการถอนและคืนเงินกลับบัญชี SW แล้ว');

        return redirect()->route('platform.withdraw.list', request()->query());
    }

    private function formatCycleLabel(string $cycleEnd): string
    {
        $end = Carbon::parse($cycleEnd)->endOfDay();
        $start = $end->copy()->subDays(6)->startOfDay();

        return sprintf(
            '%s - %s',
            $start->locale('th')->translatedFormat('d M Y'),
            $end->locale('th')->translatedFormat('d M Y'),
        );
    }
}
