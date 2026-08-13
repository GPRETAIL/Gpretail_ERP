<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="42" class="text-center"><?= esc($company) ?></th></tr>
        <tr class="hideme"><th colspan="42" class="text-center"><?= esc($address) ?></th></tr>
        <tr class="hideme"><th colspan="42" class="text-center">Sales Tally Report - From <?= esc($start) ?> To <?= esc($end) ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Sales Date</th><th>Sales No</th><th>Voucher Type</th><th>Customer Name</th>
            <th>Address 1</th><th>Address 2</th><th>Address 3</th><th>State</th><th>Tin No</th>
            <th>CST No</th><th>GSTIN/UIN</th><th>Receipt Note No</th><th>Receipt Note Date</th><th>Order No</th>
            <th>Order Date</th><th>LR No</th><th>Despatch Through</th><th>Destination</th><th>Term of Payment</th>
            <th>Terms of Delivery</th><th>Item Name</th><th>Tax Rate</th><th>Batch No</th><th>QTY</th>
            <th>UOM</th><th>Rate</th><th>Discount %</th><th>Amount</th><th>Sales Ledger</th>
            <th>Other Charges_1 Amount</th><th>Other Charges_1 Ledger</th>
            <th>Other Charges_2 Amount</th><th>Other Charges_2 Ledger</th>
            <th>CGST Amount</th><th>CGST Ledger</th><th>SGST Amount</th><th>SGST Ledger</th>
            <th>IGST Amount</th><th>IGST Ledger</th><th>Cost Center</th><th>Godown</th><th>Narration</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($sales as $item): ?>
            <?php
                $product = $productMap[$item->product_id] ?? [];
                $sale = $saleMap[$item->sale_id] ?? [];
            ?>
            <tr>
                <td><?= date("d/m/Y", strtotime($item->date)) ?></td>
                <td><?= esc($item->sale_id) ?></td>
                <td>Sales</td>
                <td>Karunakaran</td>
                <td><?= esc($sale['mobnnm'] ?? '') ?></td>
                <td><?= esc($sale['mobnnm'] ?? '') ?></td>
                <td><?= esc($sale['mobnnm'] ?? '') ?></td>
                <td>Tamilnadu</td>
                <td>11111111V</td>
                <td>11111111C</td>
                <td>27ABCDE1234D1Z1</td>
                <td>GRN - 001</td>
                <td><?= date("d/m/Y", strtotime($item->date)) ?></td>
                <td><?= esc($item->sale_id) ?></td>
                <td><?= date("d/m/Y", strtotime($item->date)) ?></td>
                <td>LR- 1234</td>
                <td></td>
                <td>TamilNadu</td>
                <td>1 Days</td>
                <td>Ex-Works</td>
                <td><?= esc($product['name'] ?? '') ?></td>
                <td><?= esc($item->cgst) ?></td>
                <td><?= esc($item->sale_id) ?></td>
                <td style="text-align:right;"><?= esc($item->qt) ?></td>
                <td><?= esc($product['unit'] ?? '') ?></td>
                <td><?= esc($item->cost) ?></td>
                <td>0</td>
                <td><?= esc($item->subtot) ?></td>
                <td>Sales</td>
                <td></td><td></td><td></td><td></td>
                <td></td><td></td><td></td><td></td><td>Main Location</td><td></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
