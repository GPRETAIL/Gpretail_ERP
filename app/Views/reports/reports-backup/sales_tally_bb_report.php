<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="42" style="text-align:center;"><?= esc($company) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="42"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="42">Sales Tally Report - From <?= esc($start) ?> To <?= esc($end) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Sales Date</th>
            <th>Sales No</th>
            <th>Voucher Type</th>
            <th>Customer Name</th>
            <th>Address 1</th>
            <th>Address 2</th>
            <th>Address 3</th>
            <th>State</th>
            <th>Tin No</th>
            <th>CST No</th>
            <th>GSTIN/UIN</th>
            <th>Receipt Note No</th>
            <th>Receipt Note Date</th>
            <th>Order No</th>
            <th>Order Date</th>
            <th>LR No</th>
            <th>Despatch Through</th>
            <th>Destination</th>
            <th>Term of Payment</th>
            <th>Terms of Delivery</th>
            <th>Item Name</th>
            <th>Tax Rate</th>
            <th>Batch No</th>
            <th>Qty</th>
            <th>UOM</th>
            <th>Rate</th>
            <th>Discount %</th>
            <th>Amount</th>
            <th>Sales Ledger</th>
            <th>Other Charges 1 Amount</th>
            <th>Other Charges 1 Ledger</th>
            <th>Other Charges 2 Amount</th>
            <th>Other Charges 2 Ledger</th>
            <th>CGST Amount</th>
            <th>CGST Ledger</th>
            <th>SGST Amount</th>
            <th>SGST Ledger</th>
            <th>IGST Amount</th>
            <th>IGST Ledger</th>
            <th>Cost Center</th>
            <th>Godown</th>
            <th>Narration</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $db = \Config\Database::connect();

        foreach ($salesItems as $row):
            $product = $db->table('products')->where('id', $row->product_id)->get()->getRowArray();
            $sale = $db->table('sales')->where('id', $row->sale_id)->get()->getRowArray();
        ?>
        <tr>
            <td><?= date("d/m/Y", strtotime($row->date)) ?></td>
            <td><?= $row->sale_id ?></td>
            <td>Sales</td>
            <td>Karunakaran</td>
            <td><?= esc($sale['mobnnm']) ?></td>
            <td><?= esc($sale['mobnnm']) ?></td>
            <td><?= esc($sale['mobnnm']) ?></td>
            <td>Tamilnadu</td>
            <td>11111111V</td>
            <td>11111111C</td>
            <td>27ABCDE1234D1Z1</td>
            <td>GRN - 001</td>
            <td><?= date("d/m/Y", strtotime($row->date)) ?></td>
            <td><?= $row->sale_id ?></td>
            <td><?= date("d/m/Y", strtotime($row->date)) ?></td>
            <td>LR-1234</td>
            <td></td>
            <td>Tamilnadu</td>
            <td>1 Days</td>
            <td>Ex-Works</td>
            <td><?= esc($product['name'] ?? '-') ?></td>
            <td><?= $row->cgst ?></td>
            <td><?= $row->sale_id ?></td>
            <td style="text-align:right;"><?= $row->qt ?></td>
            <td><?= esc($product['unit'] ?? '-') ?></td>
            <td><?= $row->cost ?></td>
            <td>0</td>
            <td><?= $row->subtot ?></td>
            <td>Sales</td>
            <td></td><td></td><td></td><td></td>
            <td></td><td></td><td></td><td></td>
            <td>Main Location</td>
            <td></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>
