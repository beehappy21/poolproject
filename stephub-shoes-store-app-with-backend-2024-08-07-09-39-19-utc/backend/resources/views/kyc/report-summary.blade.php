@php
    $filters = $filters ?? [];
@endphp

<form method="GET" class="row g-3 mb-4">
    <div class="col-md-6">
        <label class="form-label">ค้นหา</label>
        <input name="search" value="{{ $filters['search'] ?? '' }}" class="form-control" placeholder="รหัสสมาชิก / ชื่อ / เลขบัตร / ธนาคาร">
    </div>
    <div class="col-md-3">
        <label class="form-label">สถานะ</label>
        <select name="status" class="form-select">
            @php $status = $filters['status'] ?? ''; @endphp
            <option value="" @selected($status === '')>ทั้งหมด</option>
            <option value="pending" @selected($status === 'pending')>pending</option>
            <option value="approved" @selected($status === 'approved')>approved</option>
            <option value="rejected" @selected($status === 'rejected')>rejected</option>
        </select>
    </div>
    <div class="col-md-3 d-flex align-items-end">
        <button class="btn btn-primary w-100" type="submit">Search</button>
    </div>
</form>
