<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="12" style="text-align:center;"><?= esc($settings['companyname']) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="12"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="12">Dealer Purchase Report from <?= esc($start) ?> Till <?= esc($end) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border:1px solid #1c76bc;">
            <th><?= label("Date") ?></th>
            <th><?= label("Dealer") ?> <?= label("Name") ?></th>
            <th><?= label("Bill") ?> <?= label("Number") ?></th>
            <th>Invo <?= label("Number") ?></th>
            <th><?= label("Bill") ?> <?= label("Amount") ?></th>
            <th><?= label("tax") ?></th>
            <th><?= label("Discount") ?></th>
            <th><?= label("Amount") ?></th>
            <th><?= label("Return") ?> <?= label("Amount") ?></th>
            <th><?= label("Net") ?> <?= label("Amount") ?></th>
            <th><?= label("Paid") ?></th>
            <th><?= label("Balanceamt") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($data as $row): ?>
            <tr>
                <td><?= esc($row['date']) ?></td>
                <td><?= esc($row['supplier']) ?></td>
                <td class="text-center"><?= esc($row['bill_no']) ?></td>
                <td class="text-center"><?= esc($row['invoice_no']) ?></td>
                <td class="text-end"><?= number_format($row['betot'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['tax'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['disc'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['total'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['return'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['net'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['paid'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['balance'], $settings['decimals'], '.', '') ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr style="background:#e2e2e2;font-weight:bold;">
            <td colspan="4" style="text-align:right;"><?= label("Total") ?>:</td>
            <td class="text-end">Rs. <?= number_format($summary['billamt'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['tottax'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['discc'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['toott'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['toott_return'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['toott_ggg'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['paidd'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['balance'], $settings['decimals'], '.', '') ?></td>
        </tr>
    </tfoot>
</table>
