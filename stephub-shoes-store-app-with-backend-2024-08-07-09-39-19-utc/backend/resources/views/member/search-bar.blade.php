<div class="bg-white rounded shadow-sm p-3 mb-3">
    <div class="alert alert-info mb-3" role="alert">
        สมาชิกชุด import นี้ใช้ <strong>รหัสสมาชิก</strong> เป็นชื่อผู้ใช้สำหรับเข้าสู่ระบบ และใช้
        <strong>เลขบัตรประชาชน 6 หลักท้าย</strong> เป็นรหัสผ่าน
        ถ้าแถวใดไม่มีเลขบัตรครบ 6 หลัก ระบบจะใช้รหัสผ่านสำรองเป็น <strong>123456</strong>
    </div>
    <form method="get" action="{{ request()->url() }}" class="row g-2 align-items-end">
        <div class="col-md-8">
            <label for="member-search" class="form-label mb-1">ค้นหาสมาชิก</label>
            <input
                id="member-search"
                type="text"
                name="search"
                class="form-control"
                value="{{ $search ?? request('search') }}"
                placeholder="รหัสสมาชิก, ชื่อ, ผู้แนะนำ, อัพไลน์, เลขบัตร, อีเมล, เบอร์โทร"
            >
        </div>
        <div class="col-md-4 d-flex gap-2">
            <button type="submit" class="btn btn-primary">ค้นหา</button>
            <a href="{{ request()->url() }}" class="btn btn-light">ล้างค่า</a>
        </div>
    </form>
</div>
