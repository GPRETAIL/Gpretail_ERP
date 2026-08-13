<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="13" class="text-center"><?= esc($company) ?></th></tr>
        <tr class="hideme"><th colspan="13" class="text-center"><?= esc($address) ?></th></tr>
        <tr class="hideme"><th colspan="13" class="text-center">Store Stock Transfer Reports - from <?= esc($start) ?> to <?= esc($end) ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Store Name</th>
            <th>Product Name</th>
            <th>Opening</th>
            <th>Purchase</th>
            <th>Sales</th>
            <th>Return</th>
            <th>Adjustment</th>
            <?php if ($show_dispatch): ?>
                <th>Dispatch</th>
            <?php endif; ?>
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
                <td><?= esc($row['warehouse_name']) ?></td>
                <td><?= esc($row['product_name']) ?></td>
                <td class="text-end"><?= floatval($row['opening']) ?></td>
                <td class="text-end"><?= floatval($row['purchase_qty']) ?></td>
                <td class="text-end"><?= floatval($row['sales_qty']) ?></td>
                <td class="text-end"><?= floatval($row['return_qty']) ?></td>
                <td class="text-end"><?= floatval($row['adjustment_qty']) ?></td>
                <?php if ($show_dispatch): ?>
                    <td class="text-end"><?= floatval($row['dispatch_qty']) ?></td>
                <?php endif; ?>
                <td class="text-end"><?= floatval($row['in_qty']) ?></td>
                <td class="text-end"><?= floatval($row['out_qty']) ?></td>
                <td class="text-end"><?= floatval($row['closing']) ?></td>
                <td class="text-end"><?= number_format($row['purchase_value'], 2) ?></td>
                <td class="text-end"><?= number_format($row['sales_value'], 2) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
