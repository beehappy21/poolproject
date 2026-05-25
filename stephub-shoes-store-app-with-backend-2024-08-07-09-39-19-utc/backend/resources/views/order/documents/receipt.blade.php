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
    @page {
      size: A4 portrait;
      margin: 18px 18px 20px;
    }
    :root {
      --ink: #1f2937;
      --muted: #5b6472;
      --line: #d7dce3;
      --line-strong: #98a2b3;
      --brand: #0f172a;
      --soft: #f5f7fa;
      --accent: #eef2f7;
      --a4-page-width: 794px;
      --a4-page-height: 1123px;
      --a4-page-margin-x: 36px;
      --a4-page-margin-y: 38px;
      --a4-content-width: 758px;
      --a4-content-height: 1085px;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: "Prompt", "DejaVu Sans", sans-serif;
      color: var(--ink);
      font-size: 11px;
      line-height: 1.45;
      background: #f3f4f6;
    }
    .page {
      width: 100%;
      margin: 0 auto;
      padding: 16px;
    }
    .print-actions {
      text-align: right;
      margin-bottom: 10px;
    }
    .print-actions button {
      border: 0;
      border-radius: 999px;
      padding: 8px 14px;
      background: #0f766e;
      color: #ffffff;
      font: inherit;
      cursor: pointer;
    }
    .sheet-frame {
      width: 100%;
      max-width: 100%;
      overflow: hidden;
      display: block;
    }
    .sheet {
      width: var(--a4-content-width);
      min-height: var(--a4-content-height);
      max-width: none;
      border: 1px solid var(--line-strong);
      padding: 14px;
      margin: 0;
      background: #ffffff;
      transform-origin: top left;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
    }
    .header-table,
    .meta-table,
    .party-table,
    .items-table,
    .totals-table,
    .sign-table {
      width: 100%;
      border-collapse: collapse;
    }
    .header-table td {
      vertical-align: top;
    }
    .logo-wrap {
      width: 62px;
      padding-right: 10px;
    }
    .logo {
      width: 52px;
      height: 52px;
      object-fit: contain;
      display: block;
    }
    .company-name {
      font-size: 16px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 2px;
    }
    .company-name-en {
      font-size: 10px;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .company-copy {
      font-size: 10.5px;
      line-height: 1.5;
    }
    .doc-panel {
      width: 178px;
      border: 1px solid var(--line-strong);
      padding: 8px 10px;
      text-align: center;
    }
    .doc-copy-badge {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.08em;
      margin-bottom: 5px;
    }
    .doc-title {
      font-size: 17px;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 2px;
    }
    .doc-title-en {
      font-size: 9.5px;
      color: var(--muted);
      line-height: 1.35;
    }
    .section {
      margin-top: 12px;
    }
    .meta-table td,
    .party-table td {
      border: 1px solid var(--line);
      padding: 7px 8px;
      vertical-align: top;
    }
    .meta-label,
    .party-label {
      width: 88px;
      background: var(--soft);
      font-weight: 600;
      white-space: nowrap;
    }
    .party-label {
      width: 102px;
    }
    .items-table th,
    .items-table td,
    .totals-table td,
    .sign-table td {
      border: 1px solid var(--line);
      padding: 7px 8px;
      vertical-align: top;
    }
    .items-table th {
      background: var(--accent);
      text-align: center;
      font-weight: 700;
    }
    .items-table .col-no {
      width: 34px;
      text-align: center;
    }
    .items-table .col-qty,
    .items-table .col-unit,
    .items-table .col-price,
    .items-table .col-total,
    .items-table .col-pv {
      text-align: right;
      white-space: nowrap;
    }
    .items-table .col-unit {
      width: 52px;
      text-align: center;
    }
    .items-table .col-qty {
      width: 54px;
    }
    .items-table .col-price,
    .items-table .col-total,
    .items-table .col-pv {
      width: 78px;
    }
    .muted {
      color: var(--muted);
    }
    .totals-wrap {
      margin-top: 10px;
    }
    .totals-table {
      width: 46%;
      margin-left: auto;
    }
    .totals-table .label {
      background: var(--soft);
      font-weight: 600;
    }
    .totals-table .amount {
      text-align: right;
      white-space: nowrap;
    }
    .totals-table .grand {
      font-size: 12px;
      font-weight: 700;
    }
    .note-box {
      margin-top: 12px;
      border: 1px solid var(--line);
      padding: 9px 10px;
      font-size: 10px;
      line-height: 1.55;
    }
    .note-title {
      font-weight: 700;
      margin-bottom: 4px;
    }
    .sign-table {
      margin-top: 12px;
    }
    .sign-table td {
      width: 50%;
      height: 74px;
      text-align: center;
      vertical-align: bottom;
      padding-bottom: 10px;
    }
    .sign-label {
      display: block;
      border-top: 1px solid var(--line-strong);
      padding-top: 6px;
      font-weight: 600;
    }
    .footer {
      margin-top: 10px;
      font-size: 9.5px;
      color: var(--muted);
      text-align: center;
    }
    @media print {
      body {
        background: #ffffff;
      }
      .page {
        padding: 0;
      }
      .print-actions {
        display: none;
      }
      .sheet-frame {
        display: block;
        overflow: visible;
        height: auto !important;
      }
      .sheet {
        width: auto;
        min-height: auto;
        margin: 0;
        transform: none !important;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  @php
    $isReceipt = $documentType === 'receipt';
    $displayTitle = $isReceipt ? 'ใบกำกับภาษี / ใบเสร็จรับเงิน' : $documentTitle;
    $displayTitleEn = $isReceipt ? 'TAX INVOICE / RECEIPT' : 'DELIVERY NOTE';
    $displayDate = $order->paid_at ?: ($order->approved_at ?: $order->created_at);
  @endphp

  <div class="page">
    <div class="print-actions">
      <button type="button" onclick="window.print()">พิมพ์เอกสาร</button>
    </div>

    <div class="sheet-frame" id="sheet-frame">
      <div class="sheet" id="sheet">
        <table class="header-table">
          <tr>
            <td>
              <table>
                <tr>
                  <td class="logo-wrap">
                    <img class="logo" src="{{ $company['logoUrl'] }}" alt="B Life Healthy logo">
                  </td>
                  <td>
                    <div class="company-name">{{ $company['name'] }}</div>
                    <div class="company-name-en">{{ $company['nameEn'] }}</div>
                    <div class="company-copy">
                      <div>{{ $company['address'] }}</div>
                      <div>เลขประจำตัวผู้เสียภาษี {{ $company['taxId'] }}</div>
                      <div>โทร {{ $company['phone'] !== '-' ? $company['phone'] : '084-378-2871' }}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            <td style="width: 190px; padding-left: 12px;">
              <div class="doc-panel">
                <div class="doc-copy-badge">ORIGINAL</div>
                <div class="doc-title">{{ $displayTitle }}</div>
                <div class="doc-title-en">{{ $displayTitleEn }}</div>
              </div>
            </td>
          </tr>
        </table>

        <div class="section">
          <table class="meta-table">
            <tr>
              <td class="meta-label">เลขที่เอกสาร</td>
              <td>{{ $documentNumber }}</td>
              <td class="meta-label">วันที่</td>
              <td>{{ $displayDate?->format('d/m/Y H:i') ?: '-' }}</td>
            </tr>
            <tr>
              <td class="meta-label">Order No.</td>
              <td>{{ $order->order_no ?: '-' }}</td>
              <td class="meta-label">Member Code</td>
              <td>{{ $order->member_code ?: '-' }}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <table class="party-table">
            <tr>
              <td class="party-label">นามลูกค้า</td>
              <td>{{ $recipient['name'] }}</td>
            </tr>
            <tr>
              <td class="party-label">ที่อยู่</td>
              <td>{{ $recipient['address'] }}</td>
            </tr>
            <tr>
              <td class="party-label">ข้อมูลติดต่อ</td>
              <td>โทร {{ $recipient['phone'] }} | {{ $recipient['email'] }}</td>
            </tr>
            <tr>
              <td class="party-label">วิธีรับสินค้า</td>
              <td>{{ $recipient['methodLabel'] }} @if($recipient['note'] !== '-') | หมายเหตุ {{ $recipient['note'] }} @endif</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <table class="items-table">
            <thead>
              <tr>
                <th class="col-no">ลำดับ</th>
                <th>รายละเอียด</th>
                <th class="col-qty">จำนวน</th>
                <th class="col-unit">หน่วย</th>
                <th class="col-price">ราคา/หน่วย</th>
                <th class="col-pv">PV</th>
                <th class="col-total">รวมเงิน</th>
              </tr>
            </thead>
            <tbody>
              @forelse ($lines as $index => $line)
                <tr>
                  <td class="col-no">{{ $index + 1 }}</td>
                  <td>
                    <div>{{ $line->resolved_name }}</div>
                    @if (!empty($line->product_code))
                      <div class="muted">รหัสสินค้า {{ $line->product_code }}</div>
                    @endif
                  </td>
                  <td class="col-qty">{{ number_format((int) ($line->quantity ?? 0)) }}</td>
                  <td class="col-unit">ชิ้น</td>
                  <td class="col-price">{{ number_format((float) ($line->price ?? 0), 2) }}</td>
                  <td class="col-pv">{{ number_format((float) ($line->pv ?? 0), 2) }}</td>
                  <td class="col-total">{{ number_format((float) ($line->line_total ?? 0), 2) }}</td>
                </tr>
              @empty
                <tr>
                  <td colspan="7" style="text-align: center;">ไม่พบรายการสินค้า</td>
                </tr>
              @endforelse
            </tbody>
          </table>
        </div>

        <div class="totals-wrap">
          <table class="totals-table">
            <tr>
              <td class="label">รวมจำนวนรายการ</td>
              <td class="amount">{{ number_format((int) $totals['itemCount']) }}</td>
            </tr>
            <tr>
              <td class="label">รวมจำนวนชิ้น</td>
              <td class="amount">{{ number_format((int) $totals['lineQty']) }}</td>
            </tr>
            <tr>
              <td class="label">รวม PV</td>
              <td class="amount">{{ number_format((float) $totals['totalPv'], 2) }}</td>
            </tr>
            <tr>
              <td class="label">รวมเงิน</td>
              <td class="amount">{{ number_format((float) $totals['subtotal'], 2) }}</td>
            </tr>
            <tr>
              <td class="label grand">ยอดเงินสุทธิ</td>
              <td class="amount grand">{{ number_format((float) $totals['total'], 2) }} บาท</td>
            </tr>
          </table>
        </div>

        <div class="note-box">
          <div class="note-title">หมายเหตุ</div>
          <div>เอกสารนี้อ้างอิงรูปแบบจากต้นแบบใบกำกับภาษี/ใบเสร็จรับเงินของบริษัท และจัดทำจากข้อมูลคำสั่งซื้อในระบบเพื่อให้อ่านได้ชัดขึ้นบนอุปกรณ์พกพา</div>
          <div>กรณีนำไปใช้งานด้านภาษีหรือบัญชี โปรดตรวจสอบข้อมูลนิติบุคคล รายการสินค้า และยอดเงินอีกครั้งก่อนใช้งานจริง</div>
        </div>

        <table class="sign-table">
          <tr>
            <td>
              <span class="sign-label">ผู้รับสินค้า</span>
            </td>
            <td>
              <span class="sign-label">ผู้มีอำนาจลงนาม</span>
            </td>
          </tr>
        </table>

        <div class="footer">
          พิมพ์เมื่อ {{ $generatedAt->format('d/m/Y H:i') }} น. | {{ $company['name'] }}
        </div>
      </div>
    </div>
  </div>

  <script>
    (function () {
      var frame = document.getElementById('sheet-frame');
      var sheet = document.getElementById('sheet');

      if (!frame || !sheet) {
        return;
      }

      function fitSheetToFrame() {
        sheet.style.transform = 'none';
        sheet.style.marginLeft = '0px';
        frame.style.height = 'auto';

        var baseWidth = sheet.offsetWidth;
        var baseHeight = Math.max(sheet.scrollHeight, sheet.offsetHeight);
        var frameWidth = frame.clientWidth;
        var scale = frameWidth > 0 ? Math.min(1, frameWidth / baseWidth) : 1;
        var centeredOffset = Math.max(0, (frameWidth - (baseWidth * scale)) / 2);

        sheet.style.transform = 'scale(' + scale + ')';
        sheet.style.marginLeft = centeredOffset + 'px';
        frame.style.height = (baseHeight * scale) + 'px';
      }

      window.addEventListener('resize', fitSheetToFrame);
      window.addEventListener('load', fitSheetToFrame);
      fitSheetToFrame();
    })();
  </script>
</body>
</html>
