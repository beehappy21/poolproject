<?php

namespace App\Orchid\Screens\Order;

use App\Models\Order;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Layout;

class OrderListScreen extends Screen {

  public function query(): iterable {
    return [
      'order' => Order::query()->orderByDesc('updated_at')->paginate(10)
    ];
  }

  public function name(): ?string {
    return 'Orders';
  }

  public function commandBar(): iterable {
    return [];
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

        TD::make('created_at', 'Created')
          ->sort()
          ->cantHide()
          ->render(function (Order $order) {
            return optional($order->created_at)->format('d M, Y');
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
