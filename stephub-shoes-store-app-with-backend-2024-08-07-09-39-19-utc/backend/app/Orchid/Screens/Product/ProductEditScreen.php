<?php

namespace App\Orchid\Screens\Product;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductDetailRecord;
use App\Models\ProductRecord;
use App\Models\Supplier;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class ProductEditScreen extends Screen
{
    private const RATE_DB_MAX = '99.99999999';
    private const IMAGE_MAX_DIMENSION = 1600;
    private const IMAGE_JPEG_QUALITY = 82;

    public $product;

    private ?ProductDetailRecord $productDetailRecord = null;

    private array $productOptions = [];

    private array $productMetadata = [];

    private array $supplierOptions = [];

    private array $categoryOptions = [];

    public function query(Request $request): iterable
    {
        $firmCategory = Category::ensurePermanentFirmCategory();
        $this->productDetailRecord = $this->findProductDetailRecord($request) ?? new ProductDetailRecord();
        $selectedProductId = (int) old('product.product_id', $this->productDetailRecord->productId ?? $request->query('product_id', 0));
        $selectedProductSnapshot = $this->catalogSnapshot($selectedProductId);
        $selectedProductMeta = $this->matchedCatalogMetadata($selectedProductSnapshot);
        $selectedSupplierId = (int) old('product.supplier_id', $selectedProductMeta['supplier_id'] ?? 0);
        $selectedCategoryId = (int) old('product.category_id', $selectedProductMeta['category_id'] ?? 0);

        $this->product = $selectedProductSnapshot;

        $productRecords = ProductRecord::query()
            ->with(['supplier', 'category'])
            ->orderBy('name')
            ->get(['id', 'supplierId', 'categoryId', 'code', 'name']);

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
                    'sku_prefix' => $this->categorySkuPrefix($category),
                    'next_detail_code' => $this->nextDetailCodeForCategory((int) $category->id),
                ],
            ])
            ->all();

        $this->productMetadata = $productRecords
            ->mapWithKeys(function (ProductRecord $record) use ($snapshotByProductId) {
                $snapshot = $snapshotByProductId->get($record->id);
                $supplier = $record->supplier;
                $category = $record->category;

                return [
                    $record->id => [
                        'product_code' => $record->code ?? ($snapshot->product_code ?? ''),
                        'product_name' => $record->name ?? ($snapshot->product_name ?? ''),
                        'category_name' => $category?->name ?? ($snapshot->category_name ?? ''),
                        'category_code' => $category?->code ?? ($snapshot->category_code ?? ''),
                        'supplier_name' => $supplier?->name ?? ($snapshot->supplier_name ?? ''),
                        'supplier_code' => $supplier?->code ?? ($snapshot->supplier_code ?? ''),
                        'supplier_id' => $record->supplierId ?: $supplier?->id,
                        'category_id' => $record->categoryId ?: $category?->id,
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
            'image_urls' => $this->productDetailRecord->imageUrls ?? [],
            'home_card_image_url' => old('product.home_card_image_url', $this->productDetailRecord->homeCardImageUrl ?? ''),
            'cost_price' => old('product.cost_price', (string) ($this->productDetailRecord->costPriceUsdt ?? '0')),
            'member_price' => old('product.member_price', (string) ($this->productDetailRecord->memberPriceUsdt ?? ($this->product->price ?? '0'))),
            'retail_price' => old('product.retail_price', (string) ($this->productDetailRecord->retailPriceUsdt ?? ($this->product->old_price ?? '0'))),
            'rating_avg' => old('product.rating_avg', (string) ($this->productDetailRecord->ratingAvg ?? '0')),
            'rating_count' => old('product.rating_count', (string) ($this->productDetailRecord->ratingCount ?? '0')),
            'sort_order' => old('product.sort_order', (string) ($this->productDetailRecord->sortOrder ?? '0')),
            'pool_rate' => old('product.pool_rate', (string) ($this->productDetailRecord->poolRate ?? '0')),
            'active_days' => old('product.active_days', (string) ($this->productDetailRecord->activeDays ?? '30')),
            'earning_cap_amount' => old(
                'product.earning_cap_amount',
                (string) ($this->productDetailRecord->earningCapAmount ?? ($this->productDetailRecord->memberPriceUsdt ?? '0'))
            ),
            'dcw_spend_enabled' => old('product.dcw_spend_enabled', $this->boolAsFormValue($this->productDetailRecord->dcwSpendEnabled ?? false)),
            'dcw_reward_rate' => old(
                'product.dcw_reward_rate',
                (string) ($this->productDetailRecord->dcwCashRewardRate ?? $this->productDetailRecord->dcwShoppingRewardRate ?? '0')
            ),
            'is_new' => old('product.is_new', $this->boolAsFormValue($this->productDetailRecord->isNew ?? ($this->product->is_new ?? false))),
            'is_top' => old('product.is_top', $this->boolAsFormValue($this->productDetailRecord->isTop ?? ($this->product->is_top ?? false))),
            'is_featured' => old('product.is_featured', $this->boolAsFormValue($this->productDetailRecord->isFeatured ?? ($this->product->is_featured ?? false))),
            'is_best_seller' => old('product.is_best_seller', $this->boolAsFormValue($this->productDetailRecord->isBestSeller ?? ($this->product->is_best_seller ?? false))),
            'status' => old('product.status', $this->productDetailRecord->status ?? ($this->product->status ?? 'ACTIVE')),
            'product_name' => $this->product->product_name ?? ($this->productMetadata[$selectedProductId]['product_name'] ?? ''),
            'product_code' => $this->product->product_code ?? ($this->productMetadata[$selectedProductId]['product_code'] ?? ''),
            'category_name' => $this->product->category_name ?? ($this->productMetadata[$selectedProductId]['category_name'] ?? ''),
            'category_code' => $this->product->category_code ?? ($this->productMetadata[$selectedProductId]['category_code'] ?? ''),
            'supplier_name' => $this->product->supplier_name ?? ($this->productMetadata[$selectedProductId]['supplier_name'] ?? ''),
            'supplier_code' => $this->product->supplier_code ?? ($this->productMetadata[$selectedProductId]['supplier_code'] ?? ''),
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
        $defaultDcwUsage = $this->defaultDcwUsageValue($formProduct['member_price'], $formProduct['cost_price']);
        $storedDcwUsage = $this->productDetailRecord->exists
            ? (string) $this->productDetailRecord->dcwUsageAmount
            : null;
        $dcwUsageValue = old('product.dcw_usage_amount', $storedDcwUsage ?? $defaultDcwUsage);
        $dcwManualOverride = old(
            'product.dcw_usage_manual_override',
            $this->productDetailRecord->exists && ($this->productDetailRecord->dcwUsageAmountOverridden ?? false) ? '1' : '0'
        );

        $formProduct['dcw_usage_formula'] = $defaultDcwUsage;
        $formProduct['dcw_usage_amount'] = (string) $dcwUsageValue;
        $formProduct['dcw_usage_manual_override'] = (string) $dcwManualOverride;
        $formProduct['firm_enabled'] = old(
            'product.firm_enabled',
            $this->boolAsFormValue($this->productDetailRecord->firmEnabled ?? false)
        );
        $formProduct['firm_amount_paid'] = old(
            'product.firm_amount_paid',
            (string) ($this->productDetailRecord->memberPriceUsdt ?? ($this->product->price ?? '0'))
        );
        $formProduct['firm_dcw_reward_amount'] = old(
            'product.firm_dcw_reward_amount',
            (string) ($this->productDetailRecord->firmDcwRewardAmount ?? '0')
        );
        $formProduct['firm_cost_guard_passed'] = $this->boolAsFormValue(
            $this->passesFirmCostGuard($formProduct['member_price'], $formProduct['cost_price'])
        );
        $formProduct['firm_category_id'] = (string) $firmCategory->id;

        return [
            'product' => $formProduct,
            'productOptions' => $this->productOptions,
            'productMetadata' => $this->productMetadata,
            'supplierOptions' => $this->supplierOptions,
            'categoryOptions' => $categoryMetadata,
            'youtubeEmbedUrl' => $this->youtubeEmbedUrl($formProduct['youtube_url']),
            'imagePreviewUrl' => $this->publicImageUrl($this->productDetailRecord->primaryImageUrl ?? ($this->product->image ?? null)),
            'homeCardImagePreviewUrl' => $this->publicImageUrl($this->productDetailRecord->homeCardImageUrl ?? null),
        ];
    }

    public function name(): ?string
    {
        return $this->productDetailRecord?->exists ? 'Edit SKU / Product Detail' : 'Create SKU / Product Detail';
    }

    public function commandBar(): iterable
    {
        return [
            Button::make('Create SKU')
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
                ->confirm('Are you sure you want to delete this SKU / product detail?'),
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
        $this->saveProductDetailRecord($record, $data);

        Alert::info('You have successfully created the SKU / product detail.');

        return redirect()->route('platform.product.edit', $record->id);
    }

    public function update(Request $request)
    {
        $record = $this->resolveProductDetailRecord($request);
        $this->productDetailRecord = $record;
        $data = $this->validatedData($request, (int) $record->id);

        $this->saveProductDetailRecord($record, $data);
        Alert::info('You have successfully updated the SKU / product detail.');

        return redirect()->route('platform.product.edit', $record->id);
    }

    public function remove(Request $request)
    {
        $record = $this->resolveProductDetailRecord($request);
        $record->delete();
        Alert::info('You have successfully deleted the SKU / product detail.');

        return redirect()->route('platform.product.list');
    }

    private function validatedData(Request $request, ?int $ignoreId = null): array
    {
        $validated = $request->validate([
            'product.supplier_id' => ['nullable', 'integer', Rule::exists('poolproject.Supplier', 'id')],
            'product.category_id' => ['nullable', 'integer', Rule::exists('poolproject.ProductCategory', 'id')],
            'product.product_id' => ['nullable', 'integer', Rule::exists('poolproject.Product', 'id')],
            'product.product_family_code' => ['nullable', 'string', 'max:50'],
            'product.product_family_name' => ['nullable', 'string', 'max:255'],
            'product.code' => [
                'nullable',
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
            'product.gallery_files' => ['nullable', 'array', 'max:10'],
            'product.gallery_files.*' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp'],
            'product.home_card_file' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp'],
            'product.cost_price' => ['nullable', 'numeric', 'min:0'],
            'product.member_price' => ['nullable', 'numeric', 'min:0'],
            'product.retail_price' => ['nullable', 'numeric', 'min:0'],
            'product.pv' => ['nullable', 'numeric', 'min:0'],
            'product.pv_manual_override' => ['nullable'],
            'product.rating_avg' => ['nullable', 'numeric', 'min:0'],
            'product.rating_count' => ['nullable', 'integer', 'min:0'],
            'product.sort_order' => ['nullable', 'integer'],
            'product.pool_rate' => ['nullable', 'numeric', 'min:0', 'lte:100'],
            'product.active_days' => ['required', 'integer', 'min:1'],
            'product.earning_cap_amount' => ['required', 'numeric', 'min:0'],
            'product.dcw_spend_enabled' => ['nullable'],
            'product.dcw_usage_amount' => ['nullable', 'numeric', 'min:0'],
            'product.dcw_usage_manual_override' => ['nullable'],
            'product.dcw_reward_rate' => ['nullable', 'numeric', 'min:0', 'lte:100'],
            'product.firm_enabled' => ['nullable'],
            'product.firm_amount_paid' => ['nullable', 'numeric', 'min:0'],
            'product.firm_dcw_reward_amount' => ['nullable', 'numeric', 'min:0'],
            'product.is_new' => ['nullable'],
            'product.is_top' => ['nullable'],
            'product.is_featured' => ['nullable'],
            'product.is_best_seller' => ['nullable'],
            'product.status' => ['required', 'in:ACTIVE,INACTIVE'],
        ], [
            'product.code.required' => 'Please enter an SKU code.',
            'product.code.unique' => 'This SKU code already exists. Please use a different code.',
            'product.pool_rate.lte' => 'Pool rate must be 100 or less.',
            'product.dcw_reward_rate.lte' => 'DCW reward rate must be 100 or less.',
        ]);

        $product = $validated['product'];
        $this->assertRateFitsDatabase($product['pool_rate'] ?? 0, 'product.pool_rate', 'Pool rate');
        $this->assertRateFitsDatabase($product['dcw_reward_rate'] ?? 0, 'product.dcw_reward_rate', 'DCW reward rate');
        $firmCategory = Category::ensurePermanentFirmCategory();
        $firmEnabled = $this->truthy($product['firm_enabled'] ?? false);

        if ($firmEnabled) {
            $product['supplier_id'] = (int) $firmCategory->supplierId;
            $product['category_id'] = (int) $firmCategory->id;
            $product['member_price'] = $product['firm_amount_paid'] ?? $product['member_price'] ?? 0;
            $product['cost_price'] = 0;
            $product['retail_price'] = $product['member_price'];
            $product['pv'] = 0;
            $product['pool_rate'] = 0;
            $product['active_days'] = 1;
            $product['earning_cap_amount'] = $product['member_price'];
            $product['dcw_spend_enabled'] = false;
            $product['dcw_usage_amount'] = 0;
            $product['dcw_usage_manual_override'] = false;
            $product['dcw_reward_rate'] = 0;
        }

        $productId = $this->resolveProductId($product);

        if ($firmEnabled) {
            $productRecord = ProductRecord::query()->find($productId);
            if (
                !$productRecord instanceof ProductRecord ||
                (int) $productRecord->categoryId !== (int) $firmCategory->id
            ) {
                throw ValidationException::withMessages([
                    'product.product_id' => 'Firm products must use a product family inside the Firm catalog. Please select or create a family under Firm catalog.',
                ]);
            }
        }

        $resolvedDetailCode = $this->resolveDetailCode($product, $ignoreId);
        $normalizedYoutubeUrl = $this->normalizeYoutubeUrl($product['youtube_url'] ?? null);
        $uploadedImageUrls = $this->resolveGalleryImageUrls($request);
        $imageUrls = $this->mergeUploadedImageUrls(
            $uploadedImageUrls,
            $this->productDetailRecord?->imageUrls ?? []
        );
        $primaryImageUrl = $imageUrls[0] ?? null;
        $homeCardImageUrl = $this->resolveHomeCardImageUrl(
            $request,
            $this->productDetailRecord?->homeCardImageUrl
        );

        return [
            'productId' => $productId,
            'code' => $resolvedDetailCode,
            'name' => $product['name'],
            'slug' => ($product['slug'] ?? '') !== '' ? $product['slug'] : Str::slug($product['name']),
            'shortDescription' => $product['short_description'] ?? null,
            'description' => $product['description'] ?? null,
            'youtubeUrl' => $normalizedYoutubeUrl,
            'primaryImageUrl' => $primaryImageUrl,
            'homeCardImageUrl' => $homeCardImageUrl,
            'imageUrls' => $imageUrls,
            'costPriceUsdt' => $this->decimalString($product['cost_price'] ?? 0),
            'memberPriceUsdt' => $this->decimalString($product['member_price'] ?? 0),
            'retailPriceUsdt' => $this->decimalString($product['retail_price'] ?? 0),
            'pv' => $this->decimalString($product['pv'] ?? 0),
            'ratingAvg' => $this->decimalString($product['rating_avg'] ?? 0),
            'ratingCount' => (int) ($product['rating_count'] ?? 0),
            'sortOrder' => (int) ($product['sort_order'] ?? 0),
            'poolRate' => $this->decimalString($product['pool_rate'] ?? 0),
            'activeDays' => (int) ($product['active_days'] ?? 30),
            'earningCapAmount' => $this->decimalString(
                $product['earning_cap_amount'] ?? ($product['member_price'] ?? 0)
            ),
            'firmEnabled' => $firmEnabled,
            'firmDcwRewardAmount' => $this->decimalString($product['firm_dcw_reward_amount'] ?? 0),
            'dcwSpendEnabled' => $this->truthy($product['dcw_spend_enabled'] ?? false),
            'dcwUsageAmount' => $this->wholeNumberString(
                $this->truthy($product['dcw_usage_manual_override'] ?? false)
                    ? ($product['dcw_usage_amount'] ?? 0)
                    : $this->defaultDcwUsageValue($product['member_price'] ?? 0, $product['cost_price'] ?? 0)
            ),
            'dcwUsageAmountOverridden' => $this->truthy($product['dcw_usage_manual_override'] ?? false),
            'dcwCashRewardRate' => $this->decimalString($product['dcw_reward_rate'] ?? 0),
            'dcwShoppingRewardRate' => $this->decimalString($product['dcw_reward_rate'] ?? 0),
            'isNew' => $this->truthy($product['is_new'] ?? false),
            'isTop' => $this->truthy($product['is_top'] ?? false),
            'isFeatured' => $this->truthy($product['is_featured'] ?? false),
            'isBestSeller' => $this->truthy($product['is_best_seller'] ?? false),
            'status' => $product['status'],
        ];
    }

    private function resolveProductId(array $product): int
    {
        $existingProductId = (int) ($product['product_id'] ?? 0);

        if ($existingProductId > 0) {
            return $existingProductId;
        }

        $supplierId = (int) ($product['supplier_id'] ?? 0);
        $categoryId = (int) ($product['category_id'] ?? 0);
        $familyCode = Str::upper(trim((string) ($product['product_family_code'] ?? '')));
        $familyName = trim((string) ($product['product_family_name'] ?? ''));

        if ($supplierId <= 0) {
            throw ValidationException::withMessages([
                'product.supplier_id' => 'Please select a supplier before creating a new product family.',
            ]);
        }

        if ($categoryId <= 0) {
            throw ValidationException::withMessages([
                'product.category_id' => 'Please select a category before creating a new product family.',
            ]);
        }

        if ($familyCode === '') {
            throw ValidationException::withMessages([
                'product.product_family_code' => 'Please enter a product family code.',
            ]);
        }

        if ($familyName === '') {
            throw ValidationException::withMessages([
                'product.product_family_name' => 'Please enter a product family name.',
            ]);
        }

        $category = Category::query()->find($categoryId);
        if (!$category instanceof Category || (int) $category->supplierId !== $supplierId) {
            throw ValidationException::withMessages([
                'product.category_id' => 'Selected category does not belong to the selected supplier.',
            ]);
        }

        $existingProduct = ProductRecord::query()
            ->where('code', $familyCode)
            ->first();

        if ($existingProduct instanceof ProductRecord) {
            throw ValidationException::withMessages([
                'product.product_family_code' => 'This product family code already exists. Please select it from the list instead.',
            ]);
        }

        $record = new ProductRecord();
        $record->supplierId = $supplierId;
        $record->categoryId = $categoryId;
        $record->code = $familyCode;
        $record->name = $familyName;
        $record->slug = Str::slug($familyName);
        $record->description = null;
        $record->sortOrder = 0;
        $record->isFeatured = false;
        $record->status = 'ACTIVE';
        $record->save();

        return (int) $record->id;
    }

    private function resolveDetailCode(array $product, ?int $ignoreId = null): string
    {
        $typedCode = Str::upper(trim((string) ($product['code'] ?? '')));

        if ($typedCode !== '') {
            return $typedCode;
        }

        $categoryId = (int) ($product['category_id'] ?? 0);
        if ($categoryId <= 0) {
            throw ValidationException::withMessages([
                'product.code' => 'Please enter a detail code or select a category so the SKU can be generated automatically.',
            ]);
        }

        return $this->nextDetailCodeForCategory($categoryId, $ignoreId);
    }

    private function categorySkuPrefix(Category $category): string
    {
        $raw = Str::upper(preg_replace('/[^A-Za-z0-9]+/', '', (string) ($category->code ?: $category->name)) ?? '');

        return Str::substr($raw !== '' ? $raw : 'SKU', 0, 3);
    }

    private function nextDetailCodeForCategory(int $categoryId, ?int $ignoreId = null): string
    {
        $category = Category::query()->find($categoryId);
        if (!$category instanceof Category) {
            return '';
        }

        $prefix = $this->categorySkuPrefix($category);
        $codes = DB::connection('poolproject')
            ->table('ProductDetail as pd')
            ->join('Product as p', 'p.id', '=', 'pd.productId')
            ->where('p.categoryId', $categoryId)
            ->when($ignoreId !== null, fn ($query) => $query->where('pd.id', '!=', $ignoreId))
            ->pluck('pd.code');

        $maxSequence = 0;

        foreach ($codes as $code) {
            $normalized = Str::upper(trim((string) $code));
            if (!str_starts_with($normalized, $prefix)) {
                continue;
            }

            $suffix = substr($normalized, strlen($prefix));
            if ($suffix === '' || !ctype_digit($suffix)) {
                continue;
            }

            $maxSequence = max($maxSequence, (int) $suffix);
        }

        return sprintf('%s%03d', $prefix, $maxSequence + 1);
    }

    private function resolveGalleryImageUrls(Request $request): array
    {
        $resolvedUrls = [];

        $files = $request->file('product.gallery_files', []);

        if (is_array($files)) {
            foreach ($files as $file) {
                if (!$file instanceof UploadedFile) {
                    continue;
                }

                $resolvedUrls[] = $this->storeBinaryImage(
                    $this->prepareUploadedImageBinary($file),
                    $file->getMimeType() ?: 'application/octet-stream'
                );
            }
        }

        return array_values(array_filter(array_unique(array_filter($resolvedUrls))));
    }

    private function mergeUploadedImageUrls(array $uploadedImageUrls, array $existingImageUrls): array
    {
        $existingUrls = array_values(array_filter(array_map(
            static fn ($value) => is_string($value) ? trim($value) : null,
            $existingImageUrls
        )));

        if ($uploadedImageUrls === []) {
            return array_slice(array_values(array_unique(array_filter($existingUrls))), 0, 10);
        }

        $urls = array_merge($uploadedImageUrls, $existingUrls);
        $urls = array_values(array_unique(array_filter($urls)));

        return array_slice($urls, 0, 10);
    }

    private function resolveHomeCardImageUrl(Request $request, ?string $existingImageUrl): ?string
    {
        $file = $request->file('product.home_card_file');

        if (!$file instanceof UploadedFile) {
            return $existingImageUrl ? $this->normalizeStoredImageReference($existingImageUrl) : null;
        }

        return $this->storeBinaryImage(
            $this->prepareUploadedImageBinary($file),
            $file->getMimeType() ?: 'application/octet-stream'
        );
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

    private function prepareUploadedImageBinary(UploadedFile $file): string
    {
        $binary = file_get_contents($file->getRealPath()) ?: '';

        if ($binary === '') {
            return '';
        }

        return $this->resizeImageBinaryIfNeeded($binary, $file->getMimeType() ?: 'application/octet-stream');
    }

    private function resizeImageBinaryIfNeeded(string $binary, string $mime): string
    {
        if (!function_exists('gd_info')) {
            return $binary;
        }

        $source = match ($mime) {
            'image/jpeg', 'image/jpg' => @imagecreatefromstring($binary) ?: null,
            'image/png' => @imagecreatefromstring($binary) ?: null,
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromstring($binary) ?: null : null,
            default => null,
        };

        if ($source === null) {
            return $binary;
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $needsResize = $width > self::IMAGE_MAX_DIMENSION || $height > self::IMAGE_MAX_DIMENSION;

        if (!$needsResize) {
            imagedestroy($source);

            return $binary;
        }

        $scale = min(self::IMAGE_MAX_DIMENSION / max($width, 1), self::IMAGE_MAX_DIMENSION / max($height, 1));
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));

        $target = imagecreatetruecolor($targetWidth, $targetHeight);
        if ($target === false) {
            imagedestroy($source);

            return $binary;
        }

        if ($mime === 'image/png' || $mime === 'image/webp') {
            imagealphablending($target, false);
            imagesavealpha($target, true);
            $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
            imagefilledrectangle($target, 0, 0, $targetWidth, $targetHeight, $transparent);
        }

        imagecopyresampled($target, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        ob_start();
        $encoded = match ($mime) {
            'image/png' => imagepng($target),
            'image/webp' => function_exists('imagewebp') ? imagewebp($target, null, self::IMAGE_JPEG_QUALITY) : imagejpeg($target, null, self::IMAGE_JPEG_QUALITY),
            default => imagejpeg($target, null, self::IMAGE_JPEG_QUALITY),
        };
        $resizedBinary = (string) ob_get_clean();

        imagedestroy($target);
        imagedestroy($source);

        if ($encoded !== true || $resizedBinary === '') {
            return $binary;
        }

        return $resizedBinary;
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

        abort_if($record === null, 404, 'SKU / product detail not found.');

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

    private function defaultDcwUsageValue(mixed $memberPrice, mixed $costPrice): string
    {
        $member = (float) $memberPrice;
        $cost = (float) $costPrice;
        $dcw = floor(max(0, $member - ($cost * 0.7)));

        return $this->wholeNumberString($dcw);
    }

    private function wholeNumberString(mixed $value): string
    {
        return (string) max(0, (int) floor((float) $value));
    }

    private function boolAsFormValue(bool $value): string
    {
        return $value ? '1' : '0';
    }

    private function passesFirmCostGuard(mixed $memberPrice, mixed $costPrice): bool
    {
        $member = (float) $memberPrice;
        $cost = (float) $costPrice;

        if ($member <= 0) {
            return false;
        }

        return $cost <= ($member * 0.3);
    }

    private function saveProductDetailRecord(ProductDetailRecord $record, array $data): void
    {
        try {
            $record->fill($data)->save();
        } catch (QueryException $exception) {
            if ($this->isNumericOverflowException($exception)) {
                throw ValidationException::withMessages([
                    'product.pool_rate' => 'Pool rate และ DCW reward rate ต้องน้อยกว่า 100. ถ้ากรอกเป็นเปอร์เซ็นต์เต็ม เช่น 250% ให้กรอกเป็น 2.5 แทน',
                    'product.dcw_reward_rate' => 'Pool rate และ DCW reward rate ต้องน้อยกว่า 100. ถ้ากรอกเป็นเปอร์เซ็นต์เต็ม เช่น 250% ให้กรอกเป็น 2.5 แทน',
                ]);
            }

            throw $exception;
        }
    }

    private function isNumericOverflowException(QueryException $exception): bool
    {
        $message = $exception->getMessage();

        return str_contains($message, 'SQLSTATE[22003]')
            || str_contains($message, 'numeric field overflow')
            || str_contains($message, 'Numeric value out of range');
    }

    private function assertRateFitsDatabase(mixed $value, string $field, string $label): void
    {
        if ((float) $value <= 100) {
            return;
        }

        throw ValidationException::withMessages([
            $field => sprintf('%s must be %s or less. If you mean a percentage, enter 2.5 for 2.5%%.', $label, self::RATE_DB_MAX),
        ]);
    }

    private function decimalString(mixed $value): string
    {
        return number_format((float) $value, 8, '.', '');
    }
}
