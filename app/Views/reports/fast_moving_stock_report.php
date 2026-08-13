<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="3" class="text-center"><?= esc($company) ?></th></tr>
        <tr class="hideme"><th colspan="3" class="text-center"><?= esc($address) ?></th></tr>
        <tr class="hideme"><th colspan="3" class="text-center">Fast Moving Stock Reports - from <?= esc($start) ?> Till <?= esc($end) ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label("Category") ?></th>
            <th><?= label("Product") ?></th>
            <th><?= label("Sold Qty") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($results as $row): ?>
            <tr>
                <td><?= esc($categories[$row['category']] ?? 'N/A') ?></td>
                <td><?= esc($row['product_name']) ?></td>
                <td class="text-end"><?= floatval($row['sold_qty']) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
