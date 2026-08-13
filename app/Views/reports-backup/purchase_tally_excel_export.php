<table border="1">
    <thead>
        <tr>
            <th colspan="44" style="text-align:center;"><?= esc($company) ?> - Purchase Tally Export</th>
        </tr>
        <tr>
            <th colspan="44" style="text-align:center;">From <?= esc($start) ?> To <?= esc($end) ?></th>
        </tr>
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
            <th>TIN No</th>
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
        <?php
        $db = \Config\Database::connect();

        foreach ($items as $item):
            $supplier = $db->table('suppliers')->where('id', $item->supplier)->get()->getRowArray();
            $purchase = $db->table('purchases')->where('id', $item->purchase_id)->get()->getRowArray();
            $product = $db->table('products')->where('id', $item->product_id)->get()->getRowArray();
        ?>
        <tr>
            <td><?= date("d/m/Y", strtotime($item->ndate)) ?></td>
            <td><?= esc($item->purchase_id) ?></td>
            <td><?= esc($item->supplier) ?></td>
            <td><?= date("d/m/Y", strtotime($purchase['invdat'] ?? $item->ndate)) ?></td>
            <td>Purchase</td>
            <td><?= esc($supplier['name'] ?? '-') ?></td>
            <td><?= esc($purchase['phone'] ?? '-') ?></td>
            <td><?= esc($purchase['email'] ?? '-') ?></td>
            <td><?= esc($purchase['note'] ?? '-') ?></td>
            <td>Tamilnadu</td>
            <td>11111111V</td>
            <td>11111111C</td>
            <td>27ABCDE1234D1Z1</td>
            <td>GRN - 001</td>
            <td><?= date("d/m/Y", strtotime($item->ndate)) ?></td>
            <td><?= esc($item->purchase_id) ?></td>
            <td><?= date("d/m/Y", strtotime($item->ndate)) ?></td>
            <td>LR-1234</td>
            <td></td>
            <td>TamilNadu</td>
            <td>1 Days</td>
            <td>Ex-Works</td>
            <td><?= esc($product['name'] ?? '-') ?></td>
            <td><?= $item->cgst ?></td>
            <td><?= esc($item->purchase_id) ?></td>
            <td><?= $item->qt ?></td>
            <td><?= esc($product['unit'] ?? '-') ?></td>
            <td><?= $item->cost ?></td>
            <td>0</td>
            <td><?= $item->subtot ?></td>
            <td>Purchase</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td><?= $item->cgst ?></td>
            <td></td>
            <td><?= $item->sgst ?></td>
            <td></td>
            <td><?= $item->igst ?></td>
            <td></td>
            <td>Main Location</td>
            <td></td>
            <td></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>
