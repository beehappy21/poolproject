<div class="bg-white rounded shadow-sm p-3 mb-3">
    <div class="alert alert-info mb-3" role="alert">
        สมาชิกชุด import นี้ใช้ <strong>รหัสสมาชิก</strong> เป็นชื่อผู้ใช้สำหรับเข้าสู่ระบบ และใช้
        <strong>เลขบัตรประชาชน 6 หลักท้าย</strong> เป็นรหัสผ่าน
        ถ้าแถวใดไม่มีเลขบัตรครบ 6 หลัก ระบบจะใช้รหัสผ่านสำรองเป็น <strong>123456</strong>
    </div>
    <div
        class="row g-2 align-items-end"
        id="member-search-panel"
        data-list-url="{{ route('platform.member.list') }}"
    >
        <input type="hidden" id="selected-member-code" form="filters" value="{{ $selectedMemberCode ?? request('selected_member_code') }}">
        <div class="col-md-6">
            <label for="member-code-search" class="form-label mb-1">ค้นหาจากเลขสมาชิก</label>
            <input
                id="member-code-search"
                form="filters"
                type="text"
                class="form-control"
                value="{{ $memberCodeSearch ?? request('member_code_search') }}"
                placeholder="รหัสสมาชิก, ผู้แนะนำ, อัพไลน์, เลขบัตร, อีเมล, เบอร์โทร"
                autocomplete="off"
            >
            <div id="member-code-dropdown" class="list-group mt-2 d-none">
                @foreach(($memberSearchOptions ?? collect()) as $memberOption)
                    @php
                        $memberCode = (string) $memberOption->memberCode;
                        $memberName = trim((string) $memberOption->name);
                        $memberDigits = preg_replace('/\D+/', '', $memberCode);
                        $memberShortCode = ltrim($memberDigits, '0');
                        $memberShortCode = $memberShortCode === '' ? $memberDigits : $memberShortCode;
                        $searchBlob = strtolower(trim($memberCode . ' ' . $memberName . ' ' . $memberDigits . ' ' . $memberShortCode));
                        $label = $memberShortCode !== '' ? $memberShortCode . ' - ' . $memberCode . ' - ' . $memberName : $memberCode . ' - ' . $memberName;
                    @endphp
                    <button
                        type="button"
                        class="list-group-item list-group-item-action d-none"
                        data-member-option
                        data-search="{{ $searchBlob }}"
                        data-label="{{ $label }}"
                        data-member-code="{{ $memberCode }}"
                    >
                        {{ $label }}
                    </button>
                @endforeach
            </div>
            <small class="text-muted d-block mt-2">พิมพ์อย่างน้อย 2 ตัวอักษรหรือตัวเลข ระบบจะค้นหาอัตโนมัติ</small>
        </div>
        <div class="col-md-6">
            <label for="name-search" class="form-label mb-1">ค้นหาจากชื่อ-นามสกุล</label>
            <input
                id="name-search"
                form="filters"
                type="text"
                class="form-control"
                value="{{ $nameSearch ?? request('name_search') }}"
                placeholder="ชื่อ, นามสกุล, ชื่อธุรกิจ"
                autocomplete="off"
            >
            <small class="text-muted d-block mt-2">พิมพ์อย่างน้อย 2 ตัวอักษร ระบบจะค้นหาอัตโนมัติ</small>
        </div>
        <div class="col-12 d-flex gap-2">
            <button type="button" class="btn btn-primary" id="member-search-button">ค้นหา</button>
            <a href="{{ request()->url() }}" class="btn btn-light">ล้างค่า</a>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        (() => {
            const bindMemberCodeDropdown = () => {
                const panel = document.getElementById('member-search-panel');
                const memberCodeInput = document.getElementById('member-code-search');
                const nameInput = document.getElementById('name-search');
                const searchButton = document.getElementById('member-search-button');
                const selectedMemberCodeInput = document.getElementById('selected-member-code');
                const dropdown = document.getElementById('member-code-dropdown');

                if (
                    !(panel instanceof HTMLDivElement) ||
                    !(memberCodeInput instanceof HTMLInputElement) ||
                    !(nameInput instanceof HTMLInputElement) ||
                    !(searchButton instanceof HTMLButtonElement) ||
                    !(selectedMemberCodeInput instanceof HTMLInputElement) ||
                    !(dropdown instanceof HTMLDivElement) ||
                    panel.dataset.memberCodeDropdownBound === '1'
                ) {
                    return;
                }

                panel.dataset.memberCodeDropdownBound = '1';

                const options = Array.from(dropdown.querySelectorAll('[data-member-option]'));

                const hideDropdown = () => {
                    dropdown.classList.add('d-none');
                    options.forEach((option) => option.classList.add('d-none'));
                };

                const submitSearch = () => {
                    const listUrl = panel.dataset.listUrl;
                    if (!listUrl) {
                        return;
                    }

                    const memberCode = memberCodeInput.value.trim();
                    const name = nameInput.value.trim();
                    const selectedMemberCode = selectedMemberCodeInput.value.trim();
                    const form = document.createElement('form');
                    form.method = 'GET';
                    form.action = listUrl;
                    form.style.display = 'none';

                    if (memberCode.length >= 2) {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'member_code_search';
                        input.value = memberCode;
                        form.appendChild(input);
                    }

                    if (name.length >= 2) {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'name_search';
                        input.value = name;
                        form.appendChild(input);
                    }

                    if (selectedMemberCode.length >= 2) {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'selected_member_code';
                        input.value = selectedMemberCode;
                        form.appendChild(input);
                    }

                    document.body.appendChild(form);
                    form.submit();
                };

                memberCodeInput.addEventListener('input', () => {
                    selectedMemberCodeInput.value = '';

                    const keyword = memberCodeInput.value.trim().toLowerCase();
                    let visible = 0;

                    options.forEach((option) => {
                        const haystack = (option.getAttribute('data-search') || '').toLowerCase();
                        const show = keyword.length >= 2 && haystack.includes(keyword) && visible < 8;
                        option.classList.toggle('d-none', !show);

                        if (show) {
                            visible += 1;
                        }
                    });

                    dropdown.classList.toggle('d-none', !(keyword.length >= 2 && visible > 0));
                });

                options.forEach((option) => {
                    option.addEventListener('click', () => {
                        memberCodeInput.value = option.getAttribute('data-label') || '';
                        selectedMemberCodeInput.value = option.getAttribute('data-member-code') || '';
                        hideDropdown();
                    });
                });

                searchButton.addEventListener('click', submitSearch);

                [memberCodeInput, nameInput].forEach((input) => {
                    input.addEventListener('keydown', (event) => {
                        if (event.key !== 'Enter') {
                            return;
                        }

                        event.preventDefault();
                        submitSearch();
                    });
                });

                document.addEventListener('click', (event) => {
                    if (!(event.target instanceof Node)) {
                        return;
                    }

                    if (event.target !== memberCodeInput && !dropdown.contains(event.target)) {
                        hideDropdown();
                    }
                });
            };

            document.addEventListener('DOMContentLoaded', bindMemberCodeDropdown);
            document.addEventListener('turbo:load', bindMemberCodeDropdown);
        })();
    </script>
@endpush
