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
            return (string) $this->imageUrl;
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

    public function getStatusLabelAttribute(): string
    {
        return Str::headline(Str::lower((string) ($this->status ?? 'active')));
    }
}
