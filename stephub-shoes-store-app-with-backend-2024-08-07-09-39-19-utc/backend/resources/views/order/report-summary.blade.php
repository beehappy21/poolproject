@php
  $summary = $summary ?? [
      'totalOrders' => 0,
      'totalAmount' => 0,
      'totalPv' => 0,
  ];
@endphp

<div class="row g-3 mb-3">
  <div class="col-md-4">
    <div class="rounded border bg-white p-3 h-100">
      <div class="text-muted small mb-1">จำนวนออเดอร์</div>
      <div class="h3 mb-0">{{ number_format((int) ($summary['totalOrders'] ?? 0)) }}</div>
    </div>
  </div>
  <div class="col-md-4">
    <div class="rounded border bg-white p-3 h-100">
      <div class="text-muted small mb-1">ยอดขายรวม</div>
      <div class="h3 mb-0">${{ number_format((float) ($summary['totalAmount'] ?? 0), 2) }}</div>
    </div>
  </div>
  <div class="col-md-4">
    <div class="rounded border bg-white p-3 h-100">
      <div class="text-muted small mb-1">PV รวม</div>
      <div class="h3 mb-0">{{ number_format((float) ($summary['totalPv'] ?? 0), 2) }}</div>
    </div>
  </div>
</div>
