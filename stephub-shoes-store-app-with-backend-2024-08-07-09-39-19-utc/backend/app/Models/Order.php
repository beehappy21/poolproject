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
    public const REPORT_BUCKET_ALL = 'all';
    public const REPORT_BUCKET_AWAITING_PAYMENT = 'awaiting-payment';
    public const REPORT_BUCKET_TRANSFER_REVIEW = 'transfer-review';
    public const REPORT_BUCKET_AWAITING_SHIPMENT = 'awaiting-shipment';
    public const REPORT_BUCKET_SHIPPED = 'shipped';
    public const REPORT_BUCKET_DELIVERED = 'delivered';

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

    protected $casts = [
        'paid_at' => 'datetime',
        'approved_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    protected $allowedSorts = [
        'name',
        'member_code',
        'total',
        'created_at',
        'phone_number',
        'order_status',
        'shipped_at',
    ];

    protected $allowedFilters = [
        'name' => Like::class,
        'member_code' => Like::class,
        'created_at' => Like::class,
        'phone_number' => Like::class,
        'order_status' => Like::class,
        'total' => Like::class,
        'order_no' => Like::class,
    ];

    public function scopeForReportBucket($query, ?string $bucket)
    {
        return match ($bucket) {
            self::REPORT_BUCKET_AWAITING_PAYMENT => $query->where('order_status', 'pending'),
            self::REPORT_BUCKET_TRANSFER_REVIEW => $query->where('order_status', 'paid'),
            self::REPORT_BUCKET_AWAITING_SHIPMENT => $query
                ->where('approval_status', 'APPROVED')
                ->whereNull('shipped_at'),
            self::REPORT_BUCKET_SHIPPED => $query
                ->where('approval_status', 'APPROVED')
                ->whereNotNull('shipped_at')
                ->whereNull('delivered_at'),
            self::REPORT_BUCKET_DELIVERED => $query
                ->where('approval_status', 'APPROVED')
                ->whereNotNull('delivered_at'),
            default => $query,
        };
    }

    public function scopeOrderByReportPriority($query, ?string $bucket = null)
    {
        if ($bucket === self::REPORT_BUCKET_SHIPPED) {
            return $query
                ->orderByDesc('shipped_at')
                ->orderByDesc('updated_at')
                ->orderByDesc('id');
        }

        if ($bucket === self::REPORT_BUCKET_DELIVERED) {
            return $query
                ->orderByDesc('delivered_at')
                ->orderByDesc('shipped_at')
                ->orderByDesc('id');
        }

        if ($bucket === self::REPORT_BUCKET_AWAITING_SHIPMENT) {
            return $query
                ->orderByDesc('approved_at')
                ->orderByDesc('updated_at')
                ->orderByDesc('id');
        }

        return $query
            ->orderByRaw("case when lower(order_status) = 'paid' then 0 else 1 end")
            ->orderByDesc('updated_at')
            ->orderByDesc('id');
    }

    public static function bucketLabel(?string $bucket): string
    {
        return match ($bucket) {
            self::REPORT_BUCKET_AWAITING_PAYMENT => 'รายการสินค้ารอชำระ',
            self::REPORT_BUCKET_TRANSFER_REVIEW => 'รายการรอตรวจสอบการโอน',
            self::REPORT_BUCKET_AWAITING_SHIPMENT => 'รายการรอจัดส่ง',
            self::REPORT_BUCKET_SHIPPED => 'รายการจัดส่งแล้ว',
            self::REPORT_BUCKET_DELIVERED => 'รายการส่งถึงแล้ว',
            default => 'รายการสั่งซื้อทั้งหมด',
        };
    }

    public function hasTransferSlip(): bool
    {
        return strtolower((string) $this->order_status) === 'paid'
            || !empty($this->paid_at);
    }

    public function getShipmentStatusAttribute(): string
    {
        if ($this->fulfillment_method === 'branch_pickup') {
            if (!empty($this->delivered_at)) {
                return 'picked-up';
            }

            if (!empty($this->shipped_at)) {
                return 'ready-for-pickup';
            }

            if (strtolower((string) $this->approval_status) === 'approved') {
                return 'awaiting-pickup';
            }
        }

        if (!empty($this->delivered_at)) {
            return 'delivered';
        }

        if (!empty($this->shipped_at)) {
            return 'shipped';
        }

        if (strtolower((string) $this->approval_status) === 'approved') {
            return 'awaiting-shipment';
        }

        return 'not-ready';
    }

    public function getFulfillmentMethodAttribute(): string
    {
        return strtolower((string) $this->shipping_label) === 'branch_pickup'
            ? 'branch_pickup'
            : 'delivery';
    }

    public function getFulfillmentLabelAttribute(): string
    {
        return $this->fulfillment_method === 'branch_pickup'
            ? 'รับที่สาขา'
            : 'จัดส่งถึงที่';
    }

    public function getStatusBadgeHtmlAttribute(): string
    {
        $status = strtolower((string) ($this->order_status ?? 'pending'));
        $color = match ($status) {
            'approved' => 'success',
            'paid' => 'primary',
            'pending' => 'warning',
            'canceled', 'cancelled' => 'danger',
            default => 'info',
        };

        return '<i class="text-' . $color . '">●</i> ' . Str::headline($status);
    }
}
