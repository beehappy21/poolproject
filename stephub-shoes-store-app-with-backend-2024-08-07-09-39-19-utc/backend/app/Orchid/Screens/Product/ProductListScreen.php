<?php

namespace App\Orchid\Screens\Product;

use Orchid\Screen\TD;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Layout;
use Orchid\Screen\Actions\Link;
use App\Models\Product;

class ProductListScreen extends Screen {
  public $product;

  public function query(Product $product): iterable {
    return [
      'product' => $product,
      'products' => Product::query()->orderByDesc('updated_at')->paginate(10)
    ];
  }

  public function name(): ?string {
    return 'Products';
  }

  public function commandBar(): iterable {
    return [
      Link::make('Create')
        ->icon('bs.plus-circle')
        ->route('platform.product.edit'),
    ];
  }

  public function layout(): iterable {
    return [
      Layout::table('products', [
        TD::make('image', 'Image')
          ->cantHide()
          ->render(function (Product $product) {
            return '<img src="' . $product->image . '" width="50" height="62.50" style="object-fit: cover; object-position: center; border-radius: 7%;">';
          }),

        TD::make('name', 'Name')
          ->sort()
          ->cantHide()
          ->render(function (Product $product) {
            $productDetailId = (int) ($product->source_product_detail_id ?? 0);
            $routeParameters = $productDetailId > 0
              ? ['product' => $productDetailId]
              : ['product_id' => $product->id];

            return Link::make($product->name)
              ->route('platform.product.edit', $routeParameters);
          }),

        TD::make('price', 'Price')
          ->sort()
          ->cantHide()
          ->render(function (Product $product) {
            return '$' . $product->price;
          }),

        TD::make('old_price', 'Old Price')
          ->sort()
          ->cantHide()
          ->render(function (Product $product) {
            return $product->old_price ? '<del>$' . $product->old_price . '</del>' : '-';
          }),

        TD::make('code', 'Code')
          ->cantHide()
          ->render(function (Product $product) {
            return e($product->code);
          }),

        TD::make('updated_at', __('Last sync'))
          ->sort()
          ->cantHide()
          ->render(function (Product $product) {
            return optional($product->updated_at)->format('M j, Y');
          }),

        TD::make('pv', 'PV')
          ->sort()
          ->cantHide()
          ->align(TD::ALIGN_CENTER)
          ->render(function (Product $product) {
            return number_format((float) $product->pv, 2);
          }),
      ]),
    ];
  }
}
