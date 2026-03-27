<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MemberShippingAddressRecord extends Model
{
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'MemberShippingAddress';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $guarded = [];

    protected $casts = [
        'userId' => 'integer',
        'isDefault' => 'boolean',
    ];
}
