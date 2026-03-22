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

    return [
      'order' => Order::query()
        ->forReportBucket($this->bucket)
        ->orderByReportPriority($this->bucket)
        ->paginate(10)
    ];
  }

  public function name(): ?string {
    return Order::bucketLabel($this->bucket);
  }

  public function commandBar(): iterable {
    return [
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
    ];
  }

  public function layout(): iterable {
    return [
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

            return e($order->shipment_status) . $tracking;
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
