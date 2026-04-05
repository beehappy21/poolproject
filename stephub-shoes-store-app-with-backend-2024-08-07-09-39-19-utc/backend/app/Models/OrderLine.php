<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Orchid\Screen\AsSource;

class OrderLine extends Model
{
    use AsSource;
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'stephub_order_items_v1';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'created_at';
    const UPDATED_AT = 'updated_at';

    protected $fillable = [];

    public function getResolvedNameAttribute(): string
    {
        $name = trim((string) ($this->attributes['name'] ?? ''));
        if ($name !== '') {
            return $name;
        }

        $productId = $this->attributes['product_id'] ?? null;
        if ($productId !== null && $productId !== '') {
            $detailQuery = ProductDetailRecord::query();

            if (ctype_digit((string) $productId)) {
                $detailQuery->whereKey((int) $productId);
            } else {
                $detailQuery->where(function ($query) use ($productId) {
                    $query->where('code', (string) $productId)
                        ->orWhere('slug', (string) $productId);
                });
            }

            $detailName = $detailQuery->value('name');

            if (is_string($detailName) && trim($detailName) !== '') {
                return trim($detailName);
            }
        }

        return 'Product item';
    }
}
