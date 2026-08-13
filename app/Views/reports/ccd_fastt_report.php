<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="6" style="text-align:center;"><?= esc($companyName) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="6"><?= esc($storeAddress) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="6">Fast Moving Reports from <?= date('d-m-Y', strtotime($startDate)) ?> Till <?= date('d-m-Y', strtotime($endDate)) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;"><?= label("Category") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Product") ?></th>
            <th style="border: 1px solid #1c76bc;text-align:center;"><?= label("Sales") ?></th>
            <th style="border: 1px solid #1c76bc;text-align:center;"><?= label("Cancel") ?></th>
            <th style="border: 1px solid #1c76bc;text-align:center;"><?= label("Return") ?></th>
            <th style="border: 1px solid #1c76bc;text-align:center;"><?= label("Total") ?> <?= label("Sales") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($products as $prd): ?>
            <?php
            $returnQty = $returns[$prd->product_id] ?? 0;
            $finalQty = intval($prd->ttt) - intval($prd->qt_cancel) - intval($returnQty);
            ?>
            <tr style="border: 1px solid #1c76bc;">
                <td style="border: 1px solid #1c76bc;"><?= esc($prd->ccc) ?></td>
                <td style="border: 1px solid #1c76bc;"><?= esc($prd->pprd) ?></td>
                <td style="border: 1px solid #1c76bc;text-align:center;"><?= $prd->ttt ?></td>
                <td style="border: 1px solid #1c76bc;text-align:center;"><?= $prd->qt_cancel ?></td>
                <td style="border: 1px solid #1c76bc;text-align:center;"><?= $returnQty ?></td>
                <td style="border: 1px solid #1c76bc;text-align:center;"><?= $finalQty ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>