@php
    $filters = $filters ?? [];
    $rows = $commissionReportRows ?? null;
    $totals = $commissionReportTotals ?? [];
    $section = $commissionSection ?? [];
    $accent = $section['accent'] ?? '#2563eb';
    $reportMode = $reportMode ?? 'overview';
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
    .commission-filter-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); margin-top:1rem; }
    .commission-field { display:flex; flex-direction:column; gap:.45rem; }
    .commission-field label { font-weight:600; color:#334155; }
    .commission-field input,.commission-field select { border:1px solid #cbd5e1; border-radius:10px; padding:.8rem .9rem; width:100%; }
    .commission-actions { display:flex; gap:.75rem; flex-wrap:wrap; margin-top:1rem; }
    .commission-button { display:inline-flex; align-items:center; justify-content:center; border:0; border-radius:10px; padding:.8rem 1rem; font-weight:700; color:#fff; background:{{ $accent }}; text-decoration:none; }
    .commission-button.is-secondary { background:#e2e8f0; color:#334155; }
    .commission-table-wrap { overflow:auto; }
    .commission-table { width:100%; border-collapse:separate; border-spacing:0; }
    .commission-table th,.commission-table td { padding:.9rem .85rem; border-bottom:1px solid #e2e8f0; text-align:left; vertical-align:top; white-space:nowrap; }
    .commission-table th { background:#f8fafc; color:#334155; font-weight:700; }
    .commission-table tfoot td { background:#f8fafc; color:#0f172a; font-weight:700; border-top:2px solid #cbd5e1; }
    .commission-table tfoot td.is-muted { color:#64748b; }
    .commission-empty { color:#64748b; padding:.5rem 0; }
    .commission-note { border:1px dashed color-mix(in srgb, {{ $accent }} 30%, #cbd5e1); border-radius:14px; padding:1.1rem 1.2rem; background:color-mix(in srgb, {{ $accent }} 5%, #fff); color:#334155; }
    @media (max-width:980px) { .commission-shell { grid-template-columns:1fr; } }
</style>

<div class="commission-shell">
    <section class="commission-main">
        <div class="commission-panel">
            <form method="GET" action="{{ url()->current() }}">
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
                <div class="commission-actions">
                    <button type="submit" class="commission-button">Search</button>
                    <a href="{{ url()->current() }}" class="commission-button is-secondary">Reset</a>
                </div>
            </form>
        </div>

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
                                <th>พูลโบนัส</th>
                                <th>ยูนิลีเวล</th>
                                <th>เมทริกซ์</th>
                                <th>จำนวนรวม</th>
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
                                    <td>{{ $formatDecimal($row['poolAmount']) }}</td>
                                    <td>{{ $formatDecimal($row['uniAmount']) }}</td>
                                    <td>{{ $formatDecimal($row['matrixAmount']) }}</td>
                                    <td>{{ $formatDecimal($row['totalAmount']) }}</td>
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
                                <td colspan="{{ $reportMode === 'overview' ? '8' : '9' }}" class="commission-empty">ยังไม่มีข้อมูลคอมมิชชั่นในช่วงเวลาหรือเงื่อนไขที่เลือก</td>
                            </tr>
                        @endforelse
                    </tbody>
                    @if (($rows instanceof \Illuminate\Contracts\Pagination\Paginator && count($rows->items()) > 0) || (is_iterable($rows) && count($rows) > 0))
                        <tfoot>
                            <tr>
                                <td colspan="3">รวมทั้งหมด</td>
                                @if ($reportMode === 'overview')
                                    <td>{{ $formatDecimal($totals['directAmount'] ?? 0) }}</td>
                                    <td>{{ $formatDecimal($totals['poolAmount'] ?? 0) }}</td>
                                    <td>{{ $formatDecimal($totals['uniAmount'] ?? 0) }}</td>
                                    <td>{{ $formatDecimal($totals['matrixAmount'] ?? 0) }}</td>
                                    <td>{{ $formatDecimal($totals['totalAmount'] ?? 0) }}</td>
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
                <div style="margin-top:1rem;">{{ $rows->links() }}</div>
            @endif
        </div>

        <div class="commission-note">
            {{ $reportMode === 'overview'
                ? 'รายงานนี้แสดงยอดคอมมิชชั่นรวมต่อสมาชิกในแต่ละวัน โดยแยกคอลัมน์ตามประเภทโบนัสหลัก และมีแถวรวมยอดจากผลลัพธ์ที่กรองทั้งหมด'
                : 'รายงานนี้แสดงรายการคอมมิชชั่นแบบละเอียด พร้อมค่าพีวี เปอร์เซ็นต์ และจำนวนเงินแบบทศนิยม 2 ตำแหน่ง รวมยอดจากข้อมูลที่กรองทั้งหมด' }}
        </div>
    </section>
</div>
