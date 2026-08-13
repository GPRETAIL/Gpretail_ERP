<table id="chltkarr" class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="<?= 3 + count($taxRates) ?>" class="text-center"><?= esc($settings['companyname']) ?></th>
        </tr>
        <tr class="hideme text-center">
            <th colspan="<?= 3 + count($taxRates) ?>"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme text-center">
            <th colspan="<?= 3 + count($taxRates) ?>">Customer Tax Reports from <?= esc($start) ?> to <?= esc($end) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Customer Name</th>
            <?php foreach ($taxRates as $rate): ?>
                <th><?= $rate ?>%</th>
            <?php endforeach; ?>
            <th>Amount</th>
            <th>Total Tax</th>
            <th>Total</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $sumAmount = $sumTax = $sumTotal = 0;
        foreach ($structured as $custId => $taxData):
            $custName = $customers[$custId] ?? 'Unknown';
            $rowAmount = $rowTax = 0;
        ?>
            <tr>
                <td><?= esc($custName) ?></td>
                <?php foreach ($taxRates as $rate):
                    $subtotal = $taxData[$rate] ?? 0;
                    // $taxAmt = ($subtotal * $rate) / 100;
                    $taxAmt = ((float) $subtotal) * ((float) $rate) / 100;
                    $totalAmt = $subtotal + $taxAmt;
                    $rowAmount += $subtotal;
                    $rowTax += $taxAmt;
                    $rowTotal = $rowAmount + $rowTax;
                ?>
                    <td class="text-end"><?= number_format($taxAmt, $decimals) ?></td>
                <?php endforeach; ?>
                <td class="text-end"><?= number_format($rowAmount, $decimals) ?></td>
                <td class="text-end"><?= number_format($rowTax, $decimals) ?></td>
                <td class="text-end"><?= number_format($rowTotal, $decimals) ?></td>
            </tr>
        <?php
            $sumAmount += $rowAmount;
            $sumTax += $rowTax;
            $sumTotal += $rowTotal;
        endforeach; ?>
        <tr>
            <td><b>Total</b></td>
            <?php foreach ($taxRates as $rate): ?>
                <td></td>
            <?php endforeach; ?>
            <td class="text-end"><b><?= number_format($sumAmount, $decimals) ?></b></td>
            <td class="text-end"><b><?= number_format($sumTax, $decimals) ?></b></td>
            <td class="text-end"><b><?= number_format($sumTotal, $decimals) ?></b></td>
        </tr>
    </tbody>
</table>