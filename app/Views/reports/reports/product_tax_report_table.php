<table class="table table-striped table-bordered" id="chltkarr" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="11" style="text-align:center;"><?= esc($settings['companyname']) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="11"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="11">Product Tax Reports from <?= esc($start) ?> to <?= esc($end) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Sales ID</th>
            <th>Product</th>
            <th>Store</th>
            <th>GST</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Purchase Price</th>
            <th>MRP</th>
            <th>Selling</th>
            <th>Total</th>
            <th>Discount</th>
            <th>CGST+SGST</th>
            <th>IGST</th>
            <th>Profit</th>
            <th>Status</th>
        </tr>
    </thead>
    <tbody>
    <?php
    $totalprofit = $cgstTotal = $igstTotal = $discountTotal = $profitTotal = 0;

    foreach ($saleItems as $item):
        $sale = $db->query("SELECT * FROM $saleTable WHERE id = {$item->sale_id}")->getRow();
        $product = $db->query("SELECT unit FROM products WHERE id = {$item->product_id}")->getRow();
        $status = $item->cancel_status ? 'Cancel' : 'Sales';
        $rowStyle = $item->cancel_status ? 'background:#e9c0c0;' : '';
        $discountAmt = ($item->dis_per > 0) ? $item->dis_per : ($item->subtotal * $sale->discountamount / $sale->subtotal);
        $cgst = $item->cgst > 0 ? $item->subtotal * $item->cgst / (100 + $item->cgst) : 0;
        $igst = $item->igstt > 0 ? $item->subtotal * $item->igstt / (100 + $item->igstt) : 0;
        $profit = $item->subtotal - $discountAmt - $cgst - $igst - ($item->qt * $item->perprice);

        $totalprofit += $item->subtotal;
        $discountTotal += $discountAmt;
        $cgstTotal += $cgst;
        $igstTotal += $igst;
        $profitTotal += $profit;
    ?>
        <tr style="<?= $rowStyle ?>">
            <td><?= $item->sale_id ?></td>
            <td><?= esc($item->name) ?></td>
            <td><?= esc($store['name']) ?></td>
            <td><?= $item->cgst > 0 ? $item->cgst . '%' : $item->igstt . '%' ?></td>
            <td><?= $item->qt ?></td>
            <td><?= esc($product->unit ?? '') ?></td>
            <td><?= number_format($item->perprice, $settings['decimals']) ?></td>
            <td><?= number_format($item->mrpp, $settings['decimals']) ?></td>
            <td><?= number_format($item->price, $settings['decimals']) ?></td>
            <td><?= number_format($item->subtotal, $settings['decimals']) ?></td>
            <td><?= number_format($discountAmt, $settings['decimals']) ?></td>
            <td><?= number_format($cgst, $settings['decimals']) ?></td>
            <td><?= number_format($igst, $settings['decimals']) ?></td>
            <td><?= number_format($profit, $settings['decimals']) ?></td>
            <td><?= $status ?></td>
        </tr>
    <?php endforeach ?>
    </tbody>
    <tfoot>
        <tr>
            <th colspan="9" class="text-right">Totals</th>
            <th><?= number_format($totalprofit, $settings['decimals']) ?></th>
            <th><?= number_format($discountTotal, $settings['decimals']) ?></th>
            <th><?= number_format($cgstTotal, $settings['decimals']) ?></th>
            <th><?= number_format($igstTotal, $settings['decimals']) ?></th>
            <th><?= number_format($profitTotal, $settings['decimals']) ?></th>
        </tr>
    </tfoot>
</table>
