<table id="chltkarr" class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme"><th colspan="9" style="text-align:center;"><?= esc($company) ?></th></tr>
        <tr class="hideme"><th colspan="9" style="text-align:center;"><?= esc($address) ?></th></tr>
        <tr class="hideme"><th colspan="9" style="text-align:center;">Monthly Sales Reports from <?= esc($startDate) ?> Till <?= esc($endDate) ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Total Bills</th>
            <th>Month</th>
            <th>No Of Items</th>
            <th>Total Amount</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $billamt = $cancel = $return = 0;
        foreach ($salesData as $row):
            $monthKey = date('Y-m', strtotime($row->created_at));
            $monthLabel = date('m-Y', strtotime($row->created_at));
            $billamt += $row->toot;
            $cancel += $row->total_can;
            $returnAmt = $returns[$monthKey] ?? 0;
            $return += $returnAmt;
        ?>
        <tr>
            <td><?= $row->tbils ?></td>
            <td><?= $monthLabel ?></td>
            <td><?= $row->noofitem ?></td>
            <td style="text-align:right">Rs. <?= number_format($row->toot, $decimals, '.', '') ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="2"></td>
            <td><b>Sub Total</b></td>
            <td style="text-align:right"><b>Rs. <?= number_format($billamt, $decimals, '.', '') ?></b></td>
        </tr>
        <tr>
            <td colspan="2"></td>
            <td><b>Cancel</b></td>
            <td style="text-align:right"><b>Rs. <?= number_format($cancel, $decimals, '.', '') ?></b></td>
        </tr>
        <tr>
            <td colspan="2"></td>
            <td><b>Return</b></td>
            <td style="text-align:right"><b>Rs. <?= number_format($return, $decimals, '.', '') ?></b></td>
        </tr>
        <tr>
            <td colspan="2"></td>
            <td><b>Total</b></td>
            <td style="text-align:right"><b>Rs. <?= number_format($billamt - $cancel - $return, $decimals, '.', '') ?></b></td>
        </tr>
    </tfoot>
</table>
