<?php

declare(strict_types=1);

namespace App\Orchid\Screens\Wallet;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Layout;

class WalletTransactionListScreen extends Screen
{
    protected const MODE_CW_TO_SW = 'cw-to-sw';
    protected const MODE_SW_TRANSFER = 'sw-transfer';

    public function query(Request $request): iterable
    {
        $mode = $this->currentMode();
        $search = trim((string) $request->query('search', ''));
        $dateFrom = trim((string) $request->query('date_from', ''));
        $dateTo = trim((string) $request->query('date_to', ''));

        $baseQuery = DB::connection('poolproject')
            ->table('WalletTransaction as wt')
            ->join('User as u', 'u.id', '=', 'wt.userId')
            ->leftJoin('User as cp', 'cp.id', '=', 'wt.counterpartyUserId')
            ->select([
                'wt.id',
                'wt.userId',
                'wt.counterpartyUserId',
                'wt.txType',
                'wt.direction',
                'wt.balanceBucket',
                'wt.refType',
                'wt.refId',
                'wt.note',
                'wt.amount',
                'wt.status',
                'wt.createdAt',
                'u.memberCode as memberCode',
                'u.name as memberName',
                'cp.memberCode as counterpartyMemberCode',
                'cp.name as counterpartyMemberName',
            ])
            ->whereIn('wt.txType', $this->transactionTypesForMode($mode))
            ->orderByDesc('wt.createdAt')
            ->orderByDesc('wt.id');

        if ($search !== '') {
            $like = '%'.$search.'%';
            $baseQuery->where(function ($query) use ($like) {
                $query
                    ->where('u.memberCode', 'ilike', $like)
                    ->orWhere('u.name', 'ilike', $like)
                    ->orWhere('cp.memberCode', 'ilike', $like)
                    ->orWhere('cp.name', 'ilike', $like)
                    ->orWhere('wt.note', 'ilike', $like)
                    ->orWhereRaw('CAST("wt"."refId" AS TEXT) ILIKE ?', [$like]);
            });
        }

        if ($dateFrom !== '') {
            $baseQuery->whereDate('wt.createdAt', '>=', $dateFrom);
        }

        if ($dateTo !== '') {
            $baseQuery->whereDate('wt.createdAt', '<=', $dateTo);
        }

        return [
            'filters' => [
                'search' => $search,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'mode_label' => $this->modeLabel($mode),
            ],
            'transactions' => $baseQuery->paginate(30)->appends([
                'search' => $search,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ]),
        ];
    }

    public function name(): ?string
    {
        return $this->modeLabel($this->currentMode());
    }

    public function description(): ?string
    {
        return $this->currentMode() === self::MODE_CW_TO_SW
            ? 'ดูรายการเปลี่ยน CW เป็น SW และค่าธรรมเนียมที่เกี่ยวข้อง'
            : 'ดูรายการโอน SW ระหว่างสมาชิกและค่าธรรมเนียมที่เกี่ยวข้อง';
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('Wallet Top-up Requests')
                ->icon('bs.card-checklist')
                ->route('platform.wallet.topup.list'),
            Link::make('Top Up Wallet')
                ->icon('bs.plus-circle')
                ->route('platform.wallet.topup.manual'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::view('wallet.transaction-search-bar'),
            Layout::table('transactions', [
                TD::make('createdAt', 'วันที่')
                    ->render(function ($row) {
                        $createdAt = $row->createdAt ?? null;
                        if (! is_string($createdAt) || trim($createdAt) === '') {
                            return '-';
                        }

                        return Carbon::parse($createdAt)->format('d/m/Y H:i:s');
                    }),
                TD::make('member', 'สมาชิก')
                    ->render(function ($row) {
                        $memberId = (int) ($row->userId ?? 0);
                        $memberCode = (string) ($row->memberCode ?? '-');
                        $memberName = trim((string) ($row->memberName ?? ''));

                        if ($memberId <= 0) {
                            return e($memberCode);
                        }

                        $url = route('platform.member.edit', $memberId);

                        return '<a href="'.e($url).'">'.e($memberCode).'</a><br><small>'.e($memberName !== '' ? $memberName : '-').'</small>';
                    }),
                TD::make('counterparty', 'คู่รายการ')
                    ->render(function ($row) {
                        $counterpartyUserId = (int) ($row->counterpartyUserId ?? 0);
                        $memberCode = trim((string) ($row->counterpartyMemberCode ?? ''));
                        $memberName = trim((string) ($row->counterpartyMemberName ?? ''));

                        if ($counterpartyUserId <= 0 || $memberCode === '') {
                            return '<span class="text-muted">-</span>';
                        }

                        $url = route('platform.member.edit', $counterpartyUserId);

                        return '<a href="'.e($url).'">'.e($memberCode).'</a><br><small>'.e($memberName !== '' ? $memberName : '-').'</small>';
                    }),
                TD::make('txType', 'ประเภทรายการ')
                    ->render(fn ($row) => e($this->txTypeLabel((string) ($row->txType ?? '')))),
                TD::make('direction', 'ทิศทาง')
                    ->render(fn ($row) => e(strtolower((string) ($row->direction ?? '-')))),
                TD::make('balanceBucket', 'กระเป๋า')
                    ->render(fn ($row) => e($this->bucketLabel((string) ($row->balanceBucket ?? '')))),
                TD::make('amount', 'จำนวน')
                    ->align(TD::ALIGN_RIGHT)
                    ->render(function ($row) {
                        $amount = number_format((float) ($row->amount ?? 0), 2);
                        $direction = strtoupper((string) ($row->direction ?? ''));
                        $prefix = $direction === 'CREDIT' ? '+' : '-';

                        return sprintf('%s%s', $prefix, $amount);
                    }),
                TD::make('reference', 'อ้างอิง')
                    ->render(fn ($row) => e(sprintf('%s #%s', (string) ($row->refType ?? '-'), (string) ($row->refId ?? '-')))),
                TD::make('note', 'หมายเหตุ')
                    ->render(fn ($row) => e((string) ($row->note ?? '-'))),
                TD::make('status', 'สถานะ')
                    ->render(fn ($row) => e(strtolower((string) ($row->status ?? '-')))),
            ]),
        ];
    }

    protected function currentMode(): string
    {
        return self::MODE_CW_TO_SW;
    }

    /**
     * @return array<int, string>
     */
    private function transactionTypesForMode(string $mode): array
    {
        if ($mode === self::MODE_SW_TRANSFER) {
            return [
                'WALLET_TRANSFER_OUT',
                'TRANSFER_FEE_DEBIT',
                'WALLET_TRANSFER_IN',
            ];
        }

        return [
            'COMMISSION_CONVERT_OUT',
            'CONVERT_FEE_DEBIT',
            'SHOPPING_WALLET_CONVERT_IN',
        ];
    }

    private function modeLabel(string $mode): string
    {
        return $mode === self::MODE_SW_TRANSFER
            ? 'SW Transfer Transactions'
            : 'CW > SW Transactions';
    }

    private function bucketLabel(string $value): string
    {
        return match (strtoupper($value)) {
            'WITHDRAWABLE' => 'CW',
            'SHOPPING' => 'SW',
            'DISCOUNT' => 'DCW',
            'FIRM' => '-',
            default => $value !== '' ? $value : '-',
        };
    }

    private function txTypeLabel(string $value): string
    {
        return match (strtoupper($value)) {
            'COMMISSION_CONVERT_OUT' => 'Convert CW to SW',
            'CONVERT_FEE_DEBIT' => 'Convert Fee',
            'SHOPPING_WALLET_CONVERT_IN' => 'SW Credit from Conversion',
            'WALLET_TRANSFER_OUT' => 'SW Transfer Out',
            'TRANSFER_FEE_DEBIT' => 'Transfer Fee',
            'WALLET_TRANSFER_IN' => 'SW Transfer In',
            default => $value !== '' ? $value : '-',
        };
    }
}
