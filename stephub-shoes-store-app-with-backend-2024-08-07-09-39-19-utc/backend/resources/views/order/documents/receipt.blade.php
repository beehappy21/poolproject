<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ $documentTitle }} {{ $order->order_no }}</title>
  <style>
    @font-face {
      font-family: 'Prompt';
      font-style: normal;
      font-weight: 400;
      src: url('{{ resource_path('fonts/prompt/Prompt-Regular.ttf') }}') format('truetype');
    }
    @font-face {
      font-family: 'Prompt';
      font-style: normal;
      font-weight: 600;
      src: url('{{ resource_path('fonts/prompt/Prompt-SemiBold.ttf') }}') format('truetype');
    }
    @font-face {
      font-family: 'Prompt';
      font-style: normal;
      font-weight: 700;
      src: url('{{ resource_path('fonts/prompt/Prompt-Bold.ttf') }}') format('truetype');
    }
    :root {
      color-scheme: light;
      --ink: #1e293b;
      --muted: #64748b;
      --line: #d9e2ec;
      --panel: #ffffff;
      --accent: #0f766e;
      --accent-soft: #ecfeff;
      --bg: #f8fafc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Prompt", "DejaVu Sans", sans-serif;
      font-size: 11px;
      color: var(--ink);
      background: var(--bg);
    }
    .page {
      max-width: 100%;
      margin: 0 auto;
      background: var(--panel);
      padding: 18px 20px;
      box-shadow: none;
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 18px;
    }
    .brand {
      display: flex;
      align-items: flex-start;
      gap: 18px;
      flex: 1;
    }
    .brand-copy {
      flex: 1;
    }
    .brand-logo {
      width: 54px;
      height: 54px;
      object-fit: contain;
      flex: 0 0 auto;
    }
    .brand h1, .doc h2 { margin: 0; }
    .brand h1 { font-size: 20px; line-height: 1.25; }
    .brand .subtitle {
      margin-top: 4px;
      margin-bottom: 6px;
      font-size: 11px;
      color: var(--muted);
      letter-spacing: 0.05em;
    }
    .doc h2 { font-size: 19px; color: var(--accent); line-height: 1.25; }
    .meta, .recipient, .summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px 14px;
      background: #fff;
    }
    .label {
      display: block;
      font-size: 10px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 4px;
    }
    .value {
      font-size: 11px;
      line-height: 1.5;
      word-break: break-word;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 8px 6px;
      text-align: left;
      vertical-align: top;
      font-size: 10px;
    }
    th {
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 700;
    }
    .num { text-align: right; white-space: nowrap; }
    .footer-note {
      color: var(--muted);
      font-size: 10px;
      line-height: 1.6;
      border-top: 1px dashed var(--line);
      padding-top: 12px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }
    .actions button {
      border: 0;
      border-radius: 999px;
      padding: 10px 16px;
      background: var(--accent);
      color: #fff;
      cursor: pointer;
      font: inherit;
    }
    @media print {
      body { background: #fff; }
      .page { margin: 0; box-shadow: none; max-width: none; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="actions">
      <button type="button" onclick="window.print()">พิมพ์เอกสาร</button>
    </div>

    <div class="topbar">
      <div class="brand">
        <img class="brand-logo" src="{{ $company['logoUrl'] }}" alt="B Life Healthy logo">
        <div class="brand-copy">
          <h1>{{ $company['name'] }}</h1>
          <div class="subtitle">{{ $company['nameEn'] }}</div>
          <div class="value">{{ $company['address'] }}</div>
          <div class="value">เลขประจำตัวผู้เสียภาษี {{ $company['taxId'] }}</div>
        </div>
      </div>
      <div class="doc">
        <h2>{{ $documentTitle }}</h2>
        <div class="value">เลขที่เอกสาร {{ $documentNumber }}</div>
        <div class="value">วันที่พิมพ์ {{ $generatedAt->format('d/m/Y H:i') }}</div>
      </div>
    </div>

    <div class="meta">
      <div class="card">
        <span class="label">Order</span>
        <div class="value">Order ID: #{{ $order->id }}</div>
        <div class="value">Order No: {{ $order->order_no ?: '-' }}</div>
        <div class="value">Member Code: {{ $order->member_code ?: '-' }}</div>
        <div class="value">สถานะ: {{ $order->order_status ?: '-' }}</div>
      </div>
      <div class="card">
        <span class="label">Payment</span>
        <div class="value">วันที่สร้าง: {{ optional($order->created_at)->format('d/m/Y H:i') ?: '-' }}</div>
        <div class="value">วันที่ชำระ: {{ optional($order->paid_at)->format('d/m/Y H:i') ?: '-' }}</div>
        <div class="value">วันที่อนุมัติ: {{ optional($order->approved_at)->format('d/m/Y H:i') ?: '-' }}</div>
      </div>
    </div>

    <div class="recipient">
      <div class="card">
        <span class="label">Bill To</span>
        <div class="value">{{ $recipient['name'] }}</div>
        <div class="value">โทร {{ $recipient['phone'] }}</div>
        <div class="value">{{ $recipient['email'] }}</div>
      </div>
      <div class="card">
        <span class="label">Ship To</span>
        <div class="value">{{ $recipient['methodLabel'] }}</div>
        <div class="value">{{ $recipient['address'] }}</div>
        <div class="value">หมายเหตุ: {{ $recipient['note'] }}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:64px;">ลำดับ</th>
          <th>สินค้า</th>
          <th class="num">จำนวน</th>
          <th class="num">ราคาต่อหน่วย</th>
          <th class="num">PV</th>
          <th class="num">รวม</th>
        </tr>
      </thead>
      <tbody>
        @forelse ($lines as $index => $line)
          <tr>
            <td>{{ $index + 1 }}</td>
            <td>{{ $line->resolved_name }}</td>
            <td class="num">{{ number_format((int) ($line->quantity ?? 0)) }}</td>
            <td class="num">{{ number_format((float) ($line->price ?? 0), 2) }}</td>
            <td class="num">{{ number_format((float) ($line->pv ?? 0), 2) }}</td>
            <td class="num">{{ number_format((float) ($line->line_total ?? 0), 2) }}</td>
          </tr>
        @empty
          <tr>
            <td colspan="6">ไม่พบรายการสินค้า</td>
          </tr>
        @endforelse
      </tbody>
    </table>

    <div class="summary">
      <div class="card">
        <span class="label">Summary</span>
        <div class="value">จำนวนรายการสินค้า {{ number_format((int) $totals['itemCount']) }}</div>
        <div class="value">จำนวนชิ้นรวม {{ number_format((int) $totals['lineQty']) }}</div>
        <div class="value">PV รวม {{ number_format((float) $totals['totalPv'], 2) }}</div>
      </div>
      <div class="card">
        <span class="label">Amount</span>
        <div class="value">ยอดก่อนรวม {{ number_format((float) $totals['subtotal'], 2) }} บาท</div>
        <div class="value"><strong>ยอดสุทธิ {{ number_format((float) $totals['total'], 2) }} บาท</strong></div>
      </div>
    </div>

    <div class="footer-note">
      เอกสารนี้สร้างจากระบบ BAO เพื่อใช้เป็นใบเสร็จอ้างอิงสำหรับออเดอร์ในระบบ หากต้องการใช้เป็นเอกสารทางภาษีอย่างเป็นทางการ กรุณาตรวจสอบข้อมูลนิติบุคคลและเลขประจำตัวผู้เสียภาษีก่อนใช้งานจริง
    </div>
  </div>
</body>
</html>
