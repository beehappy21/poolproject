<?php

namespace App\Orchid\Screens\Product;

use Orchid\Screen\Screen;
use Orchid\Screen\Fields\Input;
use Orchid\Support\Facades\Layout;
use App\Models\Product;

class ProductEditScreen extends Screen {
  public $product;

  public function query(Product $product): iterable {
    return [
      'product' => $product,
    ];
  }

  public function name(): ?string {
    return 'Product';
  }

  public function commandBar(): iterable {
    return [];
  }

  public function layout(): iterable {
    return [
      Layout::rows([
        Input::make('product.name')
          ->title(__('Name:'))
          ->readonly(),

        Input::make('product.code')
          ->title(__('Code:'))
          ->readonly(),

        Input::make('product.product_name')
          ->title('Product family:')
          ->readonly(),

        Input::make('product.product_code')
          ->title('Product family code:')
          ->readonly(),

        Input::make('product.category_name')
          ->title('Category:')
          ->readonly(),

        Input::make('product.category_code')
          ->title('Category code:')
          ->readonly(),

        Input::make('product.supplier_name')
          ->title('Supplier:')
          ->readonly(),

        Input::make('product.supplier_code')
          ->title('Supplier code:')
          ->readonly(),

        Input::make('product.price')
          ->title('Member price (USD):')
          ->readonly(),

        Input::make('product.old_price')
          ->title('Retail price (USD):')
          ->readonly(),

        Input::make('product.pv')
          ->title('PV:')
          ->readonly(),

        Input::make('product.rating')
          ->title('Rating:')
          ->readonly(),

        Input::make('product.rating_count')
          ->title('Rating count:')
          ->readonly(),

        Input::make('product.status')
          ->title('Status:')
          ->readonly(),

        Input::make('product.image')
          ->title(__('Primary image URL:'))
          ->readonly(),

        Input::make('product.youtube_url')
          ->title('YouTube URL:')
          ->readonly(),

        Input::make('product.description')
          ->title('Description:')
          ->readonly(),
      ])
    ];
  }
}
