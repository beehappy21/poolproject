<?php

namespace App\Orchid\Screens\Package;

use App\Models\CatalogPackage;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Layout;

class PackageListScreen extends Screen
{
    public function query(): iterable
    {
        return [
            'packages' => CatalogPackage::query()->orderByDesc('updated_at')->paginate(10),
        ];
    }

    public function name(): ?string
    {
        return 'Packages';
    }

    public function commandBar(): iterable
    {
        return [];
    }

    public function layout(): iterable
    {
        return [
            Layout::table('packages', [
                TD::make('name', 'Name')
                    ->sort()
                    ->cantHide()
                    ->filter(Input::make())
                    ->render(fn (CatalogPackage $package) => e($package->name)),
                TD::make('code', 'Code')
                    ->cantHide()
                    ->filter(Input::make())
                    ->render(fn (CatalogPackage $package) => e($package->code)),
                TD::make('price', 'Price')
                    ->sort()
                    ->cantHide()
                    ->render(fn (CatalogPackage $package) => '$' . $package->price),
                TD::make('pv', 'PV')
                    ->sort()
                    ->cantHide()
                    ->render(fn (CatalogPackage $package) => number_format((float) $package->pv, 2)),
                TD::make('item_count', 'Items')
                    ->cantHide()
                    ->render(fn (CatalogPackage $package) => (string) $package->item_count),
                TD::make('status', 'Status')
                    ->cantHide()
                    ->render(fn (CatalogPackage $package) => e($package->status_label)),
                TD::make('updated_at', 'Last sync')
                    ->sort()
                    ->cantHide()
                    ->render(fn (CatalogPackage $package) => optional($package->updated_at)->format('M j, Y')),
            ]),
        ];
    }
}
