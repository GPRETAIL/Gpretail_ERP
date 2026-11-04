<?php

namespace App\Services\Hr;

/**
 * Income tax on a year's taxable income under one regime's rules (see PayrollSetup::TAX): tax by slabs, the
 * rebate (nil tax up to the limit; in the new regime, never more tax than the income above the limit), surcharge
 * on high incomes with its marginal relief, and health and education cess.
 */
class TaxCalculator
{
    /**
     * @param  array  $regime  ['slabs' => [[from, to|null, %]...], 'rebate_limit', 'rebate_max', 'marginal_relief', 'surcharge' => [[above, %]...]]
     * @return array{slab_tax: float, rebate: float, surcharge: float, cess: float, total: float}
     */
    public function annualTax(array $regime, float $taxable, float $cessPct = 4): array
    {
        $taxable = max(0, $taxable);
        $slabTax = $this->slabTax($regime['slabs'] ?? [], $taxable);

        $rebate = 0.0;
        $limit = (float) ($regime['rebate_limit'] ?? 0);
        if ($taxable <= $limit) {
            $rebate = min($slabTax, (float) ($regime['rebate_max'] ?? 0));
        } elseif (! empty($regime['marginal_relief']) && $slabTax > $taxable - $limit) {
            // Just above the limit: pay no more than the income above it.
            $rebate = $slabTax - ($taxable - $limit);
        }
        $tax = $slabTax - $rebate;

        $surcharge = 0.0;
        $bands = collect($regime['surcharge'] ?? [])->sortBy(fn ($band) => (float) $band[0])->values();
        $band = $bands->filter(fn ($b) => $taxable > (float) $b[0])->last();
        if ($band) {
            $surcharge = $tax * (float) $band[1] / 100;
            // Marginal relief: tax plus surcharge may exceed the tax at the threshold by no more than the income above it.
            $threshold = (float) $band[0];
            $previous = $bands->filter(fn ($b) => $threshold > (float) $b[0])->last();
            $atThreshold = $this->slabTax($regime['slabs'] ?? [], $threshold) * (1 + ($previous ? (float) $previous[1] / 100 : 0));
            $surcharge = max(0, min($surcharge, $atThreshold + ($taxable - $threshold) - $tax));
        }

        $cess = ($tax + $surcharge) * $cessPct / 100;

        return ['slab_tax' => round($slabTax, 2), 'rebate' => round($rebate, 2), 'surcharge' => round($surcharge, 2), 'cess' => round($cess, 2),
            'total' => round($tax + $surcharge + $cess)];
    }

    private function slabTax(array $slabs, float $income): float
    {
        $tax = 0.0;
        foreach ($slabs as [$from, $to, $pct]) {
            if ($income > (float) $from) {
                $upper = $to === null || $to === '' ? $income : min($income, (float) $to);
                $tax += max(0, $upper - (float) $from) * (float) $pct / 100;
            }
        }

        return $tax;
    }
}
