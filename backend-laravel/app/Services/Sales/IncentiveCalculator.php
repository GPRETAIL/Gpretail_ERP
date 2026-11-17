<?php

namespace App\Services\Sales;

use App\Support\BusinessDay;
use App\Models\IncentivePayout;
use App\Models\IncentiveRule;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Salesperson incentives for a store and month, from the bill lines credited to each employee (pos_sale_items.
 * sales_man_id) and the store's rules (Settings > Incentive Configuration):
 * - item: % of the line's net value (after discount, without GST) or ₹ per piece; the most specific rule wins
 *   (product > brand > category > section > store-wide), else the employee's own Incentive %;
 * - scheme: extra on chosen items within its dates, on top of the item rule;
 * - ageing: extra on units that were in stock at least N days (the FIFO batches the sale consumed);
 * - target: once a month, a slab on the salesperson's (or their section's) achievement of the month's target.
 * Returns take back the returned units' share from the original line's salesperson; cancelled bills never count.
 * Months are worked out live until a manager approves them; approval freezes them in incentive_payouts, which
 * payroll pays. A return entered after its month was approved counts in the month it was entered.
 */
class IncentiveCalculator
{
    private const SPECIFICITY = ['product' => 5, 'brand' => 4, 'category' => 3, 'section' => 2, 'all' => 1];

    private const CANCELLED = ['CANCELLED', 'CANCELED'];

    /** @var Collection<int, IncentiveRule> */
    private Collection $rules;

    /** @var array<int, object> employee id → employee row */
    private array $employees = [];

    /**
     * @return array{month: string, approved: bool, approved_at: ?string, rows: list<array<string, mixed>>, lines?: list<array<string, mixed>>}
     */
    public function month(int $storeId, string $month, ?int $employeeId = null, bool $withLines = false): array
    {
        [$start, $end] = $this->bounds($month);
        $this->rules = IncentiveRule::withoutGlobalScopes()->where('store_id', $storeId)->where('is_active', true)->get();

        $lines = $this->saleLines($storeId, fn ($q) => $q->whereBetween('s.sale_date', BusinessDay::range($start, $end)));
        $this->loadEmployees($storeId, $lines->pluck('sales_man_id')->all());
        $lines = $this->priceLines($lines);
        $returns = $this->returnLines($storeId, $month, $start, $end);

        $rows = [];
        foreach ($lines as $line) {
            $row = &$this->row($rows, (int) $line->sales_man_id);
            $row['bills'][$line->pos_sale_id] = true;
            $row['qty'] += (float) $line->quantity;
            $row['net_sales'] += $line->net;
            $row['item_amount'] += $line->item;
            $row['scheme_amount'] += $line->scheme;
            $row['ageing_amount'] += $line->ageing;
            unset($row);
        }
        foreach ($returns as $return) {
            $row = &$this->row($rows, (int) $return['employee_id']);
            $row['qty'] -= $return['qty'];
            $row['net_sales'] -= $return['net'];
            $row['returns_amount'] -= $return['amount'];
            unset($row);
        }
        $this->applyTargets($storeId, $month, $start, $rows);

        $payouts = IncentivePayout::withoutGlobalScopes()->where('store_id', $storeId)->where('month', $month)->get()->keyBy('employee_id');
        $approved = $payouts->isNotEmpty() && $payouts->every(fn ($p) => $p->approved_at !== null);

        $result = [];
        foreach ($rows as $id => $row) {
            if ($employeeId && $id !== $employeeId) {
                continue;
            }
            $frozen = $payouts->get($id);
            $amounts = $frozen && $frozen->approved_at
                ? $frozen->only(['net_sales', 'qty', 'item_amount', 'scheme_amount', 'ageing_amount', 'target_amount', 'returns_amount', 'total'])
                : $this->rounded($row);
            $result[] = [
                'employee_id' => $id, 'employee_code' => $this->employees[$id]->code ?? null,
                'employee_name' => $this->employees[$id]->name ?? ('Employee #'.$id), 'section' => $this->employees[$id]->section ?? null,
                'bills' => count($row['bills']), ...$amounts, 'approved' => (bool) $frozen?->approved_at,
            ];
        }
        usort($result, fn ($a, $b) => $b['total'] <=> $a['total'] ?: strcmp((string) $a['employee_name'], (string) $b['employee_name']));

        $data = ['month' => $month, 'approved' => $approved,
            'approved_at' => $approved ? $payouts->max('approved_at')?->toIso8601String() : null, 'rows' => $result];
        if ($withLines) {
            $data['lines'] = $lines->filter(fn ($l) => ! $employeeId || (int) $l->sales_man_id === $employeeId)->map(fn ($l) => [
                'kind' => 'sale', 'date' => substr((string) $l->sale_date, 0, 10), 'bill_no' => $l->invoice_no, 'employee_id' => (int) $l->sales_man_id,
                'product' => $l->product_name, 'qty' => (float) $l->quantity, 'net' => round($l->net, 2), 'item' => round($l->item, 2),
                'item_rule' => $l->item_rule, 'scheme' => round($l->scheme, 2), 'ageing' => round($l->ageing, 2),
                'total' => round($l->item + $l->scheme + $l->ageing, 2),
            ])->concat(collect($returns)->filter(fn ($r) => ! $employeeId || $r['employee_id'] === $employeeId)->map(fn ($r) => [
                'kind' => 'return', 'date' => $r['date'], 'bill_no' => $r['bill_no'], 'employee_id' => $r['employee_id'], 'product' => $r['product'],
                'qty' => -$r['qty'], 'net' => -round($r['net'], 2), 'item' => 0, 'item_rule' => 'Return', 'scheme' => 0, 'ageing' => 0,
                'total' => -round($r['amount'], 2),
            ]))->values()->all();
        }

        return $data;
    }

    /** Freezes the month: each salesperson's amounts are saved and payroll pays them. */
    public function approve(int $storeId, string $month, User $user): array
    {
        [, $end] = $this->bounds($month);
        if ($end->isFuture()) {
            throw ValidationException::withMessages(['month' => 'Approve a month after it has ended.']);
        }

        return DB::transaction(function () use ($storeId, $month, $user) {
            $data = $this->month($storeId, $month);
            if ($data['approved']) {
                throw ValidationException::withMessages(['month' => 'This month is already approved.']);
            }
            foreach ($data['rows'] as $row) {
                IncentivePayout::withoutGlobalScopes()->updateOrCreate(
                    ['store_id' => $storeId, 'month' => $month, 'employee_id' => $row['employee_id']],
                    [...collect($row)->only(['net_sales', 'qty', 'item_amount', 'scheme_amount', 'ageing_amount', 'target_amount', 'returns_amount', 'total'])->all(),
                        'approved_by' => $user->id, 'approved_at' => now()],
                );
            }

            return $this->month($storeId, $month);
        });
    }

    /** What payroll pays an employee for a month: the approved total, or nothing until the month is approved. */
    public function approvedTotal(int $employeeId, string $month): float
    {
        return (float) IncentivePayout::withoutGlobalScopes()->where('employee_id', $employeeId)->where('month', $month)
            ->whereNotNull('approved_at')->sum('total');
    }

    /** Which item rule a product gets for a salesperson on a date (Incentive Configuration's "Test"). */
    public function explain(int $storeId, int $productId, ?int $employeeId, string $date): array
    {
        $this->rules = IncentiveRule::withoutGlobalScopes()->where('store_id', $storeId)->where('is_active', true)->get();
        $this->loadEmployees($storeId, $employeeId ? [$employeeId] : []);
        $product = DB::table('products')->where('id', $productId)->first(['id', 'name', 'category_id', 'brand_id', 'section']);
        abort_unless($product, 404, 'Product not found.');
        $line = (object) ['product_id' => $product->id, 'category_id' => $product->category_id, 'brand_id' => $product->brand_id,
            'section' => $product->section, 'sales_man_id' => $employeeId, 'sale_date' => $date];
        $item = $this->itemRule($line);
        $schemes = $this->matching('scheme', $line);

        return [
            'product' => $product->name,
            'item_rule' => $item ? ['id' => $item->id, 'name' => $item->name, 'basis' => $item->basis, 'value' => $item->value] : null,
            'employee_default_pct' => $employeeId ? $this->defaultPct($employeeId) : null,
            'schemes' => $schemes->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'basis' => $r->basis, 'value' => $r->value])->values(),
            'ageing' => $this->matching('ageing', $line)->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'min_age_days' => $r->min_age_days])->values(),
        ];
    }

    // ── Lines ───────────────────────────────────────────────────────────────

    /** Credited, not cancelled bill lines with their product grouping. */
    private function saleLines(int $storeId, \Closure $where): Collection
    {
        $query = DB::table('pos_sale_items as i')->join('pos_sales as s', 's.id', '=', 'i.pos_sale_id')
            ->leftJoin('products as p', 'p.id', '=', 'i.product_id')
            ->where('s.store_id', $storeId)->whereNotNull('i.sales_man_id')->whereNotIn('s.status', self::CANCELLED)
            ->select('i.id', 'i.pos_sale_id', 'i.product_id', 'i.variant_id', 'i.quantity', 'i.subtotal', 'i.tax_amount', 'i.sales_man_id',
                's.invoice_no', 's.sale_date', 'p.name as product_name', 'p.category_id', 'p.brand_id', 'p.section')
            ->orderBy('i.id');
        $where($query);

        return $query->get();
    }

    /** Each line's net value and its item, scheme and old-stock incentive. */
    private function priceLines(Collection $lines): Collection
    {
        $aged = $this->agedUnits($lines);

        return $lines->map(function ($line) use ($aged) {
            $qty = max(0.0, (float) $line->quantity);
            $line->net = max(0.0, (float) $line->subtotal - (float) $line->tax_amount);
            $rule = $this->itemRule($line);
            if ($rule) {
                $line->item = $this->amount($rule, $line->net, $qty);
                $line->item_rule = $rule->name;
            } else {
                $pct = $this->defaultPct((int) $line->sales_man_id);
                $line->item = $line->net * $pct / 100;
                $line->item_rule = $pct > 0 ? "Employee {$pct}%" : null;
            }
            $line->scheme = $this->matching('scheme', $line)->sum(fn ($r) => $this->amount($r, $line->net, $qty));
            $line->ageing = $this->matching('ageing', $line)->sum(function ($r) use ($aged, $line, $qty) {
                $units = collect($aged[$line->id] ?? [])->filter(fn ($u) => $u['age'] >= (int) $r->min_age_days)->sum('qty');
                $units = min($qty, $units);

                return $units > 0 ? $this->amount($r, $qty > 0 ? $line->net * $units / $qty : 0, $units) : 0;
            });

            return $line;
        });
    }

    /**
     * Per line, the units it took from each stock batch and how old they were when sold. A sale writes one stock
     * movement per line in line order, so a bill's movements and lines pair up by position.
     *
     * @return array<int, list<array{qty: float, age: int}>>
     */
    private function agedUnits(Collection $lines): array
    {
        if (! $this->rules->contains('type', 'ageing') || $lines->isEmpty()) {
            return [];
        }
        $out = [];
        foreach ($lines->pluck('pos_sale_id')->unique()->chunk(500) as $saleIds) {
            $movements = DB::table('stock_transactions')->where('reference_type', 'POS_SALE')->whereIn('reference_id', $saleIds->all())
                ->orderBy('id')->get(['id', 'reference_id', 'product_id', 'variant_id'])->groupBy('reference_id');
            $allocations = DB::table('stock_batch_allocations as a')->join('stock_batches as b', 'b.id', '=', 'a.stock_batch_id')
                ->whereIn('a.stock_transaction_id', $movements->flatten()->pluck('id')->all())
                ->get(['a.stock_transaction_id', 'a.quantity', 'b.received_at'])->groupBy('stock_transaction_id');
            foreach ($lines->whereIn('pos_sale_id', $saleIds->all())->groupBy('pos_sale_id') as $saleId => $saleLines) {
                $saleMovements = ($movements[$saleId] ?? collect())->values();
                foreach ($saleLines->values() as $index => $line) {
                    $movement = $saleMovements->count() === $saleLines->count() ? $saleMovements[$index]
                        : $saleMovements->first(fn ($m) => (int) $m->product_id === (int) $line->product_id && (int) $m->variant_id === (int) $line->variant_id);
                    foreach ($movement ? ($allocations[$movement->id] ?? []) : [] as $allocation) {
                        $out[$line->id][] = ['qty' => (float) $allocation->quantity,
                            'age' => (int) Carbon::parse($allocation->received_at)->startOfDay()->diffInDays(Carbon::parse($line->sale_date)->startOfDay())];
                    }
                }
            }
        }

        return $out;
    }

    /**
     * Returns counted in this month: those dated in it, plus late ones entered in it for an already approved month.
     * Each takes back the returned units' share of the original line's incentive.
     *
     * @return list<array<string, mixed>>
     */
    private function returnLines(int $storeId, string $month, Carbon $start, Carbon $end): array
    {
        $approvedAt = IncentivePayout::withoutGlobalScopes()->where('store_id', $storeId)->whereNotNull('approved_at')
            ->groupBy('month')->selectRaw('month, MIN(approved_at) as at')->pluck('at', 'month');
        $thisApproved = $approvedAt[$month] ?? null;
        $items = DB::table('pos_return_items as ri')->join('pos_returns as r', 'r.id', '=', 'ri.pos_return_id')
            ->leftJoin('pos_sales as s', 's.id', '=', 'r.pos_sale_id')
            ->where('r.store_id', $storeId)->whereNotNull('r.pos_sale_id')->whereNotIn('r.status', self::CANCELLED)
            ->where(fn ($q) => $q->whereBetween('r.return_date', BusinessDay::range($start, $end))->orWhereBetween('r.created_at', BusinessDay::range($start, $end)))
            ->get(['ri.product_id', 'ri.variant_id', 'ri.quantity', 'r.pos_sale_id', 'r.return_date', 'r.created_at', 's.invoice_no']);

        $items = $items->filter(function ($item) use ($start, $end, $approvedAt, $thisApproved) {
            $dated = Carbon::parse($item->return_date);
            $returnMonth = $dated->format('Y-m');
            $entered = Carbon::parse($item->created_at);
            $lateFor = $approvedAt[$returnMonth] ?? null;
            $isLate = $lateFor && $entered->greaterThan(Carbon::parse($lateFor));
            if ($dated->betweenIncluded($start, $end)) {
                // Entered after this month was approved: it belongs to the month it was entered.
                return ! ($thisApproved && $entered->greaterThan(Carbon::parse($thisApproved)));
            }

            return $isLate && $entered->betweenIncluded($start, $end);
        });
        if ($items->isEmpty()) {
            return [];
        }

        $original = $this->priceLines($this->saleLines($storeId, fn ($q) => $q->whereIn('s.id', $items->pluck('pos_sale_id')->unique()->all())))
            ->groupBy(fn ($l) => $l->pos_sale_id.':'.$l->product_id.':'.((int) $l->variant_id));
        $this->loadEmployees($storeId, $original->flatten()->pluck('sales_man_id')->all());

        $out = [];
        foreach ($items as $item) {
            $lines = $original[$item->pos_sale_id.':'.$item->product_id.':'.((int) $item->variant_id)] ?? collect();
            $billed = (float) $lines->sum('quantity');
            if ($billed <= 0) {
                continue; // The line had no salesperson: nothing to take back.
            }
            foreach ($lines as $line) {
                $share = (float) $line->quantity / $billed;
                $qty = (float) $item->quantity * $share;
                $perUnit = (float) $line->quantity > 0 ? ($line->item + $line->scheme + $line->ageing) / (float) $line->quantity : 0;
                $out[] = ['employee_id' => (int) $line->sales_man_id, 'qty' => $qty, 'net' => $line->net / max(0.0001, (float) $line->quantity) * $qty,
                    'amount' => $perUnit * $qty, 'date' => substr((string) $item->return_date, 0, 10), 'bill_no' => $item->invoice_no, 'product' => $line->product_name];
            }
        }

        return $out;
    }

    // ── Targets ─────────────────────────────────────────────────────────────

    private function applyTargets(int $storeId, string $month, Carbon $start, array &$rows): void
    {
        $targetRules = $this->rules->where('type', 'target')->filter(fn ($r) => $this->validOn($r, $start->copy()->endOfMonth()) || $this->validOn($r, $start));
        if ($targetRules->isEmpty()) {
            return;
        }
        $targets = DB::table('incentive_targets')->where('store_id', $storeId)->where('month', $month)->get();
        // A section's achievement is all of its salespeople together.
        $sectionTotals = [];
        foreach ($rows as $id => $row) {
            $dept = $this->employees[$id]->department_id ?? null;
            if ($dept) {
                $sectionTotals[$dept]['amount'] = ($sectionTotals[$dept]['amount'] ?? 0) + $row['net_sales'];
                $sectionTotals[$dept]['qty'] = ($sectionTotals[$dept]['qty'] ?? 0) + $row['qty'];
            }
        }
        foreach ($rows as $id => &$row) {
            $dept = $this->employees[$id]->department_id ?? null;
            foreach ($targetRules as $rule) {
                if (! $this->appliesToPerson($rule, $id)) {
                    continue;
                }
                $useQty = $rule->target_type === 'qty';
                $own = $targets->first(fn ($t) => (int) $t->employee_id === $id);
                $section = $dept ? $targets->first(fn ($t) => (int) $t->department_id === (int) $dept && ! $t->employee_id) : null;
                $target = $own ?? $section;
                $goal = $target ? (float) ($useQty ? $target->target_qty : $target->target_amount) : 0;
                if ($goal <= 0) {
                    continue;
                }
                $achieved = $own ? ($useQty ? $row['qty'] : $row['net_sales'])
                    : (float) ($sectionTotals[$dept][$useQty ? 'qty' : 'amount'] ?? 0);
                $pct = $achieved / $goal * 100;
                $slab = collect($rule->slabs ?? [])->first(fn ($s) => $pct + 0.0001 >= (float) ($s['from'] ?? 0)
                    && (($s['to'] ?? null) === null || $s['to'] === '' || $pct < (float) $s['to']));
                if ($slab) {
                    $row['target_amount'] += ($slab['type'] ?? 'percent') === 'amount'
                        ? (float) $slab['value'] : max(0, $row['net_sales']) * (float) $slab['value'] / 100;
                    $row['achievement_pct'] = round($pct, 1);
                }
            }
        }
        unset($row);
    }

    // ── Rules ───────────────────────────────────────────────────────────────

    private function itemRule(object $line): ?IncentiveRule
    {
        return $this->matching('item', $line)
            ->sortByDesc(fn ($r) => self::SPECIFICITY[$r->scope_type] * 1_000_000 + $r->id)->first();
    }

    /** @return Collection<int, IncentiveRule> */
    private function matching(string $type, object $line): Collection
    {
        $date = Carbon::parse($line->sale_date);

        return $this->rules->where('type', $type)->filter(fn ($r) => $this->validOn($r, $date)
            && $this->coversProduct($r, $line) && $this->appliesToPerson($r, (int) $line->sales_man_id))->values();
    }

    private function coversProduct(IncentiveRule $rule, object $line): bool
    {
        $ids = array_map('strval', (array) ($rule->scope_ids ?? []));

        return match ($rule->scope_type) {
            'product' => in_array((string) $line->product_id, $ids, true),
            'brand' => $line->brand_id !== null && in_array((string) $line->brand_id, $ids, true),
            'category' => $line->category_id !== null && in_array((string) $line->category_id, $ids, true),
            'section' => $line->section !== null && in_array(mb_strtolower(trim((string) $line->section)), array_map(fn ($s) => mb_strtolower(trim($s)), $ids), true),
            default => true,
        };
    }

    private function appliesToPerson(IncentiveRule $rule, ?int $employeeId): bool
    {
        $people = array_map('intval', (array) ($rule->employee_ids ?? []));
        $sections = array_map('intval', (array) ($rule->department_ids ?? []));
        if ($people === [] && $sections === []) {
            return true;
        }

        return ($employeeId && in_array($employeeId, $people, true))
            || ($employeeId && in_array((int) ($this->employees[$employeeId]->department_id ?? 0), $sections, true));
    }

    private function validOn(IncentiveRule $rule, Carbon $date): bool
    {
        return (! $rule->valid_from || $date->copy()->startOfDay()->gte($rule->valid_from->copy()->startOfDay()))
            && (! $rule->valid_to || $date->copy()->startOfDay()->lte($rule->valid_to->copy()->startOfDay()));
    }

    private function amount(IncentiveRule $rule, float $net, float $qty): float
    {
        return $rule->basis === 'per_piece' ? (float) $rule->value * $qty : $net * (float) $rule->value / 100;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function loadEmployees(int $storeId, array $ids): void
    {
        $missing = array_diff(array_unique(array_map('intval', array_filter($ids))), array_keys($this->employees));
        if ($missing === []) {
            return;
        }
        DB::table('employees as e')->leftJoin('hr_departments as d', 'd.id', '=', 'e.department_id')->whereIn('e.id', $missing)
            ->get(['e.id', 'e.code', 'e.name', 'e.department_id', 'e.master_details', 'd.name as section'])
            ->each(function ($e) {
                $e->incentive_pct = (float) (json_decode($e->master_details ?? '[]', true)['incentive_pct'] ?? 0);
                $this->employees[(int) $e->id] = $e;
            });
    }

    private function defaultPct(int $employeeId): float
    {
        return (float) ($this->employees[$employeeId]->incentive_pct ?? 0);
    }

    private function &row(array &$rows, int $employeeId): array
    {
        if (! isset($rows[$employeeId])) {
            $rows[$employeeId] = ['bills' => [], 'qty' => 0.0, 'net_sales' => 0.0, 'item_amount' => 0.0, 'scheme_amount' => 0.0,
                'ageing_amount' => 0.0, 'target_amount' => 0.0, 'returns_amount' => 0.0];
        }

        return $rows[$employeeId];
    }

    private function rounded(array $row): array
    {
        $out = ['net_sales' => round($row['net_sales'], 2), 'qty' => round($row['qty'], 3)];
        foreach (['item_amount', 'scheme_amount', 'ageing_amount', 'target_amount', 'returns_amount'] as $key) {
            $out[$key] = round($row[$key], 2);
        }
        $out['total'] = round(max(0, $out['item_amount'] + $out['scheme_amount'] + $out['ageing_amount'] + $out['target_amount'] + $out['returns_amount']), 2);
        if (isset($row['achievement_pct'])) {
            $out['achievement_pct'] = $row['achievement_pct'];
        }

        return $out;
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function bounds(string $month): array
    {
        if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
            throw ValidationException::withMessages(['month' => 'Choose a month (YYYY-MM).']);
        }
        $start = Carbon::createFromFormat('Y-m-d', $month.'-01')->startOfDay();

        return [$start, $start->copy()->endOfMonth()];
    }
}
