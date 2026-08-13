<input type="hidden" name="rrt" id="rrt" value="<?= $rrt ?>" />

<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Invoice Date</th>
            <th>Invoice No</th>
            <th>Supplier Invoice No</th>
            <th>Supplier Invoice Date</th>
            <th>Voucher Type</th>
            <th>Supplier Name</th>
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
            <th>QTY</th>
            <th>UOM</th>
            <th>Rate</th>
            <th>Discount %</th>
            <th>Amount</th>
            <th>Purchase Ledger</th>
            <th>Other Charges_1 Amount</th>
            <th>Other Charges_1 Ledger</th>
            <th>Other Charges_2 Amount</th>
            <th>Other Charges_2 Ledger</th>
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
        <?php foreach ($purchase_items as $prd):
            $product = $prd->product_id ? db_connect()->query("SELECT * FROM products WHERE id = {$prd->product_id}")->getRow() : null;
            $purchase = $prd->purchase_id ? db_connect()->query("SELECT * FROM purchases WHERE id = {$prd->purchase_id}")->getRowArray() : [];
        ?>
        <tr>
            <td><?= date("d/m/Y", strtotime($prd->ndate)) ?></td>
            <td><?= $prd->purchase_id ?></td>
            <td><?= $prd->supplier ?></td>
            <td><?= isset($purchase['invdat']) ? date("d/m/Y", strtotime($purchase['invdat'])) : '' ?></td>
            <td>Purchase</td>
            <td>Karunakaran</td>
            <td><?= $purchase['phone'] ?? '' ?></td>
            <td><?= $purchase['email'] ?? '' ?></td>
            <td><?= $purchase['note'] ?? '' ?></td>
            <td>Tamilnadu</td>
            <td>11111111V</td>
            <td>11111111C</td>
            <td>27ABCDE1234D1Z1</td>
            <td>GRN - 001</td>
            <td><?= date("d/m/Y", strtotime($prd->ndate)) ?></td>
            <td><?= $prd->purchase_id ?></td>
            <td><?= date("d/m/Y", strtotime($prd->ndate)) ?></td>
            <td>LR-1234</td>
            <td></td>
            <td>TamilNadu</td>
            <td>1 Days</td>
            <td>Ex-Works</td>
            <td><?= $product->name ?? '' ?></td>
            <td><?= $prd->cgst ?></td>
            <td><?= $prd->purchase_id ?></td>
            <td><?= $prd->qt ?></td>
            <td><?= $product->unit ?? '' ?></td>
            <td><?= $prd->cost ?></td>
            <td>0</td>
            <td><?= $prd->subtot ?></td>
            <td>Purchase</td>
            <td></td><td></td><td></td><td></td>
            <td></td><td></td><td></td><td></td>
            <td>Main Location</td>
            <td></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>
