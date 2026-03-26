<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminAuditLog extends Model
{
    protected $fillable = [
        'admin_user_id',
        'admin_name',
        'admin_email',
        'method',
        'route_name',
        'path',
        'query',
        'payload',
        'target_type',
        'target_id',
        'status_code',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'query' => 'array',
        'payload' => 'array',
    ];

    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }
}
