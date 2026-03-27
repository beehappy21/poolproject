@php
    $images = $images ?? [];
    $slipUrl = $images['transfer_slip_url'] ?? null;
@endphp

<div class="row g-3">
    <div class="col-md-8">
        <div class="card h-100">
            <div class="card-header">สลิปเติม Wallet</div>
            <div class="card-body text-center">
                @if (!empty($slipUrl))
                    <img src="{{ $slipUrl }}" alt="Wallet top-up slip" style="max-width:100%; max-height:480px; object-fit:contain;">
                    <div class="mt-2">
                        <a href="{{ $slipUrl }}" target="_blank" rel="noopener noreferrer">เปิดสลิปในแท็บใหม่</a>
                    </div>
                @else
                    <div class="text-muted">ไม่มีสลิปแนบมากับคำขอ</div>
                @endif
            </div>
        </div>
    </div>
</div>
