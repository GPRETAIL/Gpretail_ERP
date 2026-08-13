<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="14" class="text-center"><?= esc($company) ?></th></tr>
        <tr class="hideme"><th colspan="14" class="text-center"><?= esc($address) ?></th></tr>
        <tr class="hideme"><th colspan="14" class="text-center">Store Stock Transfer Reports - from <?= esc($start) ?> Till <?= esc($end) ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Warehouse</th>
            <th>Product</th>
            <th>Level</th>
            <th>Rack</th>
            <th>Opening</th>
            <th>Purchase</th>
            <th>Sales</th>
            <th>Return</th>
            <th>Adjustment</th>
            <th>In</th>
            <th>Out</th>
            <th>Closing</th>
            <th>Purchase Value</th>
            <th>Sales Value</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($reportData as $row): ?>
            <tr>
                <td><?= esc($row['warehouse']) ?></td>
                <td><?= esc($row['product']) ?></td>
                <td class="text-end"><?= esc($row['level']) ?></td>
                <td class="text-end"><?= esc($row['rack']) ?></td>
                <td class="text-end"><?= floatval($row['opening']) ?></td>
                <td class="text-end"><?= floatval($row['purchase']) ?></td>
                <td class="text-end"><?= floatval($row['sales']) ?></td>
                <td class="text-end"><?= floatval($row['return']) ?></td>
                <td class="text-end"><?= floatval($row['adjustment']) ?></td>
                <td class="text-end"><?= floatval($row['in']) ?></td>
                <td class="text-end"><?= floatval($row['out']) ?></td>
                <td class="text-end"><?= floatval($row['closing']) ?></td>
                <td class="text-end"><?= number_format((float)$row['purchase_val'], 2) ?></td>
                <td class="text-end"><?= number_format((float)$row['sales_val'], 2) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
