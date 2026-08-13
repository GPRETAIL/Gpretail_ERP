<table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr>
            <th><?= label("Product") ?> (<?= label("ProductCode") ?>)</th>
            <th><?= label("Quantity") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($stockData as $row): ?>
            <tr class="<?= esc($row['class']) ?>">
                <td><?= esc($row['name']) ?> (<?= esc($row['code']) ?>)</td>
                <td><?= esc($row['stock']) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
