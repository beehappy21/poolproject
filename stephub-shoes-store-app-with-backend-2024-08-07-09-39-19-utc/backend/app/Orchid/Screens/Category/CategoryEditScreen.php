<?php

namespace App\Orchid\Screens\Category;

use App\Models\Category;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
        Category::ensurePermanentFirmCategory();
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
                ->canSee($this->category->exists && !$this->category->isPermanentFirmCategory())
                ->confirm('Are you sure you want to delete this category?'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::rows([
                Select::make('category.supplier_id')
                    ->title('Supplier:')
                    ->options($this->supplierOptions)
                    ->required(),
                Input::make('category.name')
                    ->title('Name:')
                    ->required(!$this->category->exists),
                Input::make('category.code')
                    ->title('Code / SKU prefix:')
                    ->help('ใช้ code นี้เป็นฐานรหัส SKU ของสินค้าในหมวด เช่น Longevity จะได้ LON001, LON002')
                    ->required(!$this->category->exists),
                Input::make('category.slug')
                    ->title('Slug:'),
                Input::make('category.image_file')
                    ->title('Image file:')
                    ->type('file')
                    ->accept('image/*'),
                Input::make('category.image_url')
                    ->title('Image URL:')
                    ->help('อัปโหลดรูป 1 รูป หรือวางลิงก์รูปจากภายนอก'),
                Input::make('category.description')
                    ->title('Description:'),
                Input::make('category.sort_order')
                    ->title('Sort order:')
                    ->type('number'),
                Select::make('category.is_featured')
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
        Category::ensurePermanentFirmCategory();
        $data = $this->validatedData($request);
        $data['slug'] = $data['slug'] ?: Str::slug($data['name']);

        $this->category->fill($data)->save();
        Alert::info('You have successfully created the category.');

        return redirect()->route('platform.category.list');
    }

    public function update(Request $request)
    {
        Category::ensurePermanentFirmCategory();
        $data = $this->validatedData($request, $this->category->id);
        $data['slug'] = $data['slug'] ?: Str::slug($data['name']);

        $this->category->fill($data)->save();
        Alert::info('You have successfully updated the category.');

        return redirect()->route('platform.category.list');
    }

    public function remove(Category $category)
    {
        if ($category->isPermanentFirmCategory()) {
            Alert::warning('Firm catalog is permanent and cannot be deleted.');

            return redirect()->route('platform.category.list');
        }

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
            'category.image_file' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp'],
            'category.description' => ['nullable', 'string'],
            'category.image_url' => ['nullable', 'string', 'max:500'],
            'category.sort_order' => ['nullable', 'integer'],
            'category.is_featured' => ['nullable'],
            'category.status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $category = $validated['category'];

        if ($this->category->exists && $this->category->isPermanentFirmCategory()) {
            $firmCategory = Category::ensurePermanentFirmCategory();
            $category['supplier_id'] = $firmCategory->supplierId;
            $category['name'] = Category::PERMANENT_FIRM_CATEGORY_NAME;
            $category['code'] = Category::PERMANENT_FIRM_CATEGORY_CODE;
            $category['status'] = 'ACTIVE';
        }

        $resolvedImageUrl = $this->resolveImageUrl(
            $request,
            $category['image_url'] ?? null,
            $this->category->imageUrl ?? null,
            'categories'
        );

        $data = [
            'supplierId' => (int) $category['supplier_id'],
            'name' => $category['name'],
            'code' => $category['code'],
            'slug' => $category['slug'] ?? null,
            'description' => $category['description'] ?? null,
            'imageUrl' => $resolvedImageUrl,
            'sortOrder' => (int) ($category['sort_order'] ?? 0),
            'isFeatured' => filter_var($category['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'status' => $category['status'],
        ];

        return $data;
    }

    private function resolveImageUrl(
        Request $request,
        ?string $submittedImageUrl,
        ?string $existingImageUrl,
        string $directory
    ): ?string {
        $file = $request->file('category.image_file');

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
