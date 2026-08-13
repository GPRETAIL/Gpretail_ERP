<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="9" style="text-align:center;"><?= esc($setting['companyname']) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="9"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="9">Daily Purchase Reports Product wise from <?= esc($start_display) ?> Till <?= esc($end_display) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th style="border: 1px solid #1c76bc;">Date</th>
            <th style="border: 1px solid #1c76bc;">Dealer Name</th>
            <th style="border: 1px solid #1c76bc;">Bill Number</th>
            <th style="border: 1px solid #1c76bc;">Product</th>
            <th style="border: 1px solid #1c76bc;">Price</th>
            <th style="border: 1px solid #1c76bc;">Qty</th>
            <th style="border: 1px solid #1c76bc;">Sub Total</th>
            <th style="border: 1px solid #1c76bc;">Tax</th>
            <th style="border: 1px solid #1c76bc;">Total</th>
        </tr>
    </thead>
    <tbody>
        <?php 
            $qtyTotal = $subTotal = $taxTotal = $grandTotal = 0;
            foreach ($products as $prd): 
                $supplier = db_connect()->query("SELECT name FROM suppliers WHERE id = '$prd->supplier'")->getRow();
                $product  = db_connect()->query("SELECT name FROM products WHERE id = '$prd->product_id'")->getRow();
                $tax      = ($prd->subtot * $prd->cgst) / 100;
                $total    = $prd->subtot + $tax;
                $qtyTotal += $prd->qt;
                $subTotal += $prd->subtot;
                $taxTotal += $tax;
                $grandTotal += $total;
        ?>
        <tr>
            <td><?= date("d-m-Y", strtotime($prd->ndate)) ?></td>
            <td><?= esc($supplier->name ?? '') ?></td>
            <td><?= $prd->purchase_id ?></td>
            <td><?= esc($product->name ?? '') ?></td>
            <td style="text-align:right;"><?= number_format((float)$prd->cost, $setting['decimals'], '.', '') ?></td>
            <td style="text-align:right;"><?= $prd->qt ?></td>
            <td style="text-align:right;"><?= number_format((float)$prd->subtot, $setting['decimals'], '.', '') ?></td>
            <td style="text-align:right;"><?= number_format((float)$tax, $setting['decimals'], '.', '') ?></td>
            <td style="text-align:right;"><?= number_format((float)$total, $setting['decimals'], '.', '') ?></td>
        </tr>
        <?php endforeach; ?>
        <tr>
            <td colspan="5"></td>
            <td style="text-align:right;"><b><?= $qtyTotal ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format((float)$subTotal, $setting['decimals'], '.', '') ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format((float)$taxTotal, $setting['decimals'], '.', '') ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format((float)$grandTotal, $setting['decimals'], '.', '') ?></b></td>
        </tr>
    </tbody>
</table>
