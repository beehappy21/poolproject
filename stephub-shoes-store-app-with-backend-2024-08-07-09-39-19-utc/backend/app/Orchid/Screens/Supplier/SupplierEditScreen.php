<?php

namespace App\Orchid\Screens\Supplier;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Fields\Input;
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
                Input::make('supplier.image_file')
                    ->title('Image file:')
                    ->type('file')
                    ->accept('image/*'),
                Input::make('supplier.image_url')
                    ->title('Image URL:')
                    ->help('อัปโหลดรูป 1 รูป หรือวางลิงก์รูปจากภายนอก'),
                Input::make('supplier.description')
                    ->title('Description:'),
                Input::make('supplier.sort_order')
                    ->title('Sort order:')
                    ->type('number'),
                Select::make('supplier.is_featured')
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
            'supplier.image_file' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp'],
            'supplier.description' => ['nullable', 'string'],
            'supplier.image_url' => ['nullable', 'string', 'max:500'],
            'supplier.sort_order' => ['nullable', 'integer'],
            'supplier.is_featured' => ['nullable'],
            'supplier.status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $supplier = $validated['supplier'];
        $resolvedImageUrl = $this->resolveImageUrl(
            $request,
            $supplier['image_url'] ?? null,
            $this->supplier->imageUrl ?? null,
            'suppliers'
        );
        $data = [
            'name' => $supplier['name'],
            'code' => $supplier['code'],
            'slug' => $supplier['slug'] ?? null,
            'description' => $supplier['description'] ?? null,
            'imageUrl' => $resolvedImageUrl,
            'sortOrder' => (int) ($supplier['sort_order'] ?? 0),
            'isFeatured' => filter_var($supplier['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'status' => $supplier['status'],
        ];

        return $data;
    }

    private function resolveImageUrl(
        Request $request,
        ?string $submittedImageUrl,
        ?string $existingImageUrl,
        string $directory
    ): ?string {
        $file = $request->file('supplier.image_file');

        if ($file instanceof UploadedFile) {
            return $this->storeUploadedImage($file, $directory);
        }

        $normalizedSubmitted = $this->normalizeStoredImageReference($submittedImageUrl);
        if ($normalizedSubmitted !== null) {
            return $normalizedSubmitted;
        }

        return $this->normalizeStoredImageReference($existingImageUrl);
    }

    private function storeUploadedImage(UploadedFile $file, string $directory): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $path = $file->storeAs(
            $directory,
            Str::uuid()->toString() . '.' . $extension,
            'public'
        );

        return $path;
    }

    private function normalizeStoredImageReference(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        if (Str::startsWith($value, ['http://', 'https://', 'data:image/'])) {
            return $value;
        }

        if (Str::startsWith($value, '/storage/')) {
            return ltrim(substr($value, 9), '/');
        }

        $disk = Storage::disk('public');
        if ($disk->exists($value)) {
            return ltrim($value, '/');
        }

        return $value;
    }
}
