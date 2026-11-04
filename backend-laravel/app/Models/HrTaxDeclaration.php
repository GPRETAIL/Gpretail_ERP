<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** An employee's income tax regime and tax-saving declarations for a financial year. */
class HrTaxDeclaration extends Model
{
    protected $fillable = ['store_id', 'employee_id', 'fy', 'regime', 'status', 'submitted_at', 'locked', 'updated_by'];

    protected function casts(): array
    {
        return ['submitted_at' => 'datetime', 'locked' => 'boolean'];
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /** @return HasMany<HrTaxDeclarationItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(HrTaxDeclarationItem::class, 'declaration_id');
    }
}
