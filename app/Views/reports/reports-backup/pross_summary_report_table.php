<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="7" style="text-align:center;"><?= esc($companyName) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="7"><?= esc($storeAddress ?? '') ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="7">HSN Sales Summary Reports from <?= esc($reportStart) ?> Till <?= esc($reportEnd) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;"><?= label("Total") . ' ' . label("Bill") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("HSN") . ' ' . label("Name") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Date") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("NoOfItems") ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc;"><?= label("MRP") ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc;"><?= label("Discount") ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc;"><?= label("Total") . ' ' . label("Amount") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $totalQty = $totalDiscount = $totalAmount = 0;
        foreach ($reportData as $row):
            $totalQty += $row['quantity'];
            $totalDiscount += $row['discount'];
            $totalAmount += $row['total'];
        ?>
        <tr>
            <td style="border: 1px solid #1c76bc;"><?= esc($row['bills']) ?></td>
            <td style="border: 1px solid #1c76bc;"><?= esc($row['hsn']) ?></td>
            <td style="border: 1px solid #1c76bc;"><?= esc($row['date']) ?></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><?= esc($row['quantity']) ?></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><?= number_format($row['rate'], $decimals) ?></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><?= number_format($row['discount'], $decimals) ?></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><?= number_format($row['total'], $decimals) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="3" style="border: 1px solid #1c76bc;"></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= $totalQty ?></b></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b>Rs.<?= number_format($totalDiscount, $decimals) ?></b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b>Rs.<?= number_format($totalAmount, $decimals) ?></b></td>
        </tr>
    </tfoot>
</table>
