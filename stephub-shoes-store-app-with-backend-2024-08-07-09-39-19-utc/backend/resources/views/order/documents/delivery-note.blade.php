<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ $documentTitle }} {{ $order->order_no }}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #172554;
      --muted: #64748b;
      --line: #cbd5e1;
      --panel: #ffffff;
      --accent: #1d4ed8;
      --accent-soft: #eff6ff;
      --bg: #f8fafc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "DejaVu Sans", sans-serif;
      color: var(--ink);
      background: var(--bg);
    }
    .page {
      max-width: 960px;
      margin: 24px auto;
      background: var(--panel);
      padding: 32px;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
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
    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 24px;
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
      width: 74px;
      height: 74px;
      object-fit: contain;
      flex: 0 0 auto;
    }
    .brand h1, .doc h2 { margin: 0; }
    .brand h1 { font-size: 28px; }
    .brand .subtitle {
      margin-top: 4px;
      margin-bottom: 8px;
      font-size: 14px;
      color: var(--muted);
      letter-spacing: 0.05em;
    }
    .doc h2 { font-size: 26px; color: var(--accent); }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 16px 18px;
      background: #fff;
    }
    .label {
      display: block;
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 6px;
    }
    .value {
      font-size: 15px;
      line-height: 1.55;
      word-break: break-word;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 12px 10px;
      text-align: left;
      vertical-align: top;
      font-size: 14px;
    }
    th {
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 700;
    }
    .center { text-align: center; }
    .num { text-align: right; white-space: nowrap; }
    .signatures {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      margin-top: 32px;
    }
    .signature-box {
      border-top: 1px solid var(--line);
      padding-top: 12px;
      min-height: 64px;
      color: var(--muted);
      font-size: 13px;
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
        <div class="value">พิมพ์เมื่อ {{ $generatedAt->format('d/m/Y H:i') }}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <span class="label">Order</span>
        <div class="value">Order ID: #{{ $order->id }}</div>
        <div class="value">Order No: {{ $order->order_no ?: '-' }}</div>
        <div class="value">Member Code: {{ $order->member_code ?: '-' }}</div>
        <div class="value">สถานะจัดส่ง: {{ $order->shipment_status }}</div>
      </div>
      <div class="card">
        <span class="label">Shipment</span>
        <div class="value">วิธีรับสินค้า: {{ $recipient['methodLabel'] }}</div>
        <div class="value">Tracking No: {{ $sourceOrder?->shipmentTrackingNo ?: '-' }}</div>
        <div class="value">Carrier: {{ $sourceOrder?->shipmentCarrier ?: '-' }}</div>
        <div class="value">Shipped At: {{ optional($sourceOrder?->shippedAt)->format('d/m/Y H:i') ?: '-' }}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <span class="label">ผู้รับ</span>
        <div class="value">{{ $recipient['name'] }}</div>
        <div class="value">โทร {{ $recipient['phone'] }}</div>
        <div class="value">{{ $recipient['email'] }}</div>
      </div>
      <div class="card">
        <span class="label">ที่อยู่จัดส่ง / จุดรับสินค้า</span>
        <div class="value">{{ $recipient['address'] }}</div>
        <div class="value">หมายเหตุ: {{ $recipient['note'] }}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:64px;">ลำดับ</th>
          <th>สินค้า</th>
          <th class="center">จำนวน</th>
          <th class="num">ราคาต่อหน่วย</th>
          <th class="num">รวม</th>
        </tr>
      </thead>
      <tbody>
        @forelse ($lines as $index => $line)
          <tr>
            <td>{{ $index + 1 }}</td>
            <td>{{ $line->resolved_name }}</td>
            <td class="center">{{ number_format((int) ($line->quantity ?? 0)) }}</td>
            <td class="num">{{ number_format((float) ($line->price ?? 0), 2) }}</td>
            <td class="num">{{ number_format((float) ($line->line_total ?? 0), 2) }}</td>
          </tr>
        @empty
          <tr>
            <td colspan="5">ไม่พบรายการสินค้า</td>
          </tr>
        @endforelse
      </tbody>
    </table>

    <div class="grid">
      <div class="card">
        <span class="label">สรุป</span>
        <div class="value">จำนวนรายการ {{ number_format((int) $totals['itemCount']) }}</div>
        <div class="value">จำนวนชิ้นรวม {{ number_format((int) $totals['lineQty']) }}</div>
        <div class="value">PV รวม {{ number_format((float) $totals['totalPv'], 2) }}</div>
      </div>
      <div class="card">
        <span class="label">ยอดอ้างอิง</span>
        <div class="value">ยอดสุทธิ {{ number_format((float) $totals['total'], 2) }} บาท</div>
        <div class="value">เอกสารนี้ใช้ประกอบการจัดสินค้าและจัดส่ง</div>
      </div>
    </div>

    <div class="signatures">
      <div class="signature-box">ผู้จัดสินค้า / วันที่</div>
      <div class="signature-box">ผู้ตรวจสอบ / วันที่</div>
      <div class="signature-box">ผู้รับสินค้า / วันที่</div>
    </div>
  </div>
</body>
</html>
