<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr>
            <th style="border: 1px solid #1c76bc;">Invoice Date</th>
            <th style="border: 1px solid #1c76bc;">Invoice No</th>
            <th style="border: 1px solid #1c76bc;">Supplier Invoice No</th>
            <th style="border: 1px solid #1c76bc;">Supplier Invoice Date</th>
            <th style="border: 1px solid #1c76bc;">Voucher Type</th>
            <th style="border: 1px solid #1c76bc;">Supplier Name</th>
            <th style="border: 1px solid #1c76bc;">Address 1</th>
            <th style="border: 1px solid #1c76bc;">Address 2</th>
            <th style="border: 1px solid #1c76bc;">Address 3</th>
            <th style="border: 1px solid #1c76bc;">State</th>
            <th style="border: 1px solid #1c76bc;">Tin No</th>
            <th style="border: 1px solid #1c76bc;">CST No</th>
            <th style="border: 1px solid #1c76bc;">GSTIN/UIN</th>
            <th style="border: 1px solid #1c76bc;">Receipt Note No</th>
            <th style="border: 1px solid #1c76bc;">Receipt Note Date</th>
            <th style="border: 1px solid #1c76bc;">Order No</th>
            <th style="border: 1px solid #1c76bc;">Order Date</th>
            <th style="border: 1px solid #1c76bc;">LR No</th>
            <th style="border: 1px solid #1c76bc;">Despatch Through</th>
            <th style="border: 1px solid #1c76bc;">Destination</th>
            <th style="border: 1px solid #1c76bc;">Term of Payment</th>
            <th style="border: 1px solid #1c76bc;">Terms of Delivery</th>
            <th style="border: 1px solid #1c76bc;">Item Name</th>
            <th style="border: 1px solid #1c76bc;">Tax Rate</th>
            <th style="border: 1px solid #1c76bc;">Batch No</th>
            <th style="border: 1px solid #1c76bc;">QTY</th>
            <th style="border: 1px solid #1c76bc;">UOM</th>
            <th style="border: 1px solid #1c76bc;">Rate</th>
            <th style="border: 1px solid #1c76bc;">Discount %</th>
            <th style="border: 1px solid #1c76bc;">Amount</th>
            <th style="border: 1px solid #1c76bc;">Purchase Ledger</th>
            <th style="border: 1px solid #1c76bc;">Other Charges_1 Amount</th>
            <th style="border: 1px solid #1c76bc;">Other Charges_1 Ledger</th>
            <th style="border: 1px solid #1c76bc;">Other Charges_2 Amount</th>
            <th style="border: 1px solid #1c76bc;">Other Charges_2 Ledger</th>
            <th style="border: 1px solid #1c76bc;">CGST Amount</th>
            <th style="border: 1px solid #1c76bc;">CGST Ledger</th>
            <th style="border: 1px solid #1c76bc;">SGST Amount</th>
            <th style="border: 1px solid #1c76bc;">SGST Ledger</th>
            <th style="border: 1px solid #1c76bc;">IGST Amount</th>
            <th style="border: 1px solid #1c76bc;">IGST Ledger</th>
            <th style="border: 1px solid #1c76bc;">Cost Center</th>
            <th style="border: 1px solid #1c76bc;">Godown</th>
            <th style="border: 1px solid #1c76bc;">Narration</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($products as $prd):
            $supplier = db_connect()->table('suppliers')->where('id', $prd->supplier)->get()->getRowArray();
            $purchase = db_connect()->table('purchases')->where('id', $prd->purchase_id)->get()->getRowArray();
            $product = db_connect()->table('products')->where('id', $prd->product_id)->get()->getRowArray();
        ?>
        <tr>
            <td><?= date("d/m/Y", strtotime($prd->ndate)) ?></td>
            <td><?= $prd->purchase_id ?></td>
            <td><?= $prd->supplier ?></td>
            <td><?= date("d/m/Y", strtotime($purchase['invdat'])) ?></td>
            <td>Purchase</td>
            <td><?= esc($supplier['name'] ?? 'Karunakaran') ?></td>
            <td><?= esc($purchase['phone'] ?? '') ?></td>
            <td><?= esc($purchase['email'] ?? '') ?></td>
            <td><?= esc($purchase['note'] ?? '') ?></td>
            <td>Tamilnadu</td>
            <td>11111111V</td>
            <td>11111111C</td>
            <td>27ABCDE1234D1Z1</td>
            <td>GRN - 001</td>
            <td><?= date("d/m/Y", strtotime($prd->ndate)) ?></td>
            <td><?= $prd->purchase_id ?></td>
            <td><?= date("d/m/Y", strtotime($prd->ndate)) ?></td>
            <td>LR- 1234</td>
            <td></td>
            <td>TamilNadu</td>
            <td>1 Days</td>
            <td>Ex-Works</td>
            <td><?= esc($product['name'] ?? '') ?></td>
            <td><?= $prd->cgst ?></td>
            <td><?= $prd->purchase_id ?></td>
            <td><?= $prd->qt ?></td>
            <td><?= esc($product['unit'] ?? '') ?></td>
            <td><?= $prd->cost ?></td>
            <td>0</td>
            <td><?= $prd->subtot ?></td>
            <td>Purchase</td>
            <td></td><td></td><td></td><td></td>
            <td></td><td></td><td></td><td></td><td></td>
            <td>Main Location</td><td></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>
