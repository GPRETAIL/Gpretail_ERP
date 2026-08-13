<table id="chltkarr" class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="8" class="text-center"><?= esc($settings['companyname']) ?></th>
        </tr>
        <tr class="hideme text-center">
            <th colspan="8"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme text-center">
            <th colspan="8">Product Reports from <?= esc(date('d-m-Y', strtotime($start))) ?> Till <?= esc(date('d-m-Y', strtotime($end))) ?></th>
        </tr>
        <tr style="border: 1px solid #1c76bc;">
            <th>Sale #</th>
            <th>Product Name</th>
            <th>Cost</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Tax</th>
            <th>Total</th>
            <th>Status</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $total = 0;
        $totalCancelled = 0;
        foreach ($saleItems as $item):
            $style = $item->sale_status == 3 ? 'background:#e9c0c0;' : '';
            $total += $item->subtotal;
            if ($item->sale_status == 3) {
                $totalCancelled += $item->subtotal;
            }
        ?>
        <tr style="<?= $style ?>">
            <td><?= esc($item->sale_id) ?></td>
            <td><?= esc($item->name) ?></td>
            <td class="text-end"><?= number_format($item->perprice, $decimals) ?></td>
            <td class="text-end"><?= number_format($item->subtotal2, $decimals) ?></td>
            <td class="text-end"><?= esc($item->qt) ?></td>
            <td class="text-end"><?= number_format($item->tax, $decimals) ?></td>
            <td class="text-end"><?= number_format($item->subtotal, $decimals) ?></td>
            <td class="text-center"><?= esc($item->status_label) ?></td>
        </tr>
        <?php endforeach; ?>
        <tr>
            <td colspan="5"></td>
            <td class="text-end"><b>Total</b></td>
            <td class="text-end"><?= number_format($total, $decimals) ?></td>
            <td></td>
        </tr>
        <tr>
            <td colspan="5"></td>
            <td class="text-end"><b>Cancelled</b></td>
            <td class="text-end"><?= number_format($totalCancelled, $decimals) ?></td>
            <td></td>
        </tr>
    </tbody>
</table>
