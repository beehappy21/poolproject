<?php

namespace App\Orchid\Screens\Category;

use App\Models\Category;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\Select;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class CategoryEditScreen extends Screen
{
    public $category;

    public $supplierOptions = [];

    public function query(Category $category): iterable
    {
        $this->category = $category;
        $this->supplierOptions = Supplier::query()
            ->orderBy('name')
            ->pluck('name', 'id')
            ->map(fn ($name) => (string) $name)
            ->all();

        return [
            'category' => $category,
        ];
    }

    public function name(): ?string
    {
        return $this->category->exists ? 'Edit category' : 'Create category';
    }

    public function commandBar(): iterable
    {
        return [
            Button::make('Create category')
                ->icon('pencil')
                ->method('create')
                ->canSee(!$this->category->exists),
            Button::make('Update')
                ->icon('note')
                ->method('update')
                ->canSee($this->category->exists),
            Button::make('Remove')
                ->icon('trash')
                ->method('remove')
                ->canSee($this->category->exists)
                ->confirm('Are you sure you want to delete this category?'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::rows([
                Select::make('category.supplierId')
                    ->title('Supplier:')
                    ->options($this->supplierOptions)
                    ->required(),
                Input::make('category.name')
                    ->title('Name:')
                    ->required(!$this->category->exists),
                Input::make('category.code')
                    ->title('Code:')
                    ->required(!$this->category->exists),
                Input::make('category.slug')
                    ->title('Slug:'),
                Input::make('category.imageUrl')
                    ->title('Image URL:'),
                Input::make('category.description')
                    ->title('Description:'),
                Input::make('category.sortOrder')
                    ->title('Sort order:')
                    ->type('number'),
                Select::make('category.isFeatured')
                    ->title('Featured:')
                    ->options([
                        0 => 'No',
                        1 => 'Yes',
                    ]),
                Select::make('category.status')
                    ->title('Status:')
                    ->options([
                        'ACTIVE' => 'ACTIVE',
                        'INACTIVE' => 'INACTIVE',
                    ])
                    ->required(),
            ]),
        ];
    }

    public function create(Request $request)
    {
        $data = $this->validatedData($request);
        $data['slug'] = $data['slug'] ?: Str::slug($data['name']);

        $this->category->fill($data)->save();
        Alert::info('You have successfully created the category.');

        return redirect()->route('platform.category.list');
    }

    public function update(Request $request)
    {
        $data = $this->validatedData($request, $this->category->id);
        $data['slug'] = $data['slug'] ?: Str::slug($data['name']);

        $this->category->fill($data)->save();
        Alert::info('You have successfully updated the category.');

        return redirect()->route('platform.category.list');
    }

    public function remove(Category $category)
    {
        $category->delete();
        Alert::info('You have successfully deleted the category.');

        return redirect()->route('platform.category.list');
    }

    private function validatedData(Request $request, ?int $ignoreId = null): array
    {
        $supplierId = (int) $request->input('category.supplier_id');

        $validated = $request->validate([
            'category.supplier_id' => ['required', 'integer', Rule::exists('poolproject.Supplier', 'id')],
            'category.name' => ['required', 'string', 'max:255'],
            'category.code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('poolproject.ProductCategory', 'code')
                    ->where(fn ($query) => $query->where('supplierId', $supplierId))
                    ->ignore($ignoreId, 'id'),
            ],
            'category.slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('poolproject.ProductCategory', 'slug')->ignore($ignoreId, 'id'),
            ],
            'category.description' => ['nullable', 'string'],
            'category.image_url' => ['nullable', 'string', 'max:500'],
            'category.sort_order' => ['nullable', 'integer'],
            'category.is_featured' => ['nullable'],
            'category.status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $category = $validated['category'];
        $data = [
            'supplierId' => (int) $category['supplier_id'],
            'name' => $category['name'],
            'code' => $category['code'],
            'slug' => $category['slug'] ?? null,
            'description' => $category['description'] ?? null,
            'imageUrl' => $category['image_url'] ?? null,
            'sortOrder' => (int) ($category['sort_order'] ?? 0),
            'isFeatured' => filter_var($category['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'status' => $category['status'],
        ];

        return $data;
    }
}
