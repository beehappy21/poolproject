<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductDetailRecord extends Model
{
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'ProductDetail';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'productId',
        'code',
        'name',
        'slug',
        'shortDescription',
        'description',
        'youtubeUrl',
        'primaryImageUrl',
        'homeCardImageUrl',
        'imageUrls',
        'costPriceUsdt',
        'memberPriceUsdt',
        'retailPriceUsdt',
        'pv',
        'ratingAvg',
        'ratingCount',
        'sortOrder',
        'isNew',
        'isTop',
        'isFeatured',
        'isBestSeller',
        'poolRate',
        'activeDays',
        'earningCapAmount',
        'firmEnabled',
        'firmOverrideCostGuard',
        'firmDcwRewardAmount',
        'firmRedeemStockLimit',
        'stockQuantity',
        'dcwSpendEnabled',
        'dcwUsageAmount',
        'dcwUsageAmountOverridden',
        'dcwCashRewardRate',
        'dcwShoppingRewardRate',
        'salesChannelMode',
        'status',
    ];

    protected $casts = [
        'costPriceUsdt' => 'decimal:8',
        'memberPriceUsdt' => 'decimal:8',
        'retailPriceUsdt' => 'decimal:8',
        'pv' => 'decimal:8',
        'ratingAvg' => 'decimal:2',
        'poolRate' => 'decimal:8',
        'activeDays' => 'integer',
        'earningCapAmount' => 'decimal:8',
        'firmEnabled' => 'boolean',
        'firmOverrideCostGuard' => 'boolean',
        'firmDcwRewardAmount' => 'decimal:8',
        'firmRedeemStockLimit' => 'integer',
        'stockQuantity' => 'integer',
        'dcwSpendEnabled' => 'boolean',
        'dcwUsageAmount' => 'decimal:8',
        'dcwUsageAmountOverridden' => 'boolean',
        'dcwCashRewardRate' => 'decimal:8',
        'dcwShoppingRewardRate' => 'decimal:8',
        'isNew' => 'boolean',
        'isTop' => 'boolean',
        'isFeatured' => 'boolean',
        'isBestSeller' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(ProductRecord::class, 'productId', 'id');
    }

    public function getImageUrlsAttribute($value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if ($value === null || $value === '') {
            return [];
        }

        $trimmed = trim((string) $value);
        $trimmed = preg_replace('/^\{|\}$/', '', $trimmed ?? '') ?? '';

        if ($trimmed === '') {
            return [];
        }

        $items = str_getcsv($trimmed, ',', '"', '\\');

        return array_values(array_filter(array_map(
            static fn ($item) => is_string($item) ? stripslashes($item) : null,
            $items
        )));
    }

    public function setImageUrlsAttribute($value): void
    {
        if ($value === null) {
            $this->attributes['imageUrls'] = '{}';

            return;
        }

        $items = is_array($value) ? $value : [$value];
        $items = array_values(array_filter(array_map(
            static fn ($item) => is_string($item) ? trim($item) : null,
            $items
        )));

        if ($items === []) {
            $this->attributes['imageUrls'] = '{}';

            return;
        }

        $escaped = array_map(
            static fn (string $item) => '"' . addcslashes($item, "\\\"") . '"',
            $items
        );

        $this->attributes['imageUrls'] = '{' . implode(',', $escaped) . '}';
    }
}
