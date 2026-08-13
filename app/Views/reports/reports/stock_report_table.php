<table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr>
            <th><?= label("Product") ?> (<?= label("ProductCode") ?>)</th>
            <th><?= label("Quantity") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($items as $item): ?>
            <tr class="<?= esc($item['alertClass']) ?>">
                <td><?= esc($item['name']) ?> (<?= esc($item['code']) ?>)</td>
                <td><?= esc($item['quantity']) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
