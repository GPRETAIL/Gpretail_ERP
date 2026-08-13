<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="8" style="text-align:center;"><?= esc($company['companyname']) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="8"> <?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="8">Product Reports from <?= esc($start_date) ?> Till <?= esc($end_date) ?></th>
        </tr>
        <tr style="border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;"><?= label('SaleNum') ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label('ProductName') ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label('Cost') ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label('Price') ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label('Quantity') ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label('tax') ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label('Total') ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label('Status') ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($products as $row): ?>
            <tr style="<?= $row['row_style'] ?>">
                <td style="border: 1px solid #1c76bc;"><?= esc($row['sale_id']) ?></td>
                <td style="border: 1px solid #1c76bc;"><?= esc($row['name']) ?></td>
                <td style="border: 1px solid #1c76bc;text-align:right;"><?= number_format($row['perprice'], $decimals, '.', '') ?></td>
                <td style="border: 1px solid #1c76bc;text-align:right;"><?= number_format($row['subtotal2'], $decimals, '.', '') ?></td>
                <td style="border: 1px solid #1c76bc;text-align:right;"><?= esc($row['qt']) ?></td>
                <td style="border: 1px solid #1c76bc;text-align:right;"><?= number_format($row['tax'], $decimals, '.', '') ?></td>
                <td style="border: 1px solid #1c76bc;text-align:right;"><?= number_format($row['subtotal'], $decimals, '.', '') ?></td>
                <td style="border: 1px solid #1c76bc;text-align:center;"><?= esc($row['status']) ?></td>
            </tr>
        <?php endforeach; ?>

        <tr style="border: 1px solid #1c76bc;">
            <td colspan="5" style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;text-align:right;">Total</td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><?= number_format($total_profit, $decimals, '.', '') ?></td>
            <td style="border: 1px solid #1c76bc;"></td>
        </tr>
        <tr style="border: 1px solid #1c76bc;">
            <td colspan="5" style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;text-align:right;">Total Cancelled</td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><?= number_format($total_cancelled, $decimals, '.', '') ?></td>
            <td style="border: 1px solid #1c76bc;"></td>
        </tr>
    </tbody>
</table>
