<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** The leave an employee gets each year, per leave type. The store's default policy applies when none is set. */
class HrLeavePolicy extends Model
{
    protected $fillable = ['store_id', 'name', 'is_default'];

    protected function casts(): array
    {
        return ['is_default' => 'boolean'];
    }

    /** @return HasMany<HrLeavePolicyItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(HrLeavePolicyItem::class, 'policy_id');
    }
}
