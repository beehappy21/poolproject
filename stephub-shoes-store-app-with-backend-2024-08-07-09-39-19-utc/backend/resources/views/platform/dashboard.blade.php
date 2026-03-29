@php
    $dashboard = $dashboard ?? [];
    $headline = $dashboard['headline'] ?? [];
    $stats = $dashboard['stats'] ?? [];
    $queues = $dashboard['queues'] ?? [];
    $quickLinks = $dashboard['quickLinks'] ?? [];
    $recentOrders = $dashboard['recentOrders'] ?? [];
    $recentWalletTopups = $dashboard['recentWalletTopups'] ?? [];
    $recentWithdrawals = $dashboard['recentWithdrawals'] ?? [];

    $statusClasses = [
        'pending' => 'warning',
        'paid' => 'info',
        'approved' => 'success',
        'rejected' => 'danger',
        'cancelled' => 'secondary',
        'canceled' => 'secondary',
        'exported' => 'primary',
        'shipped' => 'primary',
        'delivered' => 'success',
    ];

    $toneClasses = [
        'primary' => 'primary',
        'info' => 'info',
        'success' => 'success',
        'warning' => 'warning',
    ];

    $renderList = function (array $items, string $emptyText) use ($statusClasses) {
        if ($items === []) {
            return '<div class="text-muted small">'.$emptyText.'</div>';
        }

        $html = '<div class="list-group list-group-flush">';

        foreach ($items as $item) {
            $status = strtolower((string) ($item['status'] ?? ''));
            $badgeClass = $statusClasses[$status] ?? 'secondary';
            $statusLabel = $status !== '' ? ucfirst(str_replace('-', ' ', $status)) : null;

            $html .= '<a class="list-group-item list-group-item-action px-0" href="'.e($item['route'] ?? '#').'">';
            $html .= '<div class="d-flex justify-content-between align-items-start gap-3">';
            $html .= '<div>';
            $html .= '<div class="fw-semibold">'.e($item['title'] ?? '-').'</div>';
            $html .= '<div class="text-muted small">'.e($item['subtitle'] ?? '').'</div>';
            $html .= '</div>';
            $html .= '<div class="text-end">';
            $html .= '<div class="fw-semibold">'.e($item['meta'] ?? '').'</div>';
            if ($statusLabel !== null) {
                $html .= '<span class="badge bg-'.$badgeClass.' mt-1">'.e($statusLabel).'</span>';
            }
            $html .= '</div>';
            $html .= '</div>';
            if (! empty($item['time'])) {
                $html .= '<div class="text-muted small mt-1">'.e($item['time']).'</div>';
            }
            $html .= '</a>';
        }

        $html .= '</div>';

        return $html;
    };
@endphp

<div class="row g-3 mb-4">
    <div class="col-xl-8">
        <div class="card border-0 shadow-sm h-100">
            <div class="card-body p-4">
                <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                    <div>
                        <div class="text-muted text-uppercase small mb-2">Overview</div>
                        <h2 class="mb-2">ภาพรวมงาน BAO วันนี้</h2>
                        <div class="text-muted">
                            รอตรวจ {{ number_format((int) ($headline['transferReview'] ?? 0)) }} รายการ,
                            รอชำระ {{ number_format((int) ($headline['pendingOrders'] ?? 0)) }} รายการ,
                            รอจัดส่ง {{ number_format((int) ($headline['awaitingShipment'] ?? 0)) }} รายการ
                        </div>
                    </div>
                    <div class="text-muted small text-end">
                        อัปเดตล่าสุด<br>
                        {{ $dashboard['generatedAt'] ?? '-' }}
                    </div>
                </div>

                <div class="row g-3 mt-1">
                    <div class="col-md-6">
                        <div class="rounded border bg-light p-3 h-100">
                            <div class="text-muted small mb-1">งานการเงินที่ยังค้าง</div>
                            <div class="fs-2 fw-bold">{{ number_format((int) ($headline['pendingFinance'] ?? 0)) }}</div>
                            <div class="text-muted small">รวม wallet top-up และ withdrawal ที่ยัง pending</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="rounded border bg-light p-3 h-100">
                            <div class="text-muted small mb-2">Quick Actions</div>
                            <div class="d-flex flex-wrap gap-2">
                                @foreach ($quickLinks as $link)
                                    <a href="{{ $link['route'] }}" class="btn btn-outline-dark btn-sm">{{ $link['label'] }}</a>
                                @endforeach
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-xl-4">
        <div class="card border-0 shadow-sm h-100">
            <div class="card-body p-4">
                <div class="text-muted text-uppercase small mb-2">Queues</div>
                <div class="list-group list-group-flush">
                    @foreach ($queues as $queue)
                        <a href="{{ $queue['route'] }}" class="list-group-item list-group-item-action px-0 d-flex justify-content-between align-items-center">
                            <span>{{ $queue['label'] }}</span>
                            <span class="badge bg-dark">{{ number_format((int) ($queue['count'] ?? 0)) }}</span>
                        </a>
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</div>

<div class="row g-3 mb-4">
    @foreach ($stats as $stat)
        @php $tone = $toneClasses[$stat['tone'] ?? 'primary'] ?? 'primary'; @endphp
        <div class="col-lg-3 col-md-6">
            <a href="{{ $stat['route'] }}" class="text-decoration-none text-reset">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body p-4">
                        <div class="text-muted small mb-2">{{ $stat['label'] }}</div>
                        <div class="fs-3 fw-bold text-{{ $tone }}">{{ $stat['value'] }}</div>
                        <div class="small text-muted mt-2">{{ $stat['meta'] }}</div>
                    </div>
                </div>
            </a>
        </div>
    @endforeach
</div>

<div class="row g-3">
    <div class="col-xl-4">
        <div class="card border-0 shadow-sm h-100">
            <div class="card-body p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">ออเดอร์ล่าสุด</h5>
                    <a href="{{ route('platform.order.list') }}" class="small">ดูทั้งหมด</a>
                </div>
                {!! $renderList($recentOrders, 'ยังไม่มีรายการสั่งซื้อ') !!}
            </div>
        </div>
    </div>

    <div class="col-xl-4">
        <div class="card border-0 shadow-sm h-100">
            <div class="card-body p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">Wallet Top-up ล่าสุด</h5>
                    <a href="{{ route('platform.wallet.topup.list') }}" class="small">ดูทั้งหมด</a>
                </div>
                {!! $renderList($recentWalletTopups, 'ยังไม่มีคำขอเติม wallet') !!}
            </div>
        </div>
    </div>

    <div class="col-xl-4">
        <div class="card border-0 shadow-sm h-100">
            <div class="card-body p-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">ถอนเงินล่าสุด</h5>
                    <a href="{{ route('platform.withdraw.list') }}" class="small">ดูทั้งหมด</a>
                </div>
                {!! $renderList($recentWithdrawals, 'ยังไม่มีคำขอถอนเงิน') !!}
            </div>
        </div>
    </div>
</div>
