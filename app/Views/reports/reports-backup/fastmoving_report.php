<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="3" style="text-align:center;">
                <?= esc($company) ?>
            </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="3"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="3">
                Fast Moving Stock Reports - From <?= date("d-m-Y", strtotime($start)) ?> To <?= date("d-m-Y", strtotime($end)) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th style="border: 1px solid #1c76bc;"><?= label("Category") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Product") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Sold Qty") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($products as $row): ?>
            <tr>
                <td style="border: 1px solid #1c76bc;"><?= esc($row['category_name']) ?></td>
                <td style="border: 1px solid #1c76bc;"><?= esc($row['product_name']) ?></td>
                <td style="text-align:right; border: 1px solid #1c76bc;">
                    <?= floatval($row['sold_qty']) ?>
                </td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
