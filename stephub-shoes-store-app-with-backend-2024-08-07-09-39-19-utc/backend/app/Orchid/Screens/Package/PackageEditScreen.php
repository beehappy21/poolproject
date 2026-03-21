<?php

namespace App\Orchid\Screens\Package;

use App\Models\CatalogPackage;
use App\Models\PackageItemRecord;
use App\Models\PackageLine;
use App\Models\PackageRecord;
use App\Models\Product;
use App\Models\ProductDetailRecord;
use Illuminate\Http\Request;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\Select;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class PackageEditScreen extends Screen
{
    public $package;

    public $productOptions = [];

    public function query(CatalogPackage $package): iterable
    {
        $this->package = $package;
        $this->productOptions = Product::query()
            ->orderBy('supplier_name')
            ->orderBy('category_name')
            ->orderBy('name')
            ->get()
            ->mapWithKeys(function (Product $product) {
                $label = sprintf(
                    '%s [%s] - %s / %s',
                    $product->name,
                    $product->code,
                    $product->supplier_name,
                    $product->category_name
                );

                return [$product->id => $label];
            })
            ->all();

        return [
            'package' => $package,
            'items' => PackageLine::query()
                ->where('source_package_id', $package->id)
                ->orderBy('id')
                ->get(),
        ];
    }

    public function name(): ?string
    {
        return 'Package';
    }

    public function commandBar(): iterable
    {
        return [
            Button::make('Add item')
                ->icon('bs.plus-circle')
                ->method('addItem')
                ->canSee($this->package->exists),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::rows([
                Input::make('package.id')->type('hidden'),
                Input::make('package.name')->title('Name:')->readonly(),
                Input::make('package.code')->title('Code:')->readonly(),
                Input::make('package.price')->title('Price:')->readonly(),
                Input::make('package.member_price')->title('Member price:')->readonly(),
                Input::make('package.retail_price')->title('Retail price:')->readonly(),
                Input::make('package.pv')->title('PV:')->readonly(),
                Input::make('package.item_count')->title('Item count:')->readonly(),
                Input::make('package.active_days')->title('Active days:')->readonly(),
                Input::make('package.earning_cap_type')->title('Earning cap type:')->readonly(),
                Input::make('package.earning_cap_amount')->title('Earning cap amount:')->readonly(),
                Input::make('package.status_label')->title('Status:')->readonly(),
            ]),
            Layout::rows([
                Select::make('item.productDetailId')
                    ->title('Product detail:')
                    ->options($this->productOptions)
                    ->required(),
                Input::make('item.qty')
                    ->title('Qty:')
                    ->type('number')
                    ->min(1)
                    ->value(1)
                    ->required(),
            ])->title('Add package item'),
            Layout::table('items', [
                TD::make('product_detail_name', 'Product detail')
                    ->cantHide()
                    ->render(fn (PackageLine $item) => e($item->product_detail_name)),
                TD::make('product_detail_code', 'Detail code')
                    ->cantHide()
                    ->render(fn (PackageLine $item) => e($item->product_detail_code)),
                TD::make('supplier_name', 'Supplier')
                    ->cantHide()
                    ->render(fn (PackageLine $item) => e($item->supplier_name)),
                TD::make('category_name', 'Category')
                    ->cantHide()
                    ->render(fn (PackageLine $item) => e($item->category_name)),
                TD::make('qty', 'Qty')
                    ->cantHide()
                    ->align(TD::ALIGN_CENTER)
                    ->render(fn (PackageLine $item) => (string) $item->qty),
                TD::make('unit_member_price', 'Unit member price')
                    ->cantHide()
                    ->render(fn (PackageLine $item) => '$' . $item->unit_member_price),
                TD::make('line_member_price', 'Line total')
                    ->cantHide()
                    ->render(fn (PackageLine $item) => '$' . $item->line_member_price),
                TD::make('line_pv', 'Line PV')
                    ->cantHide()
                    ->render(fn (PackageLine $item) => number_format((float) $item->line_pv, 2)),
                TD::make(__('Actions'))
                    ->cantHide()
                    ->align(TD::ALIGN_CENTER)
                    ->width('100px')
                    ->render(fn (PackageLine $item) => Button::make('Remove')
                        ->icon('bs.trash3')
                        ->confirm('Are you sure you want to remove this package item?')
                        ->method('removeItem')
                        ->parameters([
                            'itemId' => $item->id,
                            'packageId' => $this->package->id,
                        ])),
            ])->title('Package items'),
        ];
    }

    public function addItem(Request $request)
    {
        $validated = $request->validate([
            'package.id' => ['required', 'integer', 'exists:poolproject.Package,id'],
            'item.product_detail_id' => ['required', 'integer', 'exists:poolproject.ProductDetail,id'],
            'item.qty' => ['required', 'integer', 'min:1'],
        ]);

        $packageId = (int) $validated['package']['id'];
        $productDetailId = (int) $validated['item']['product_detail_id'];
        $qty = (int) $validated['item']['qty'];

        PackageRecord::query()->findOrFail($packageId);
        $detail = ProductDetailRecord::query()->findOrFail($productDetailId);

        $item = PackageItemRecord::query()->firstOrNew([
            'packageId' => $packageId,
            'productDetailId' => $productDetailId,
        ]);

        $item->fill([
            'qty' => $qty,
            'unitCostPriceUsdt' => $this->decimalString($detail->costPriceUsdt ?? 0),
            'unitMemberPriceUsdt' => $this->decimalString($detail->memberPriceUsdt ?? 0),
            'unitRetailPriceUsdt' => $this->decimalString($detail->retailPriceUsdt ?? 0),
            'unitPv' => $this->decimalString($detail->pv ?? 0),
            'unitPoolRate' => $this->decimalString($detail->poolRate ?? 0),
            'lineCostPriceUsdt' => $this->multiplyDecimal($detail->costPriceUsdt ?? 0, $qty),
            'lineMemberPriceUsdt' => $this->multiplyDecimal($detail->memberPriceUsdt ?? 0, $qty),
            'lineRetailPriceUsdt' => $this->multiplyDecimal($detail->retailPriceUsdt ?? 0, $qty),
            'linePv' => $this->multiplyDecimal($detail->pv ?? 0, $qty),
        ]);
        $item->save();

        Alert::info('You have successfully added the package item.');

        return redirect()->route('platform.package.edit', ['package' => $packageId]);
    }

    public function removeItem(Request $request)
    {
        $validated = $request->validate([
            'item_id' => ['required', 'integer', 'exists:poolproject.PackageItem,id'],
            'package_id' => ['required', 'integer', 'exists:poolproject.Package,id'],
        ]);

        PackageItemRecord::query()->findOrFail((int) $validated['item_id'])->delete();
        Alert::info('You have successfully removed the package item.');

        return redirect()->route('platform.package.edit', ['package' => (int) $validated['package_id']]);
    }

    private function decimalString($value): string
    {
        return number_format((float) $value, 8, '.', '');
    }

    private function multiplyDecimal($value, int $qty): string
    {
        return number_format((float) $value * $qty, 8, '.', '');
    }
}
