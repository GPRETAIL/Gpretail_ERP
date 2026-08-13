<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="7" style="text-align:center;"><?= esc($company) ?></th></tr>
        <tr class="hideme" style="text-align:center;"><th colspan="7"><?= esc($address) ?></th></tr>
        <tr class="hideme" style="text-align:center;"><th colspan="7">Profit Reports from <?= esc($start) ?> Till <?= esc($end) ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th style="text-align:center;">Date</th>
            <th style="text-align:center;">Purchase</th>
            <th style="text-align:center;">Sales</th>
            <th style="text-align:center;">Cancel</th>
            <th style="text-align:center;">Return</th>
            <th style="text-align:center;">Goods Out</th>
            <th style="text-align:center;">Profit</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($rows as $row): ?>
        <tr>
            <td style="text-align:center;"><?= esc($row['date']) ?></td>
            <td style="text-align:right;"><?= number_format($row['purchase'], $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($row['sales'], $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($row['cancel'], $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($row['return'], $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($row['goodsout'], $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($row['profit'], $decimals) ?></td>
        </tr>
        <?php endforeach; ?>
        <tr>
            <td style="text-align:right;"><b>Total</b></td>
            <td style="text-align:right;"><b><?= number_format($totals['purchase'], $decimals) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($totals['sales'], $decimals) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($totals['cancel'], $decimals) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($totals['return'], $decimals) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($totals['goodsout'], $decimals) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($totals['profit'], $decimals) ?></b></td>
        </tr>
    </tbody>
</table>
