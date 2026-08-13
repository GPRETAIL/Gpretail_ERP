<table id="chltkarr" class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="6" class="text-center"><?= esc($settings['companyname']) ?></th>
        </tr>
        <tr class="hideme text-center">
            <th colspan="6"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme text-center">
            <th colspan="6">Category Reports from <?= esc(date('d-m-Y', strtotime($start))) ?> Till <?= esc(date('d-m-Y', strtotime($end))) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Category</th>
            <th>Product</th>
            <th class="text-center">Sales</th>
            <th class="text-center">Cancel</th>
            <th class="text-center">Return</th>
            <th class="text-center">Total Sales</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($items as $row): ?>
            <tr>
                <td><?= esc($row->category_name) ?></td>
                <td><?= esc($row->product_name) ?></td>
                <td class="text-center"><?= esc($row->total_qt) ?></td>
                <td class="text-center"><?= esc($row->cancelled_qt) ?></td>
                <td class="text-center"><?= esc($row->returned_qty) ?></td>
                <td class="text-center"><?= esc($row->final_qt) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
