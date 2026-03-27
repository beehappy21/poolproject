<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Orchid\Filters\Filterable;
use Orchid\Filters\Types\Like;
use Orchid\Screen\AsSource;

class Member extends Model
{
    use AsSource;
    use Filterable;
    use HasFactory;

    protected $connection = 'poolproject';

    protected $table = 'User';

    protected $primaryKey = 'id';

    public $incrementing = true;

    protected $keyType = 'int';

    const CREATED_AT = 'created_at';
    const UPDATED_AT = 'updated_at';

    protected $fillable = [];

    protected $allowedSorts = [
        'id',
        'memberCode',
        'createdAt',
        'name',
        'email',
        'phone',
        'status',
    ];

    protected $allowedFilters = [
        'memberCode' => Like::class,
        'name' => Like::class,
        'email' => Like::class,
        'phone' => Like::class,
        'status' => Like::class,
    ];

    protected $casts = [
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    public function scopeMember003(Builder $query): Builder
    {
        return $query
            ->where('isAdmin', false)
            ->whereRaw('"memberCode" like ?', ['TH%']);
    }

    public function memberProfile(): HasOne
    {
        return $this->hasOne(MemberProfileRecord::class, 'userId', 'id');
    }

    public function sponsor(): BelongsTo
    {
        return $this->belongsTo(self::class, 'sponsorId', 'id');
    }

    public function getSeqNoAttribute(): int
    {
        return (int) $this->id;
    }

    public function getMemberCodeAttribute(): string
    {
        return (string) $this->attributes['memberCode'];
    }

    public function getReferralCodeAttribute(): ?string
    {
        return $this->attributes['referralCode'] ?? null;
    }

    public function getFullNameAttribute(): string
    {
        return (string) $this->attributes['name'];
    }

    public function getJoinedDateAttribute()
    {
        return $this->memberProfile?->joinedAtOverride ?? $this->createdAt;
    }

    public function getSponsorCodeAttribute(): ?string
    {
        return $this->sponsor?->memberCode;
    }

    public function getUplineCodeAttribute(): ?string
    {
        $uplineUserId = $this->memberProfile?->uplineUserId;
        if (! $uplineUserId) {
            return null;
        }

        return MemberUserRecord::query()
            ->whereKey($uplineUserId)
            ->value('memberCode');
    }

    public function getNationalIdAttribute(): ?string
    {
        return $this->memberProfile?->nationalId;
    }

    public function getSideAttribute(): ?string
    {
        return $this->memberProfile?->placementSide?->value ?? $this->memberProfile?->placementSide;
    }

    public function getRankCodeAttribute(): ?string
    {
        return $this->memberProfile?->rankCode;
    }

    public function getHonorTitleAttribute(): ?string
    {
        return $this->memberProfile?->honorTitle;
    }

    public function getMobileCenterAttribute(): ?string
    {
        return $this->memberProfile?->mobileCenterCode;
    }
}
