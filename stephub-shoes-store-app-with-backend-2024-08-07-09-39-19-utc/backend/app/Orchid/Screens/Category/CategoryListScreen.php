<?php

namespace App\Orchid\Screens\Category;

use App\Models\Category;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Actions\DropDown;
use Orchid\Screen\Actions\Link;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Screen;
use Orchid\Screen\TD;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class CategoryListScreen extends Screen
{
    public function query(): iterable
    {
        return [
            'categories' => Category::query()
                ->with('supplier')
                ->orderByDesc('updatedAt')
                ->paginate(10),
        ];
    }

    public function name(): ?string
    {
        return 'Categories';
    }

    public function commandBar(): iterable
    {
        return [
            Link::make('Create')
                ->icon('bs.plus-circle')
                ->route('platform.category.edit'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::table('categories', [
                TD::make('image', 'Image')
                    ->cantHide()
                    ->render(function (Category $category) {
                        return '<img src="' . $category->image . '" width="50" height="50" style="object-fit: cover; object-position: center; border-radius: 7%;">';
                    }),
                TD::make('name', 'Name')
                    ->sort()
                    ->cantHide()
                    ->filter(Input::make())
                    ->render(function (Category $category) {
                        return Link::make($category->name)
                            ->route('platform.category.edit', ['category' => $category]);
                    }),
                TD::make('code', 'Code')
                    ->cantHide()
                    ->filter(Input::make())
                    ->render(function (Category $category) {
                        return e($category->code);
                    }),
                TD::make('supplier.name', 'Supplier')
                    ->cantHide()
                    ->render(function (Category $category) {
                        return e(optional($category->supplier)->name ?: '-');
                    }),
                TD::make('status', 'Status')
                    ->cantHide()
                    ->render(function (Category $category) {
                        return e($category->status_label);
                    }),
                TD::make('updated_at', 'Last sync')
                    ->sort()
                    ->cantHide()
                    ->render(function (Category $category) {
                        return optional($category->updatedAt)->format('M j, Y');
                    }),
                TD::make(__('Actions'))
                    ->cantHide()
                    ->align(TD::ALIGN_CENTER)
                    ->width('100px')
                    ->render(fn (Category $category) => DropDown::make()
                        ->icon('bs.three-dots-vertical')
                        ->list([
                            Link::make(__('Edit'))
                                ->route('platform.category.edit', ['category' => $category])
                                ->icon('bs.pencil'),
                            Button::make('Delete')
                                ->icon('bs.trash3')
                                ->confirm('Are you sure you want to delete this category?')
                                ->method('remove')
                                ->parameters([
                                    'category' => $category->id,
                                ]),
                        ])),
            ]),
        ];
    }

    public function remove(Category $category)
    {
        $category->delete();
        Alert::info('You have successfully deleted the category.');
    }
}
