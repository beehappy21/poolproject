@php
    $filters = $filters ?? [];
    $rows = $commissionReportRows ?? null;
    $totals = $commissionReportTotals ?? [];
    $summaryCards = $commissionReportSummaryCards ?? [];
    $nav = $commissionNav ?? [];
    $section = $commissionSection ?? [];
    $accent = $section['accent'] ?? '#2563eb';
    $reportMode = $reportMode ?? 'overview';
    $selectedFormat = strtolower((string) request('format', 'csv'));
    $resultCount = $rows instanceof \Illuminate\Contracts\Pagination\Paginator
        ? (int) $rows->total()
        : (is_countable($rows) ? count($rows) : 0);
    $activeFilters = array_filter([
        ($filters['memberFrom'] ?? '') !== '' ? 'สมาชิกจาก: ' . $filters['memberFrom'] : null,
        ($filters['memberTo'] ?? '') !== '' ? 'สมาชิกถึง: ' . $filters['memberTo'] : null,
        ($filters['dateFrom'] ?? '') !== '' ? 'วันที่เริ่ม: ' . $filters['dateFrom'] : null,
        ($filters['dateTo'] ?? '') !== '' ? 'วันที่สิ้นสุด: ' . $filters['dateTo'] : null,
        isset($filters['pageSize']) ? 'ต่อหน้า: ' . $filters['pageSize'] : null,
    ]);
    $formatDecimal = static function ($value): string {
        return number_format((float) $value, 2, '.', ',');
    };
@endphp

<style>
    .commission-shell { display:grid; gap:1.25rem; grid-template-columns:minmax(0,1fr); }
    .commission-panel,.commission-card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; box-shadow:0 12px 40px rgba(15,23,42,.05); }
    .commission-main { display:grid; gap:1.25rem; }
    .commission-panel { padding:1.5rem; position:relative; overflow:hidden; }
    .commission-panel::before { content:""; position:absolute; inset:0 auto auto 0; width:100%; height:4px; background:linear-gradient(90deg, {{ $accent }}, color-mix(in srgb, {{ $accent }} 35%, #fff)); }
    .commission-eyebrow { font-size:.75rem; text-transform:uppercase; letter-spacing:.12em; color:#64748b; }
    .commission-title { margin:0; font-size:1.8rem; line-height:1.15; color:#0f172a; }
    .commission-description { margin:.85rem 0 0; font-size:1rem; line-height:1.7; color:#475569; max-width:62rem; }
    .commission-toolbar { display:flex; flex-wrap:wrap; gap:.75rem; margin-top:1rem; }
    .commission-tab { display:inline-flex; align-items:center; justify-content:center; padding:.78rem 1rem; border:1px solid #dbe2ea; border-radius:999px; background:#fff; color:#334155; font-weight:700; text-decoration:none; transition:all .18s ease; }
    .commission-tab:hover { border-color:color-mix(in srgb, {{ $accent }} 24%, #cbd5e1); background:#f8fafc; color:#0f172a; }
    .commission-tab.is-active { border-color:color-mix(in srgb, {{ $accent }} 30%, #cbd5e1); background:color-mix(in srgb, {{ $accent }} 10%, #fff); color:{{ $accent }}; box-shadow:0 10px 24px color-mix(in srgb, {{ $accent }} 12%, transparent); }
    .commission-meta-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); margin-top:1.1rem; }
    .commission-meta-card { border:1px solid #e2e8f0; border-radius:14px; padding:1rem 1.1rem; background:#f8fafc; }
    .commission-meta-card__label { font-size:.8rem; text-transform:uppercase; letter-spacing:.08em; color:#64748b; }
    .commission-meta-card__value { margin-top:.4rem; font-size:1.15rem; font-weight:700; color:#0f172a; }
    .commission-meta-card__note { margin-top:.35rem; font-size:.92rem; line-height:1.6; color:#475569; }
    .commission-filter-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); margin-top:1rem; }
    .commission-field { display:flex; flex-direction:column; gap:.45rem; }
    .commission-field label { font-weight:600; color:#334155; }
    .commission-field input,.commission-field select { border:1px solid #cbd5e1; border-radius:10px; padding:.8rem .9rem; width:100%; }
    .commission-actions { display:flex; gap:.75rem; flex-wrap:wrap; margin-top:1rem; }
    .commission-button { display:inline-flex; align-items:center; justify-content:center; border:0; border-radius:10px; padding:.8rem 1rem; font-weight:700; color:#fff; background:{{ $accent }}; text-decoration:none; }
    .commission-button.is-secondary { background:#e2e8f0; color:#334155; }
    .commission-button.is-ghost { background:#fff; color:#334155; border:1px solid #cbd5e1; }
    .commission-filter-summary { display:flex; flex-wrap:wrap; gap:.6rem; margin-top:1rem; }
    .commission-chip { display:inline-flex; align-items:center; gap:.4rem; padding:.45rem .75rem; border-radius:999px; background:color-mix(in srgb, {{ $accent }} 8%, #fff); color:#334155; font-size:.88rem; border:1px solid color-mix(in srgb, {{ $accent }} 18%, #dbe2ea); }
    .commission-table-wrap { overflow:auto; }
    .commission-table { width:100%; border-collapse:separate; border-spacing:0; }
    .commission-table th,.commission-table td { padding:.9rem .85rem; border-bottom:1px solid #e2e8f0; text-align:left; vertical-align:top; white-space:nowrap; }
    .commission-table th { background:#f8fafc; color:#334155; font-weight:700; }
    .commission-table tfoot td { background:#f8fafc; color:#0f172a; font-weight:700; border-top:2px solid #cbd5e1; }
    .commission-table tfoot td.is-muted { color:#64748b; }
    .commission-empty { color:#64748b; padding:1rem 0; white-space:normal; }
    .commission-note { border:1px dashed color-mix(in srgb, {{ $accent }} 30%, #cbd5e1); border-radius:14px; padding:1.1rem 1.2rem; background:color-mix(in srgb, {{ $accent }} 5%, #fff); color:#334155; }
    .commission-card-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); }
    .commission-card { padding:1.15rem; border-top:4px solid {{ $accent }}; }
    .commission-card__label { font-size:.86rem; color:#64748b; margin-bottom:.5rem; }
    .commission-card__value { font-size:1.3rem; font-weight:700; color:#0f172a; margin-bottom:.35rem; }
    .commission-card__note { font-size:.92rem; line-height:1.6; color:#475569; }
    .commission-inline-note { margin-top:.75rem; color:#64748b; font-size:.92rem; line-height:1.6; }
    .commission-empty-state { display:grid; gap:.6rem; padding:1.2rem 0 .4rem; }
    .commission-empty-state strong { color:#0f172a; }
    .commission-empty-state span { color:#64748b; line-height:1.7; }
    .commission-pagination-wrap { margin-top:1rem; }
    .commission-export-select { max-width:160px; }
    .commission-form { display:block; }
    @media (max-width:640px) {
        .commission-actions { flex-direction:column; align-items:stretch; }
        .commission-export-select { max-width:none; width:100%; }
        .commission-button { width:100%; }
    }
    @media (max-width:980px) { .commission-shell { grid-template-columns:1fr; } }
</style>

<div class="commission-shell">
    <section class="commission-main">
        <div class="commission-panel">
            <div class="commission-eyebrow">{{ $section['eyebrow'] ?? 'รายงานคอมมิชชั่น' }}</div>
            <h1 class="commission-title">{{ $section['title'] ?? 'รายงานคอมมิชชั่น' }}</h1>
            <p class="commission-description">{{ $section['description'] ?? 'ตรวจสอบข้อมูลคอมมิชชั่นตามสมาชิก ประเภทโบนัส และช่วงเวลาที่ต้องการ' }}</p>

            @if ($nav !== [])
                <div class="commission-toolbar">
                    @foreach ($nav as $item)
                        <a href="{{ $item['route'] }}" class="commission-tab{{ !empty($item['isActive']) ? ' is-active' : '' }}">
                            {{ $item['title'] }}
                        </a>
                    @endforeach
                </div>
            @endif

            <div class="commission-meta-grid">
                <div class="commission-meta-card">
                    <div class="commission-meta-card__label">ผลลัพธ์ทั้งหมด</div>
                    <div class="commission-meta-card__value">{{ number_format($resultCount, 0, '.', ',') }} แถว</div>
                    <div class="commission-meta-card__note">นับจากเงื่อนไขที่กรองอยู่ตอนนี้ และใช้ชุดข้อมูล active commission เท่านั้น</div>
                </div>
                <div class="commission-meta-card">
                    <div class="commission-meta-card__label">โหมดรายงาน</div>
                    <div class="commission-meta-card__value">{{ $section['title'] ?? 'รายงานคอมมิชชั่น' }}</div>
                    <div class="commission-meta-card__note">สลับแท็บได้โดยระบบจะพกตัวกรองเดิมไปให้ เพื่อเทียบ direct, team, matching และ pool ได้ต่อเนื่อง</div>
                </div>
            </div>

            <form id="commission-report-form" class="commission-form" method="GET" action="{{ url()->current() }}">
                <div class="commission-filter-grid">
                    <div class="commission-field">
                        <label>สมาชิกจาก</label>
                        <input name="member_from" value="{{ $filters['memberFrom'] ?? '' }}" placeholder="รหัสสมาชิกหรือชื่อสมาชิก">
                    </div>
                    <div class="commission-field">
                        <label>สมาชิกถึง</label>
                        <input name="member_to" value="{{ $filters['memberTo'] ?? '' }}" placeholder="รหัสสมาชิกหรือชื่อสมาชิก">
                    </div>
                    <div class="commission-field">
                        <label>วันที่เริ่ม</label>
                        <input type="date" name="date_from" value="{{ $filters['dateFrom'] ?? '' }}">
                    </div>
                    <div class="commission-field">
                        <label>วันที่สิ้นสุด</label>
                        <input type="date" name="date_to" value="{{ $filters['dateTo'] ?? '' }}">
                    </div>
                    <div class="commission-field">
                        <label>จำนวนต่อหน้า</label>
                        <select name="page_size">
                            @foreach ([25, 50, 100] as $size)
                                <option value="{{ $size }}" @selected((int) ($filters['pageSize'] ?? 25) === $size)>{{ $size }}</option>
                            @endforeach
                        </select>
                    </div>
                </div>
                @if ($activeFilters !== [])
                    <div class="commission-filter-summary">
                        @foreach ($activeFilters as $filterLabel)
                            <span class="commission-chip">{{ $filterLabel }}</span>
                        @endforeach
                    </div>
                @endif
                <div class="commission-actions">
                    <button type="submit" class="commission-button" id="commission-search-button">ค้นหา</button>
                    <a href="{{ url()->current() }}" class="commission-button is-secondary">ล้างตัวกรอง</a>
                    <select name="format" class="commission-export-select">
                        <option value="csv" @selected($selectedFormat === 'csv')>CSV</option>
                        <option value="xlsx" @selected(in_array($selectedFormat, ['xlsx', 'excel'], true))>Excel</option>
                        <option value="pdf" @selected($selectedFormat === 'pdf')>PDF</option>
                    </select>
                    <button
                        type="button"
                        class="commission-button is-secondary"
                        id="commission-export-button"
                        data-export-url="{{ route('platform.commission.report.export', ['reportMode' => $reportMode]) }}"
                    >
                        ส่งออกไฟล์
                    </button>
                </div>
                <div class="commission-inline-note">
                    PDF เหมาะกับรายงานขนาดเล็ก และรองรับการส่งออกได้ไม่เกิน 500 แถวต่อครั้ง หากข้อมูลมากกว่านี้แนะนำให้ใช้ CSV หรือ Excel
                </div>
            </form>
        </div>

        @if ($summaryCards !== [])
            <div class="commission-card-grid">
                @foreach ($summaryCards as $card)
                    <article class="commission-panel commission-card">
                        <div class="commission-card__label">{{ $card['label'] }}</div>
                        <div class="commission-card__value">
                            {{ ($card['format'] ?? 'decimal') === 'count' ? number_format((float) $card['value'], 0, '.', ',') : $formatDecimal($card['value']) }}
                        </div>
                        <div class="commission-card__note">{{ $card['note'] }}</div>
                    </article>
                @endforeach
            </div>
        @endif

        <div class="commission-panel">
            <div class="commission-table-wrap">
                <table class="commission-table">
                    <thead>
                        <tr>
                            <th>วันที่</th>
                            <th>รหัสสมาชิก</th>
                            <th>ชื่อสมาชิก</th>
                            @if ($reportMode === 'overview')
                                <th>โบนัสแนะนำ</th>
                                <th>โบนัสทีม</th>
                                <th>โบนัส Matching</th>
                                <th>พูลโบนัส</th>
                                <th>จำนวนรวม</th>
                            @elseif ($reportMode === 'pool')
                                <th>พีวี</th>
                                <th>เปอร์เซ็นต์</th>
                                <th>จำนวน</th>
                            @else
                                <th>จาก</th>
                                <th>ชื่อ</th>
                                <th>ลำดับชั้น</th>
                                <th>พีวี</th>
                                <th>เปอร์เซ็นต์</th>
                                <th>จำนวน</th>
                            @endif
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($rows as $row)
                            <tr>
                                <td>{{ \Illuminate\Support\Carbon::parse($row['reportDate'])->format('Y-m-d') }}</td>
                                <td>{{ $row['beneficiaryMemberCode'] }}</td>
                                <td>{{ $row['beneficiaryName'] }}</td>
                                @if ($reportMode === 'overview')
                                <td>{{ $formatDecimal($row['directAmount']) }}</td>
                                <td>{{ $formatDecimal($row['teamAmount']) }}</td>
                                <td>{{ $formatDecimal($row['matchingAmount']) }}</td>
                                <td>{{ $formatDecimal($row['poolAmount']) }}</td>
                                <td>{{ $formatDecimal($row['totalAmount']) }}</td>
                            @elseif ($reportMode === 'pool')
                                <td>{{ $formatDecimal($row['basePv']) }}</td>
                                <td>{{ $formatDecimal($row['rate']) }}</td>
                                <td>{{ $formatDecimal($row['amount']) }}</td>
                            @else
                                <td>{{ $row['sourceMemberCode'] }}</td>
                                <td>{{ $row['sourceName'] }}</td>
                                <td>{{ $row['levelNo'] }}</td>
                                <td>{{ $formatDecimal($row['basePv']) }}</td>
                                <td>{{ $formatDecimal($row['rate']) }}</td>
                                <td>{{ $formatDecimal($row['amount']) }}</td>
                                @endif
                            </tr>
                        @empty
                            <tr>
                                <td colspan="{{ $reportMode === 'overview' ? '8' : ($reportMode === 'pool' ? '6' : '9') }}" class="commission-empty">
                                    <div class="commission-empty-state">
                                        <strong>ยังไม่มีข้อมูลคอมมิชชั่นในช่วงเวลาหรือเงื่อนไขที่เลือก</strong>
                                        <span>ลองขยายช่วงวันที่ หรือสลับแท็บรายงานเพื่อตรวจสอบว่าข้อมูลอยู่ใน direct, team, matching หรือ pool แทน</span>
                                    </div>
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                    @if (($rows instanceof \Illuminate\Contracts\Pagination\Paginator && count($rows->items()) > 0) || (is_iterable($rows) && count($rows) > 0))
                        <tfoot>
                            <tr>
                                <td colspan="3">รวมทั้งหมด</td>
                                @if ($reportMode === 'overview')
                                <td>{{ $formatDecimal($totals['directAmount'] ?? 0) }}</td>
                                <td>{{ $formatDecimal($totals['teamAmount'] ?? 0) }}</td>
                                <td>{{ $formatDecimal($totals['matchingAmount'] ?? 0) }}</td>
                                <td>{{ $formatDecimal($totals['poolAmount'] ?? 0) }}</td>
                                <td>{{ $formatDecimal($totals['totalAmount'] ?? 0) }}</td>
                            @elseif ($reportMode === 'pool')
                                <td>{{ $formatDecimal($totals['basePv'] ?? 0) }}</td>
                                <td>{{ $formatDecimal($totals['avgRate'] ?? 0) }}</td>
                                <td>{{ $formatDecimal($totals['amount'] ?? 0) }}</td>
                            @else
                                <td class="is-muted">-</td>
                                <td class="is-muted">-</td>
                                <td class="is-muted">-</td>
                                <td>{{ $formatDecimal($totals['basePv'] ?? 0) }}</td>
                                <td class="is-muted">-</td>
                                <td>{{ $formatDecimal($totals['amount'] ?? 0) }}</td>
                                @endif
                            </tr>
                        </tfoot>
                    @endif
                </table>
            </div>

            @if ($rows instanceof \Illuminate\Contracts\Pagination\Paginator)
                <div class="commission-pagination-wrap">{{ $rows->links() }}</div>
            @endif
        </div>

        <div class="commission-note">
            {{ $reportMode === 'overview'
                ? 'รายงานนี้แสดงยอดคอมมิชชั่นรวมต่อสมาชิกในแต่ละวัน โดยแยกตาม direct, team, matching, และ pool พร้อมแถวรวมยอดจากผลลัพธ์ที่กรองทั้งหมด'
                : ($reportMode === 'pool'
                    ? 'สูตรของพูลโบนัสคือ PV approved รวมของวัน x % pool แล้วหารด้วยจำนวนสมาชิกที่ eligible ตามกติกาปัจจุบันของระบบ'
                    : 'รายงานนี้แสดงรายการคอมมิชชั่นแบบละเอียด พร้อมค่าพีวี เปอร์เซ็นต์ และจำนวนเงินแบบทศนิยม 2 ตำแหน่ง รวมยอดจากข้อมูลที่กรองทั้งหมด') }}
        </div>
    </section>
</div>

<script>
    (() => {
        const form = document.getElementById('commission-report-form');
        const exportButton = document.getElementById('commission-export-button');

        if (!form || !exportButton) {
            return;
        }

        const buildParams = () => {
            const params = new URLSearchParams();
            const fields = form.querySelectorAll('input[name], select[name], textarea[name]');

            for (const field of fields) {
                const key = field.name;
                const value = field.value;

                if (typeof value !== 'string' || value === '') {
                    continue;
                }

                params.set(key, value);
            }

            return params;
        };

        exportButton.addEventListener('click', () => {
            const params = buildParams();
            const exportUrl = exportButton.dataset.exportUrl || '';
            const targetUrl = params.toString() !== '' ? `${exportUrl}?${params.toString()}` : exportUrl;
            window.open(targetUrl, '_blank', 'noopener');
        });
    })();
</script>
