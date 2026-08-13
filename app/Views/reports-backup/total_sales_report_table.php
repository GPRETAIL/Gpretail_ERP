<table id="chltkarr" class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="9" style="text-align:center"><?= esc($company) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="9"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="9">Sales Summary Reports from <?= esc($startDate) ?> Till <?= esc($endDate) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label("Total") . ' ' . label("Bill") ?></th>
            <th><?= label("Date") ?></th>
            <th><?= label("NoOfItems") ?></th>
            <th><?= label("Total") . ' ' . label("Amount") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $totalSub = $totalCancel = $totalReturn = 0;
        foreach ($salesData as $sale):
            $created = date('d-m-Y', strtotime($sale->created_at));
            $totalSub += $sale->toot;
            $totalCancel += $sale->total_can;
            $returnAmt = $returnTotals[$sale->created_at] ?? 0;
            $totalReturn += $returnAmt;
        ?>
        <tr>
            <td style="text-align:center"><?= $sale->tbils ?></td>
            <td style="text-align:center"><?= $created ?></td>
            <td style="text-align:center"><?= $sale->noofitem ?></td>
            <td style="text-align:right"><?= number_format($sale->toot, $decimals, '.', '') ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="2"></td>
            <td><b>Sub Total</b></td>
            <td style="text-align:right"><b><?= number_format($totalSub, $decimals, '.', '') ?></b></td>
        </tr>
        <tr>
            <td colspan="2"></td>
            <td><b>Cancel</b></td>
            <td style="text-align:right"><b><?= number_format($totalCancel, $decimals, '.', '') ?></b></td>
        </tr>
        <tr>
            <td colspan="2"></td>
            <td><b>Return</b></td>
            <td style="text-align:right"><b><?= number_format($totalReturn, $decimals, '.', '') ?></b></td>
        </tr>
        <tr>
            <td colspan="2"></td>
            <td><b>Total</b></td>
            <td style="text-align:right"><b><?= number_format(($totalSub - $totalCancel - $totalReturn), $decimals, '.', '') ?></b></td>
        </tr>
    </tfoot>
</table>
