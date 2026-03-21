<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Orchid\Filters\Filterable;
use Orchid\Filters\Types\Like;
use Orchid\Screen\AsSource;

class CatalogPackage extends Model
{
    use AsSource;
    use Filterable;
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'stephub_packages_v1';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'created_at';
    const UPDATED_AT = 'updated_at';

    protected $appends = [
        'status_label',
    ];

    protected $fillable = [];

    protected $allowedSorts = [
        'name',
        'price',
        'pv',
        'updated_at',
    ];

    protected $allowedFilters = [
        'name' => Like::class,
        'code' => Like::class,
    ];

    public function getStatusLabelAttribute(): string
    {
        return Str::headline(Str::lower((string) ($this->status ?? 'active')));
    }
}
