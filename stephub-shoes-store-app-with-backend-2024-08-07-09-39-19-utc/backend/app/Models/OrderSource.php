<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderSource extends Model
{
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'Order';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $casts = [
        'paidAt' => 'datetime',
        'transferSubmittedAt' => 'datetime',
        'approvedAt' => 'datetime',
        'shippedAt' => 'datetime',
        'deliveredAt' => 'datetime',
    ];

    protected $guarded = [];
}
