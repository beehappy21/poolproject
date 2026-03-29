<?php

declare(strict_types=1);

namespace App\Orchid\Screens;

use App\Models\KycRequest;
use App\Models\Member;
use App\Models\Order;
use App\Models\WalletTopupRequest;
use App\Models\WithdrawRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Layout;

class PlatformScreen extends Screen
{
    public function query(): iterable
    {
        $today = Carbon::now();

        return [
            'dashboard' => [
                'generatedAt' => $today->format('Y-m-d H:i'),
                'headline' => $this->buildHeadline(),
                'stats' => $this->buildStats(),
                'queues' => $this->buildQueues(),
                'quickLinks' => $this->buildQuickLinks(),
                'recentOrders' => $this->recentOrders(),
                'recentWalletTopups' => $this->recentWalletTopups(),
                'recentWithdrawals' => $this->recentWithdrawals(),
            ],
        ];
    }

    public function name(): ?string
    {
        return 'BAO Dashboard';
    }

    public function description(): ?string
    {
        return 'ภาพรวมงานขาย สมาชิก และงานค้างของระบบแอดมิน';
    }

    public function commandBar(): iterable
    {
        return [];
    }

    public function layout(): iterable
    {
        return [
            Layout::view('platform.dashboard'),
        ];
    }

    private function buildHeadline(): array
    {
        $pendingOrders = $this->safeOrderCount(fn ($query) => $query->where('order_status', 'pending'));
        $transferReview = $this->safeOrderCount(fn ($query) => $query->where('order_status', 'paid'));
        $awaitingShipment = $this->safeOrderCount(
            fn ($query) => $query->where('approval_status', 'APPROVED')->whereNull('shipped_at')
        );
        $pendingFinance = $this->safeCount(WalletTopupRequest::class, fn ($query) => $query->where('status', 'PENDING'))
            + $this->safeCount(WithdrawRequest::class, fn ($query) => $query->where('status', 'PENDING'));

        return [
            'pendingOrders' => $pendingOrders,
            'transferReview' => $transferReview,
            'awaitingShipment' => $awaitingShipment,
            'pendingFinance' => $pendingFinance,
        ];
    }

    private function buildStats(): array
    {
        return [
            [
                'label' => 'สมาชิกทั้งหมด',
                'value' => number_format($this->safeCount(Member::class, fn ($query) => $query->where('isAdmin', false))),
                'meta' => 'ไม่นับ admin',
                'route' => route('platform.member.list'),
                'tone' => 'primary',
            ],
            [
                'label' => 'ออเดอร์ทั้งหมด',
                'value' => number_format($this->safeCount(Order::class)),
                'meta' => 'ทุกสถานะ',
                'route' => route('platform.order.list'),
                'tone' => 'info',
            ],
            [
                'label' => 'ยอดขายรวม',
                'value' => number_format($this->safeOrderAggregate('total'), 2).' บาท',
                'meta' => 'อิงจาก stephub orders',
                'route' => route('platform.order.list'),
                'tone' => 'success',
            ],
            [
                'label' => 'ยอดขายวันนี้',
                'value' => number_format($this->safeOrderAggregate('total', fn ($query) => $query->whereDate('created_at', Carbon::today())), 2).' บาท',
                'meta' => 'เฉพาะวันนี้',
                'route' => route('platform.order.list'),
                'tone' => 'warning',
            ],
        ];
    }

    private function buildQueues(): array
    {
        return [
            [
                'label' => 'Awaiting payment',
                'count' => $this->safeOrderCount(fn ($query) => $query->where('order_status', 'pending')),
                'route' => route('platform.order.awaitingPayment'),
            ],
            [
                'label' => 'Transfer review',
                'count' => $this->safeOrderCount(fn ($query) => $query->where('order_status', 'paid')),
                'route' => route('platform.order.transferReview'),
            ],
            [
                'label' => 'Awaiting shipment',
                'count' => $this->safeOrderCount(
                    fn ($query) => $query->where('approval_status', 'APPROVED')->whereNull('shipped_at')
                ),
                'route' => route('platform.order.awaitingShipment'),
            ],
            [
                'label' => 'Wallet top-up pending',
                'count' => $this->safeCount(WalletTopupRequest::class, fn ($query) => $query->where('status', 'PENDING')),
                'route' => route('platform.wallet.topup.list'),
            ],
            [
                'label' => 'Withdraw pending',
                'count' => $this->safeCount(WithdrawRequest::class, fn ($query) => $query->where('status', 'PENDING')),
                'route' => route('platform.withdraw.list'),
            ],
            [
                'label' => 'KYC pending',
                'count' => $this->safeCount(KycRequest::class, fn ($query) => $query->where('status', 'PENDING')),
                'route' => route('platform.kyc.list'),
            ],
        ];
    }

    private function buildQuickLinks(): array
    {
        return [
            ['label' => 'สร้างออเดอร์', 'route' => route('platform.order.create')],
            ['label' => 'รายการสั่งซื้อ', 'route' => route('platform.order.list')],
            ['label' => 'สมาชิก', 'route' => route('platform.member.list')],
            ['label' => 'Commission report', 'route' => route('platform.commission.report')],
            ['label' => 'Wallet top-up', 'route' => route('platform.wallet.topup.list')],
            ['label' => 'Withdrawals', 'route' => route('platform.withdraw.list')],
        ];
    }

    private function recentOrders(): array
    {
        if (! $this->tableExists(new Order())) {
            return [];
        }

        return Order::query()
            ->orderByDesc('created_at')
            ->limit(6)
            ->get(['id', 'order_no', 'member_code', 'name', 'total', 'order_status', 'created_at'])
            ->map(fn (Order $order) => [
                'title' => (string) ($order->order_no ?: '#'.$order->id),
                'subtitle' => trim(((string) ($order->member_code ?? '')).' '.((string) ($order->name ?? ''))),
                'meta' => number_format((float) ($order->total ?? 0), 2).' บาท',
                'status' => strtolower((string) ($order->order_status ?? 'pending')),
                'time' => optional($order->created_at)->format('Y-m-d H:i'),
                'route' => route('platform.order.detail', ['order' => $order->id]),
            ])
            ->all();
    }

    private function recentWalletTopups(): array
    {
        if (! $this->tableExists(new WalletTopupRequest())) {
            return [];
        }

        return WalletTopupRequest::query()
            ->with('member')
            ->orderByDesc('requestedAt')
            ->limit(5)
            ->get(['id', 'userId', 'amount', 'status', 'requestedAt'])
            ->map(fn (WalletTopupRequest $request) => [
                'title' => '#'.$request->id,
                'subtitle' => trim(((string) optional($request->member)->memberCode).' '.((string) optional($request->member)->name)),
                'meta' => number_format((float) ($request->amount ?? 0), 2).' บาท',
                'status' => strtolower((string) ($request->status ?? 'pending')),
                'time' => optional($request->requestedAt)->format('Y-m-d H:i'),
                'route' => route('platform.wallet.topup.detail', ['walletTopupRequest' => $request->id]),
            ])
            ->all();
    }

    private function recentWithdrawals(): array
    {
        if (! $this->tableExists(new WithdrawRequest())) {
            return [];
        }

        return WithdrawRequest::query()
            ->with('member')
            ->orderByDesc('requestedAt')
            ->limit(5)
            ->get(['id', 'userId', 'netBankAmount', 'amount', 'status', 'requestedAt'])
            ->map(fn (WithdrawRequest $request) => [
                'title' => '#'.$request->id,
                'subtitle' => trim(((string) optional($request->member)->memberCode).' '.((string) optional($request->member)->name)),
                'meta' => number_format((float) ($request->netBankAmount ?? $request->amount ?? 0), 2).' บาท',
                'status' => strtolower((string) ($request->status ?? 'pending')),
                'time' => optional($request->requestedAt)->format('Y-m-d H:i'),
                'route' => route('platform.withdraw.detail', ['withdrawRequest' => $request->id]),
            ])
            ->all();
    }

    private function safeCount(string $modelClass, ?callable $scope = null): int
    {
        $model = new $modelClass();
        if (! $this->tableExists($model)) {
            return 0;
        }

        $query = $modelClass::query();
        if ($scope !== null) {
            $scope($query);
        }

        return (int) $query->count();
    }

    private function safeOrderCount(?callable $scope = null): int
    {
        return $this->safeCount(Order::class, $scope);
    }

    private function safeOrderAggregate(string $column, ?callable $scope = null): float
    {
        if (! $this->tableExists(new Order())) {
            return 0.0;
        }

        $query = Order::query();
        if ($scope !== null) {
            $scope($query);
        }

        return (float) ($query->sum($column) ?? 0);
    }

    private function tableExists(object $model): bool
    {
        return Schema::connection($model->getConnectionName())->hasTable($model->getTable());
    }
}
