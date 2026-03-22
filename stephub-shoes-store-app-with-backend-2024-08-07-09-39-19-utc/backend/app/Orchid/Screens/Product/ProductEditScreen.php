<?php

namespace App\Orchid\Screens\Product;

use App\Models\Product;
use App\Models\ProductDetailRecord;
use App\Models\ProductRecord;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use Orchid\Screen\Actions\Button;
use Orchid\Screen\Screen;
use Orchid\Support\Facades\Alert;
use Orchid\Support\Facades\Layout;

class ProductEditScreen extends Screen
{
    public $product;

    private ?ProductDetailRecord $productDetailRecord = null;

    private array $productOptions = [];

    public function query(Request $request): iterable
    {
        $this->productDetailRecord = $this->findProductDetailRecord($request) ?? new ProductDetailRecord();
        $selectedProductId = (int) old(
            'product.product_id',
            $this->productDetailRecord->productId ?? $request->query('product_id', 0)
        );
        $this->product = $this->catalogSnapshot($selectedProductId);

        $productFamily = $selectedProductId > 0
            ? ProductRecord::query()->find($selectedProductId)
            : null;

        $this->productOptions = ProductRecord::query()
            ->orderBy('name')
            ->get(['id', 'code', 'name'])
            ->mapWithKeys(fn (ProductRecord $record) => [
                $record->id => trim($record->code . ' • ' . $record->name),
            ])
            ->all();

        $formProduct = [
            'id' => $this->productDetailRecord->id,
            'product_id' => $selectedProductId ?: null,
            'code' => old('product.code', $this->productDetailRecord->code ?? ''),
            'name' => old('product.name', $this->productDetailRecord->name ?? ''),
            'slug' => old('product.slug', $this->productDetailRecord->slug ?? ''),
            'short_description' => old('product.short_description', $this->productDetailRecord->shortDescription ?? ''),
            'description' => old('product.description', $this->productDetailRecord->description ?? ''),
            'youtube_url' => old('product.youtube_url', $this->productDetailRecord->youtubeUrl ?? ($this->product->youtube_url ?? '')),
            'image_url' => old('product.image_url', $this->productDetailRecord->primaryImageUrl ?? ($this->product->image ?? '')),
            'cost_price' => old('product.cost_price', (string) ($this->productDetailRecord->costPriceUsdt ?? '0')),
            'member_price' => old('product.member_price', (string) ($this->productDetailRecord->memberPriceUsdt ?? ($this->product->price ?? '0'))),
            'retail_price' => old('product.retail_price', (string) ($this->productDetailRecord->retailPriceUsdt ?? ($this->product->old_price ?? '0'))),
            'pv' => old('product.pv', (string) ($this->productDetailRecord->pv ?? ($this->product->pv ?? '0'))),
            'rating_avg' => old('product.rating_avg', (string) ($this->productDetailRecord->ratingAvg ?? '0')),
            'rating_count' => old('product.rating_count', (string) ($this->productDetailRecord->ratingCount ?? '0')),
            'sort_order' => old('product.sort_order', (string) ($this->productDetailRecord->sortOrder ?? '0')),
            'pool_rate' => old('product.pool_rate', (string) ($this->productDetailRecord->poolRate ?? '0')),
            'is_new' => old('product.is_new', $this->boolAsFormValue($this->productDetailRecord->isNew ?? ($this->product->is_new ?? false))),
            'is_top' => old('product.is_top', $this->boolAsFormValue($this->productDetailRecord->isTop ?? ($this->product->is_top ?? false))),
            'is_featured' => old('product.is_featured', $this->boolAsFormValue($this->productDetailRecord->isFeatured ?? ($this->product->is_featured ?? false))),
            'is_best_seller' => old('product.is_best_seller', $this->boolAsFormValue($this->productDetailRecord->isBestSeller ?? ($this->product->is_best_seller ?? false))),
            'status' => old('product.status', $this->productDetailRecord->status ?? ($this->product->status ?? 'ACTIVE')),
            'product_name' => $this->product->product_name ?? ($productFamily->name ?? ''),
            'product_code' => $this->product->product_code ?? ($productFamily->code ?? ''),
            'category_name' => $this->product->category_name ?? '',
            'category_code' => $this->product->category_code ?? '',
            'supplier_name' => $this->product->supplier_name ?? '',
            'supplier_code' => $this->product->supplier_code ?? '',
        ];

        return [
            'product' => $formProduct,
            'productOptions' => $this->productOptions,
            'youtubeEmbedUrl' => $this->youtubeEmbedUrl($formProduct['youtube_url']),
            'imagePreviewUrl' => $formProduct['image_url'],
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
            'product.image_url' => ['nullable', 'string', 'max:10000000'],
            'product.image_file' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp'],
            'product.cost_price' => ['nullable', 'numeric', 'min:0'],
            'product.member_price' => ['nullable', 'numeric', 'min:0'],
            'product.retail_price' => ['nullable', 'numeric', 'min:0'],
            'product.pv' => ['nullable', 'numeric', 'min:0'],
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
        $imageUrls = $this->mergedImageUrls(
            $resolvedImageUrl,
            $this->productDetailRecord?->imageUrls ?? []
        );

        return [
            'productId' => (int) $product['product_id'],
            'code' => $product['code'],
            'name' => $product['name'],
            'slug' => ($product['slug'] ?? '') !== '' ? $product['slug'] : Str::slug($product['name']),
            'shortDescription' => $product['short_description'] ?? null,
            'description' => $product['description'] ?? null,
            'youtubeUrl' => $normalizedYoutubeUrl,
            'primaryImageUrl' => $resolvedImageUrl,
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

        $url = trim((string) $typedImageUrl);

        if ($url === '') {
            return null;
        }

        if (str_starts_with($url, 'data:image/')) {
            return $this->storeDataUrlImage($url);
        }

        return $url;
    }

    private function mergedImageUrls(?string $primaryImageUrl, array $existingImageUrls): array
    {
        $urls = array_values(array_filter(array_map(
            static fn ($value) => is_string($value) ? trim($value) : null,
            $existingImageUrls
        )));

        if ($primaryImageUrl !== null && $primaryImageUrl !== '') {
            $urls = array_values(array_filter($urls, static fn ($value) => $value !== $primaryImageUrl));
            array_unshift($urls, $primaryImageUrl);
        }

        return array_values(array_unique($urls));
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

        return asset('storage/' . $filename);
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
            ->where('product_id', $productId)
            ->orderByDesc('updated_at')
            ->first();
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
