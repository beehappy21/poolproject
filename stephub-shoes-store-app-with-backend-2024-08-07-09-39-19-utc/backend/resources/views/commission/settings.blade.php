@php
    $section = $commissionSection ?? [];
    $nav = $commissionNav ?? [];
    $accent = $section['accent'] ?? '#4f46e5';
    $commissionSettings = $commissionSettings ?? [
        'directLevelRates' => ['0.2'],
        'uniLevelRates' => ['0.05', '0.05', '0.05', '0.05', '0.05'],
        'poolRate' => '0.5',
        'cashbackRate' => '0',
    ];
    $matrixSettings = $matrixSettings ?? [
        'boardWidth' => 2,
        'boardDepth' => 3,
        'boardCount' => 3,
        'organizationPvRate' => '0.1',
        'levelRates' => ['0.1', '0.05', '0.03'],
        'boardOpenPvThresholds' => ['100', '100', '100'],
    ];
    $manualPaymentSettings = $manualPaymentSettings ?? [
        'accountName' => 'Stephub Co., Ltd.',
        'bankName' => 'Kasikornbank',
        'accountNumber' => '123-4-56789-0',
        'promptPayName' => 'Stephub Co., Ltd.',
        'promptPayNumber' => '0812345678',
        'qrImageUrl' => '',
        'note' => 'กรุณาโอนตามยอดที่แสดงในคำสั่งซื้อ และอัปโหลดสลิปเพื่อรอตรวจสอบ',
    ];
    $activeKey = $section['key'] ?? null;
    $lineStatus = $lineStatus ?? null;
@endphp

<style>
    .commission-shell { display:grid; gap:1.25rem; grid-template-columns:minmax(0,1fr); }
    .commission-panel,.commission-card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; box-shadow:0 12px 40px rgba(15,23,42,.05); }
    .commission-eyebrow { font-size:.75rem; text-transform:uppercase; letter-spacing:.12em; color:#64748b; }
    .commission-main { display:grid; gap:1.25rem; }
    .commission-panel { padding:1.5rem; position:relative; overflow:hidden; }
    .commission-panel::before { content:""; position:absolute; inset:0 auto auto 0; width:100%; height:4px; background:linear-gradient(90deg, {{ $accent }}, color-mix(in srgb, {{ $accent }} 35%, #fff)); }
    .commission-title { margin:0; font-size:1.8rem; line-height:1.15; color:#0f172a; }
    .commission-description { margin:.85rem 0 0; font-size:1rem; line-height:1.7; color:#475569; max-width:62rem; }
    .commission-card-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); }
    .commission-card { padding:1.15rem; border-top:4px solid {{ $accent }}; }
    .commission-card__label { font-size:.86rem; color:#64748b; margin-bottom:.5rem; }
    .commission-card__value { font-size:1.05rem; font-weight:700; color:#0f172a; margin-bottom:.45rem; }
    .commission-card__note { font-size:.92rem; line-height:1.6; color:#475569; }
    .commission-list { margin:0; padding-left:1.1rem; color:#475569; line-height:1.8; }
    .commission-placeholder { border:1px dashed color-mix(in srgb, {{ $accent }} 30%, #cbd5e1); border-radius:14px; padding:1.1rem 1.2rem; background:color-mix(in srgb, {{ $accent }} 5%, #fff); color:#334155; }
    .commission-form-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); margin-top:1rem; }
    .commission-field { display:flex; flex-direction:column; gap:.45rem; }
    .commission-field label { font-weight:600; color:#334155; }
    .commission-field input { border:1px solid #cbd5e1; border-radius:10px; padding:.8rem .9rem; width:100%; }
    .commission-field textarea { border:1px solid #cbd5e1; border-radius:10px; padding:.8rem .9rem; width:100%; min-height:140px; resize:vertical; }
    .commission-field input[type="file"] { border:1px dashed #94a3b8; background:#f8fafc; padding:.9rem; }
    .commission-save { margin-top:1rem; display:inline-flex; align-items:center; gap:.5rem; border:0; border-radius:10px; padding:.8rem 1rem; color:#fff; background:{{ $accent }}; font-weight:700; }
    .commission-save:hover { opacity:.92; }
    .commission-toolbar { display:flex; flex-wrap:wrap; gap:.75rem; margin-top:1rem; }
    .commission-action { display:inline-flex; align-items:center; gap:.45rem; border:1px solid #cbd5e1; border-radius:10px; padding:.75rem 1rem; background:#fff; color:#334155; font-weight:700; }
    .commission-action:hover { background:#f8fafc; }
    .commission-status { padding:.9rem 1rem; border-radius:12px; background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; }
    .commission-summary-table { width:100%; border-collapse:separate; border-spacing:0; margin-top:1rem; overflow:hidden; border:1px solid #e2e8f0; border-radius:14px; }
    .commission-summary-table th,.commission-summary-table td { padding:.95rem 1rem; text-align:left; border-bottom:1px solid #e2e8f0; vertical-align:top; }
    .commission-summary-table th { width:220px; background:#f8fafc; color:#334155; font-weight:700; }
    .commission-summary-table tr:last-child th,.commission-summary-table tr:last-child td { border-bottom:0; }
    .commission-summary-value { color:#0f172a; font-weight:600; }
    .commission-summary-note { display:block; margin-top:.3rem; color:#64748b; font-size:.9rem; }
    .commission-helper { margin-top:.45rem; color:#64748b; font-size:.9rem; line-height:1.6; }
    .commission-image-preview { margin-top:.85rem; max-width:260px; border-radius:14px; border:1px solid #e2e8f0; background:#fff; overflow:hidden; }
    .commission-image-preview img { display:block; width:100%; height:auto; }
    .commission-upload-note { margin-top:.55rem; color:#0f766e; font-size:.9rem; line-height:1.6; }
    .commission-board-rate-list { display:grid; gap:1rem; margin-top:1rem; }
    .commission-board-rate-card { border:1px solid #e2e8f0; border-radius:14px; padding:1rem; background:#f8fafc; }
    .commission-board-rate-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:.85rem; }
    .commission-board-rate-title { margin:0; font-size:1rem; color:#0f172a; font-weight:700; }
    .commission-settings-layout { display:grid; gap:1.25rem; grid-template-columns:minmax(240px, 280px) minmax(0, 1fr); align-items:start; }
    .commission-settings-nav { display:grid; gap:.8rem; }
    .commission-settings-nav a { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem 1.1rem; border:1px solid #e2e8f0; border-radius:14px; background:#fff; color:#334155; font-weight:700; text-decoration:none; }
    .commission-settings-nav a.is-active { border-color:color-mix(in srgb, {{ $accent }} 35%, #cbd5e1); background:color-mix(in srgb, {{ $accent }} 8%, #fff); color:{{ $accent }}; }
    .commission-settings-nav a:hover { background:#f8fafc; }
    .commission-settings-nav span:last-child { color:#94a3b8; }
    .commission-toggle-grid { display:grid; gap:.85rem; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); margin-top:1rem; }
    .commission-toggle { display:flex; align-items:center; gap:.7rem; padding:.9rem 1rem; border:1px solid #e2e8f0; border-radius:14px; background:#fff; color:#334155; font-weight:700; }
    .commission-toggle input { width:18px; height:18px; }
    .commission-status-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); margin-top:1rem; }
    .commission-status-card { border:1px solid #e2e8f0; border-radius:14px; padding:1rem 1.1rem; background:#fff; display:grid; gap:.55rem; }
    .commission-status-card__header { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
    .commission-status-card__title { margin:0; font-size:1rem; color:#0f172a; font-weight:700; }
    .commission-status-card__badge { display:inline-flex; align-items:center; border-radius:999px; padding:.28rem .65rem; font-size:.78rem; font-weight:700; }
    .commission-status-card__badge--success { background:#dcfce7; color:#166534; }
    .commission-status-card__badge--warning { background:#fef3c7; color:#92400e; }
    .commission-status-card__badge--danger { background:#fee2e2; color:#b91c1c; }
    .commission-status-card__detail { color:#334155; line-height:1.6; }
    .commission-status-card__meta { color:#64748b; font-size:.9rem; line-height:1.6; }
    @media (max-width:980px) { .commission-shell { grid-template-columns:1fr; } }
    @media (max-width:980px) { .commission-settings-layout { grid-template-columns:1fr; } }
</style>

@php
    $directRates = old('directLevelRates', $commissionSettings['directLevelRates'] ?? ['0.2']);
    $uniRates = old('uniLevelRates', $commissionSettings['uniLevelRates'] ?? ['0.05']);
    $poolRate = old('poolRate', $commissionSettings['poolRate'] ?? '0.5');
    $cashbackRate = old('cashbackRate', $commissionSettings['cashbackRate'] ?? '0');
    $matrixOrgRate = old('organizationPvRate', $matrixSettings['organizationPvRate'] ?? '0.1');
    $matrixCwReentryAmount = old('cwReentryAmount', $matrixSettings['cwReentryAmount'] ?? ($matrixSettings['organizationPvRate'] ?? '0.1'));
    $matrixReentryFirmAmount = old('reentryFirmAmount', $matrixSettings['reentryFirmAmount'] ?? ($matrixSettings['cwReentryAmount'] ?? '0.1'));
    $matrixReentryPvAmount = old('reentryPvAmount', $matrixSettings['reentryPvAmount'] ?? ($matrixSettings['organizationPvRate'] ?? '0.1'));
    $matrixBoardWidth = old('boardWidth', $matrixSettings['boardWidth'] ?? 2);
    $matrixThresholds = old('boardOpenPvThresholds', $matrixSettings['boardOpenPvThresholds'] ?? ['100', '100', '100']);
    $matrixBoardLevelRates = old('boardLevelRates', $matrixSettings['boardLevelRates'] ?? []);
    $manualAccountName = old('accountName', $manualPaymentSettings['accountName'] ?? '');
    $manualBankName = old('bankName', $manualPaymentSettings['bankName'] ?? '');
    $manualAccountNumber = old('accountNumber', $manualPaymentSettings['accountNumber'] ?? '');
    $manualPromptPayName = old('promptPayName', $manualPaymentSettings['promptPayName'] ?? '');
    $manualPromptPayNumber = old('promptPayNumber', $manualPaymentSettings['promptPayNumber'] ?? '');
    $manualQrImageUrl = $manualPaymentSettings['qrImageUrl'] ?? '';
    $manualPaymentNote = old('note', $manualPaymentSettings['note'] ?? '');
    $signupShareSettings = $signupShareSettings ?? [
        'shareLinkMessage' => 'สมัครผ่านลิงก์แนะนำนี้ได้เลย',
        'signupSuccessMessage' => 'ส่งข้อมูลนี้เก็บไว้สำหรับเข้าใช้งานครั้งแรก และเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบทันที',
    ];
    $signupShareLinkMessage = old('shareLinkMessage', $signupShareSettings['shareLinkMessage'] ?? '');
    $signupSuccessMessage = old('signupSuccessMessage', $signupShareSettings['signupSuccessMessage'] ?? '');
    $appVisibility = $commissionSettings['appVisibility'] ?? [
        'cashback' => true,
        'direct' => true,
        'unilevel' => true,
        'matrix' => true,
        'pool' => true,
    ];
    if (!is_array($matrixBoardLevelRates) || $matrixBoardLevelRates === []) {
        $matrixBoardLevelRates = array_map(
            fn () => ($matrixSettings['levelRates'] ?? ['0.1', '0.05', '0.03']),
            range(1, max(count($matrixThresholds), 1))
        );
    }
    $latestSummaryRows = [
        [
            'label' => 'Direct bonus',
            'value' => collect($commissionSettings['directLevelRates'] ?? [])->map(fn ($rate, $index) => 'L' . ($index + 1) . ': ' . $rate)->implode(', '),
            'note' => count($commissionSettings['directLevelRates'] ?? []) . ' configured levels',
        ],
        [
            'label' => 'Unilevel bonus',
            'value' => collect($commissionSettings['uniLevelRates'] ?? [])->map(fn ($rate, $index) => 'L' . ($index + 1) . ': ' . $rate)->implode(', '),
            'note' => count($commissionSettings['uniLevelRates'] ?? []) . ' configured levels',
        ],
        [
            'label' => 'Pool rate',
            'value' => $commissionSettings['poolRate'] ?? '0',
            'note' => 'Latest pool contribution rate',
        ],
        [
            'label' => 'Cash back rate',
            'value' => $commissionSettings['cashbackRate'] ?? '0',
            'note' => 'Personal PV cashback rate on approved orders',
        ],
        [
            'label' => 'Matrix board shape',
            'value' => 'Width ' . ($matrixSettings['boardWidth'] ?? 0) . ' x Depth ' . ($matrixSettings['boardDepth'] ?? 0),
            'note' => 'Boards: ' . ($matrixSettings['boardCount'] ?? 0),
        ],
        [
            'label' => 'PV ส่วนตัวเพื่อเปิดบอร์ด',
            'value' => $matrixSettings['organizationPvRate'] ?? '0',
            'note' => 'ค่า PV ส่วนตัวขั้นต่ำล่าสุดที่ใช้เป็นเกณฑ์เปิดบอร์ด',
        ],
        [
            'label' => 'Reentry rule',
            'value' => 'ยอด Reentry ' . ($matrixSettings['cwReentryAmount'] ?? '0') . ' | Firm ' . ($matrixSettings['reentryFirmAmount'] ?? ($matrixSettings['cwReentryAmount'] ?? '0')) . ' | PV ' . ($matrixSettings['reentryPvAmount'] ?? ($matrixSettings['organizationPvRate'] ?? '0')),
            'note' => 'เมื่อเข้าเงื่อนไข reentry ระบบจะตัดยอดแล้วจ่าย Firm และ PV ตามค่านี้ทันที',
        ],
        [
            'label' => 'อัตราแต่ละบอร์ด',
            'value' => collect($matrixSettings['boardLevelRates'] ?? $matrixBoardLevelRates)->map(
                fn ($rates, $index) => 'B' . ($index + 1) . ': ' . collect($rates)->map(fn ($rate, $rateIndex) => 'L' . ($rateIndex + 1) . ' ' . $rate)->implode(', ')
            )->implode(' | '),
            'note' => 'แต่ละบอร์ดสามารถกำหนดเปอร์เซ็นต์รายชั้นแยกกันได้',
        ],
        [
            'label' => 'Board open thresholds',
            'value' => collect($matrixSettings['boardOpenPvThresholds'] ?? [])->map(fn ($value, $index) => 'B' . ($index + 1) . ': ' . $value)->implode(', '),
            'note' => count($matrixSettings['boardOpenPvThresholds'] ?? []) . ' configured boards. บอร์ดถัดไปเปิดเมื่อบอร์ดก่อนหน้าครบ',
        ],
        [
            'label' => 'Manual payment',
            'value' => ($manualPaymentSettings['bankName'] ?? '-') . ' / ' . ($manualPaymentSettings['accountNumber'] ?? '-'),
            'note' => 'PromptPay: ' . ($manualPaymentSettings['promptPayNumber'] ?? '-'),
        ],
    ];
@endphp

<div class="commission-shell">
    <section class="commission-main">
        <div class="commission-panel">
            <div class="commission-eyebrow">{{ $section['eyebrow'] ?? 'Commission Setting' }}</div>
            <h1 class="commission-title">{{ $section['title'] ?? 'Commission Setting' }}</h1>
            <p class="commission-description">{{ $section['description'] ?? '' }}</p>
        </div>

        @if (session('status'))
            <div class="commission-status">{{ session('status') }}</div>
        @endif

        <div class="commission-card-grid">
            @foreach (($section['cards'] ?? []) as $card)
                <article class="commission-card">
                    <div class="commission-card__label">{{ $card['label'] }}</div>
                    <div class="commission-card__value">{{ $card['value'] }}</div>
                    <div class="commission-card__note">{{ $card['note'] }}</div>
                </article>
            @endforeach
        </div>

        @if ($activeKey === 'settings')
            <div class="commission-settings-layout" style="grid-template-columns:minmax(0, 1fr);">
                <div class="commission-panel">
                    <div class="commission-eyebrow">Latest Commission Settings</div>
                    <table class="commission-summary-table">
                        <tbody>
                            @foreach ($latestSummaryRows as $row)
                                <tr>
                                    <th>{{ $row['label'] }}</th>
                                    <td>
                                        <span class="commission-summary-value">{{ $row['value'] !== '' ? $row['value'] : '-' }}</span>
                                        @if (!empty($row['note']))
                                            <span class="commission-summary-note">{{ $row['note'] }}</span>
                                        @endif
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
                <div class="commission-panel">
                    <form action="{{ route('platform.commission.save') }}" method="POST">
                        @csrf
                        <div class="commission-eyebrow">App Commission Menu Visibility</div>
                        <div class="commission-helper">
                            เปิดหรือปิดเมนูแต่ละตัวบนแถบหน้า Commission ของแอป หากปิด เมนูนั้นจะไม่แสดงบนหน้าแอป
                        </div>
                        <input type="hidden" name="redirectSection" value="settings">
                        @foreach ($directRates as $value)
                            <input type="hidden" name="directLevelRates[]" value="{{ $value }}">
                        @endforeach
                        @foreach ($uniRates as $value)
                            <input type="hidden" name="uniLevelRates[]" value="{{ $value }}">
                        @endforeach
                        <input type="hidden" name="poolRate" value="{{ $poolRate }}">
                        <input type="hidden" name="cashbackRate" value="{{ $cashbackRate }}">

                        <div class="commission-toggle-grid">
                            @foreach ([
                                'cashback' => 'Cashback',
                                'direct' => 'Direct',
                                'unilevel' => 'Unilevel',
                                'matrix' => 'Matrix',
                                'pool' => 'Pool',
                            ] as $key => $label)
                                <label class="commission-toggle">
                                    <input type="hidden" name="{{ $key }}Visible" value="0">
                                    <input type="checkbox" name="{{ $key }}Visible" value="1" {{ !empty($appVisibility[$key]) ? 'checked' : '' }}>
                                    <span>{{ $label }} <small style="opacity:.72;">(แสดงบนแอป)</small></span>
                                </label>
                            @endforeach
                        </div>

                        <button
                            type="submit"
                            class="commission-save"
                            data-turbo="false"
                        >
                            บันทึกการแสดงผลเมนูบนแอป
                        </button>
                    </form>
                </div>
            </div>
        @endif

        @if ($activeKey === 'direct' || $activeKey === 'unilevel' || $activeKey === 'pool' || $activeKey === 'cashback')
            <div class="commission-panel">
                <form action="{{ route('platform.commission.save') }}" method="POST">
                @csrf
                <div class="commission-eyebrow">Live Commission Settings</div>
                <input type="hidden" name="redirectSection" value="{{ $activeKey }}">

                @if ($activeKey === 'direct')
                    <div class="commission-toolbar">
                        <button type="button" class="commission-action" data-level-list="directLevelList" data-level-label="Direct level" data-level-action="add">+ Add level</button>
                        <button type="button" class="commission-action" data-level-list="directLevelList" data-level-label="Direct level" data-level-action="remove">- Remove level</button>
                    </div>
                    <div class="commission-form-grid" id="directLevelList">
                        @foreach ($directRates as $index => $value)
                            <div class="commission-field" data-level-item>
                                <label>Direct level {{ $index + 1 }}</label>
                                <input name="directLevelRates[]" value="{{ $value }}" required>
                            </div>
                        @endforeach
                    </div>
                @else
                    @foreach ($directRates as $value)
                        <input type="hidden" name="directLevelRates[]" value="{{ $value }}">
                    @endforeach
                @endif

                @if ($activeKey === 'unilevel')
                    <div class="commission-toolbar">
                        <button type="button" class="commission-action" data-level-list="uniLevelList" data-level-label="Unilevel" data-level-action="add">+ Add level</button>
                        <button type="button" class="commission-action" data-level-list="uniLevelList" data-level-label="Unilevel" data-level-action="remove">- Remove level</button>
                    </div>
                    <div class="commission-form-grid" id="uniLevelList">
                        @foreach ($uniRates as $index => $value)
                            <div class="commission-field" data-level-item>
                                <label>Unilevel {{ $index + 1 }}</label>
                                <input name="uniLevelRates[]" value="{{ $value }}" required>
                            </div>
                        @endforeach
                    </div>
                @else
                    @foreach ($uniRates as $value)
                        <input type="hidden" name="uniLevelRates[]" value="{{ $value }}">
                    @endforeach
                @endif

                @if ($activeKey === 'pool')
                    <div class="commission-form-grid">
                        <div class="commission-field">
                            <label>Pool rate</label>
                            <input name="poolRate" value="{{ $poolRate }}" required>
                        </div>
                    </div>
                @else
                    <input type="hidden" name="poolRate" value="{{ $poolRate }}">
                @endif

                @if ($activeKey === 'cashback')
                    <div class="commission-form-grid">
                        <div class="commission-field">
                            <label>Cash back rate</label>
                            <input name="cashbackRate" value="{{ $cashbackRate }}" required>
                            <div class="commission-helper">
                                คิดจาก PV ซื้อส่วนตัวของสมาชิก และจ่ายทันทีเมื่อออเดอร์ได้รับการอนุมัติ
                            </div>
                        </div>
                    </div>
                @else
                    <input type="hidden" name="cashbackRate" value="{{ $cashbackRate }}">
                @endif

                <button
                    type="submit"
                    class="commission-save"
                    data-turbo="false"
                >
                    Save Commission Settings
                </button>
                </form>
            </div>
        @endif

        @if ($activeKey === 'manual-payment')
            <div class="commission-panel">
                <form action="{{ route('platform.commission.saveManualPayment') }}" method="POST" enctype="multipart/form-data">
                @csrf
                <div class="commission-eyebrow">Manual Payment Instructions</div>
                <div class="commission-form-grid">
                    <div class="commission-field">
                        <label>Account name</label>
                        <input name="accountName" value="{{ $manualAccountName }}" required>
                    </div>
                    <div class="commission-field">
                        <label>Bank name</label>
                        <input name="bankName" value="{{ $manualBankName }}" required>
                    </div>
                    <div class="commission-field">
                        <label>Account number</label>
                        <input name="accountNumber" value="{{ $manualAccountNumber }}" required>
                    </div>
                    <div class="commission-field">
                        <label>PromptPay name</label>
                        <input name="promptPayName" value="{{ $manualPromptPayName }}" required>
                    </div>
                    <div class="commission-field">
                        <label>PromptPay number</label>
                        <input name="promptPayNumber" value="{{ $manualPromptPayNumber }}" required>
                    </div>
                    <div class="commission-field">
                        <label>QR image file</label>
                        <input type="file" id="qrImageFileInput" name="qrImageFile" accept="image/*">
                        <div class="commission-helper">
                            อัปโหลดรูป QR ได้ตรงจากเครื่อง แล้วระบบจะนำไปแสดงในหน้า Order History ของลูกค้า
                        </div>
                        <div id="qrUploadNote" class="commission-upload-note"></div>
                        @if (!empty($manualQrImageUrl))
                            <div class="commission-image-preview" id="qrPreviewContainer">
                                <img src="{{ $manualQrImageUrl }}" alt="Current QR payment image" id="qrPreviewImage">
                            </div>
                        @else
                            <div class="commission-image-preview" id="qrPreviewContainer" style="display:none;">
                                <img src="" alt="QR payment preview" id="qrPreviewImage">
                            </div>
                        @endif
                    </div>
                </div>
                <div class="commission-form-grid">
                    <div class="commission-field" style="grid-column:1 / -1;">
                        <label>Payment note</label>
                        <textarea name="note" required>{{ $manualPaymentNote }}</textarea>
                    </div>
                </div>
                <button
                    type="submit"
                    class="commission-save"
                    data-turbo="false"
                >
                    Save Manual Payment
                </button>
                </form>
            </div>
        @endif

        @if ($activeKey === 'line-status')
            @php
                $lineStatusItems = is_array($lineStatus['items'] ?? null) ? $lineStatus['items'] : [];
            @endphp
            <div class="commission-panel">
                <div class="commission-eyebrow">LINE Status</div>
                <p class="commission-description" style="margin-top:.55rem;">
                    เช็กความพร้อมของ flow LINE จาก BAO ตัวจริงโดยตรง เพื่อให้ทีมดูได้ทันทีว่า route, feed หลังบ้าน,
                    และข้อความ share พร้อมใช้งานก่อนปล่อยให้สมาชิกใช้
                </p>
                <div class="commission-helper">
                    API base: <strong>{{ $lineStatus['apiBaseUrl'] ?? '-' }}</strong>
                    <br>Checked at: <strong>{{ $lineStatus['checkedAt'] ?? '-' }}</strong>
                </div>

                <div class="commission-status-grid">
                    @foreach ($lineStatusItems as $item)
                        @php
                            $tone = $item['tone'] ?? 'warning';
                            $toneClass = match ($tone) {
                                'success' => 'commission-status-card__badge commission-status-card__badge--success',
                                'danger' => 'commission-status-card__badge commission-status-card__badge--danger',
                                default => 'commission-status-card__badge commission-status-card__badge--warning',
                            };
                            $toneLabel = match ($tone) {
                                'success' => 'Ready',
                                'danger' => 'Needs Fix',
                                default => 'Review',
                            };
                        @endphp
                        <article class="commission-status-card">
                            <div class="commission-status-card__header">
                                <h3 class="commission-status-card__title">{{ $item['title'] ?? 'Status' }}</h3>
                                <span class="{{ $toneClass }}">{{ $toneLabel }}</span>
                            </div>
                            <div class="commission-status-card__detail">{{ $item['detail'] ?? '-' }}</div>
                            @if (!empty($item['meta']))
                                <div class="commission-status-card__meta">{{ $item['meta'] }}</div>
                            @endif
                        </article>
                    @endforeach
                </div>
            </div>
        @endif

        @if ($activeKey === 'signup-share')
            <div class="commission-panel">
                <form action="{{ route('platform.commission.saveSignupShare') }}" method="POST" data-turbo="false">
                @csrf
                <input type="hidden" name="redirectSection" value="signup-share">
                <div class="commission-eyebrow">Signup Share Messages</div>
                <p class="commission-description" style="margin-top:.55rem;">
                    ตั้งค่าแยกสำหรับ <strong>ข้อความแนบไปกับลิงก์สมัคร</strong> และ
                    <strong>ข้อความก่อนแสดงรหัสสมาชิก/พาสเวิร์ดหลังสมัครสำเร็จ</strong>
                </p>

                <div class="commission-field" style="margin-top:1rem;">
                    <label for="shareLinkMessage">ข้อความแนบลิงก์สมัคร</label>
                    <textarea id="shareLinkMessage" name="shareLinkMessage">{{ $signupShareLinkMessage }}</textarea>
                    <div class="commission-helper">
                        ข้อความนี้จะถูกวางก่อนลิงก์สมัคร ตอนสมาชิกกดแชร์ผ่าน LINE หรือคัดลอกลิงก์แนะนำ
                    </div>
                </div>

                <div class="commission-field" style="margin-top:1rem;">
                    <label for="signupSuccessMessage">ข้อความหลังสมัครสำเร็จ</label>
                    <textarea id="signupSuccessMessage" name="signupSuccessMessage">{{ $signupSuccessMessage }}</textarea>
                    <div class="commission-helper">
                        ระบบจะเติมส่วนคงที่ให้อัตโนมัติใต้ข้อความนี้ในลำดับต่อไปนี้:
                        <br>รหัสสมาชิก: [จากระบบ]
                        <br>พาสเวิร์ด: [จากระบบ]
                    </div>
                </div>

                <button
                    type="submit"
                    class="commission-save"
                >
                    Save Signup Share Messages
                </button>
                </form>
            </div>
        @endif

        @if ($activeKey === 'matrix')
            <div class="commission-panel">
                <form action="{{ route('platform.commission.saveMatrix') }}" method="POST">
                @csrf
                <div class="commission-eyebrow">Live Matrix Settings</div>
                <input type="hidden" name="redirectSection" value="matrix">
                <div class="commission-form-grid">
                    <div class="commission-field">
                        <label>Board width</label>
                        <input type="number" min="1" name="boardWidth" value="{{ $matrixBoardWidth }}" required>
                    </div>
                    <div class="commission-field">
                        <label>PV ส่วนตัวขั้นต่ำเพื่อเปิดบอร์ด</label>
                        <input name="organizationPvRate" value="{{ $matrixOrgRate }}" required>
                        <div class="commission-helper">
                            ตัวอย่าง: ถ้าตั้ง 700 หมายถึงสมาชิกต้องมี PV ส่วนตัว 700 ก่อน จึงจะเปิดบอร์ด 1 ได้
                        </div>
                    </div>
                    <div class="commission-field">
                        <label>CW สำหรับ Reentry</label>
                        <input name="cwReentryAmount" value="{{ $matrixCwReentryAmount }}" required>
                        <div class="commission-helper">
                            กำหนดค่า CW ที่ต้องมีเพื่อเปิด Board 1 รอบถัดไปแยกจากค่า PV เปิดบอร์ด
                        </div>
                    </div>
                </div>

                <div class="commission-toolbar">
                    <button type="button" class="commission-action" data-level-list="matrixThresholdList" data-level-label="Board" data-level-suffix="open PV threshold" data-level-action="add">+ Add board</button>
                    <button type="button" class="commission-action" data-level-list="matrixThresholdList" data-level-label="Board" data-level-suffix="open PV threshold" data-level-action="remove">- Remove board</button>
                </div>
                <div class="commission-form-grid" id="matrixThresholdList">
                        @foreach ($matrixThresholds as $index => $value)
                            <div class="commission-field" data-level-item>
                                <label>เกณฑ์ PV ส่วนตัวขั้นต่ำสำหรับเปิดบอร์ด {{ $index + 1 }}</label>
                                <input name="boardOpenPvThresholds[]" value="{{ $value }}" required>
                                @if ($index === 0)
                                    <div class="commission-helper">
                                        เมื่อสมาชิกเปิดบอร์ดแล้ว หากคนในสายเลือดมี PV ตามเกณฑ์ จะเข้ามาเป็นคนที่ 1 ในชั้นที่ 1
                                        และถ้าคนนั้นมีสายงานต่อ ระบบจะวางต่อใต้คนนั้นทางซ้ายก่อน
                                    </div>
                                @elseif ($index === 1)
                                    <div class="commission-helper">
                                        บอร์ด 2 จะเปิดเมื่อสมาชิกในบอร์ด 1 ครบก่อน แล้วใช้ยอด PV ส่วนตัวของสมาชิกในบอร์ด 1
                                        เป็นฐานคำนวณการเปิดบอร์ด 2
                                    </div>
                                @elseif ($index === 2)
                                    <div class="commission-helper">
                                        บอร์ด 3 ใช้หลักเดียวกับบอร์ด 2 คือรอบอร์ดก่อนหน้าเต็ม แล้วคำนวณต่อจากยอด PV ส่วนตัว
                                        ของสมาชิกในบอร์ดก่อนหน้า
                                    </div>
                                @endif
                            </div>
                        @endforeach
                    </div>

                <div class="commission-eyebrow" style="margin-top:1.25rem;">เปอร์เซ็นต์รายชั้นของแต่ละบอร์ด</div>
                <div class="commission-board-rate-list" id="matrixBoardRateList">
                    @foreach ($matrixBoardLevelRates as $boardIndex => $boardRates)
                        <div class="commission-board-rate-card" data-board-item>
                            <div class="commission-board-rate-header">
                                <h3 class="commission-board-rate-title">บอร์ด {{ $boardIndex + 1 }}</h3>
                                <div class="commission-toolbar">
                                    <button
                                        type="button"
                                        class="commission-action"
                                        data-level-list="matrixBoardLevels-{{ $boardIndex }}"
                                        data-level-label="บอร์ด {{ $boardIndex + 1 }} ชั้น"
                                        data-level-action="add"
                                    >
                                        + Add level
                                    </button>
                                    <button
                                        type="button"
                                        class="commission-action"
                                        data-level-list="matrixBoardLevels-{{ $boardIndex }}"
                                        data-level-label="บอร์ด {{ $boardIndex + 1 }} ชั้น"
                                        data-level-action="remove"
                                    >
                                        - Remove level
                                    </button>
                                </div>
                            </div>
                            <div class="commission-form-grid" id="matrixBoardLevels-{{ $boardIndex }}">
                                @foreach ($boardRates as $rateIndex => $rateValue)
                                    <div class="commission-field" data-level-item>
                                        <label>บอร์ด {{ $boardIndex + 1 }} ชั้น {{ $rateIndex + 1 }}</label>
                                        <input name="boardLevelRates[{{ $boardIndex }}][]" value="{{ $rateValue }}" required>
                                    </div>
                                @endforeach
                            </div>
                        </div>
                    @endforeach
                </div>

                <button
                    type="submit"
                    class="commission-save"
                    data-turbo="false"
                >
                    Save Matrix Settings
                </button>
                </form>
            </div>
        @endif

        @if ($activeKey === 'reentry')
            <div class="commission-panel">
                <form action="{{ route('platform.commission.saveMatrix') }}" method="POST">
                @csrf
                <div class="commission-eyebrow">Live Reentry Settings</div>
                <input type="hidden" name="redirectSection" value="reentry">
                <input type="hidden" name="boardWidth" value="{{ $matrixBoardWidth }}">
                <input type="hidden" name="organizationPvRate" value="{{ $matrixOrgRate }}">
                @foreach ($matrixThresholds as $value)
                    <input type="hidden" name="boardOpenPvThresholds[]" value="{{ $value }}">
                @endforeach
                @foreach ($matrixBoardLevelRates as $boardIndex => $boardRates)
                    @foreach ($boardRates as $rateValue)
                        <input type="hidden" name="boardLevelRates[{{ $boardIndex }}][]" value="{{ $rateValue }}">
                    @endforeach
                @endforeach

                <div class="commission-form-grid">
                    <div class="commission-field">
                        <label>ยอด Reentry</label>
                        <input name="cwReentryAmount" value="{{ $matrixCwReentryAmount }}" required>
                        <div class="commission-helper">
                            ยอดที่ระบบใช้ตัดเมื่อสมาชิกเข้าเงื่อนไข reentry
                        </div>
                    </div>
                    <div class="commission-field">
                        <label>จำนวน Firm ที่ได้</label>
                        <input name="reentryFirmAmount" value="{{ $matrixReentryFirmAmount }}" required>
                        <div class="commission-helper">
                            เมื่อถึงกติกา reentry ระบบจะโอน Firm wallet ให้ทันทีตามจำนวนนี้
                        </div>
                    </div>
                    <div class="commission-field">
                        <label>จำนวน PV ที่ได้</label>
                        <input name="reentryPvAmount" value="{{ $matrixReentryPvAmount }}" required>
                        <div class="commission-helper">
                            ใช้เป็น PV ของ event reentry ทันทีเมื่อสมาชิกเข้าเงื่อนไข
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    class="commission-save"
                    data-turbo="false"
                >
                    Save Reentry Settings
                </button>
                </form>
            </div>
        @endif

        <div class="commission-panel">
            <div class="commission-eyebrow">Planning Notes</div>
            <ol class="commission-list">
                @foreach (($section['bullets'] ?? []) as $bullet)
                    <li>{{ $bullet }}</li>
                @endforeach
            </ol>
        </div>

        <div class="commission-placeholder">
            Commission pages now write into the shared runtime settings used by poolproject. Next step is wiring deeper validation and per-section business rules.
        </div>
    </section>
</div>

<script>
    (function () {
        const qrFileInput = document.getElementById('qrImageFileInput');
        const qrUploadNote = document.getElementById('qrUploadNote');
        const qrPreviewContainer = document.getElementById('qrPreviewContainer');
        const qrPreviewImage = document.getElementById('qrPreviewImage');
        const QR_MAX_DIMENSION = 1600;
        const QR_OUTPUT_QUALITY = 0.82;
        const QR_MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

        function updateQrPreview(src) {
            if (!qrPreviewContainer || !qrPreviewImage) return;
            if (!src) {
                qrPreviewContainer.style.display = 'none';
                qrPreviewImage.removeAttribute('src');
                return;
            }

            qrPreviewImage.src = src;
            qrPreviewContainer.style.display = 'block';
        }

        function setQrUploadNote(message) {
            if (!qrUploadNote) return;
            qrUploadNote.textContent = message || '';
        }

        async function resizeQrFile(file) {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Unable to read QR image.'));
                reader.readAsDataURL(file);
            });

            const image = await new Promise((resolve, reject) => {
                const nextImage = new Image();
                nextImage.onload = () => resolve(nextImage);
                nextImage.onerror = () => reject(new Error('Unable to load QR image.'));
                nextImage.src = dataUrl;
            });

            const scale = Math.min(
                1,
                QR_MAX_DIMENSION / Math.max(image.width, image.height)
            );
            const canvas = document.createElement('canvas');
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));
            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error('Unable to prepare QR image.');
            }

            context.drawImage(image, 0, 0, width, height);

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    (result) => result ? resolve(result) : reject(new Error('Unable to compress QR image.')),
                    'image/jpeg',
                    QR_OUTPUT_QUALITY
                );
            });

            const safeName = (file.name || 'qr-image').replace(/\.[^.]+$/, '');
            return new File([blob], `${safeName}-optimized.jpg`, { type: 'image/jpeg' });
        }

        function renumber(containerId, labelPrefix) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const items = Array.from(container.querySelectorAll('[data-level-item]'));
            const suffix = container.getAttribute('data-level-suffix') || '';
            items.forEach(function (item, index) {
                const label = item.querySelector('label');
                if (label) {
                    label.textContent = `${labelPrefix} ${index + 1}${suffix ? ` ${suffix}` : ''}`;
                }
            });
        }

        function addLevel(containerId, labelPrefix, suffix) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const template = container.querySelector('[data-level-item]');
            if (!template) return;
            container.setAttribute('data-level-suffix', suffix || '');
            const clone = template.cloneNode(true);
            const input = clone.querySelector('input');
            if (input) {
                input.value = '0';
            }
            container.appendChild(clone);
            renumber(containerId, labelPrefix);
        }

        function removeLevel(containerId, labelPrefix, suffix) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.setAttribute('data-level-suffix', suffix || '');
            const items = container.querySelectorAll('[data-level-item]');
            if (items.length <= 1) return;
            items[items.length - 1].remove();
            renumber(containerId, labelPrefix);
        }

        document.addEventListener('click', function (event) {
            const button = event.target.closest('[data-level-action]');
            if (!button) return;

            const containerId = button.getAttribute('data-level-list');
            const labelPrefix = button.getAttribute('data-level-label') || 'Level';
            const suffix = button.getAttribute('data-level-suffix') || '';
            const action = button.getAttribute('data-level-action');

            if (action === 'add') {
                addLevel(containerId, labelPrefix, suffix);
            } else {
                removeLevel(containerId, labelPrefix, suffix);
            }

            if (containerId === 'matrixThresholdList') {
                window.requestAnimationFrame(syncBoardRateCards);
            }
        });

        if (qrFileInput) {
            qrFileInput.addEventListener('change', async function (event) {
                const file = event.target.files && event.target.files[0];
                if (!file) {
                    setQrUploadNote('');
                    return;
                }

                try {
                    const nextFile = await resizeQrFile(file);

                    const transfer = new DataTransfer();
                    transfer.items.add(nextFile);
                    qrFileInput.files = transfer.files;
                    setQrUploadNote(
                        nextFile.size < file.size
                            ? `ระบบย่อรูปให้แล้วจาก ${(file.size / 1024 / 1024).toFixed(2)}MB เหลือ ${(nextFile.size / 1024 / 1024).toFixed(2)}MB`
                            : `ระบบเตรียมรูปสำหรับอัปโหลดแล้ว (${(nextFile.size / 1024 / 1024).toFixed(2)}MB)`
                    );
                    updateQrPreview(URL.createObjectURL(nextFile));
                } catch (error) {
                    console.error(error);
                    setQrUploadNote('ไม่สามารถย่อรูปอัตโนมัติได้ กรุณาลองเลือกรูปใหม่');
                }
            });
        }

        function syncBoardRateCards() {
            const thresholdContainer = document.getElementById('matrixThresholdList');
            const boardRateList = document.getElementById('matrixBoardRateList');
            if (!thresholdContainer || !boardRateList) return;

            const boardItems = Array.from(boardRateList.querySelectorAll('[data-board-item]'));
            const boardCount = thresholdContainer.querySelectorAll('[data-level-item]').length;

            while (boardItems.length < boardCount) {
                const template = boardItems[0];
                if (!template) break;
                const clone = template.cloneNode(true);
                clone.querySelectorAll('input').forEach(function (input) {
                    input.value = '0';
                });
                boardRateList.appendChild(clone);
                boardItems.push(clone);
            }

            while (boardItems.length > boardCount && boardItems.length > 1) {
                const last = boardItems.pop();
                if (last) {
                    last.remove();
                }
            }

            Array.from(boardRateList.querySelectorAll('[data-board-item]')).forEach(function (boardItem, boardIndex) {
                const title = boardItem.querySelector('.commission-board-rate-title');
                if (title) {
                    title.textContent = `บอร์ด ${boardIndex + 1}`;
                }

                const toolbarButtons = boardItem.querySelectorAll('[data-level-action]');
                toolbarButtons.forEach(function (button) {
                    button.setAttribute('data-level-list', `matrixBoardLevels-${boardIndex}`);
                    button.setAttribute('data-level-label', `บอร์ด ${boardIndex + 1} ชั้น`);
                });

                const levelContainer = boardItem.querySelector('.commission-form-grid');
                if (!levelContainer) return;
                levelContainer.id = `matrixBoardLevels-${boardIndex}`;

                levelContainer.querySelectorAll('[data-level-item]').forEach(function (levelItem, rateIndex) {
                    const label = levelItem.querySelector('label');
                    const input = levelItem.querySelector('input');
                    if (label) {
                        label.textContent = `บอร์ด ${boardIndex + 1} ชั้น ${rateIndex + 1}`;
                    }
                    if (input) {
                        input.name = `boardLevelRates[${boardIndex}][]`;
                    }
                });
            });
        }

        syncBoardRateCards();
    })();
</script>
