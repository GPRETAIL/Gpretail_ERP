<table>
    <tr>
        <td><strong><?= lang('Sale Number') ?>:</strong> <?= $sale['id'] ?>/<?= $sale['yyear'] ?></td>
    </tr>
    <tr>
        <td><strong><?= lang('Date') ?>:</strong> <?= date('d-m-Y H:i', strtotime($sale['attime'])) ?></td>
    </tr>
    <tr>
        <td><strong><?= lang('Customer') ?>:</strong> <?= $customer['name'] ?? 'Walk-In' ?></td>
    </tr>
</table>

<table>
    <thead>
        <tr>
            <th><?= lang('Item') ?></th>
            <th><?= lang('Qty') ?></th>
            <th><?= lang('Rate') ?></th>
            <th><?= lang('Total') ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($posales as $item): ?>
            <tr>
                <td><?= esc($item['name']) ?></td>
                <td><?= esc($item['qt']) ?></td>
                <td><?= number_format($item['price'], 2) ?></td>
                <td><?= number_format($item['price'] * $item['qt'], 2) ?></td>
            </tr>
        <?php endforeach ?>
    </tbody>
</table>

<p><strong><?= lang('Subtotal') ?>:</strong> <?= number_format($sale['subtotal'], 2) ?></p>
<p><strong><?= lang('Discount') ?>:</strong> <?= number_format($discount, 2) ?></p>
<p><strong><?= lang('Grand Total') ?>:</strong> <?= number_format($sale['total'], 2) ?></p>