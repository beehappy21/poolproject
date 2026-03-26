<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Orchid\Filters\Filterable;
use Orchid\Filters\Types\Like;
use Orchid\Screen\AsSource;

class KycRequest extends Model
{
    use AsSource;
    use Filterable;
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'KycRequest';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'status',
        'approvedAt',
        'approvedByUserId',
        'rejectionReason',
    ];

    protected $casts = [
        'submittedAt' => 'datetime',
        'approvedAt' => 'datetime',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    protected $allowedSorts = [
        'id',
        'submittedAt',
        'status',
    ];

    protected $allowedFilters = [
        'nationalId' => Like::class,
        'bankName' => Like::class,
        'bankAccountNumber' => Like::class,
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
