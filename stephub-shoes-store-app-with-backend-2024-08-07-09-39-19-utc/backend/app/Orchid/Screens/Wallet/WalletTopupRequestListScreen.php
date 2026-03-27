<?php

namespace App\Orchid\Screens\Wallet;

use App\Models\WalletTopupRequest;
use Illuminate\Http\Request;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Layout;

class WalletTopupRequestListScreen extends Screen
{
    public function query(Request $request): iterable
    {
        $baseQuery = WalletTopupRequest::query()
            ->with('member')
            ->orderByDesc('requestedAt')
            ->orderByDesc('id');

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $baseQuery->where(function ($query) use ($search) {
                $query
                    ->where('paymentMethod', 'ilike', '%'.$search.'%')
                    ->orWhere('note', 'ilike', '%'.$search.'%')
                    ->orWhereHas('member', function ($memberQuery) use ($search) {
                        $memberQuery
                            ->where('memberCode', 'ilike', '%'.$search.'%')
                            ->orWhere('name', 'ilike', '%'.$search.'%')
                            ->orWhere('email', 'ilike', '%'.$search.'%');
                    });
            });
        }

        $status = strtolower(trim((string) $request->input('status', '')));
        if ($status !== '') {
            $baseQuery->where('status', strtoupper($status));
        }

        return [
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'walletTopupRequests' => $baseQuery->paginate(20)->appends([
                'search' => $search,
                'status' => $status,
            ]),
        ];
    }

    public function name(): ?string
    {
        return 'คำขอเติม Wallet';
    }

    public function description(): ?string
    {
        return 'ตรวจสอบสลิปเติม wallet อนุมัติหรือปฏิเสธคำขอของสมาชิก';
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('เติม Wallet ให้สมาชิก')
                ->icon('bs.plus-circle')
                ->route('platform.wallet.topup.manual'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::view('wallet.topup-report-summary'),
            Layout::table('walletTopupRequests', [
                TD::make('id', 'ลำดับ')
                    ->render(fn (WalletTopupRequest $request) => '#'.$request->id),
                TD::make('requestedAt', 'วันที่')
                    ->render(fn (WalletTopupRequest $request) => optional($request->requestedAt)->format('d/m/Y H:i')),
                TD::make('member', 'สมาชิก')
                    ->render(function (WalletTopupRequest $request) {
                        $memberCode = (string) optional($request->member)->memberCode;
                        $memberName = (string) optional($request->member)->name;
                        $label = trim($memberName) !== '' ? $memberName : '-';
                        $url = route('platform.wallet.topup.detail', $request->id);

                        return '<a href="'.e($url).'">'.e($label).'</a><br><small>'.e($memberCode).'</small>';
                    }),
                TD::make('amount', 'ยอดเติม')
                    ->render(fn (WalletTopupRequest $request) => number_format((float) $request->amount, 2)),
                TD::make('paymentMethod', 'ช่องทาง')
                    ->render(fn (WalletTopupRequest $request) => e((string) $request->paymentMethod)),
                TD::make('transferSlipUrl', 'สลิป')
                    ->render(function (WalletTopupRequest $request) {
                        if (! $request->transferSlipUrl) {
                            return '<span class="text-muted">ไม่มี</span>';
                        }

                        $url = route('platform.wallet.topup.detail', $request->id);

                        return '<a href="'.e($url).'">ดูสลิป</a>';
                    }),
                TD::make('status', 'สถานะ')
                    ->render(fn (WalletTopupRequest $request) => e(strtolower((string) $request->status))),
            ]),
        ];
    }
}
