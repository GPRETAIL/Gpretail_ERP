<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="9" style="text-align:center;"><?= esc($company) ?></th></tr>
        <tr class="hideme" style="text-align:center;"><th colspan="9"><?= esc($address) ?></th></tr>
        <tr class="hideme" style="text-align:center;"><th colspan="9">Monthly Sales Reports from <?= esc($start) ?> Till <?= esc($end) ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th>Total Bill</th>
            <th>Month</th>
            <th>No Of Items</th>
            <th>Total Amount</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($rows as $row): ?>
        <tr>
            <td><?= esc($row['bills']) ?></td>
            <td><?= esc($row['month']) ?></td>
            <td><?= esc($row['items']) ?></td>
            <td style="text-align:right;"><?= number_format($row['amount'], $decimals) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="2"></td>
            <td><b>Sub Total</b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($subTotal, $decimals) ?></b></td>
        </tr>
        <tr>
            <td colspan="2"></td>
            <td><b>Cancel</b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($cancelTotal, $decimals) ?></b></td>
        </tr>
        <tr>
            <td colspan="2"></td>
            <td><b>Return</b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($returnTotal, $decimals) ?></b></td>
        </tr>
        <tr>
            <td colspan="2"></td>
            <td><b>Total</b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($netTotal, $decimals) ?></b></td>
        </tr>
    </tfoot>
</table>
