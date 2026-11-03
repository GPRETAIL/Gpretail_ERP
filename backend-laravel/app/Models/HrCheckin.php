<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One punch (IN or OUT) from the employee's phone, a manager, or an import. The day's attendance is built from these. */
class HrCheckin extends Model
{
    protected $fillable = ['store_id', 'employee_id', 'punched_at', 'type', 'source', 'lat', 'lng', 'distance_m', 'created_by'];

    protected function casts(): array
    {
        return ['punched_at' => 'datetime', 'lat' => 'float', 'lng' => 'float', 'distance_m' => 'integer'];
    }

    /** @return BelongsTo<Employee, $this> */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
