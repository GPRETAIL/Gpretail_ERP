<table class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr>
            <th>S.no</th>
            <th><?= label("ProductName") ?></th>
            <th class="text-center">GST <?= label("tax") ?></th>
            <th class="text-center">Qty</th>
            <th class="text-center"><?= label("Unit") ?></th>
            <th class="text-center"><?= label("Price") ?></th>
            <th class="text-center"><?= label("Total") ?></th>
            <th class="text-center">CGST</th>
            <th class="text-center">SGST</th>
            <th class="text-center"><?= label("Total") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $tt = 1;
        $totalAmount = $totalCgst = $totalSgst = $grandTotal = 0;
        foreach ($saleItems as $item):
            $unit = $productUnits[$item->product_id] ?? '';
            $cgst = ($item->cgst * $item->nnn * $item->price) / 100;
            $sgst = ($item->sgst * $item->nnn * $item->price) / 100;
            $subtotal = $item->price * $item->nnn;
            $total = $subtotal + $cgst + $sgst;

            $totalAmount += $subtotal;
            $totalCgst += $cgst;
            $totalSgst += $sgst;
            $grandTotal += $total;
        ?>
        <tr>
            <td><?= $tt++ ?></td>
            <td><?= esc($item->name) ?></td>
            <td class="text-end"><?= esc($item->tottax) ?>%</td>
            <td class="text-end"><?= esc($item->nnn) ?></td>
            <td class="text-end"><?= esc($unit) ?></td>
            <td class="text-end"><?= number_format($item->price, $decimals) ?></td>
            <td class="text-end"><?= number_format($subtotal, $decimals) ?></td>
            <td class="text-end"><?= number_format($cgst, $decimals) ?></td>
            <td class="text-end"><?= number_format($sgst, $decimals) ?></td>
            <td class="text-end"><?= number_format($total, $decimals) ?></td>
        </tr>
        <?php endforeach; ?>
        <tr>
            <td colspan="6" class="text-end"><b><?= label("Total") ?></b></td>
            <td class="text-end"><b>Rs.<?= number_format($totalAmount, $decimals) ?></b></td>
            <td class="text-end"><b>Rs.<?= number_format($totalCgst, $decimals) ?></b></td>
            <td class="text-end"><b>Rs.<?= number_format($totalSgst, $decimals) ?></b></td>
            <td class="text-end"><b>Rs.<?= number_format($grandTotal, $decimals) ?></b></td>
        </tr>
    </tbody>
</table>
