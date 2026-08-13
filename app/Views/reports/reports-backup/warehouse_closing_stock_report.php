<!-- warehouse_closing_stock_report.php -->

<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="7" style="text-align:center;"><?= esc($settings['companyname']) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="7"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="7">Closing Stock Reports from <?= esc($startpp) ?> Till <?= esc($endpp) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;"><?= label("ID") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Product") . ' ' . label("Name") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Opening") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Purchase") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Sent to Store") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Goods Out") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Closing") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($products as $prod): ?>
            <tr>
                <td style="border: 1px solid #1c76bc;"><?= esc($prod['id']) ?></td>
                <td style="border: 1px solid #1c76bc;"><?= esc($prod['name']) ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($prod['opening']) ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($prod['purchase']) ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($prod['sent']) ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($prod['goods_out']) ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($prod['closing']) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
