<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Orchid\Filters\Filterable;
use Orchid\Filters\Types\Like;
use Orchid\Screen\AsSource;

class Category extends Model
{
    use AsSource;
    use Filterable;
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'ProductCategory';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $appends = [
        'image',
        'status_label',
    ];

    protected $fillable = [
        'supplierId',
        'code',
        'name',
        'slug',
        'description',
        'imageUrl',
        'audienceTags',
        'sortOrder',
        'isFeatured',
        'status',
    ];

    protected $casts = [
        'supplierId' => 'integer',
        'audienceTags' => 'array',
        'sortOrder' => 'integer',
        'isFeatured' => 'boolean',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    protected $allowedSorts = [
        'name',
        'updatedAt',
    ];

    protected $allowedFilters = [
        'name' => Like::class,
        'code' => Like::class,
    ];

    public const PERMANENT_FIRM_CATEGORY_CODE = 'FIRM';
    public const PERMANENT_FIRM_CATEGORY_NAME = 'Firm Catalog';
    public const PERMANENT_FIRM_SUPPLIER_CODE = 'FIRM';
    public const PERMANENT_FIRM_SUPPLIER_NAME = 'Firm Catalog';

    public static function ensurePermanentFirmCategory(): self
    {
        $supplier = Supplier::query()->firstOrCreate(
            ['code' => self::PERMANENT_FIRM_SUPPLIER_CODE],
            [
                'name' => self::PERMANENT_FIRM_SUPPLIER_NAME,
                'slug' => Str::slug(self::PERMANENT_FIRM_SUPPLIER_NAME),
                'description' => 'Permanent supplier for firm catalog items.',
                'sortOrder' => 9999,
                'isFeatured' => false,
                'status' => 'ACTIVE',
            ],
        );

        /** @var self $category */
        $category = self::query()->firstOrCreate(
            ['code' => self::PERMANENT_FIRM_CATEGORY_CODE],
            [
                'supplierId' => (int) $supplier->id,
                'name' => self::PERMANENT_FIRM_CATEGORY_NAME,
                'slug' => Str::slug(self::PERMANENT_FIRM_CATEGORY_NAME),
                'description' => 'Permanent catalog for firm redemption products.',
                'sortOrder' => 9999,
                'isFeatured' => true,
                'status' => 'ACTIVE',
            ],
        );

        $category->forceFill([
            'supplierId' => (int) $supplier->id,
            'code' => self::PERMANENT_FIRM_CATEGORY_CODE,
            'name' => self::PERMANENT_FIRM_CATEGORY_NAME,
            'slug' => Str::slug(self::PERMANENT_FIRM_CATEGORY_NAME),
            'status' => 'ACTIVE',
        ])->save();

        return $category;
    }

    public function isPermanentFirmCategory(): bool
    {
        return Str::upper((string) $this->code) === self::PERMANENT_FIRM_CATEGORY_CODE;
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplierId', 'id');
    }

    public function getImageAttribute(): string
    {
        if (!empty($this->imageUrl)) {
            $value = trim((string) $this->imageUrl);
            if (Str::startsWith($value, ['data:image/'])) {
                return $value;
            }

            return $this->resolvePublicImageUrl($value);
        }

        $initial = strtoupper(Str::substr($this->name ?? 'C', 0, 1));
        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
  <rect width="100%" height="100%" rx="14" fill="#eef2ff"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#4f46e5">{$initial}</text>
</svg>
SVG;

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    private function resolvePublicImageUrl(string $value): string
    {
        $raw = trim($value);

        if ($raw === '') {
            return '';
        }

        if (Str::startsWith($raw, ['/storage/'])) {
            return $this->buildStorageUrl($raw);
        }

        if (Str::startsWith($raw, ['http://', 'https://'])) {
            $parts = parse_url($raw);
            $host = strtolower((string) ($parts['host'] ?? ''));
            $path = (string) ($parts['path'] ?? '');
            $query = isset($parts['query']) ? '?' . $parts['query'] : '';

            if (
                $path !== '' &&
                ($host === '127.0.0.1' ||
                    $host === 'localhost' ||
                    $host === 'bao.blifehealthy.com' ||
                    $host === 'wap.blifehealthy.com' ||
                    $host === 'www.blifehealthy.com' ||
                    $host === 'blifehealthy.com' ||
                    $host === 'bao')
            ) {
                return $this->buildStorageUrl($path . $query);
            }

            return $raw;
        }

        return $this->buildStorageUrl('/storage/' . ltrim($raw, '/'));
    }

    private function buildStorageUrl(string $path): string
    {
        $request = request();
        $forwardedHost = trim((string) $request->headers->get('x-forwarded-host', ''));
        $forwardedProto = trim((string) $request->headers->get('x-forwarded-proto', 'https'));
        $host = $forwardedHost !== '' ? $forwardedHost : $request->getHost();
        $scheme = $forwardedProto !== '' ? $forwardedProto : $request->getScheme();

        return sprintf(
            '%s://%s%s',
            $scheme,
            $host,
            Str::startsWith($path, '/') ? $path : '/' . $path,
        );
    }

    public function getStatusLabelAttribute(): string
    {
        return Str::headline(Str::lower((string) ($this->status ?? 'active')));
    }
}
