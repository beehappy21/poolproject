<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Orchid\Filters\Filterable;
use Orchid\Filters\Types\Like;
use Orchid\Screen\AsSource;

class Product extends Model
{
    use AsSource;
    use Filterable;
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'stephub_products_v1';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'created_at';
    const UPDATED_AT = 'updated_at';

    protected $appends = [
        'image',
        'rating',
        'rating_count',
    ];

    protected $fillable = [];

    protected $allowedSorts = [
        'name',
        'price',
        'old_price',
        'updated_at',
    ];

    protected $allowedFilters = [
        'name' => Like::class,
    ];

    public function getImageAttribute(): string
    {
        $raw = trim((string) ($this->getRawOriginal('image_url') ?? ''));

        if ($raw !== '') {
            if (
                Str::startsWith($raw, ['http://', 'https://', 'data:image/'])
            ) {
                return $raw;
            }

            if (Str::startsWith($raw, '/storage/')) {
                return asset(ltrim($raw, '/'));
            }

            return asset('storage/' . ltrim($raw, '/'));
        }

        return 'data:image/svg+xml;base64,' . base64_encode(
                '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="100"><rect width="100%" height="100%" rx="14" fill="#f3f4f6"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">No Image</text></svg>'
            );
    }

    public function getImagesAttribute(): array
    {
        $raw = $this->getRawOriginal('images');
        if (is_array($raw)) {
            return $raw;
        }
        if ($raw === null || $raw === '') {
            return [];
        }
        $decoded = json_decode((string) $raw, true);

        return is_array($decoded) ? array_values(array_filter($decoded)) : [];
    }

    public function getRatingAttribute(): float
    {
        return 0.0;
    }

    public function getRatingCountAttribute(): int
    {
        return 0;
    }
}
