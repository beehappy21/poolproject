<?php

namespace App\Orchid\Screens\Product;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductDetailRecord;
use App\Models\ProductRecord;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class ProductEditScreen extends Screen
{
    public $product;

    private ?ProductDetailRecord $productDetailRecord = null;

    private array $productOptions = [];

    private array $productMetadata = [];

    private array $supplierOptions = [];

    private array $categoryOptions = [];

    public function query(Request $request): iterable
    {
        $this->productDetailRecord = $this->findProductDetailRecord($request) ?? new ProductDetailRecord();
        $selectedProductId = (int) old('product.product_id', $this->productDetailRecord->productId ?? $request->query('product_id', 0));
        $selectedProductSnapshot = $this->catalogSnapshot($selectedProductId);
        $selectedProductMeta = $this->matchedCatalogMetadata($selectedProductSnapshot);
        $selectedSupplierId = (int) old('product.supplier_id', $selectedProductMeta['supplier_id'] ?? 0);
        $selectedCategoryId = (int) old('product.category_id', $selectedProductMeta['category_id'] ?? 0);

        $this->product = $selectedProductSnapshot;

        $productRecords = ProductRecord::query()
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        $suppliers = Supplier::query()
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        $categories = Category::query()
            ->orderBy('name')
            ->get(['id', 'supplierId', 'code', 'name']);

        $snapshotByProductId = Product::query()
            ->whereIn('id', $productRecords->pluck('id'))
            ->orderByDesc('updated_at')
            ->get()
            ->unique('id')
            ->keyBy('id');

        $this->supplierOptions = $suppliers
            ->mapWithKeys(fn (Supplier $supplier) => [
                $supplier->id => trim($supplier->code . ' • ' . $supplier->name),
            ])
            ->all();

        $this->categoryOptions = $categories
            ->mapWithKeys(fn (Category $category) => [
                $category->id => trim($category->code . ' • ' . $category->name),
            ])
            ->all();

        $categoryMetadata = $categories
            ->mapWithKeys(fn (Category $category) => [
                $category->id => [
                    'label' => trim($category->code . ' • ' . $category->name),
                    'supplier_id' => (int) $category->supplierId,
                ],
            ])
            ->all();

        $supplierByCode = $suppliers
            ->filter(fn (Supplier $supplier) => trim((string) $supplier->code) !== '')
            ->keyBy(fn (Supplier $supplier) => Str::lower(trim((string) $supplier->code)));

        $supplierByName = $suppliers
            ->filter(fn (Supplier $supplier) => trim((string) $supplier->name) !== '')
            ->keyBy(fn (Supplier $supplier) => Str::lower(trim((string) $supplier->name)));

        $categoriesBySupplier = $categories->groupBy('supplierId');

        $this->productMetadata = $productRecords
            ->mapWithKeys(function (ProductRecord $record) use ($snapshotByProductId, $supplierByCode, $supplierByName, $categoriesBySupplier) {
                $snapshot = $snapshotByProductId->get($record->id);
                $supplierCode = trim((string) ($snapshot->supplier_code ?? ''));
                $supplierName = trim((string) ($snapshot->supplier_name ?? ''));
                $supplier = $supplierByCode->get(Str::lower($supplierCode))
                    ?? $supplierByName->get(Str::lower($supplierName));
                $category = null;

                if ($supplier instanceof Supplier) {
                    $categoryCode = trim((string) ($snapshot->category_code ?? ''));
                    $categoryName = trim((string) ($snapshot->category_name ?? ''));
                    $categoryCandidates = $categoriesBySupplier->get($supplier->id, collect());
                    $category = $categoryCandidates->first(function (Category $candidate) use ($categoryCode, $categoryName) {
                        $candidateCode = Str::lower(trim((string) $candidate->code));
                        $candidateName = Str::lower(trim((string) $candidate->name));

                        return ($categoryCode !== '' && $candidateCode === Str::lower($categoryCode))
                            || ($categoryName !== '' && $candidateName === Str::lower($categoryName));
                    });
                }

                return [
                    $record->id => [
                        'product_code' => $snapshot->product_code ?? $record->code ?? '',
                        'product_name' => $snapshot->product_name ?? $record->name ?? '',
                        'category_name' => $snapshot->category_name ?? '',
                        'category_code' => $snapshot->category_code ?? '',
                        'supplier_name' => $snapshot->supplier_name ?? '',
                        'supplier_code' => $snapshot->supplier_code ?? '',
                        'supplier_id' => $supplier?->id,
                        'category_id' => $category?->id,
                    ],
                ];
            })
            ->all();

        $this->productOptions = $productRecords
            ->mapWithKeys(function (ProductRecord $record) {
                $meta = $this->productMetadata[$record->id] ?? [];

                return [
                    $record->id => [
                        'label' => trim($record->code . ' • ' . $record->name),
                        'supplier_id' => (int) ($meta['supplier_id'] ?? 0),
                        'category_id' => (int) ($meta['category_id'] ?? 0),
                    ],
                ];
            })
            ->all();

        $formProduct = [
            'id' => $this->productDetailRecord->id,
            'supplier_id' => $selectedSupplierId ?: null,
            'category_id' => $selectedCategoryId ?: null,
            'product_id' => $selectedProductId ?: null,
            'code' => old('product.code', $this->productDetailRecord->code ?? ''),
            'name' => old('product.name', $this->productDetailRecord->name ?? ''),
            'slug' => old('product.slug', $this->productDetailRecord->slug ?? ''),
            'short_description' => old('product.short_description', $this->productDetailRecord->shortDescription ?? ''),
            'description' => old('product.description', $this->productDetailRecord->description ?? ''),
            'youtube_url' => old('product.youtube_url', $this->productDetailRecord->youtubeUrl ?? ($this->product->youtube_url ?? '')),
            'image_url' => old('product.image_url', $this->productDetailRecord->primaryImageUrl ?? ($this->product->image ?? '')),
            'gallery_urls' => old('product.gallery_urls', $this->initialGalleryUrls()),
            'cost_price' => old('product.cost_price', (string) ($this->productDetailRecord->costPriceUsdt ?? '0')),
            'member_price' => old('product.member_price', (string) ($this->productDetailRecord->memberPriceUsdt ?? ($this->product->price ?? '0'))),
            'retail_price' => old('product.retail_price', (string) ($this->productDetailRecord->retailPriceUsdt ?? ($this->product->old_price ?? '0'))),
            'rating_avg' => old('product.rating_avg', (string) ($this->productDetailRecord->ratingAvg ?? '0')),
            'rating_count' => old('product.rating_count', (string) ($this->productDetailRecord->ratingCount ?? '0')),
            'sort_order' => old('product.sort_order', (string) ($this->productDetailRecord->sortOrder ?? '0')),
            'pool_rate' => old('product.pool_rate', (string) ($this->productDetailRecord->poolRate ?? '0')),
            'is_new' => old('product.is_new', $this->boolAsFormValue($this->productDetailRecord->isNew ?? ($this->product->is_new ?? false))),
            'is_top' => old('product.is_top', $this->boolAsFormValue($this->productDetailRecord->isTop ?? ($this->product->is_top ?? false))),
            'is_featured' => old('product.is_featured', $this->boolAsFormValue($this->productDetailRecord->isFeatured ?? ($this->product->is_featured ?? false))),
            'is_best_seller' => old('product.is_best_seller', $this->boolAsFormValue($this->productDetailRecord->isBestSeller ?? ($this->product->is_best_seller ?? false))),
            'status' => old('product.status', $this->productDetailRecord->status ?? ($this->product->status ?? 'ACTIVE')),
            'product_name' => $this->product->product_name ?? ($this->productMetadata[$selectedProductId]['product_name'] ?? ''),
            'product_code' => $this->product->product_code ?? ($this->productMetadata[$selectedProductId]['product_code'] ?? ''),
            'category_name' => $this->product->category_name ?? '',
            'category_code' => $this->product->category_code ?? '',
            'supplier_name' => $this->product->supplier_name ?? '',
            'supplier_code' => $this->product->supplier_code ?? '',
        ];

        $defaultPv = $this->defaultPvValue($formProduct['member_price'], $formProduct['cost_price']);
        $storedPv = $this->productDetailRecord->exists
            ? (string) $this->productDetailRecord->pv
            : null;
        $pvValue = old('product.pv', $storedPv ?? $defaultPv);
        $manualOverride = old(
            'product.pv_manual_override',
            $this->productDetailRecord->exists && !$this->pvMatchesFormula($storedPv, $defaultPv) ? '1' : '0'
        );

        $formProduct['pv_formula'] = $defaultPv;
        $formProduct['pv'] = (string) $pvValue;
        $formProduct['pv_manual_override'] = (string) $manualOverride;

        return [
            'product' => $formProduct,
            'productOptions' => $this->productOptions,
            'productMetadata' => $this->productMetadata,
            'supplierOptions' => $this->supplierOptions,
            'categoryOptions' => $categoryMetadata,
            'youtubeEmbedUrl' => $this->youtubeEmbedUrl($formProduct['youtube_url']),
            'imagePreviewUrl' => $this->publicImageUrl($formProduct['image_url']),
        ];
    }

    public function name(): ?string
    {
        return $this->productDetailRecord?->exists ? 'Edit product' : 'Create product';
    }

    public function commandBar(): iterable
    {
        return [
            Button::make('Create product')
                ->icon('pencil')
                ->method('create')
                ->canSee(!$this->productDetailRecord?->exists),
            Button::make('Update')
                ->icon('note')
                ->method('update')
                ->canSee($this->productDetailRecord?->exists),
            Button::make('Remove')
                ->icon('trash')
                ->method('remove')
                ->canSee($this->productDetailRecord?->exists)
                ->confirm('Are you sure you want to delete this product detail?'),
        ];
    }

    public function layout(): iterable
    {
        return [
            Layout::view('product.edit-form'),
        ];
    }

    public function create(Request $request)
    {
        $data = $this->validatedData($request);

        $record = new ProductDetailRecord();
        $record->fill($data)->save();

        Alert::info('You have successfully created the product detail.');

        return redirect()->route('platform.product.edit', $record->id);
    }

    public function update(Request $request)
    {
        $record = $this->resolveProductDetailRecord($request);
        $this->productDetailRecord = $record;
        $data = $this->validatedData($request, (int) $record->id);

        $record->fill($data)->save();
        Alert::info('You have successfully updated the product detail.');

        return redirect()->route('platform.product.edit', $record->id);
    }

    public function remove(Request $request)
    {
        $record = $this->resolveProductDetailRecord($request);
        $record->delete();
        Alert::info('You have successfully deleted the product detail.');

        return redirect()->route('platform.product.list');
    }

    private function validatedData(Request $request, ?int $ignoreId = null): array
    {
        $validated = $request->validate([
            'product.supplier_id' => ['nullable', 'integer', Rule::exists('poolproject.Supplier', 'id')],
            'product.category_id' => ['nullable', 'integer', Rule::exists('poolproject.ProductCategory', 'id')],
            'product.product_id' => ['required', 'integer', Rule::exists('poolproject.Product', 'id')],
            'product.code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('poolproject.ProductDetail', 'code')->ignore($ignoreId, 'id'),
            ],
            'product.name' => ['required', 'string', 'max:255'],
            'product.slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('poolproject.ProductDetail', 'slug')->ignore($ignoreId, 'id'),
            ],
            'product.short_description' => ['nullable', 'string', 'max:500'],
            'product.description' => ['nullable', 'string'],
            'product.youtube_url' => ['nullable', 'string', 'max:2048'],
            'product.image_url' => ['nullable', 'string', 'max:2048'],
            'product.image_file' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp'],
            'product.gallery_urls' => ['nullable', 'array', 'max:9'],
            'product.gallery_urls.*' => ['nullable', 'string', 'max:2048'],
            'product.gallery_files' => ['nullable', 'array', 'max:9'],
            'product.gallery_files.*' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp'],
            'product.cost_price' => ['nullable', 'numeric', 'min:0'],
            'product.member_price' => ['nullable', 'numeric', 'min:0'],
            'product.retail_price' => ['nullable', 'numeric', 'min:0'],
            'product.pv' => ['nullable', 'numeric', 'min:0'],
            'product.pv_manual_override' => ['nullable'],
            'product.rating_avg' => ['nullable', 'numeric', 'min:0'],
            'product.rating_count' => ['nullable', 'integer', 'min:0'],
            'product.sort_order' => ['nullable', 'integer'],
            'product.pool_rate' => ['nullable', 'numeric', 'min:0'],
            'product.is_new' => ['nullable'],
            'product.is_top' => ['nullable'],
            'product.is_featured' => ['nullable'],
            'product.is_best_seller' => ['nullable'],
            'product.status' => ['required', 'in:ACTIVE,INACTIVE'],
        ]);

        $product = $validated['product'];
        $normalizedYoutubeUrl = $this->normalizeYoutubeUrl($product['youtube_url'] ?? null);
        $resolvedImageUrl = $this->resolveImageUrl($request, $product['image_url'] ?? null);
        $galleryUrls = $this->resolveGalleryImageUrls($request, $product['gallery_urls'] ?? []);
        $imageUrls = $this->mergedImageUrls(
            $resolvedImageUrl,
            $galleryUrls,
            $this->productDetailRecord?->imageUrls ?? []
        );
        $primaryImageUrl = $resolvedImageUrl ?: ($imageUrls[0] ?? null);

        return [
            'productId' => (int) $product['product_id'],
            'code' => $product['code'],
            'name' => $product['name'],
            'slug' => ($product['slug'] ?? '') !== '' ? $product['slug'] : Str::slug($product['name']),
            'shortDescription' => $product['short_description'] ?? null,
            'description' => $product['description'] ?? null,
            'youtubeUrl' => $normalizedYoutubeUrl,
            'primaryImageUrl' => $primaryImageUrl,
            'imageUrls' => $imageUrls,
            'costPriceUsdt' => $this->decimalString($product['cost_price'] ?? 0),
            'memberPriceUsdt' => $this->decimalString($product['member_price'] ?? 0),
            'retailPriceUsdt' => $this->decimalString($product['retail_price'] ?? 0),
            'pv' => $this->decimalString($product['pv'] ?? 0),
            'ratingAvg' => $this->decimalString($product['rating_avg'] ?? 0),
            'ratingCount' => (int) ($product['rating_count'] ?? 0),
            'sortOrder' => (int) ($product['sort_order'] ?? 0),
            'poolRate' => $this->decimalString($product['pool_rate'] ?? 0),
            'isNew' => $this->truthy($product['is_new'] ?? false),
            'isTop' => $this->truthy($product['is_top'] ?? false),
            'isFeatured' => $this->truthy($product['is_featured'] ?? false),
            'isBestSeller' => $this->truthy($product['is_best_seller'] ?? false),
            'status' => $product['status'],
        ];
    }

    private function resolveImageUrl(Request $request, ?string $typedImageUrl): ?string
    {
        if ($request->hasFile('product.image_file')) {
            /** @var UploadedFile $file */
            $file = $request->file('product.image_file');

            return $this->storeBinaryImage(
                file_get_contents($file->getRealPath()) ?: '',
                $file->getMimeType() ?: 'application/octet-stream'
            );
        }

        $url = $this->normalizeStoredImageReference($typedImageUrl);

        if ($url === '') {
            return null;
        }

        if (str_starts_with($url, 'data:image/')) {
            return $this->storeDataUrlImage($url);
        }

        return $url;
    }

    private function resolveGalleryImageUrls(Request $request, array $typedGalleryUrls): array
    {
        $resolvedUrls = [];

        foreach ($typedGalleryUrls as $value) {
            $normalized = $this->normalizeStoredImageReference(is_string($value) ? $value : null);

            if ($normalized === '') {
                continue;
            }

            $resolvedUrls[] = str_starts_with($normalized, 'data:image/')
                ? $this->storeDataUrlImage($normalized)
                : $normalized;
        }

        $files = $request->file('product.gallery_files', []);

        if (is_array($files)) {
            foreach ($files as $file) {
                if (!$file instanceof UploadedFile) {
                    continue;
                }

                $resolvedUrls[] = $this->storeBinaryImage(
                    file_get_contents($file->getRealPath()) ?: '',
                    $file->getMimeType() ?: 'application/octet-stream'
                );
            }
        }

        return array_values(array_filter(array_unique(array_filter($resolvedUrls))));
    }

    private function mergedImageUrls(?string $primaryImageUrl, array $galleryImageUrls, array $existingImageUrls): array
    {
        $urls = array_values(array_filter(array_map(
            static fn ($value) => is_string($value) ? trim($value) : null,
            $existingImageUrls
        )));

        foreach ($galleryImageUrls as $galleryImageUrl) {
            if (!is_string($galleryImageUrl) || trim($galleryImageUrl) === '') {
                continue;
            }

            $urls = array_values(array_filter($urls, static fn ($value) => $value !== $galleryImageUrl));
            $urls[] = $galleryImageUrl;
        }

        if (is_string($primaryImageUrl) && $primaryImageUrl !== '') {
            $urls = array_values(array_filter($urls, static fn ($value) => $value !== $primaryImageUrl));
            array_unshift($urls, $primaryImageUrl);
        }

        $urls = array_values(array_unique(array_filter($urls)));

        return array_slice($urls, 0, 10);
    }

    private function storeDataUrlImage(string $dataUrl): ?string
    {
        if (!preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/', $dataUrl, $matches)) {
            return null;
        }

        $mime = $matches[1];
        $binary = base64_decode($matches[2], true);
        if ($binary === false) {
            return null;
        }

        return $this->storeBinaryImage($binary, $mime);
    }

    private function storeBinaryImage(string $binary, string $mime): ?string
    {
        if ($binary === '') {
            return null;
        }

        $extension = match ($mime) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'image/svg+xml' => 'svg',
            default => 'bin',
        };

        $filename = 'products/' . Str::uuid()->toString() . '.' . $extension;
        Storage::disk('public')->put($filename, $binary);

        return $filename;
    }

    private function normalizeStoredImageReference(?string $value): string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return '';
        }

        if (str_starts_with($value, 'data:image/')) {
            return $value;
        }

        if (str_starts_with($value, '/storage/')) {
            return ltrim(substr($value, 9), '/');
        }

        $parts = parse_url($value);
        $path = $parts['path'] ?? null;

        if (is_string($path) && str_starts_with($path, '/storage/')) {
            return ltrim(substr($path, 9), '/');
        }

        return $value;
    }

    private function publicImageUrl(?string $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://') || str_starts_with($value, 'data:image/')) {
            return $value;
        }

        return asset('storage/' . ltrim($value, '/'));
    }

    private function youtubeEmbedUrl(?string $url): ?string
    {
        $url = $this->normalizeYoutubeUrl($url);
        if ($url === null) {
            return null;
        }

        $parts = parse_url($url);
        $query = [];
        parse_str($parts['query'] ?? '', $query);
        $videoId = $query['v'] ?? '';

        if ($videoId === '') {
            return null;
        }

        return 'https://www.youtube.com/embed/' . $videoId . '?autoplay=1&mute=1&rel=0&playsinline=1';
    }

    private function normalizeYoutubeUrl(?string $url): ?string
    {
        $url = trim((string) $url);
        if ($url === '') {
            return null;
        }

        $parts = parse_url($url);
        $host = strtolower($parts['host'] ?? '');

        if (str_contains($host, 'youtu.be')) {
            $videoId = trim((string) ($parts['path'] ?? ''), '/');
        } else {
            parse_str($parts['query'] ?? '', $query);
            $videoId = $query['v'] ?? '';

            if ($videoId === '' && str_contains($host, 'youtube.com')) {
                $path = trim((string) ($parts['path'] ?? ''), '/');
                if (str_starts_with($path, 'embed/')) {
                    $videoId = substr($path, 6);
                } elseif (str_starts_with($path, 'shorts/')) {
                    $videoId = substr($path, 7);
                }
            }
        }

        if ($videoId === '') {
            return null;
        }

        return 'https://www.youtube.com/watch?v=' . $videoId;
    }

    private function truthy(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    private function resolveProductDetailRecord(Request $request): ProductDetailRecord
    {
        $record = $this->findProductDetailRecord($request);

        abort_if($record === null, 404, 'Product detail not found.');

        return $record;
    }

    private function findProductDetailRecord(Request $request): ?ProductDetailRecord
    {
        if ($this->productDetailRecord?->exists) {
            return $this->productDetailRecord;
        }

        $productDetailId = (int) ($request->route('product') ?? 0);

        if ($productDetailId <= 0) {
            return null;
        }

        return ProductDetailRecord::query()->find($productDetailId);
    }

    private function catalogSnapshot(int $productId): ?Product
    {
        if ($productId <= 0) {
            return null;
        }

        return Product::query()
            ->where('id', $productId)
            ->orderByDesc('updated_at')
            ->first();
    }

    private function matchedCatalogMetadata(?Product $product): array
    {
        if ($product === null) {
            return [
                'supplier_id' => null,
                'category_id' => null,
            ];
        }

        $supplier = Supplier::query()
            ->where('code', (string) ($product->supplier_code ?? ''))
            ->orWhere('name', (string) ($product->supplier_name ?? ''))
            ->first();

        if (!$supplier instanceof Supplier) {
            return [
                'supplier_id' => null,
                'category_id' => null,
            ];
        }

        $category = Category::query()
            ->where('supplierId', $supplier->id)
            ->where(function ($query) use ($product) {
                $query->where('code', (string) ($product->category_code ?? ''))
                    ->orWhere('name', (string) ($product->category_name ?? ''));
            })
            ->first();

        return [
            'supplier_id' => $supplier->id,
            'category_id' => $category?->id,
        ];
    }

    private function initialGalleryUrls(): array
    {
        $primaryImageUrl = trim((string) ($this->productDetailRecord->primaryImageUrl ?? ''));
        $urls = array_values(array_filter(
            $this->productDetailRecord->imageUrls ?? [],
            static fn ($value) => is_string($value) && trim($value) !== '' && trim($value) !== $primaryImageUrl
        ));

        return array_slice($urls, 0, 9);
    }

    private function defaultPvValue(mixed $memberPrice, mixed $costPrice): string
    {
        $member = (float) $memberPrice;
        $cost = (float) $costPrice;
        $pv = max(0, ($member - $cost) * 0.8);

        return $this->decimalString($pv);
    }

    private function pvMatchesFormula(?string $pv, string $formula): bool
    {
        if ($pv === null || trim($pv) === '') {
            return false;
        }

        return abs(((float) $pv) - ((float) $formula)) < 0.00000001;
    }

    private function boolAsFormValue(bool $value): string
    {
        return $value ? '1' : '0';
    }

    private function decimalString(mixed $value): string
    {
        return number_format((float) $value, 8, '.', '');
    }
}
