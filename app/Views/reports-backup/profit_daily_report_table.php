<table id="chltkarr" class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme"><th colspan="7" class="text-center"><?= esc($company) ?></th></tr>
        <tr class="hideme"><th colspan="7" class="text-center"><?= esc($address) ?></th></tr>
        <tr class="hideme"><th colspan="7" class="text-center">Profit Reports from <?= esc($start) ?> Till <?= esc($end) ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Date</th>
            <th>Purchase</th>
            <th>Sales</th>
            <th>Cancel</th>
            <th>Return</th>
            <th>Goods Out</th>
            <th>Profit</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($rows as $row): ?>
        <tr>
            <td style="text-align:center"><?= date('d-m-Y', strtotime($row['date'])) ?></td>
            <td style="text-align:right"><?= number_format($row['purchase'], $decimals) ?></td>
            <td style="text-align:right"><?= number_format($row['sales'], $decimals) ?></td>
            <td style="text-align:right"><?= number_format($row['cancel'], $decimals) ?></td>
            <td style="text-align:right"><?= number_format($row['return'], $decimals) ?></td>
            <td style="text-align:right"><?= number_format($row['goods_out'], $decimals) ?></td>
            <td style="text-align:right"><?= number_format($row['profit'], $decimals) ?></td>
        </tr>
        <?php endforeach; ?>
        <tr>
            <td class="text-right"><b>Total</b></td>
            <td class="text-right"><b><?= number_format($totals['purchase'], $decimals) ?></b></td>
            <td class="text-right"><b><?= number_format($totals['sales'], $decimals) ?></b></td>
            <td class="text-right"><b><?= number_format($totals['cancel'], $decimals) ?></b></td>
            <td class="text-right"><b><?= number_format($totals['return'], $decimals) ?></b></td>
            <td class="text-right"><b><?= number_format($totals['goods_out'], $decimals) ?></b></td>
            <td class="text-right"><b><?= number_format($totals['profit'], $decimals) ?></b></td>
        </tr>
    </tbody>
</table>
