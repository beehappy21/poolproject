@php
    $filters = $filters ?? [];
    $search = $filters['search'] ?? '';
    $status = $filters['status'] ?? '';
@endphp

<form method="GET" class="mb-3">
    <div class="row g-2">
        <div class="col-md-5">
            <input
                type="text"
                name="search"
                value="{{ $search }}"
                class="form-control"
                placeholder="ค้นหาจากรหัสสมาชิก ชื่อ อีเมล ช่องทาง หรือ note"
            >
        </div>
        <div class="col-md-3">
            <select name="status" class="form-control">
                <option value="">ทุกสถานะ</option>
                <option value="pending" @selected($status === 'pending')>pending</option>
                <option value="approved" @selected($status === 'approved')>approved</option>
                <option value="rejected" @selected($status === 'rejected')>rejected</option>
                <option value="cancelled" @selected($status === 'cancelled')>cancelled</option>
            </select>
        </div>
        <div class="col-md-4 d-flex gap-2">
            <button type="submit" class="btn btn-primary">กรองข้อมูล</button>
            <a href="{{ route('platform.wallet.topup.list') }}" class="btn btn-outline-secondary">ล้างตัวกรอง</a>
        </div>
    </div>
</form>
