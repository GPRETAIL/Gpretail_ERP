<table class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="11" class="text-center"><?= esc($settings['companyname']) ?></th></tr>
        <tr class="hideme"><th colspan="11" class="text-center"><?= esc($storeInfo['adresse'] ?? '') ?></th></tr>
        <tr class="hideme"><th colspan="11" class="text-center">Closing Stock Reports from <?= $startFormatted ?> Till <?= $endFormatted ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>ID</th><th>Product Name</th><th>Initial</th><th>Opening</th>
            <th>Purchase</th><th>Sales</th><th>Cancel</th><th>Return</th>
            <th>Closing</th><th>Price</th><th>Value</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $tot_value = 0;
        $db = \Config\Database::connect();
        foreach ($products as $product):
            $id = $product['id'];
            $price = $product['price'];
            $storeId = $storeId;

            // Initial stock
            $q_stockf = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id='$id' AND store_id='$storeId' AND tyoftrans=5")->getRow()->qty ?? 0;

            // Opening stock
            $bb_sal_f = $db->query("SELECT SUM(qt) as qty FROM sale_items WHERE product_id='$id' AND store_irrdd='$storeId' AND date < '$start'")->getRow()->qty ?? 0;
            $bb_purc_f = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id='$id' AND store_id='$storeId' AND tyoftrans=1 AND date < '$start'")->getRow()->qty ?? 0;
            $bb_can_f = $db->query("SELECT SUM(qt) as qty FROM sale_items WHERE product_id='$id' AND store_irrdd='$storeId' AND cancel_status=1 AND date < '$start'")->getRow()->qty ?? 0;
            $bb_ret_f = $db->query("SELECT SUM(sl_newqt) as qty FROM retunn_items WHERE prodd_ids='$id' AND store_idsi='$storeId' AND to_datte < '$start'")->getRow()->qty ?? 0;

            $opening_stock = $q_stockf - $bb_sal_f + $bb_purc_f + $bb_can_f + $bb_ret_f;

            // Between range
            $bbwn_purc_f = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id='$id' AND store_id='$storeId' AND tyoftrans=1 AND date BETWEEN '$start' AND '$end'")->getRow()->qty ?? 0;
            $bbwn_sal_f = $db->query("SELECT SUM(qt) as qty FROM sale_items WHERE product_id='$id' AND store_irrdd='$storeId' AND date BETWEEN '$start' AND '$end'")->getRow()->qty ?? 0;
            $bbwn_can_f = $db->query("SELECT SUM(qt) as qty FROM sale_items WHERE product_id='$id' AND store_irrdd='$storeId' AND cancel_status=1 AND date BETWEEN '$start' AND '$end'")->getRow()->qty ?? 0;
            $bbwn_ret_f = $db->query("SELECT SUM(sl_newqt) as qty FROM retunn_items WHERE prodd_ids='$id' AND store_idsi='$storeId' AND to_datte BETWEEN '$start' AND '$end'")->getRow()->qty ?? 0;

            // Closing stock
            $bben_sal_f = $db->query("SELECT SUM(qt) as qty FROM sale_items WHERE product_id='$id' AND store_irrdd='$storeId' AND date <= '$end'")->getRow()->qty ?? 0;
            $bben_purc_f = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id='$id' AND store_id='$storeId' AND tyoftrans=1 AND date <= '$end'")->getRow()->qty ?? 0;
            $bben_can_f = $db->query("SELECT SUM(qt) as qty FROM sale_items WHERE product_id='$id' AND store_irrdd='$storeId' AND cancel_status=1 AND date <= '$end'")->getRow()->qty ?? 0;
            $bben_ret_f = $db->query("SELECT SUM(sl_newqt) as qty FROM retunn_items WHERE prodd_ids='$id' AND store_idsi='$storeId' AND to_datte <= '$end'")->getRow()->qty ?? 0;

            $closing_stock = $q_stockf - $bben_sal_f + $bben_purc_f + $bben_can_f + $bben_ret_f;
            $value = $closing_stock * $price;
            $tot_value += $value;
        ?>
            <tr>
                <td><?= $product['id'] ?></td>
                <td><?= esc($product['name']) ?></td>
                <td><?= floatval($q_stockf) ?></td>
                <td><?= floatval($opening_stock) ?></td>
                <td><?= floatval($bbwn_purc_f) ?></td>
                <td><?= floatval($bbwn_sal_f) ?></td>
                <td><?= floatval($bbwn_can_f) ?></td>
                <td><?= floatval($bbwn_ret_f) ?></td>
                <td><?= floatval($closing_stock) ?></td>
                <td><?= floatval($price) ?></td>
                <td><?= floatval($value) ?></td>
            </tr>
        <?php endforeach; ?>
        <tr>
            <td colspan="9"></td>
            <td><strong>Total</strong></td>
            <td><strong><?= floatval($tot_value) ?></strong></td>
        </tr>
    </tbody>
</table>
