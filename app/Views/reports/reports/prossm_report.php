<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="7" style="text-align:center;"><?= esc($company) ?></th></tr>
        <tr class="hideme" style="text-align:center;"><th colspan="7"><?= esc($address) ?></th></tr>
        <tr class="hideme" style="text-align:center;"><th colspan="7">Monthly Summary HSN Sales Reports from <?= esc($start) ?> Till <?= esc($end) ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label("Total") ?> <?= label("Bill") ?></th>
            <th><?= label("HSN") ?> <?= label("Name") ?></th>
            <th><?= label("Date") ?></th>
            <th><?= label("NoOfItems") ?></th>
            <th><?= label("MRP") ?></th>
            <th><?= label("Discount") ?></th>
            <th><?= label("Total") ?> <?= label("Amount") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($rows as $row): ?>
            <tr>
                <td><?= esc($row['bills']) ?></td>
                <td><?= esc($row['hsn']) ?></td>
                <td><?= esc($row['month']) ?></td>
                <td style="text-align:right;"><?= esc($row['qty']) ?></td>
                <td style="text-align:right;"><?= number_format($row['price'], $decimals) ?></td>
                <td style="text-align:right;"><?= number_format($row['discount'], $decimals) ?></td>
                <td style="text-align:right;"><?= number_format($row['total'], $decimals) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="3"></td>
            <td style="text-align:right;"><b><?= esc($billamt) ?></b></td>
            <td></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($discc, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($paidd, $decimals) ?></b></td>
        </tr>
    </tfoot>
</table>
