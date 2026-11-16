<?php

namespace App\Services\Sales;

use App\Models\Employee;
use Illuminate\Support\Collection;

/**
 * Salespeople are the store's active employees. A bill line credits one by employee id (pos_sale_items.sales_man_id),
 * which the Incentive report and payroll's Sales Incentive read. An employee sticker carries "EMP-<id>".
 */
class Salespeople
{
    public const STICKER_PREFIX = 'EMP-';

    /** @return Collection<int, array{id: int, code: ?string, name: string, section: ?string, designation: ?string}> */
    public function active(): Collection
    {
        return Employee::with(['department:id,name', 'designation:id,name'])->where('is_active', true)->orderBy('name')
            ->get(['id', 'code', 'name', 'department_id', 'designation_id'])
            ->map(fn (Employee $employee) => $this->present($employee))->values();
    }

    /** A scanned sticker (EMP-<id>), an employee code or a phone number. */
    public function resolve(string $value): ?Employee
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }
        $query = Employee::with(['department:id,name', 'designation:id,name'])->where('is_active', true);
        if (preg_match('/^'.preg_quote(self::STICKER_PREFIX, '/').'(\d+)$/i', $value, $match)) {
            return $query->whereKey((int) $match[1])->first();
        }

        return $query->where(fn ($q) => $q->where('code', $value)->orWhere('phone', $value))->first();
    }

    /** @return array{id: int, code: ?string, employeeCode: ?string, name: string, section: ?string, designation: ?string, sticker: string} */
    public function present(Employee $employee): array
    {
        return [
            'id' => (int) $employee->id, 'code' => $employee->code, 'employeeCode' => $employee->code, 'name' => $employee->name,
            'section' => $employee->department?->name, 'designation' => $employee->designation?->name,
            'sticker' => self::STICKER_PREFIX.$employee->id,
        ];
    }

    /**
     * The salesperson ids among $ids that are employees of $storeId: a bill line keeps only those, so a stale or
     * mistyped value (an old code, another store's employee) never fails a sale; the line just has no salesperson.
     *
     * @return array<int, true>
     */
    public function validIds(array $ids, int $storeId): array
    {
        $ids = array_values(array_unique(array_filter(array_map(fn ($id) => is_numeric($id) ? (int) $id : 0, $ids))));
        if ($ids === []) {
            return [];
        }

        return Employee::withoutGlobalScopes()->whereIn('id', $ids)->where('store_id', $storeId)->pluck('id')
            ->mapWithKeys(fn ($id) => [(int) $id => true])->all();
    }
}
