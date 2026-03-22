<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MemberProfileRecord extends Model
{
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'MemberProfile';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'userId',
        'nationalId',
        'uplineUserId',
        'placementSide',
        'rankCode',
        'honorTitle',
        'mobileCenterCode',
        'joinedAtOverride',
    ];

    protected $casts = [
        'userId' => 'integer',
        'uplineUserId' => 'integer',
        'joinedAtOverride' => 'date',
    ];
}
