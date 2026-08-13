<table id="chltkarr" class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="6" class="text-center"><?= esc($settings['companyname']) ?></th>
        </tr>
        <tr class="hideme text-center">
            <th colspan="6"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme text-center">
            <th colspan="6">Fast Moving Reports from <?= date('d-m-Y', strtotime($start)) ?> Till <?= date('d-m-Y', strtotime($end)) ?></th>
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
        <?php foreach ($products as $prd): ?>
        <tr>
            <td><?= esc($prd->category_name) ?></td>
            <td><?= esc($prd->product_name) ?></td>
            <td class="text-center"><?= esc($prd->total_qt) ?></td>
            <td class="text-center"><?= esc($prd->cancelled_qt) ?></td>
            <td class="text-center"><?= esc($prd->returned_qty) ?></td>
            <td class="text-center"><?= esc($prd->final_qt) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>
