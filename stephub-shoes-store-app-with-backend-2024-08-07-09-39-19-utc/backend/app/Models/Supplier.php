<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Orchid\Filters\Filterable;
use Orchid\Filters\Types\Like;
use Orchid\Screen\AsSource;

class Supplier extends Model
{
    use AsSource;
    use Filterable;
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'Supplier';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $appends = [
        'image',
        'status_label',
    ];

    protected $fillable = [
        'code',
        'name',
        'slug',
        'description',
        'imageUrl',
        'sortOrder',
        'isFeatured',
        'status',
    ];

    protected $casts = [
        'sortOrder' => 'integer',
        'isFeatured' => 'boolean',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    protected $allowedSorts = [
        'name',
        'updatedAt',
    ];

    protected $allowedFilters = [
        'name' => Like::class,
        'code' => Like::class,
    ];

    public function getImageAttribute(): string
    {
        if (!empty($this->imageUrl)) {
            return (string) $this->imageUrl;
        }

        $initial = strtoupper(Str::substr($this->name ?? 'S', 0, 1));
        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
  <rect width="100%" height="100%" rx="14" fill="#ecfeff"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#0f766e">{$initial}</text>
</svg>
SVG;

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    public function getStatusLabelAttribute(): string
    {
        return Str::headline(Str::lower((string) ($this->status ?? 'active')));
    }
}
