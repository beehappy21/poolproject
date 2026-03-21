<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PackageItemRecord extends Model
{
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'PackageItem';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    protected $fillable = [
        'packageId',
        'productDetailId',
        'qty',
        'unitCostPriceUsdt',
        'unitMemberPriceUsdt',
        'unitRetailPriceUsdt',
        'unitPv',
        'unitPoolRate',
        'lineCostPriceUsdt',
        'lineMemberPriceUsdt',
        'lineRetailPriceUsdt',
        'linePv',
    ];
}
