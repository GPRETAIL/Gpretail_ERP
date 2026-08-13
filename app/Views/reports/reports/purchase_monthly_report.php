<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="10" style="text-align:center;"><?= esc($settings['companyname']) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="10"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="10">Purchase Monthly Summary Reports from <?= date('d-m-Y', strtotime($start)) ?> Till <?= date('d-m-Y', strtotime($end)) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border:1px solid #1c76bc;">
            <th><?= label("Date") ?></th>
            <th><?= label("Bill") ?></th>
            <th><?= label("Bill") . ' ' . label("Amount") ?></th>
            <th><?= label("tax") ?></th>
            <th><?= label("Discount") ?></th>
            <th><?= label("Amount") ?></th>
            <th><?= label("Return") . ' ' . label("Amount") ?></th>
            <th><?= label("Net") . ' ' . label("Amount") ?></th>
            <th><?= label("Paid") ?></th>
            <th><?= label("Balanceamt") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($data as $row): ?>
            <tr>
                <td><?= date('m-Y', strtotime($row['month'])) ?></td>
                <td class="text-center"><?= esc($row['bills']) ?></td>
                <td class="text-end"><?= number_format($row['billamt'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['tax'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['disc'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['netamtt'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['returnamt'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['netafterreturn'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['paid'], $settings['decimals'], '.', '') ?></td>
                <td class="text-end"><?= number_format($row['balance'], $settings['decimals'], '.', '') ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr style="background:#e2e2e2;font-weight:bold;">
            <td colspan="2" style="text-align:right;"><?= label("Total") ?>:</td>
            <td class="text-end">Rs. <?= number_format($summary['billamt'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['tottax'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['discc'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['toott'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['paidd_rrr'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['toott'] - $summary['paidd_rrr'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['paidd'], $settings['decimals'], '.', '') ?></td>
            <td class="text-end">Rs. <?= number_format($summary['toott'] - $summary['paidd'] - $summary['paidd_rrr'], $settings['decimals'], '.', '') ?></td>
        </tr>
    </tfoot>
</table>
