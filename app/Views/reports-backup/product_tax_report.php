<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="15" style="text-align:center;"><?= esc($company) ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="15" style="text-align:center;"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="15" style="text-align:center;">
                Product Tax Reports from <?= date("d-m-Y", strtotime($start)) ?> Till <?= date("d-m-Y", strtotime($end)) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Sales ID</th>
            <th><?= label("ProductName") ?></th>
            <th><?= label("Stores") ?></th>
            <th>GST</th>
            <th>Qty</th>
            <th><?= label("Unit") ?></th>
            <th>Purchase<br>Price</th>
            <th>MRP<br>Price</th>
            <th><?= label("Selling") ?></th>
            <th><?= label("Total") ?></th>
            <th><?= label("Discount") ?></th>
            <th>CGST+SGST</th>
            <th>IGST</th>
            <th>Profit</th>
            <th>Status</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $db = \Config\Database::connect();
        $dec = $settings['decimals'] ?? 2;

        // Init totals
        $totalSub = $totalDisc = $totalCGST = $totalIGST = $totalProfit = 0;
        $cancelSub = $cancelDisc = $cancelCGST = $cancelIGST = 0;
        $returnSub = $returnDisc = $returnCGST = $returnIGST = 0;

        foreach ($items as $item):
            $storeName = $db->table('stores')->select('name')->where('id', $item->store_irrdd)->get()->getRow('name');
            $unit = $db->table('products')->select('unit')->where('id', $item->product_id)->get()->getRow('unit');
            $sale = $db->table($sales_table)->where('id', $item->sale_id)->get()->getRowArray();
            $discount_per = $sale['subtotal'] ? ($sale['discountamount'] * 100 / $sale['subtotal']) : 0;
            $discount_amt = $item->dis_per > 0 ? $item->dis_per : ($item->subtotal * $discount_per / 100);
            $adjusted_total = $item->subtotal - $discount_amt;

            if ($item->cgst > 0) {
                $cgst_sgst = $adjusted_total - ($adjusted_total / (1 + ($item->cgst / 100)));
                $igst = 0;
                $gst = $item->cgst;
            } else {
                $cgst_sgst = 0;
                $igst = $adjusted_total - ($adjusted_total / (1 + ($item->igstt / 100)));
                $gst = $item->igstt;
            }

            $profit = $item->subtotal - $discount_amt - $cgst_sgst - $igst - ($item->qt * $item->perprice);

            // Determine status
            $status = 'Sales';
            $row_style = '';
            if ($item->cancel_status == 1) {
                $status = 'Cancel';
                $row_style = 'style="background:#e9c0c0;"';
                $cancelSub += $item->subtotal;
                $cancelDisc += $discount_amt;
                $cancelCGST += $cgst_sgst;
                $cancelIGST += $igst;
                $profit = 0;
            } else {
                // Check for return items
                $returns = $db->table('retunn_items')
                    ->where('sl_id', $item->id)
                    ->where('rsaleit_type', $ret_type)
                    ->get()->getResult();

                if (count($returns)) {
                    $status = 'Return';
                    $row_style = 'style="background:#f86e50;"';
                    foreach ($returns as $ret) {
                        $returnSub += $ret->sl_subtotal;
                        $ret_disc = ($ret->sl_subtotal * $discount_per / 100);
                        $returnDisc += $ret_disc;
                        $ret_adj = $ret->sl_subtotal - $ret_disc;

                        if ($item->cgst > 0) {
                            $returnCGST += $ret_adj - ($ret_adj / (1 + ($item->cgst / 100)));
                        } else {
                            $returnIGST += $ret_adj - ($ret_adj / (1 + ($item->igstt / 100)));
                        }
                    }
                }
            }

            $totalSub += $item->subtotal;
            $totalDisc += $discount_amt;
            $totalCGST += $cgst_sgst;
            $totalIGST += $igst;
            $totalProfit += $profit;
        ?>
        <tr <?= $row_style ?>>
            <td><?= $item->sale_id ?></td>
            <td><?= ucfirst($item->name) ?></td>
            <td><?= ucfirst($storeName) ?></td>
            <td style="text-align:right;"><?= $gst ?>%</td>
            <td style="text-align:right;"><?= $item->qt ?></td>
            <td style="text-align:right;"><?= $unit ?></td>
            <td style="text-align:right;"><?= number_format($item->perprice, $dec) ?></td>
            <td style="text-align:right;"><?= number_format($item->mrpp, $dec) ?></td>
            <td style="text-align:right;"><?= number_format($item->price, $dec) ?></td>
            <td style="text-align:right;"><?= number_format($item->subtotal, $dec) ?></td>
            <td style="text-align:right;"><?= number_format($discount_amt, $dec) ?></td>
            <td style="text-align:right;"><?= number_format($cgst_sgst, $dec) ?></td>
            <td style="text-align:right;"><?= number_format($igst, $dec) ?></td>
            <td style="text-align:right;"><?= number_format($profit, $dec) ?></td>
            <td style="text-align:center;"><?= $status ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>

    <!-- Totals -->
    <tfoot>
        <tr>
            <td colspan="9" style="text-align:right;"><?= label("Sub Total") ?></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalSub, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalDisc, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalCGST, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalIGST, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalProfit, $dec) ?></b></td>
            <td></td>
        </tr>
        <tr>
            <td colspan="9" style="text-align:right;"><?= label("Cancel") ?></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($cancelSub, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($cancelDisc, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($cancelCGST, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($cancelIGST, $dec) ?></b></td>
            <td></td>
        </tr>
        <tr>
            <td colspan="9" style="text-align:right;"><?= label("Return") ?></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($returnSub, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($returnDisc, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($returnCGST, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($returnIGST, $dec) ?></b></td>
            <td></td>
        </tr>
        <tr>
            <td colspan="9" style="text-align:right;"><?= label("Total") ?></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalSub - $cancelSub - $returnSub, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalDisc - $cancelDisc - $returnDisc, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalCGST - $cancelCGST - $returnCGST, $dec) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalIGST - $cancelIGST - $returnIGST, $dec) ?></b></td>
            <td></td>
        </tr>
    </tfoot>
</table>
