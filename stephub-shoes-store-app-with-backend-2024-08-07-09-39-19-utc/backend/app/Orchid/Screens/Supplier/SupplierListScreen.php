<?php

namespace App\Orchid\Screens\Supplier;

use App\Models\Supplier;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\DropDown;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class SupplierListScreen extends Screen
{
    public function query(): iterable
    {
        return [
            'suppliers' => Supplier::query()->orderByDesc('updatedAt')->paginate(10),
        ];
    }

    public function name(): ?string
    {
        return 'Suppliers';
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('Create')
                ->icon('bs.plus-circle')
                ->route('platform.supplier.edit'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::table('suppliers', [
                TD::make('image', 'Image')
                    ->cantHide()
                    ->render(function (Supplier $supplier) {
                        return '<img src="' . $supplier->image . '" width="50" height="50" style="object-fit: cover; object-position: center; border-radius: 7%;">';
                    }),
                TD::make('name', 'Name')
                    ->sort()
                    ->cantHide()
                    ->filter(Input::make())
                    ->render(function (Supplier $supplier) {
                        return Link::make($supplier->name)
                            ->route('platform.supplier.edit', ['supplier' => $supplier]);
                    }),
                TD::make('code', 'Code')
                    ->cantHide()
                    ->filter(Input::make())
                    ->render(function (Supplier $supplier) {
                        return e($supplier->code);
                    }),
                TD::make('status', 'Status')
                    ->cantHide()
                    ->render(function (Supplier $supplier) {
                        return e($supplier->status_label);
                    }),
                TD::make('updated_at', 'Last sync')
                    ->sort()
                    ->cantHide()
                    ->render(function (Supplier $supplier) {
                        return optional($supplier->updatedAt)->format('M j, Y');
                    }),
                TD::make(__('Actions'))
                    ->cantHide()
                    ->align(TD::ALIGN_CENTER)
                    ->width('100px')
                    ->render(fn (Supplier $supplier) => DropDown::make()
                        ->icon('bs.three-dots-vertical')
                        ->list([
                            Link::make(__('Edit'))
                                ->route('platform.supplier.edit', ['supplier' => $supplier])
                                ->icon('bs.pencil'),
                            Button::make('Delete')
                                ->icon('bs.trash3')
                                ->confirm('Are you sure you want to delete this supplier?')
                                ->method('remove')
                                ->parameters([
                                    'supplier' => $supplier->id,
                                ]),
                        ])),
            ]),
        ];
    }

    public function remove(Supplier $supplier)
    {
        $supplier->delete();
        Alert::info('You have successfully deleted the supplier.');
    }
}
