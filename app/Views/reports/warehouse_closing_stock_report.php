<table class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="7" class="text-center"><?= esc($settings['companyname']) ?></th></tr>
        <tr class="hideme"><th colspan="7" class="text-center"><?= esc($storeInfo['adresse'] ?? '') ?></th></tr>
        <tr class="hideme"><th colspan="7" class="text-center">Closing Stock Reports from <?= $startFormatted ?> Till <?= $endFormatted ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>ID</th><th>Product Name</th><th>Opening</th><th>Purchase</th>
            <th>Sent to Store</th><th>Goods Out</th><th>Closing</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $db = \Config\Database::connect();
        foreach ($products as $product):
            $id = $product['id'];
            $storeId = $storeId;

            // Opening calculation
            $bb_wal = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE store_id=0 AND tyoftrans=1 AND pro_id='$id' AND war_id='$storeId' AND date < '$start'")->getRow()->qty ?? 0;
            $bb_sal = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE store_id!=0 AND tyoftrans=1 AND pro_id='$id' AND war_id='$storeId' AND date < '$start'")->getRow()->qty ?? 0;
            $bb_gal = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE tyoftrans=6 AND pro_id='$id' AND war_id='$storeId' AND date < '$start'")->getRow()->qty ?? 0;
            $opening = $bb_wal - $bb_sal - $bb_gal;

            // Within date range
            $purr = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE store_id=0 AND tyoftrans=1 AND pro_id='$id' AND war_id='$storeId' AND date BETWEEN '$start' AND '$end'")->getRow()->qty ?? 0;
            $sent = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE store_id!=0 AND tyoftrans=1 AND pro_id='$id' AND war_id='$storeId' AND date BETWEEN '$start' AND '$end'")->getRow()->qty ?? 0;
            $goodsOut = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE tyoftrans=6 AND pro_id='$id' AND war_id='$storeId' AND date BETWEEN '$start' AND '$end'")->getRow()->qty ?? 0;

            $closing = $opening + $purr - $sent - $goodsOut;
        ?>
            <tr>
                <td><?= $product['id'] ?></td>
                <td><?= esc($product['name']) ?></td>
                <td><?= floatval($opening) ?></td>
                <td><?= floatval($purr) ?></td>
                <td><?= floatval($sent) ?></td>
                <td><?= floatval($goodsOut) ?></td>
                <td><?= floatval($closing) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
