<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Orchid\Filters\Filterable;
use Orchid\Filters\Types\Like;
use Orchid\Screen\AsSource;

class WithdrawRequest extends Model
{
    use AsSource;
    use Filterable;
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'WithdrawRequest';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'status',
        'approvedAt',
        'approvedByUserId',
        'exportedAt',
        'paidAt',
        'rejectionReason',
    ];

    protected $casts = [
        'amount' => 'decimal:8',
        'taxAmount' => 'decimal:8',
        'autoSweepAmount' => 'decimal:8',
        'feeAmount' => 'decimal:8',
        'netBankAmount' => 'decimal:8',
        'requestedAt' => 'datetime',
        'approvedAt' => 'datetime',
        'exportedAt' => 'datetime',
        'paidAt' => 'datetime',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    protected $allowedSorts = [
        'id',
        'requestedAt',
        'status',
        'amount',
        'netBankAmount',
    ];

    protected $allowedFilters = [
        'bankName' => Like::class,
        'accountName' => Like::class,
        'accountNumber' => Like::class,
        'status' => Like::class,
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(MemberUserRecord::class, 'userId', 'id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(MemberUserRecord::class, 'approvedByUserId', 'id');
    }
}
