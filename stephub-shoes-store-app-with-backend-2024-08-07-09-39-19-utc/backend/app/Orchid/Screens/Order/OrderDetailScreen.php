<?php

namespace App\Orchid\Screens\Order;

use App\Models\Order;
use App\Models\OrderLine;
use App\Models\OrderSource;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\TextArea;
use Orchid\Screen\Sight;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Layout;
use Orchid\Support\Facades\Alert;

class OrderDetailScreen extends Screen {
  public $products;
  public $order;
  public $sourceOrder;

  public function query(Order $order): iterable {
    $sourceOrder = null;

    if (!empty($order->source_order_id)) {
      $sourceOrder = OrderSource::query()->find($order->source_order_id);
    }

    $this->order = Order::find($order->id);
    $this->sourceOrder = $sourceOrder;

    return [
      'order' => $this->order,
      'sourceOrder' => $sourceOrder,
      'products' => OrderLine::query()
        ->where('source_order_id', $order->id)
        ->orderBy('id')
        ->get(),
    ];
  }

  public function name(): ?string {
    return 'Order Details';
  }

  public function commandBar(): iterable {
    return [
      Button::make('อนุมัติคำสั่งซื้อ')
        ->icon('bs.check-circle')
        ->confirm('ยืนยันการอนุมัติคำสั่งซื้อนี้?')
        ->method('approveOrder')
        ->canSee($this->canApproveOrder()),
      Button::make($this->isBranchPickup() ? 'บันทึกว่าพร้อมรับที่สาขา' : 'บันทึกว่าจัดส่งแล้ว')
        ->icon('bs.truck')
        ->confirm($this->isBranchPickup() ? 'ยืนยันว่าคำสั่งซื้อนี้พร้อมให้ลูกค้ามารับที่สาขาแล้ว?' : 'ยืนยันว่าคำสั่งซื้อนี้ถูกจัดส่งแล้ว?')
        ->method('markShipped')
        ->canSee($this->canMarkShipped()),
      Button::make($this->isBranchPickup() ? 'บันทึกว่ารับสินค้าแล้ว' : 'บันทึกว่าส่งถึงแล้ว')
        ->icon('bs.check2-circle')
        ->confirm($this->isBranchPickup() ? 'ยืนยันว่าลูกค้ามารับสินค้าที่สาขาเรียบร้อยแล้ว?' : 'ยืนยันว่าคำสั่งซื้อนี้ส่งถึงลูกค้าแล้ว?')
        ->method('markDelivered')
        ->canSee($this->canMarkDelivered()),
    ];
  }

  public function approveOrder(): RedirectResponse
  {
    if (!$this->order instanceof Order) {
      abort(404);
    }

    if (!$this->sourceOrder instanceof OrderSource) {
      abort(422, 'Source order not found.');
    }

    $approvedAt = now();

    $this->sourceOrder->forceFill([
      'approvedAt' => $approvedAt,
      'approvalStatus' => 'APPROVED',
      'status' => 'APPROVED',
    ])->save();

    Alert::info('You have successfully approved the order.');

    return redirect()->route('platform.order.detail', $this->order->id);
  }

  public function markShipped(Request $request): RedirectResponse
  {
    if (!$this->sourceOrder instanceof OrderSource) {
      abort(422, 'Source order not found.');
    }

    $this->sourceOrder->forceFill([
      'shippedAt' => now(),
      'shipmentTrackingNo' => $request->input('shipment.tracking_no') ?: null,
      'shipmentCarrier' => $request->input('shipment.carrier') ?: null,
      'shipmentNote' => $request->input('shipment.note') ?: null,
    ])->save();

    Alert::info('Shipment has been recorded.');

    return redirect()->route('platform.order.detail', $this->order->id);
  }

  public function markDelivered(Request $request): RedirectResponse
  {
    if (!$this->sourceOrder instanceof OrderSource) {
      abort(422, 'Source order not found.');
    }

    $this->sourceOrder->forceFill([
      'deliveredAt' => now(),
      'shipmentNote' => $request->input('shipment.note') ?: $this->sourceOrder->shipmentNote,
    ])->save();

    Alert::info('Delivery has been recorded.');

    return redirect()->route('platform.order.detail', $this->order->id);
  }

  public function layout(): iterable {
    $orderSummaryLayout = Layout::legend('order', [
        Sight::make('id', 'Order ID:')->render(function (Order $order) {
          return '#' . $order->id;
        }),
        Sight::make('order_no', 'Order No:')->render(function (Order $order) {
          return e($order->order_no);
        }),
        Sight::make('name', 'Name:')->render(function (Order $order) {
          return e($order->name);
        }),
        Sight::make('email', 'Email:')->render(function (Order $order) {
          return $order->email ?: '-';
        }),
        Sight::make('phone_number', 'Phone Number:')->render(function (Order $order) {
          return $order->phone_number ?: '-';
        }),
        Sight::make('referral_code', 'Referral Code:')->render(function (Order $order) {
          return $order->referral_code ?: '-';
        }),
        Sight::make('order_status', 'Status:')->render(function (Order $order) {
          return $order->status_badge_html;
        }),
        Sight::make('fulfillment_label', 'Fulfillment:')->render(function (Order $order) {
          return e($order->fulfillment_label);
        }),
      ]);

    $productsLayout = Layout::table('products', [

        TD::make('name', 'Name')
          ->cantHide()
          ->render(function (OrderLine $product) {
            return e($product->name ?: 'Product item');
          }),

        TD::make('price', 'Price')
          ->cantHide()
          ->render(function (OrderLine $product) {
            return '$' . $product->price;
          }),

        TD::make('pv', 'PV')
          ->cantHide()
          ->render(function (OrderLine $product) {
            return number_format((float) $product->pv, 2);
          }),

        TD::make('line_total', 'Line Total')
          ->cantHide()
          ->render(function (OrderLine $product) {
            return '$' . $product->line_total;
          }),

        TD::make('quantity', 'Quantity')
          ->cantHide()
          ->align(TD::ALIGN_CENTER)
          ->render(function (OrderLine $product) {
            return $product->quantity;
          }),
      ])->title('Products in order');

    $totalsLayout = Layout::legend('order', [
        Sight::make('subtotal', 'Subtotal:')->render(function () {
          return '$' . $this->order->subtotal;
        }),
        Sight::make('total', 'Total:')->render(function () {
          return '$' . $this->order->total;
        }),
        Sight::make('total_pv', 'Total PV:')->render(function () {
          return number_format((float) $this->order->total_pv, 2);
        }),
        Sight::make('item_count', 'Item count:')->render(function () {
          return (string) $this->order->item_count;
        }),
      ])->title('Order Summary');

    $datesLayout = Layout::legend('order', [
        Sight::make('created_at', 'Created:')->render(function (Order $order) {
          return optional($order->created_at)->format('d M, Y H:i');
        }),
        Sight::make('paid_at', 'Transfer submitted:')->render(function (Order $order) {
          return $order->paid_at ? optional($order->paid_at)->format('d M, Y H:i') : '-';
        }),
        Sight::make('approved_at', 'Approved:')->render(function (Order $order) {
          return $order->approved_at ? optional($order->approved_at)->format('d M, Y H:i') : '-';
        }),
      ])->title('Date');

    $transferReviewLayout = Layout::legend('sourceOrder', [
        Sight::make('shippingLabel', 'Method:')->render(function ($sourceOrder) {
          return strtolower((string) ($sourceOrder?->shippingLabel ?? '')) === 'branch_pickup'
            ? 'รับที่สาขา'
            : 'จัดส่งถึงที่';
        }),
        Sight::make('shippingAddressLine', 'Pickup Branch / Address:')->render(function ($sourceOrder) {
          return $sourceOrder?->shippingAddressLine ?: '-';
        }),
        Sight::make('shippingAddressNote', 'Pickup / Shipping Note:')->render(function ($sourceOrder) {
          return $sourceOrder?->shippingAddressNote ?: '-';
        }),
        Sight::make('transferSlipUrl', 'Transfer Slip:')->render(function ($sourceOrder) {
          if (!$sourceOrder || empty($sourceOrder->transferSlipUrl)) {
            return 'ยังไม่มีสลิปที่แนบเข้ามา';
          }

          $url = e($sourceOrder->transferSlipUrl);

          return '<a href="' . $url . '" target="_blank" rel="noopener noreferrer">เปิดดูสลิป</a><br><img src="' . $url . '" alt="Transfer slip" style="max-width:320px;margin-top:12px;border-radius:8px;border:1px solid #d9dce3;" />';
        }),
        Sight::make('transferSubmittedAt', 'Slip Submitted:')->render(function ($sourceOrder) {
          return $sourceOrder?->transferSubmittedAt
            ? optional($sourceOrder->transferSubmittedAt)->format('d M, Y H:i')
            : ($this->order?->paid_at ? optional($this->order->paid_at)->format('d M, Y H:i') : '-');
        }),
        Sight::make('transferSlipNote', 'Note:')->render(function ($sourceOrder) {
          return $sourceOrder?->transferSlipNote ?: '-';
        }),
      ])->title('Transfer Review');

    $shipmentUpdateLayout = Layout::rows([
        Input::make('shipment.tracking_no')
          ->title($this->isBranchPickup() ? 'Pickup Ref' : 'Tracking No')
          ->placeholder('TRACK123456')
          ->value($this->sourceOrder?->shipmentTrackingNo),
        Input::make('shipment.carrier')
          ->title($this->isBranchPickup() ? 'Pickup Location' : 'Carrier')
          ->placeholder($this->isBranchPickup() ? 'Counter A / Branch desk' : 'Flash, Kerry, Thailand Post')
          ->value($this->sourceOrder?->shipmentCarrier),
        TextArea::make('shipment.note')
          ->title($this->isBranchPickup() ? 'Pickup Note' : 'Shipment Note')
          ->rows(3)
          ->placeholder($this->isBranchPickup() ? 'Optional pickup note' : 'Optional shipping note')
          ->value($this->sourceOrder?->shipmentNote),
      ])->title($this->isBranchPickup() ? 'Pickup Update' : 'Shipment Update');

    $shipmentStatusLayout = Layout::legend('sourceOrder', [
        Sight::make('shipmentTrackingNo', 'Tracking No:')->render(function ($sourceOrder) {
          return $sourceOrder?->shipmentTrackingNo ?: '-';
        }),
        Sight::make('shipmentCarrier', 'Carrier:')->render(function ($sourceOrder) {
          return $sourceOrder?->shipmentCarrier ?: '-';
        }),
        Sight::make('shipmentNote', 'Shipment Note:')->render(function ($sourceOrder) {
          return $sourceOrder?->shipmentNote ?: '-';
        }),
        Sight::make('shippedAt', 'Shipped At:')->render(function ($sourceOrder) {
          return $sourceOrder?->shippedAt
            ? optional($sourceOrder->shippedAt)->format('d M, Y H:i')
            : '-';
        }),
        Sight::make('deliveredAt', 'Delivered At:')->render(function ($sourceOrder) {
          return $sourceOrder?->deliveredAt
            ? optional($sourceOrder->deliveredAt)->format('d M, Y H:i')
            : '-';
        }),
      ])->title($this->isBranchPickup() ? 'Pickup Status' : 'Shipment Status');

    $layouts = [
      $orderSummaryLayout,
      $productsLayout,
      $totalsLayout,
      $datesLayout,
      $transferReviewLayout,
      $shipmentUpdateLayout,
      $shipmentStatusLayout,
    ];

    if ($this->hasTransferSlip()) {
      $layouts = [
        $transferReviewLayout,
        $orderSummaryLayout,
        $productsLayout,
        $totalsLayout,
        $datesLayout,
        $shipmentUpdateLayout,
        $shipmentStatusLayout,
      ];
    }

    return $layouts;
  }

  private function hasTransferSlip(): bool
  {
    return !empty($this->sourceOrder?->transferSlipUrl) || !empty($this->sourceOrder?->transferSubmittedAt);
  }

  private function isBranchPickup(): bool
  {
    return strtolower((string) ($this->sourceOrder?->shippingLabel ?? '')) === 'branch_pickup';
  }

  private function canApproveOrder(): bool
  {
    if (!$this->order instanceof Order) {
      return false;
    }

    return strtolower((string) $this->order->order_status) === 'paid';
  }

  private function canMarkShipped(): bool
  {
    if (!$this->sourceOrder instanceof OrderSource) {
      return false;
    }

    return strtoupper((string) $this->sourceOrder->approvalStatus) === 'APPROVED'
      && empty($this->sourceOrder->shippedAt);
  }

  private function canMarkDelivered(): bool
  {
    if (!$this->sourceOrder instanceof OrderSource) {
      return false;
    }

    return !empty($this->sourceOrder->shippedAt)
      && empty($this->sourceOrder->deliveredAt);
  }
}
