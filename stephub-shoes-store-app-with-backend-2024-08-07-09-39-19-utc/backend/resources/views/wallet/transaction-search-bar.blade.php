<div class="bg-white rounded shadow-sm p-3 mb-3">
    <form method="get" action="{{ request()->url() }}" class="row g-2 align-items-end">
        <div class="col-md-6">
            <label for="wallet-transaction-search" class="form-label mb-1">ค้นหารายการ {{ $filters['mode_label'] ?? '' }}</label>
            <input
                id="wallet-transaction-search"
                type="text"
                name="search"
                class="form-control"
                value="{{ $filters['search'] ?? request('search') }}"
                placeholder="รหัสสมาชิก, ชื่อสมาชิก, คู่รายการ, เลขอ้างอิง, หมายเหตุ"
            >
        </div>
        <div class="col-md-2">
            <label for="wallet-transaction-date-from" class="form-label mb-1">วันที่เริ่ม</label>
            <input
                id="wallet-transaction-date-from"
                type="date"
                name="date_from"
                class="form-control"
                value="{{ $filters['date_from'] ?? request('date_from') }}"
            >
        </div>
        <div class="col-md-2">
            <label for="wallet-transaction-date-to" class="form-label mb-1">วันที่สิ้นสุด</label>
            <input
                id="wallet-transaction-date-to"
                type="date"
                name="date_to"
                class="form-control"
                value="{{ $filters['date_to'] ?? request('date_to') }}"
            >
        </div>
        <div class="col-md-2 d-flex gap-2">
            <button type="submit" class="btn btn-primary">ค้นหา</button>
            <a href="{{ request()->url() }}" class="btn btn-light">ล้างค่า</a>
        </div>
    </form>
</div>
