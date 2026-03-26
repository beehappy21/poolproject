<?php

namespace App\Orchid\Screens\Kyc;

use App\Models\KycRequest;
use Illuminate\Http\Request;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Layout;

class KycRequestListScreen extends Screen
{
    public function query(Request $request): iterable
    {
        $baseQuery = KycRequest::query()
            ->with('member')
            ->orderByDesc('submittedAt')
            ->orderByDesc('id');

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $baseQuery->where(function ($query) use ($search) {
                $query
                    ->where('nationalId', 'ilike', '%' . $search . '%')
                    ->orWhere('bankName', 'ilike', '%' . $search . '%')
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

        return [
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'kycRequests' => $baseQuery->paginate(20),
        ];
    }

    public function name(): ?string
    {
        return 'คำขอ KYC';
    }

    public function description(): ?string
    {
        return 'ตรวจสอบเอกสาร KYC อนุมัติหรือปฏิเสธคำขอสมาชิก';
    }

    public function commandBar(): iterable
    {
        return [];
    }

    public function layout(): iterable
    {
        return [
            Layout::view('kyc.report-summary'),
            Layout::table('kycRequests', [
                TD::make('id', 'ลำดับ')
                    ->render(fn (KycRequest $request) => '#' . $request->id),
                TD::make('submittedAt', 'วันที่')
                    ->render(fn (KycRequest $request) => optional($request->submittedAt)->format('d/m/Y H:i')),
                TD::make('member', 'สมาชิก')
                    ->render(function (KycRequest $request) {
                        $memberCode = (string) optional($request->member)->memberCode;
                        $memberName = (string) optional($request->member)->name;

                        $label = trim($memberName) !== '' ? $memberName : '-';
                        $url = route('platform.kyc.detail', $request->id);

                        return '<a href="' . e($url) . '">' . e($label) . '</a><br><small>' . e($memberCode) . '</small>';
                    }),
                TD::make('nationalId', 'เลขบัตร')
                    ->render(fn (KycRequest $request) => e((string) ($request->nationalId ?? '-'))),
                TD::make('bankName', 'ธนาคาร')
                    ->render(fn (KycRequest $request) => e((string) ($request->bankName ?? '-'))),
                TD::make('status', 'สถานะ')
                    ->render(fn (KycRequest $request) => e(strtolower((string) $request->status))),
            ]),
        ];
    }
}
