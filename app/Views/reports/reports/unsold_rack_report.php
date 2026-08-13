<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="7" class="text-center"><?= esc($company) ?></th></tr>
        <tr class="hideme"><th colspan="7" class="text-center"><?= esc($address) ?></th></tr>
        <tr class="hideme"><th colspan="7" class="text-center">Unsold Report</th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label("Warehouse") ?> <?= label("Name") ?></th>
            <th><?= label("Product") ?> <?= label("Name") ?></th>
            <th><?= label("Level") ?></th>
            <th><?= label("Rack") ?></th>
            <th><?= label("Purchased Date") ?></th>
            <th><?= label("Purchased Qty") ?></th>
            <th><?= label("Avl Qty") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($items as $item): ?>
            <tr>
                <td><?= esc($warehouses[$item['warehouse_id']] ?? 'Unknown') ?></td>
                <td><?= esc($products[$item['product_id']] ?? 'Unknown') ?></td>
                <td><?= esc($item['levelk']) ?></td>
                <td><?= esc($item['rackk']) ?></td>
                <td><?= esc($item['ndate']) ?></td>
                <td><?= esc($item['qt']) ?></td>
                <td><?= esc($item['avlqty']) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
