<?php

namespace App\Orchid\Screens\Order;

use App\Models\Order;
use App\Models\OrderLine;
use Orchid\Screen\Sight;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Layout;

class OrderDetailScreen extends Screen {
  public $products;
  public $order;

  public function query(Order $order): iterable {
    return [
      'order' => Order::find($order->id),
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
    return [];
  }

  public function layout(): iterable {

    return [
      Layout::legend('order', [
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
      ]),

      Layout::table('products', [

        TD::make('name', 'Name')
          ->cantHide()
          ->render(function (OrderLine $product) {
            return e($product->name ?: 'Package item');
          }),

        TD::make('price', 'Price')
          ->cantHide()
          ->render(function (OrderLine $product) {
            return '$' . $product->price;
          }),

        TD::make('package_code', 'Package Code')
          ->cantHide()
          ->render(function (OrderLine $product) {
            return $product->package_code ?: '-';
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
      ])->title('Products in order'),

      Layout::legend('order', [
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
      ])->title('Order Summary'),

      Layout::legend('order', [
        Sight::make('created_at', 'Created:')->render(function (Order $order) {
          return optional($order->created_at)->format('d M, Y H:i');
        }),
        Sight::make('approved_at', 'Approved:')->render(function (Order $order) {
          return $order->approved_at ? optional($order->approved_at)->format('d M, Y H:i') : '-';
        }),
      ])->title('Date'),
    ];
  }
}
