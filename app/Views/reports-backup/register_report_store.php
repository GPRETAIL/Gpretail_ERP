<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="<?= $includeDispatch ? 13 : 12 ?>" style="text-align:center;">
                <?= esc($company) ?>
            </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="<?= $includeDispatch ? 13 : 12 ?>">
                <?= esc($address) ?>
            </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="<?= $includeDispatch ? 13 : 12 ?>">
                Store Stock Transfer Reports - from <?= esc(date("d-m-Y", strtotime($start))) ?> till <?= esc(date("d-m-Y", strtotime($end))) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label("Store") ?> <?= label("Name") ?></th>
            <th><?= label("Product") ?> <?= label("Name") ?></th>
            <th><?= label("Opening") ?></th>
            <th><?= label("Purchase") ?></th>
            <th><?= label("Sales") ?></th>
            <th><?= label("Return") ?></th>
            <th><?= label("Adjustment") ?></th>
            <?php if ($includeDispatch): ?>
                <th><?= label("dispatch") ?></th>
            <?php endif; ?>
            <th><?= label("In") ?></th>
            <th><?= label("Out") ?></th>
            <th><?= label("Closing") ?></th>
            <th><?= label("Purchase Velue") ?></th>
            <th><?= label("Sales Velue") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $db = \Config\Database::connect();

        foreach ($warehouses as $warehouse):
            foreach ($products as $product):
                $wid = $warehouse['id'];
                $pid = $product['id'];

                $range = "date BETWEEN '$start' AND '$end'";
                $beforeStart = "date < '$start'";
                $upToEnd = "date <= '$end'";

                // Type codes: 1=Purchase, 2=Sale, 3=AdjustOut, 4=Return, 5=GRN, 6=Dispatch, 8=In, 9=Out

                $purchase = $db->query("SELECT SUM(qty) as qty, SUM(totamt) as total FROM stock_transfer WHERE pro_id=$pid AND war_id=$wid AND tyoftrans=1 AND $range")->getRowArray();
                $return   = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id=$pid AND war_id=$wid AND tyoftrans=4 AND $range")->getRowArray();
                $sales    = $db->query("SELECT SUM(qty) as qty, SUM(totamt) as total FROM stock_transfer WHERE pro_id=$pid AND war_id=$wid AND tyoftrans=2 AND $range")->getRowArray();
                $adjust   = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id=$pid AND war_id=$wid AND tyoftrans=3 AND $range")->getRowArray();
                $dispatch = $includeDispatch
                    ? $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id=$pid AND war_id=$wid AND tyoftrans=6 AND $range")->getRowArray()
                    : ['qty' => 0];
                $in  = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id=$pid AND war_id=$wid AND tyoftrans=9 AND $range")->getRowArray();
                $out = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id=$pid AND war_id=$wid AND tyoftrans=8 AND $range")->getRowArray();

                $openIn = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id=$pid AND war_id=$wid AND tyoftrans IN (1,5) AND $beforeStart")->getRowArray();
                $openOut = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id=$pid AND war_id=$wid AND tyoftrans IN (2,3,4,6) AND $beforeStart")->getRowArray();

                $openQty = ($openIn['qty'] ?? 0) - ($openOut['qty'] ?? 0);
                $closeIn = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id=$pid AND war_id=$wid AND tyoftrans IN (1,4,5) AND $upToEnd")->getRowArray();
                $closeOut = $db->query("SELECT SUM(qty) as qty FROM stock_transfer WHERE pro_id=$pid AND war_id=$wid AND tyoftrans IN (2,3,6) AND $upToEnd")->getRowArray();
                $closeQty = ($closeIn['qty'] ?? 0) - ($closeOut['qty'] ?? 0) + (($in['qty'] ?? 0) - ($out['qty'] ?? 0));

                // Only show rows with any movement or stock
                if ($openQty || $purchase['qty'] || $sales['qty'] || $return['qty'] || $adjust['qty']):
        ?>
        <tr>
            <td><?= esc($warehouse['name']) ?></td>
            <td><?= esc($product['name']) ?></td>
            <td style="text-align:right;"><?= floatval($openQty) ?></td>
            <td style="text-align:right;"><?= floatval($purchase['qty'] ?? 0) ?></td>
            <td style="text-align:right;"><?= floatval($sales['qty'] ?? 0) ?></td>
            <td style="text-align:right;"><?= floatval($return['qty'] ?? 0) ?></td>
            <td style="text-align:right;"><?= floatval($adjust['qty'] ?? 0) ?></td>
            <?php if ($includeDispatch): ?>
                <td style="text-align:right;"><?= floatval($dispatch['qty'] ?? 0) ?></td>
            <?php endif; ?>
            <td style="text-align:right;"><?= floatval($in['qty'] ?? 0) ?></td>
            <td style="text-align:right;"><?= floatval($out['qty'] ?? 0) ?></td>
            <td style="text-align:right;"><?= floatval($closeQty) ?></td>
            <td style="text-align:right;">
                <?= number_format((float)($purchase['total'] ?? 0), $decimals) ?>
            </td>
            <td style="text-align:right;">
                <?= number_format((float)($sales['total'] ?? 0), $decimals) ?>
            </td>
        </tr>
        <?php
                endif;
            endforeach;
        endforeach;
        ?>
    </tbody>
</table>
