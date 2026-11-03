<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One line of a Salary Structure (an HR Configuration record): how a component is worked out from the gross. */
class HrSalaryStructureLine extends Model
{
    protected $fillable = ['store_id', 'structure_id', 'component_id', 'calc', 'value', 'sort'];

    protected function casts(): array
    {
        return ['value' => 'float', 'sort' => 'integer'];
    }

    /** @return BelongsTo<HrSalaryComponent, $this> */
    public function component(): BelongsTo
    {
        return $this->belongsTo(HrSalaryComponent::class, 'component_id');
    }
}
