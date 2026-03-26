<?php

namespace App\Orchid\Screens\Withdraw;

use App\Models\WithdrawRequest;
use Illuminate\Http\Request;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Layout;

class WithdrawRequestListScreen extends Screen
{
    public function query(Request $request): iterable
    {
        $baseQuery = WithdrawRequest::query()
            ->with('member')
            ->orderByDesc('requestedAt')
            ->orderByDesc('id');

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

        $fromDate = trim((string) $request->input('from_date', ''));
        if ($fromDate !== '') {
            $baseQuery->whereDate('requestedAt', '>=', $fromDate);
        }

        $toDate = trim((string) $request->input('to_date', ''));
        if ($toDate !== '') {
            $baseQuery->whereDate('requestedAt', '<=', $toDate);
        }

        $summaryQuery = clone $baseQuery;

        return [
            'filters' => [
                'search' => $search,
                'status' => $status,
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
            'summary' => [
                'totalRequests' => (int) $summaryQuery->count(),
                'totalAmount' => (float) ((clone $baseQuery)->sum('amount')),
                'totalNetAmount' => (float) ((clone $baseQuery)->sum('netBankAmount')),
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
                TD::make('requestedAt', 'วันที่')
                    ->render(fn (WithdrawRequest $request) => optional($request->requestedAt)->format('d/m/Y H:i')),
                TD::make('member', 'สมาชิก')
                    ->render(function (WithdrawRequest $request) {
                        $memberCode = (string) optional($request->member)->memberCode;
                        $memberName = (string) optional($request->member)->name;

                        $label = trim($memberName) !== '' ? $memberName : '-';
                        $url = route('platform.withdraw.detail', $request->id);

                        return '<a href="' . e($url) . '">' . e($label) . '</a><br><small>' . e($memberCode) . '</small>';
                    }),
                TD::make('bankName', 'บัญชีรับโอน')
                    ->render(function (WithdrawRequest $request) {
                        return e($request->bankName) . '<br><small>' . e($request->accountName) . ' / ' . e($request->accountNumber) . '</small>';
                    }),
                TD::make('amount', 'จำนวน')
                    ->align(TD::ALIGN_RIGHT)
                    ->render(fn (WithdrawRequest $request) => number_format((float) $request->amount, 2)),
                TD::make('taxAmount', 'ภาษี')
                    ->align(TD::ALIGN_RIGHT)
                    ->render(fn (WithdrawRequest $request) => number_format((float) $request->taxAmount, 2)),
                TD::make('feeAmount', 'ค่าธรรมเนียม')
                    ->align(TD::ALIGN_RIGHT)
                    ->render(fn (WithdrawRequest $request) => number_format((float) $request->feeAmount, 2)),
                TD::make('netBankAmount', 'ยอดเข้าธนาคาร')
                    ->align(TD::ALIGN_RIGHT)
                    ->render(fn (WithdrawRequest $request) => number_format((float) $request->netBankAmount, 2)),
                TD::make('status', 'สถานะ')
                    ->render(fn (WithdrawRequest $request) => e(strtolower((string) $request->status))),
            ]),
        ];
    }
}
