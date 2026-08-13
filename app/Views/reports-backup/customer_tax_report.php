<!-- app/Views/reports/customer_tax_report.php -->

<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="<?= count($taxRates) + 4 ?>" style="text-align:center;"><?= esc($companyName) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="<?= count($taxRates) + 4 ?>"><?= esc($companyAddress) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="<?= count($taxRates) + 4 ?>">Customer Tax Reports from <?= esc($startFormatted) ?> Till <?= esc($endFormatted) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;"><?= label('Customer') . ' ' . label('Name') ?></th>
            <?php foreach ($taxRates as $rate): ?>
                <th style="border: 1px solid #1c76bc;"><?= esc($rate) ?>%</th>
            <?php endforeach; ?>
            <th style="border: 1px solid #1c76bc;"><?= label("Amount") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Total") . ' ' . label("tax") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Total") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($reportData as $row): ?>
            <tr>
                <th style="border: 1px solid #1c76bc;"><?= esc($row['customerName']) ?></th>
                <?php foreach ($taxRates as $rate): ?>
                    <th style="border: 1px solid #1c76bc; text-align:right;">
                        <?= number_format((float)($row['taxAmounts'][$rate] ?? 0), $decimals, '.', '') ?>
                    </th>
                <?php endforeach; ?>
                <th style="border: 1px solid #1c76bc; text-align:right;"><?= number_format($row['amount'], $decimals, '.', '') ?></th>
                <th style="border: 1px solid #1c76bc; text-align:right;"><?= number_format($row['tax'], $decimals, '.', '') ?></th>
                <th style="border: 1px solid #1c76bc; text-align:right;"><?= number_format($row['total'], $decimals, '.', '') ?></th>
            </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td style="border: 1px solid #1c76bc;"></td>
            <?php foreach ($taxRates as $i => $rate): ?>
                <td style="border: 1px solid #1c76bc;<?= $i === 0 ? 'text-align:center;' : '' ?>">
                    <?= $i === 0 ? label('Total') : '' ?>
                </td>
            <?php endforeach; ?>
            <td style="border: 1px solid #1c76bc; text-align:right;"><b>Rs.<?= number_format($grandTotals['amount'], $decimals, '.', '') ?></b></td>
            <td style="border: 1px solid #1c76bc; text-align:right;"><b>Rs.<?= number_format($grandTotals['tax'], $decimals, '.', '') ?></b></td>
            <td style="border: 1px solid #1c76bc; text-align:right;"><b>Rs.<?= number_format($grandTotals['total'], $decimals, '.', '') ?></b></td>
        </tr>
    </tfoot>
</table>
