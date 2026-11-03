<?php

namespace App\Services\Hr;

use App\Models\Employee;
use App\Models\User;
use App\Services\Tenancy\BusinessPermissions;
use Illuminate\Database\Eloquent\Builder;

/**
 * Whose HR records a user may see: HR roles (hr.view) see the whole selected store; anyone else sees
 * themselves and the employees who report to them, directly or further down.
 */
class HrScope
{
    public function seesAll(User $user): bool
    {
        return app(BusinessPermissions::class)->allows($user, 'hr.view');
    }

    public function employeeFor(User $user): ?Employee
    {
        return Employee::where('user_id', $user->id)->first();
    }

    /** @return int[]|null null when the user sees everyone in the store */
    public function employeeIds(User $user): ?array
    {
        if ($this->seesAll($user)) {
            return null;
        }
        $own = $this->employeeFor($user);
        if (! $own) {
            return [];
        }
        $ids = [$own->id];
        $frontier = [$own->id];
        while ($frontier && count($ids) < 5000) {
            $frontier = array_values(array_diff(Employee::whereIn('reports_to_id', $frontier)->pluck('id')->all(), $ids));
            $ids = array_merge($ids, $frontier);
        }

        return $ids;
    }

    /** @param Builder<\Illuminate\Database\Eloquent\Model> $query */
    public function apply(Builder $query, User $user, string $column = 'employee_id'): Builder
    {
        $ids = $this->employeeIds($user);

        return $ids === null ? $query : $query->whereIn($column, $ids);
    }

    public function canSee(User $user, int $employeeId): bool
    {
        $ids = $this->employeeIds($user);

        return $ids === null ? Employee::whereKey($employeeId)->exists() : in_array($employeeId, $ids, true);
    }
}
