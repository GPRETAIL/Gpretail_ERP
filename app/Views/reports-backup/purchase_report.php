<table class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr>
            <th>S.no</th>
            <th><?= label("ProductName") ?></th>
            <th style="text-align:center;">GST <?= label("tax") ?></th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:center;"><?= label("Unit") ?></th>
            <th style="text-align:center;"><?= label("Price") ?></th>
            <th style="text-align:center;"><?= label("Total") ?></th>
            <th style="text-align:center;">CGST</th>
            <th style="text-align:center;">SGST</th>
            <th style="text-align:center;"><?= label("Total") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($rows as $row): ?>
            <tr>
                <td><?= esc($row['sn']) ?></td>
                <td><?= esc($row['name']) ?></td>
                <td style="text-align:right;"><?= esc($row['tax']) ?>%</td>
                <td style="text-align:right;"><?= esc($row['qty']) ?></td>
                <td style="text-align:right;"><?= esc($row['unit']) ?></td>
                <td style="text-align:right;"><?= number_format($row['price'], $decimals, '.', '') ?></td>
                <td style="text-align:right;"><?= number_format($row['total'], $decimals, '.', '') ?></td>
                <td style="text-align:right;"><?= number_format($row['cgst'], $decimals, '.', '') ?></td>
                <td style="text-align:right;"><?= number_format($row['sgst'], $decimals, '.', '') ?></td>
                <td style="text-align:right;"><?= number_format($row['gtotal'], $decimals, '.', '') ?></td>
            </tr>
        <?php endforeach; ?>
        <tr>
            <td colspan="6"><strong><?= label("Total") ?></strong></td>
            <td style="text-align:right;"><b>Rs. <?= number_format($totalprofit, $decimals, '.', '') ?></b></td>
            <td style="text-align:right;"><b>Rs. <?= number_format($totalprocg, $decimals, '.', '') ?></b></td>
            <td style="text-align:right;"><b>Rs. <?= number_format($totalprosg, $decimals, '.', '') ?></b></td>
            <td style="text-align:right;"><b>Rs. <?= number_format($gtotal, $decimals, '.', '') ?></b></td>
        </tr>
    </tbody>
</table>
