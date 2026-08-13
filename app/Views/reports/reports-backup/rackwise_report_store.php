<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="14" style="text-align:center;"><?= esc($company) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="14"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="14">
                Store Stock Transfer Reports (Rackwise) - From <?= date("d-m-Y", strtotime($start)) ?> to <?= date("d-m-Y", strtotime($end)) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label("Warehouse") ?></th>
            <th><?= label("Product") ?></th>
            <th><?= label("Level") ?></th>
            <th><?= label("Rack") ?></th>
            <th><?= label("Opening") ?></th>
            <th><?= label("Purchase") ?></th>
            <th><?= label("Sales") ?></th>
            <th><?= label("Return") ?></th>
            <th><?= label("Adjustment") ?></th>
            <th><?= label("In") ?></th>
            <th><?= label("Out") ?></th>
            <th><?= label("Closing") ?></th>
            <th><?= label("Purchase Value") ?></th>
            <th><?= label("Sales Value") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $db = \Config\Database::connect();

        foreach ($levels as $level):
            $warehouseId = $level['warehousr'];
            $warehouseName = $warehouseMap[$warehouseId] ?? '-';
            $levelName = $level['name'];
            $rackCount = $level['valueper'];

            for ($rack = 1; $rack <= $rackCount; $rack++):
                foreach ($products as $product):
                    $pid = $product['id'];
                    $pname = $product['name'];

                    $getSum = function($type, $column = 'qty') use ($db, $pid, $warehouseId, $levelName, $rack, $start, $end, $column) {
                        return $db->table('stock_transfer')
                            ->selectSum($column)
                            ->where([
                                'pro_id' => $pid,
                                'war_id' => $warehouseId,
                                'llvel' => $levelName,
                                'rrack' => $rack,
                                'tyoftrans' => $type
                            ])
                            ->where("date >=", $start)
                            ->where("date <=", $end)
                            ->get()->getRowArray()[$column] ?? 0;
                    };

                    $qty1 = $getSum(1);  $val1 = $getSum(1, 'totamt');
                    $qty2 = $getSum(2);  $val2 = $getSum(2, 'totamt');
                    $qty3 = $getSum(3);
                    $qty4 = $getSum(4);
                    $qty5 = $getSum(5);
                    $qty6 = $getSum(6);
                    $qty8 = $getSum(8);
                    $qty9 = $getSum(9);

                    // Opening calculation
                    $getBefore = function($types) use ($db, $pid, $warehouseId, $levelName, $rack, $start) {
                        return $db->table('stock_transfer')
                            ->selectSum('qty')
                            ->where('pro_id', $pid)
                            ->where('war_id', $warehouseId)
                            ->where('llvel', $levelName)
                            ->where('rrack', $rack)
                            ->whereIn('tyoftrans', $types)
                            ->where('date <', $start)
                            ->get()->getRowArray()['qty'] ?? 0;
                    };

                    $openIn = $getBefore([1, 4, 5]);
                    $openOut = $getBefore([2, 3, 6]);
                    $opening = $openIn - $openOut;

                    // Closing calculation
                    $closeIn = $openIn + $qty1 + $qty4 + $qty5;
                    $closeOut = $openOut + $qty2 + $qty3 + $qty6;
                    $closing = $closeIn - $closeOut + ($qty9 - $qty8);

                    // Show only active rows
                    if ($opening || $closing || $qty1 || $qty2 || $qty4):
        ?>
        <tr>
            <td><?= esc($warehouseName) ?></td>
            <td><?= esc($pname) ?></td>
            <td style="text-align:right;"><?= esc($levelName) ?></td>
            <td style="text-align:right;"><?= $rack ?></td>
            <td style="text-align:right;"><?= floatval($opening) ?></td>
            <td style="text-align:right;"><?= floatval($qty1) ?></td>
            <td style="text-align:right;"><?= floatval($qty2) ?></td>
            <td style="text-align:right;"><?= floatval($qty4) ?></td>
            <td style="text-align:right;"><?= floatval($qty3) ?></td>
            <td style="text-align:right;"><?= floatval($qty9) ?></td>
            <td style="text-align:right;"><?= floatval($qty8) ?></td>
            <td style="text-align:right;"><?= floatval($closing) ?></td>
            <td style="text-align:right;"><?= number_format((float)($val1), $decimals) ?></td>
            <td style="text-align:right;"><?= number_format((float)($val2), $decimals) ?></td>
        </tr>
        <?php
                    endif;
                endforeach;
            endfor;
        endforeach;
        ?>
    </tbody>
</table>
