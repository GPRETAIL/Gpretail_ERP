<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="9" style="text-align:center;"><?= esc($company) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="9"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="9">
                Daily Purchase Reports Product Wise from <?= esc($start) ?> Till <?= esc($end) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label("Date") ?></th>
            <th><?= label("Dealer") ?> <?= label("Name") ?></th>
            <th><?= label("Bill") ?> <?= label("Number") ?></th>
            <th><?= label("Product") ?></th>
            <th><?= label("Price") ?></th>
            <th>Qty</th>
            <th><?= label("Sub Total") ?></th>
            <th><?= label("Tax") ?></th>
            <th><?= label("Total") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $db = \Config\Database::connect();
        $totalQty = $subTotal = $totalTax = $grandTotal = 0;

        foreach ($items as $item):
            $supplier = $db->table('suppliers')->select('name')->where('id', $item->supplier)->get()->getRow();
            $product = $db->table('products')->select('name')->where('id', $item->product_id)->get()->getRow();

            $tax = ($item->subtot * $item->cgst) / 100;
            $total = $item->subtot + $tax;

            $totalQty += $item->qt;
            $subTotal += $item->subtot;
            $totalTax += $tax;
            $grandTotal += $total;
        ?>
        <tr>
            <td><?= date("d-m-Y", strtotime($item->ndate)) ?></td>
            <td><?= esc($supplier->name ?? '-') ?></td>
            <td style="text-align:center;"><?= esc($item->purchase_id) ?></td>
            <td><?= esc($product->name ?? '-') ?></td>
            <td style="text-align:right;"><?= number_format($item->cost, $decimals) ?></td>
            <td style="text-align:right;"><?= esc($item->qt) ?></td>
            <td style="text-align:right;"><?= number_format($item->subtot, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($tax, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($total, $decimals) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="5"></td>
            <td style="text-align:right;"><b><?= $totalQty ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($subTotal, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalTax, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($grandTotal, $decimals) ?></b></td>
        </tr>
    </tfoot>
</table>
