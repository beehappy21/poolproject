<div class="bg-white rounded shadow-sm p-3 mb-3">
    <form method="get" action="{{ request()->url() }}" class="row g-2 align-items-end">
        <div class="col-md-8">
            <label for="member-bank-search" class="form-label mb-1">ค้นหาบัญชีสมาชิก</label>
            <input
                id="member-bank-search"
                type="text"
                name="search"
                class="form-control"
                value="{{ $search ?? request('search') }}"
                placeholder="รหัสสมาชิก, ชื่อ นามสกุล, ชื่อบัญชี, ธนาคาร, เลขบัญชี"
            >
        </div>
        <div class="col-md-4 d-flex gap-2">
            <button type="submit" class="btn btn-primary">ค้นหา</button>
            <a href="{{ request()->url() }}" class="btn btn-light">ล้างค่า</a>
        </div>
    </form>
</div>
