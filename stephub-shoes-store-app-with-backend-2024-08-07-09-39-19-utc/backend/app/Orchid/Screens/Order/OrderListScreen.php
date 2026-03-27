<?php

namespace App\Orchid\Screens\Order;

use App\Models\Order;
use Illuminate\Http\Request;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Layout;

class OrderListScreen extends Screen {
  public string $bucket = Order::REPORT_BUCKET_ALL;

  public function query(Request $request): iterable {
    $this->bucket = (string) ($request->route('bucket') ?? Order::REPORT_BUCKET_ALL);

    $baseQuery = Order::query()->forReportBucket($this->bucket);
    $summaryQuery = clone $baseQuery;
    $summary = [
      'totalOrders' => (int) $summaryQuery->count(),
      'totalAmount' => (float) ((clone $baseQuery)->sum('total')),
      'totalPv' => (float) ((clone $baseQuery)->sum('total_pv')),
    ];

    return [
      'summary' => $summary,
      'order' => $baseQuery
        ->orderByReportPriority($this->bucket)
        ->paginate(10)
    ];
  }

  public function name(): ?string {
    return Order::bucketLabel($this->bucket);
  }

  public function description(): ?string
  {
    return match ($this->bucket) {
      Order::REPORT_BUCKET_AWAITING_PAYMENT => 'ออเดอร์ที่ยังรอสมาชิกชำระเงิน',
      Order::REPORT_BUCKET_TRANSFER_REVIEW => 'ออเดอร์ที่แนบสลิปแล้วและรอเจ้าหน้าที่ตรวจสอบ',
      Order::REPORT_BUCKET_AWAITING_SHIPMENT => 'ออเดอร์ที่อนุมัติแล้วและพร้อมจัดส่ง',
      Order::REPORT_BUCKET_SHIPPED => 'ออเดอร์ที่บันทึกการจัดส่งแล้ว',
      default => 'ภาพรวมรายการขายทั้งหมดและสถานะล่าสุดของแต่ละออเดอร์',
    };
  }

  public function commandBar(): iterable {
    return [
      Link::make('Create Member Sale')
        ->icon('bs.cart-plus')
        ->route('platform.order.create'),
      Link::make('CSV')
        ->icon('bs.download')
        ->route('platform.order.export', ['bucket' => $this->bucket, 'format' => 'csv']),
      Link::make('Excel')
        ->icon('bs.file-earmark-spreadsheet')
        ->route('platform.order.export', ['bucket' => $this->bucket, 'format' => 'xlsx']),
      Link::make('PDF')
        ->icon('bs.file-earmark-pdf')
        ->route('platform.order.export', ['bucket' => $this->bucket, 'format' => 'pdf']),
      Link::make('ทั้งหมด')
        ->icon('bs.list-ul')
        ->route('platform.order.list'),
      Link::make('รอชำระ')
        ->icon('bs.clock-history')
        ->route('platform.order.awaitingPayment'),
      Link::make('รอตรวจสอบการโอน')
        ->icon('bs.search')
        ->route('platform.order.transferReview'),
      Link::make('รอจัดส่ง')
        ->icon('bs.box-seam')
        ->route('platform.order.awaitingShipment'),
      Link::make('จัดส่งแล้ว')
        ->icon('bs.truck')
        ->route('platform.order.shipped'),
      Link::make('ส่งถึงแล้ว')
        ->icon('bs.check2-circle')
        ->route('platform.order.delivered'),
    ];
  }

  public function layout(): iterable {
    return [
      Layout::view('order.report-summary'),
      Layout::table('order', [
        TD::make('id', 'ID')
          ->cantHide()
          ->sort()
          ->render(function (Order $order) {
            return '#' . $order->id;
          }),

        TD::make('name', 'Name')
          ->sort()
          ->cantHide()
          ->filter(Input::make())
          ->render(function (Order $order) {
            return Link::make($order->name)->route('platform.order.detail', $order->id);
          }),

        TD::make('phone_number', 'Phone')
          ->sort()
          ->cantHide()
          ->filter(Input::make())
          ->render(function (Order $order) {
            return $order->phone_number ?: '-';
          }),

        TD::make('total', 'Total')
          ->sort()
          ->cantHide()
          ->filter(Input::make())
          ->render(function (Order $order) {
            return '$' . $order->total;
          }),

        TD::make('order_status', 'Status')
          ->sort()
          ->cantHide()
          ->filter(Input::make())
          ->render(function (Order $order) {
            return $order->status_badge_html;
          }),

        TD::make('shipment_status', 'Shipment')
          ->cantHide()
          ->render(function (Order $order) {
            $tracking = $order->shipment_tracking_no ? '<br><small>' . e($order->shipment_tracking_no) . '</small>' : '';
            $method = '<br><small>' . e($order->fulfillment_label) . '</small>';

            return e($order->shipment_status) . $tracking . $method;
          }),

        TD::make('created_at', 'Created')
          ->sort()
          ->cantHide()
          ->render(function (Order $order) {
            return optional($order->created_at)->format('d M, Y');
          }),
        TD::make('shipped_at', 'Shipped')
          ->cantHide()
          ->render(function (Order $order) {
            return $order->shipped_at ? optional($order->shipped_at)->format('d M, Y H:i') : '-';
          }),
        TD::make('item_count', 'Items')
          ->cantHide()
          ->align(TD::ALIGN_CENTER)
          ->render(function (Order $order) {
            return (string) $order->item_count;
          }),
        TD::make('order_no', 'Order No')
          ->cantHide()
          ->render(function (Order $order) {
            return e($order->order_no);
          }),

      ])
    ];
  }
}
