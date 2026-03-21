<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Orchid\Filters\Filterable;
use Orchid\Filters\Types\Like;
use Orchid\Screen\AsSource;

class Order extends Model
{
    use AsSource;
    use Filterable;
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'stephub_orders_v1';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'created_at';
    const UPDATED_AT = 'updated_at';

    protected $appends = [
        'status_badge_html',
    ];

    protected $fillable = [];

    protected $allowedSorts = [
        'name',
        'total',
        'created_at',
        'phone_number',
        'order_status',
    ];

    protected $allowedFilters = [
        'name' => Like::class,
        'created_at' => Like::class,
        'phone_number' => Like::class,
        'order_status' => Like::class,
        'total' => Like::class,
        'order_no' => Like::class,
    ];

    public function getStatusBadgeHtmlAttribute(): string
    {
        $status = strtolower((string) ($this->order_status ?? 'pending'));
        $color = match ($status) {
            'approved' => 'success',
            'pending' => 'warning',
            'canceled', 'cancelled' => 'danger',
            default => 'info',
        };

        return '<i class="text-' . $color . '">●</i> ' . Str::headline($status);
    }
}
