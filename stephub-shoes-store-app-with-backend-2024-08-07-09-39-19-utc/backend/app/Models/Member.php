<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Orchid\Filters\Filterable;
use Orchid\Filters\Types\Like;
use Orchid\Screen\AsSource;

class Member extends Model
{
    use AsSource;
    use Filterable;
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'stephub_members_v1';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'created_at';
    const UPDATED_AT = 'updated_at';

    protected $fillable = [];

    protected $allowedSorts = [
        'seq_no',
        'member_code',
        'joined_date',
        'sponsor_code',
        'full_name',
        'email',
        'phone',
        'status',
    ];

    protected $allowedFilters = [
        'member_code' => Like::class,
        'sponsor_code' => Like::class,
        'full_name' => Like::class,
        'email' => Like::class,
        'phone' => Like::class,
        'status' => Like::class,
    ];

    protected $casts = [
        'joined_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
