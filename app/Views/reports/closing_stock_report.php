<table class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="11" class="text-center"><?= esc($setting['companyname']) ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="11" class="text-center"><?= esc($storeInfo['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="11" class="text-center">Closing Stock Reports from <?= $startFormatted ?> Till <?= $endFormatted ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>ID</th>
            <th>Product Name</th>
            <th>Initial</th>
            <th>Opening</th>
            <th>Purchase</th>
            <th>Sales</th>
            <th>Cancel</th>
            <th>Return</th>
            <th>Closing</th>
            <th>Price</th>
            <th>Value</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $tot_value = 0;
        $db = \Config\Database::connect();
        foreach ($products as $product):
            $id = $product['id'];
            $code = $product['code'];
            $price = $product['price'];
            $storeId = $storeId;

            $sale_items = 'sale_items';
            if ($setting['sales_type'] == 0) {
                $sale_items = 'dsale_items';
            }

            // Initial stock
            // $q_stockf = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id='$id' AND store_id='$storeId' AND tyoftrans=5")->getRow()->qty ?? 0;


            $stock_transfer = $db->table('stock_transfer');
            $stock_transfer->selectSum('qty', 'pur1');
            $stock_transfer->where([
                'pro_id'    => $id,
                'store_id'  => $storeId,
                'tyoftrans' => 5
            ]);

            $q_stock = $stock_transfer->get()->getRowArray();
            $q_stockf = $q_stock['pur1'] ?? 0; // default 0 if null

            $purchase_stocks = $db->query("SELECT COALESCE(SUM(quantity), 0) as qty FROM stocks WHERE product_id='$id' AND store_id='$storeId' AND `type`='0'")->getRow()->qty ?? 0;

            //Opening Stock Calculation
            //Before day

            // 🔸 Sales
            $bb_sal = $db->table('sale_items')
                ->selectSum('qt', 'pur1')
                ->where('product_id', $id)
                ->where('store_irrdd', $storeId)
                ->where('date <', $start)
                ->get()
                ->getRowArray();
            $bb_sal_f = $bb_sal['pur1'] ?? 0;

            // 🔸 Purchase
            $bb_purc = $db->table('stock_transfer')
                ->selectSum('qty', 'pur1')
                ->where('pro_id', $id)
                ->where('store_id', $storeId)
                ->where('tyoftrans', 1)
                ->where('date <', $start)
                ->get()
                ->getRowArray();
            $bb_purc_f = $bb_purc['pur1'] ?? 0;

            // 🔸 Cancel
            $bb_can = $db->table('sale_items')
                ->selectSum('qt', 'pur1')
                ->where('product_id', $id)
                ->where('store_irrdd', $storeId)
                ->where('cancel_status', 1)
                ->where('date <', $start)
                ->get()
                ->getRowArray();
            $bb_can_f = $bb_can['pur1'] ?? 0;

            // 🔸 Return
            $bb_ret = $db->table('retunn_items')
                ->selectSum('sl_newqt', 'pur1')
                ->where('prodd_ids', $id)
                ->where('store_idsi', $storeId)
                ->where('to_datte <', $start)
                ->get()
                ->getRowArray();
            $bb_ret_f = $bb_ret['pur1'] ?? 0;

            $opening_stock = $q_stockf + $purchase_stocks;

            // Between range
            $bbwn_purc_f = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id='$id' AND store_id='$storeId' AND tyoftrans=5 AND `date` BETWEEN '$start' AND '$end'")->getRow()->qty ?? 0;
            $builder = $db->table('sale_items');
            $builder->select('COALESCE(SUM(qt), 0) as qty');
            $builder->where('product_id', $id);
            $builder->where('store_irrdd', $storeId);
            $builder->where("`date` BETWEEN '{$start}' AND '{$end}'");

            $row = $builder->get()->getRow();
            $bbwn_sal_f =  $row->qty ?? 0;

            // $bbwn_can_f = $db->query("SELECT COALESCE(SUM(qt), 0) as qty FROM $sale_items WHERE product_id= ? AND store_irrdd= ? AND cancel_status=? AND `date` BETWEEN ? AND ?", [$id, $storeId, 1, $start, $end])->getRow()->qty;
            // $bbwn_ret_f = $db->query("SELECT SUM(sl_newqt) as qty FROM retunn_items WHERE prodd_ids='$id' AND store_idsi='$storeId' AND to_datte BETWEEN '$start' AND '$end'")->getRow()->qty ?? 0;

            // Closing stock
            // 🔸 Sales
            $bbwn_sal = $db->table('sale_items')
                ->selectSum('qt', 'pur1')
                ->where('product_id', $id)
                ->where('store_irrdd', $storeId)
                ->where("date >=", $start)
                ->where("date <=", $end)
                ->get()
                ->getRowArray();
            $bbwn_sal_f = $bbwn_sal['pur1'] ?? 0;

            // 🔸 Purchase
            $bbwn_purc = $db->table('stock_transfer')
                ->selectSum('qty', 'pur1')
                ->where('pro_id', $id)
                ->where('store_id', $storeId)
                ->where('tyoftrans', 1)
                ->where("date >=", $start)
                ->where("date <=", $end)
                ->get()
                ->getRowArray();
            $bbwn_purc_f = $bbwn_purc['pur1'] ?? 0;

            // 🔸 Cancel
            $bbwn_can = $db->table('sale_items')
                ->selectSum('qt', 'pur1')
                ->where('product_id', $id)
                ->where('store_irrdd', $storeId)
                ->where('cancel_status', 1)
                ->where("date >=", $start)
                ->where("date <=", $end)
                ->get()
                ->getRowArray();
            $bbwn_can_f = $bbwn_can['pur1'] ?? 0;

            // 🔸 Return
            $bbwn_ret = $db->table('retunn_items')
                ->selectSum('sl_newqt', 'pur1')
                ->where('prodd_ids', $id)
                ->where('store_idsi', $storeId)
                ->where("to_datte >=", $start)
                ->where("to_datte <=", $end)
                ->get()
                ->getRowArray();
            $bbwn_ret_f = $bbwn_ret['pur1'] ?? 0;


            // 🔸 Sales (till end day)
            $bben_sal = $db->table('sale_items')
                ->selectSum('qt', 'pur1')
                ->where('product_id', $id)
                ->where('store_irrdd', $storeId)
                ->where('date <=', $end)
                ->get()
                ->getRowArray();
            $bben_sal_f = $bben_sal['pur1'] ?? 0;

            // 🔸 Purchase (till end day)
            $bben_purc = $db->table('stock_transfer')
                ->selectSum('qty', 'pur1')
                ->where('pro_id', $id)
                ->where('store_id', $storeId)
                ->where('tyoftrans', 1)
                ->where('date <=', $end)
                ->get()
                ->getRowArray();
            $bben_purc_f = $bben_purc['pur1'] ?? 0;

            // 🔸 Cancel (till end day)
            $bben_can = $db->table('sale_items')
                ->selectSum('qt', 'pur1')
                ->where('product_id', $id)
                ->where('store_irrdd', $storeId)
                ->where('cancel_status', 1)
                ->where('date <=', $end)
                ->get()
                ->getRowArray();
            $bben_can_f = $bben_can['pur1'] ?? 0;

            // 🔸 Return (till end day)
            $bben_ret = $db->table('retunn_items')
                ->selectSum('sl_newqt', 'pur1')
                ->where('prodd_ids', $id)
                ->where('store_idsi', $storeId)
                ->where('to_datte <=', $end)
                ->get()
                ->getRowArray();
            $bben_ret_f = $bben_ret['pur1'] ?? 0;


            $closing_stock = $q_stockf - $bben_sal_f + $bben_purc_f + $bben_can_f + $bben_ret_f;
            $value = $closing_stock * $price;
            // $value = $opening_stock * $price;
            $tot_value += $value;



        ?>
            <tr>
                <td><?= $product['id'] ?></td>
                <td><?= esc($product['name']) ?></td>
                <td><?= floatval($q_stockf) ?></td>
                <td><?= floatval($opening_stock) ?></td>
                <td><?= floatval($bbwn_purc_f) ?></td>
                <td><?= floatval($bbwn_sal_f) ?></td>
                <td><?= floatval($bbwn_can_f) ?>
                </td>
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