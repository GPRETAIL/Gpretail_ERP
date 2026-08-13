<div class="receipt">
    <h2 class="center">Sale Receipt</h2>
    <p>
        <strong>Date:</strong> <?= date('Y-m-d H:i:s', strtotime($sale['created_at'])) ?><br>
        <strong>Receipt #:</strong> <?= $sale['id'] ?><br>
        <strong>Customer:</strong> <?= esc($customer['name']) ?><br>
        <strong>Phone:</strong> <?= esc($customer['phone']) ?>
    </p>

    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($items as $item): ?>
                <tr>
                    <td><?= esc($item['name']) ?></td>
                    <td class="text-right"><?= $item['qt'] ?></td>
                    <td class="text-right"><?= number_format($item['price'], 2) ?></td>
                    <td class="text-right"><?= number_format($item['qt'] * $item['price'], 2) ?></td>
                </tr>
            <?php endforeach ?>
        </tbody>
        <tfoot>
            <tr class="total">
                <td colspan="3" class="text-right">Subtotal</td>
                <td class="text-right"><?= number_format($sale['subtotal'], 2) ?></td>
            </tr>
            <tr class="total">
                <td colspan="3" class="text-right">Discount</td>
                <td class="text-right">-<?= number_format($sale['discountamount'], 2) ?></td>
            </tr>
            <tr class="total">
                <td colspan="3" class="text-right">Total</td>
                <td class="text-right"><?= number_format($sale['total'], 2) ?></td>
            </tr>
            <tr class="total">
                <td colspan="3" class="text-right">Amount Paid</td>
                <td class="text-right"><?= number_format($sale['paid'], 2) ?></td>
            </tr>
        </tfoot>
    </table>

    <p class="center">Thank you for your business!</p>
</div>