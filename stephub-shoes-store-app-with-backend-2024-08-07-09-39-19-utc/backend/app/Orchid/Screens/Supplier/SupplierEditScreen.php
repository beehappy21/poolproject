<?php

namespace App\Orchid\Screens\Supplier;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Fields\Input;
use Orchid\Screen\Fields\Relation;
use Orchid\Screen\Fields\Select;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;
use Illuminate\Support\Str;

class SupplierEditScreen extends Screen
{
    public $supplier;

    public function query(Supplier $supplier): iterable
    {
        return [
            'supplier' => $supplier,
        ];
    }

    public function name(): ?string
    {
        return $this->supplier->exists ? 'Edit supplier' : 'Create supplier';
    }

    public function commandBar(): iterable
    {
        return [
            Button::make('Create supplier')
                ->icon('pencil')
                ->method('create')
                ->canSee(!$this->supplier->exists),
            Button::make('Update')
                ->icon('note')
                ->method('update')
                ->canSee($this->supplier->exists),
            Button::make('Remove')
                ->icon('trash')
                ->method('remove')
                ->canSee($this->supplier->exists)
                ->confirm('Are you sure you want to delete this supplier?'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::rows([
                Input::make('supplier.name')
                    ->title('Name:')
                    ->required(!$this->supplier->exists),
                Input::make('supplier.code')
                    ->title('Code:')
                    ->required(!$this->supplier->exists),
                Input::make('supplier.slug')
                    ->title('Slug:'),
                Input::make('supplier.imageUrl')
                    ->title('Image URL:'),
                Input::make('supplier.description')
                    ->title('Description:'),
                Input::make('supplier.sortOrder')
                    ->title('Sort order:')
                    ->type('number'),
                Select::make('supplier.isFeatured')
                    ->title('Featured:')
                    ->options([
                        0 => 'No',
                        1 => 'Yes',
                    ]),
                Select::make('supplier.status')
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

        $this->supplier->fill($data)->save();
        Alert::info('You have successfully created the supplier.');

        return redirect()->route('platform.supplier.list');
    }

    public function update(Request $request)
    {
        $data = $this->validatedData($request, $this->supplier->id);
        $data['slug'] = $data['slug'] ?: Str::slug($data['name']);

        $this->supplier->fill($data)->save();
        Alert::info('You have successfully updated the supplier.');

        return redirect()->route('platform.supplier.list');
    }

    public function remove(Supplier $supplier)
    {
        $supplier->delete();
        Alert::info('You have successfully deleted the supplier.');

        return redirect()->route('platform.supplier.list');
    }

    private function validatedData(Request $request, ?int $ignoreId = null): array
    {
        $validated = $request->validate([
            'supplier.name' => ['required', 'string', 'max:255'],
            'supplier.code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('poolproject.Supplier', 'code')->ignore($ignoreId, 'id'),
            ],
            'supplier.slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('poolproject.Supplier', 'slug')->ignore($ignoreId, 'id'),
            ],
            'supplier.description' => ['nullable', 'string'],
            'supplier.image_url' => ['nullable', 'string', 'max:500'],
            'supplier.sort_order' => ['nullable', 'integer'],
            'supplier.is_featured' => ['nullable'],
            'supplier.status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $supplier = $validated['supplier'];
        $data = [
            'name' => $supplier['name'],
            'code' => $supplier['code'],
            'slug' => $supplier['slug'] ?? null,
            'description' => $supplier['description'] ?? null,
            'imageUrl' => $supplier['image_url'] ?? null,
            'sortOrder' => (int) ($supplier['sort_order'] ?? 0),
            'isFeatured' => filter_var($supplier['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'status' => $supplier['status'],
        ];

        return $data;
    }
}
