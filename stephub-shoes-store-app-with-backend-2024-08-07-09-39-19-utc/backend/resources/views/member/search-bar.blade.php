<div class="bg-white rounded shadow-sm p-3 mb-3">
    <div class="alert alert-info mb-3" role="alert">
        สมาชิกชุด import นี้ใช้ <strong>รหัสสมาชิก</strong> เป็นชื่อผู้ใช้สำหรับเข้าสู่ระบบ และใช้
        <strong>เลขบัตรประชาชน 6 หลักท้าย</strong> เป็นรหัสผ่าน
        ถ้าแถวใดไม่มีเลขบัตรครบ 6 หลัก ระบบจะใช้รหัสผ่านสำรองเป็น <strong>123456</strong>
    </div>
    <form method="get" action="{{ request()->url() }}" class="row g-2 align-items-end" id="member-search-form">
        <div class="col-md-6">
            <label for="member-code-search" class="form-label mb-1">ค้นหาจากเลขสมาชิก</label>
            <input
                id="member-code-search"
                type="text"
                name="member_code_search"
                class="form-control"
                value="{{ $memberCodeSearch ?? request('member_code_search') }}"
                placeholder="รหัสสมาชิก, ผู้แนะนำ, อัพไลน์, เลขบัตร, อีเมล, เบอร์โทร"
                autocomplete="off"
            >
            <small class="text-muted d-block mt-2">พิมพ์อย่างน้อย 2 ตัวอักษรหรือตัวเลข ระบบจะค้นหาอัตโนมัติ</small>
        </div>
        <div class="col-md-6">
            <label for="name-search" class="form-label mb-1">ค้นหาจากชื่อ-นามสกุล</label>
            <input
                id="name-search"
                type="text"
                name="name_search"
                class="form-control"
                value="{{ $nameSearch ?? request('name_search') }}"
                placeholder="ชื่อ, นามสกุล, ชื่อธุรกิจ"
                autocomplete="off"
            >
            <small class="text-muted d-block mt-2">พิมพ์อย่างน้อย 2 ตัวอักษร ระบบจะค้นหาอัตโนมัติ</small>
        </div>
        <div class="col-12 d-flex gap-2">
            <button type="submit" class="btn btn-primary">ค้นหา</button>
            <a href="{{ request()->url() }}" class="btn btn-light">ล้างค่า</a>
        </div>
    </form>
</div>

<script>
(() => {
    const form = document.getElementById('member-search-form');
    const memberCodeInput = document.getElementById('member-code-search');
    const nameInput = document.getElementById('name-search');

    if (
        !(form instanceof HTMLFormElement) ||
        !(memberCodeInput instanceof HTMLInputElement) ||
        !(nameInput instanceof HTMLInputElement)
    ) {
        return;
    }

    let timerId = null;
    let lastSubmittedValue = JSON.stringify({
        memberCode: memberCodeInput.value.trim(),
        name: nameInput.value.trim(),
    });

    const submitIfReady = () => {
        const memberCode = memberCodeInput.value.trim();
        const name = nameInput.value.trim();
        const nextValue = JSON.stringify({ memberCode, name });

        if (timerId) {
            window.clearTimeout(timerId);
        }

        timerId = window.setTimeout(() => {
            if (nextValue === lastSubmittedValue) {
                return;
            }

            const canSearch =
                memberCode.length === 0 ||
                memberCode.length >= 2;
            const canSearchName =
                name.length === 0 ||
                name.length >= 2;

            if (canSearch && canSearchName) {
                lastSubmittedValue = nextValue;
                form.requestSubmit();
            }
        }, 250);
    };

    memberCodeInput.addEventListener('input', submitIfReady);
    nameInput.addEventListener('input', submitIfReady);
})();
</script>
