<?php

namespace App\Orchid\Screens\ProductFamily;

use App\Models\ProductDetailRecord;
use App\Models\ProductRecord;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\DropDown;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class ProductFamilyListScreen extends Screen
{
    public function query(): iterable
    {
        return [
            'families' => ProductRecord::query()
                ->with(['supplier', 'category'])
                ->orderByDesc('updatedAt')
                ->paginate(10),
        ];
    }

    public function name(): ?string
    {
        return 'Product Families';
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('Create')
                ->icon('bs.plus-circle')
                ->route('platform.product-family.edit'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::table('families', [
                TD::make('name', 'Family name')
                    ->sort()
                    ->cantHide()
                    ->filter(Input::make())
                    ->render(function (ProductRecord $family) {
                        return Link::make($family->name)
                            ->route('platform.product-family.edit', ['family' => $family]);
                    }),
                TD::make('code', 'Family code')
                    ->cantHide()
                    ->filter(Input::make())
                    ->render(fn (ProductRecord $family) => e($family->code)),
                TD::make('supplier.name', 'Supplier')
                    ->cantHide()
                    ->render(fn (ProductRecord $family) => e(optional($family->supplier)->name ?: '-')),
                TD::make('category.name', 'Category')
                    ->cantHide()
                    ->render(fn (ProductRecord $family) => e(optional($family->category)->name ?: '-')),
                TD::make('detail_count', 'SKUs')
                    ->cantHide()
                    ->align(TD::ALIGN_CENTER)
                    ->render(function (ProductRecord $family) {
                        return (string) ProductDetailRecord::query()
                            ->where('productId', $family->id)
                            ->count();
                    }),
                TD::make('status', 'Status')
                    ->cantHide()
                    ->render(fn (ProductRecord $family) => e((string) $family->status)),
                TD::make('updated_at', 'Last sync')
                    ->sort()
                    ->cantHide()
                    ->render(fn (ProductRecord $family) => optional($family->updatedAt)->format('M j, Y')),
                TD::make(__('Actions'))
                    ->cantHide()
                    ->align(TD::ALIGN_CENTER)
                    ->width('100px')
                    ->render(fn (ProductRecord $family) => DropDown::make()
                        ->icon('bs.three-dots-vertical')
                        ->list([
                            Link::make(__('Edit'))
                                ->route('platform.product-family.edit', ['family' => $family])
                                ->icon('bs.pencil'),
                            Button::make('Delete')
                                ->icon('bs.trash3')
                                ->confirm('Are you sure you want to delete this product family?')
                                ->method('remove')
                                ->parameters([
                                    'family' => $family->id,
                                ]),
                        ])),
            ]),
        ];
    }

    public function remove(ProductRecord $family)
    {
        if (ProductDetailRecord::query()->where('productId', $family->id)->exists()) {
            Alert::warning('This product family still has product details. Please remove those SKUs first.');

            return;
        }

        $family->delete();
        Alert::info('You have successfully deleted the product family.');
    }
}
