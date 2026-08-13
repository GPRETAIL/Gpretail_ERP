<table class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="<?= count($taxRates) + 4 ?>" style="text-align:center"><?= esc($companyName) ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="<?= count($taxRates) + 4 ?>" style="text-align:center"><?= esc($companyAddress) ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="<?= count($taxRates) + 4 ?>" style="text-align:center">Customer Tax Reports from <?= esc(date("d-m-Y", strtotime($startpp))) ?> to <?= esc(date("d-m-Y", strtotime($endpp))) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Customer Name</th>
            <?php foreach ($taxRates as $rate): ?>
                <th><?= esc($rate) ?>%</th>
            <?php endforeach; ?>
            <th>Amount</th>
            <th>Total Tax</th>
            <th>Total</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $totalAmount = $totalTax = $grandTotal = 0;
        ?>
        <?php foreach ($grouped as $custId => $taxData): ?>
            <tr>
                <td><?= esc($customers[$custId] ?? 'Unknown') ?></td>
                <?php
                $custAmount = $custTax = $custTotal = 0;
                ?>
                <?php foreach ($taxRates as $rate): ?>
                    <?php
                    $base = $taxData[$rate] ?? 0;
                    $taxVal = $base * $rate / 100;
                    $custAmount += $base;
                    $custTax += $taxVal;
                    $custTotal += ($base + $taxVal);
                    ?>
                    <td style="text-align:right"><?= number_format($taxVal, $decimals) ?></td>
                <?php endforeach; ?>
                <td style="text-align:right"><?= number_format($custAmount, $decimals) ?></td>
                <td style="text-align:right"><?= number_format($custTax, $decimals) ?></td>
                <td style="text-align:right"><?= number_format($custTotal, $decimals) ?></td>
            </tr>
            <?php
            $totalAmount += $custAmount;
            $totalTax += $custTax;
            $grandTotal += $custTotal;
            ?>
        <?php endforeach; ?>
        <tr style="font-weight:bold">
            <td>Total</td>
            <?php foreach ($taxRates as $rate): ?>
                <td></td>
            <?php endforeach; ?>
            <td style="text-align:right"><?= number_format($totalAmount, $decimals) ?></td>
            <td style="text-align:right"><?= number_format($totalTax, $decimals) ?></td>
            <td style="text-align:right"><?= number_format($grandTotal, $decimals) ?></td>
        </tr>
    </tbody>
</table>