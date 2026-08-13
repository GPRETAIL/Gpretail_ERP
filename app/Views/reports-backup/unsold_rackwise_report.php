<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="7" style="text-align:center;"><?= esc($company) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="7"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="7">Unsold Report</th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th style="border: 1px solid #1c76bc;"><?= label("Warehouse") ?> <?= label("Name") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Product") ?> <?= label("Name") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Level") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Rack") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Purchased Date") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Purchased Qty") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Avl Qty") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $db = \Config\Database::connect();

        foreach ($items as $item):
            $product = $db->table('products')->where('id', $item['product_id'])->get()->getRowArray();
            $warehouse = $db->table('warehouses')->where('id', $item['warehouse_id'])->get()->getRowArray();
        ?>
        <tr>
            <td style="border: 1px solid #1c76bc;"><?= esc($warehouse['name'] ?? '-') ?></td>
            <td style="border: 1px solid #1c76bc;"><?= esc($product['name'] ?? '-') ?></td>
            <td style="border: 1px solid #1c76bc;"><?= esc($item['levelk']) ?></td>
            <td style="border: 1px solid #1c76bc;"><?= esc($item['rackk']) ?></td>
            <td style="border: 1px solid #1c76bc;"><?= date("d-m-Y", strtotime($item['ndate'])) ?></td>
            <td style="border: 1px solid #1c76bc;"><?= esc($item['qt']) ?></td>
            <td style="border: 1px solid #1c76bc;"><?= esc($item['avlqty']) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
</table>
