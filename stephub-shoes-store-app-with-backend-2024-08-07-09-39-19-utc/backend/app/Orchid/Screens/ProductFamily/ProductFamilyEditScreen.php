<?php

namespace App\Orchid\Screens\ProductFamily;

use App\Models\Category;
use App\Models\ProductRecord;
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

class ProductFamilyEditScreen extends Screen
{
    public $family;

    public $supplierOptions = [];

    public $categoryOptions = [];

    public function query(ProductRecord $family): iterable
    {
        $this->family = $family;
        $this->supplierOptions = Supplier::query()
            ->orderBy('name')
            ->get(['id', 'code', 'name'])
            ->mapWithKeys(fn (Supplier $supplier) => [
                $supplier->id => trim($supplier->code . ' • ' . $supplier->name),
            ])
            ->all();

        $this->categoryOptions = Category::query()
            ->orderBy('name')
            ->get(['id', 'supplierId', 'code', 'name'])
            ->mapWithKeys(fn (Category $category) => [
                $category->id => trim($category->code . ' • ' . $category->name),
            ])
            ->all();

        return [
            'family' => $family,
        ];
    }

    public function name(): ?string
    {
        return $this->family->exists ? 'Edit product family' : 'Create product family';
    }

    public function commandBar(): iterable
    {
        return [
            Button::make('Create product family')
                ->icon('pencil')
                ->method('create')
                ->canSee(!$this->family->exists),
            Button::make('Update')
                ->icon('note')
                ->method('update')
                ->canSee($this->family->exists),
            Button::make('Remove')
                ->icon('trash')
                ->method('remove')
                ->canSee($this->family->exists)
                ->confirm('Are you sure you want to delete this product family?'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::rows([
                Select::make('family.supplier_id')
                    ->title('Supplier:')
                    ->options($this->supplierOptions)
                    ->required(),
                Select::make('family.category_id')
                    ->title('Category:')
                    ->options($this->categoryOptions)
                    ->required(),
                Input::make('family.name')
                    ->title('Family name:')
                    ->required(!$this->family->exists),
                Input::make('family.code')
                    ->title('Family code:')
                    ->help('ใช้รหัสสำหรับจัดกลุ่มสินค้า เช่น ENERG')
                    ->required(!$this->family->exists),
                Input::make('family.slug')
                    ->title('Slug:'),
                Input::make('family.description')
                    ->title('Description:'),
                Input::make('family.sort_order')
                    ->title('Sort order:')
                    ->type('number'),
                Select::make('family.is_featured')
                    ->title('Featured:')
                    ->options([
                        0 => 'No',
                        1 => 'Yes',
                    ]),
                Select::make('family.status')
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

        $this->family->fill($data)->save();
        Alert::info('You have successfully created the product family.');

        return redirect()->route('platform.product-family.list');
    }

    public function update(Request $request)
    {
        $data = $this->validatedData($request, (int) $this->family->id);
        $data['slug'] = $data['slug'] ?: Str::slug($data['name']);

        $this->family->fill($data)->save();
        Alert::info('You have successfully updated the product family.');

        return redirect()->route('platform.product-family.list');
    }

    public function remove(ProductRecord $family)
    {
        if ($family->details()->exists()) {
            Alert::warning('This product family still has product details. Please remove those SKUs first.');

            return redirect()->route('platform.product-family.list');
        }

        $family->delete();
        Alert::info('You have successfully deleted the product family.');

        return redirect()->route('platform.product-family.list');
    }

    private function validatedData(Request $request, ?int $ignoreId = null): array
    {
        $supplierId = (int) $request->input('family.supplier_id');
        $categoryId = (int) $request->input('family.category_id');

        $validated = $request->validate([
            'family.supplier_id' => ['required', 'integer', Rule::exists('poolproject.Supplier', 'id')],
            'family.category_id' => ['required', 'integer', Rule::exists('poolproject.ProductCategory', 'id')],
            'family.name' => ['required', 'string', 'max:255'],
            'family.code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('poolproject.Product', 'code')->ignore($ignoreId, 'id'),
            ],
            'family.slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('poolproject.Product', 'slug')->ignore($ignoreId, 'id'),
            ],
            'family.description' => ['nullable', 'string'],
            'family.sort_order' => ['nullable', 'integer'],
            'family.is_featured' => ['nullable'],
            'family.status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $category = Category::query()->find($categoryId);
        if (!$category instanceof Category || (int) $category->supplierId !== $supplierId) {
            abort(422, 'Selected category does not belong to the selected supplier.');
        }

        $family = $validated['family'];

        return [
            'supplierId' => $supplierId,
            'categoryId' => $categoryId,
            'name' => $family['name'],
            'code' => Str::upper(trim((string) $family['code'])),
            'slug' => $family['slug'] ?? null,
            'description' => $family['description'] ?? null,
            'sortOrder' => (int) ($family['sort_order'] ?? 0),
            'isFeatured' => filter_var($family['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'status' => $family['status'],
        ];
    }
}
