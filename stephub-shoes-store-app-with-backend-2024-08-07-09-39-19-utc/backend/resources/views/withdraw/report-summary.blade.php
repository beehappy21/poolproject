@php
    $filters = $filters ?? [];
    $cycles = $cycles ?? [];
    $summary = $summary ?? [
        'totalRequests' => 0,
        'totalAmount' => 0,
        'totalNetAmount' => 0,
    ];
@endphp

<div class="row g-3 mb-4">
    <div class="col-md-4">
        <div class="card">
            <div class="card-body">
                <div class="text-muted small">จำนวนรายการ</div>
                <div class="fs-4 fw-bold">{{ number_format((int) ($summary['totalRequests'] ?? 0)) }}</div>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card">
            <div class="card-body">
                <div class="text-muted small">ยอดถอนรวม</div>
                <div class="fs-4 fw-bold">{{ number_format((float) ($summary['totalAmount'] ?? 0), 2) }} บาท</div>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card">
            <div class="card-body">
                <div class="text-muted small">ยอดรายงานรวมหลังหัก 5%</div>
                <div class="fs-4 fw-bold">{{ number_format((float) ($summary['totalNetAmount'] ?? 0), 2) }} บาท</div>
            </div>
        </div>
    </div>
</div>

<form method="GET" class="row g-3 mb-4">
    <div class="col-md-4">
        <label class="form-label">ค้นหา</label>
        <input name="search" value="{{ $filters['search'] ?? '' }}" class="form-control" placeholder="รหัสสมาชิก / ชื่อ / บัญชี">
    </div>
    <div class="col-md-2">
        <label class="form-label">รอบสรุปวันอาทิตย์</label>
        <select name="cycle_end" class="form-select">
            @php $cycleEnd = $filters['cycle_end'] ?? ''; @endphp
            <option value="" @selected($cycleEnd === '')>ทุกรอบ</option>
            @foreach ($cycles as $cycle)
                <option value="{{ $cycle['value'] }}" @selected($cycleEnd === $cycle['value'])>{{ $cycle['label'] }}</option>
            @endforeach
        </select>
    </div>
    <div class="col-md-2">
        <label class="form-label">สถานะ</label>
        <select name="status" class="form-select">
            @php $status = $filters['status'] ?? ''; @endphp
            <option value="" @selected($status === '')>ทั้งหมด</option>
            <option value="pending" @selected($status === 'pending')>pending</option>
            <option value="approved" @selected($status === 'approved')>approved</option>
            <option value="rejected" @selected($status === 'rejected')>rejected</option>
            <option value="cancelled" @selected($status === 'cancelled')>cancelled</option>
            <option value="exported" @selected($status === 'exported')>exported</option>
            <option value="paid" @selected($status === 'paid')>paid</option>
        </select>
    </div>
    <div class="col-md-4 d-flex align-items-end gap-2">
        <button class="btn btn-primary w-100" type="submit">Search</button>
        <a href="{{ request()->url() }}" class="btn btn-light">ล้างค่า</a>
    </div>
</form>
