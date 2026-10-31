<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A ledger in a store's chart of accounts (see App\Services\Accounting\ChartOfAccounts). */
class LedgerAccount extends Model
{
    protected $fillable = ['store_id', 'name', 'group_code', 'system_key', 'party_type', 'party_id', 'opening_balance', 'is_active', 'notes', 'created_by'];

    protected function casts(): array
    {
        return ['opening_balance' => 'decimal:2', 'is_active' => 'boolean'];
    }

    /** @return HasMany<VoucherLine, $this> */
    public function lines(): HasMany
    {
        return $this->hasMany(VoucherLine::class);
    }
}
