<?php

namespace App\Orchid\Screens\Finance;

use App\Models\KycRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Layout;

class MemberBankAccountListScreen extends Screen
{
    public function query(Request $request): iterable
    {
        $search = trim((string) $request->input('search', ''));

        $latestKycIds = DB::connection('poolproject')
            ->table('KycRequest')
            ->selectRaw('MAX("id") as id')
            ->groupBy('userId');

        $baseQuery = KycRequest::query()
            ->with('member')
            ->joinSub($latestKycIds, 'latest_kyc', function ($join) {
                $join->on('KycRequest.id', '=', 'latest_kyc.id');
            })
            ->where(function ($query) {
                $query
                    ->whereNotNull('bankName')
                    ->orWhereNotNull('bankAccountName')
                    ->orWhereNotNull('bankAccountNumber');
            })
            ->orderBy('KycRequest.id');

        if ($search !== '') {
            $baseQuery->where(function ($query) use ($search) {
                $like = '%' . $search . '%';

                $query
                    ->where('bankName', 'ilike', $like)
                    ->orWhere('bankAccountName', 'ilike', $like)
                    ->orWhere('bankAccountNumber', 'ilike', $like)
                    ->orWhereHas('member', function ($memberQuery) use ($like) {
                        $memberQuery
                            ->where('memberCode', 'ilike', $like)
                            ->orWhere('name', 'ilike', $like);
                    });
            });
        }

        return [
            'search' => $search,
            'memberBankAccounts' => $baseQuery->paginate(20)->appends(['search' => $search]),
        ];
    }

    public function name(): ?string
    {
        return 'บัญชีสมาชิก';
    }

    public function description(): ?string
    {
        return 'รายการบัญชีธนาคารล่าสุดของสมาชิกสำหรับใช้งานด้านการเงิน';
    }

    public function commandBar(): iterable
    {
        return [];
    }

    public function layout(): iterable
    {
        return [
            Layout::view('finance.member-bank-search-bar'),
            Layout::table('memberBankAccounts', [
                TD::make('id', 'ลำดับ')
                    ->render(fn (KycRequest $request) => '#' . $request->id),
                TD::make('member_code', 'รหัสสมาชิก')
                    ->render(fn (KycRequest $request) => e((string) optional($request->member)->memberCode ?: '-')),
                TD::make('member_name', 'ชื่อ นามสกุล')
                    ->render(fn (KycRequest $request) => e((string) optional($request->member)->name ?: '-')),
                TD::make('bankAccountName', 'ชื่อบัญชี')
                    ->render(fn (KycRequest $request) => e((string) ($request->bankAccountName ?? '-'))),
                TD::make('bankName', 'ธนาคาร')
                    ->render(fn (KycRequest $request) => e((string) ($request->bankName ?? '-'))),
                TD::make('bankAccountNumber', 'เลขบัญชี')
                    ->render(fn (KycRequest $request) => e((string) ($request->bankAccountNumber ?? '-'))),
            ]),
        ];
    }
}
