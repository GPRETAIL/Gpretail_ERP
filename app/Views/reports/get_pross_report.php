<?php if (!isset($isExport)) $isExport = false; ?>

<table <?= $isExport ? '' : 'id="chltkarr"' ?> class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="<?= $isExport ? '' : 'hideme' ?>">
            <th colspan="7" style="text-align:center;">
                <?= esc($companyname) ?>
            </th>
        </tr>
        <tr class="<?= $isExport ? '' : 'hideme' ?>">
            <th colspan="7" style="text-align:center;">
                <?= esc($storeAddress) ?>
            </th>
        </tr>
        <tr class="<?= $isExport ? '' : 'hideme' ?>">
            <th colspan="7" style="text-align:center;">
                HSN Sales Reports from <?= esc($startDate) ?> Till <?= esc($endDate) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;">Bill Number</th>
            <th style="border: 1px solid #1c76bc;">HSN Name</th>
            <th style="border: 1px solid #1c76bc;">Date</th>
            <th style="border: 1px solid #1c76bc;">NoOfItems</th>
            <th style="border: 1px solid #1c76bc;">Rate</th>
            <th style="border: 1px solid #1c76bc;">Discount</th>
            <th style="border: 1px solid #1c76bc;">Total Amount</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $totalQty = 0;
        $totalDiscount = 0;
        $totalAmount = 0;
        foreach ($records as $row):
            $totalQty += $row['qty'];
            $totalDiscount += $row['discount'];
            $totalAmount += $row['total'];
        ?>
        <tr>
            <td style="text-align:center; border: 1px solid #1c76bc;">
                <?= esc($row['bill_number']) ?>
            </td>
            <td style="text-align:center; border: 1px solid #1c76bc;">
                <?= esc($row['hsn']) ?>
            </td>
            <td style="text-align:center; border: 1px solid #1c76bc;">
                <?= esc($row['date']) ?>
            </td>
            <td style="text-align:center; border: 1px solid #1c76bc;">
                <?= esc($row['qty']) ?>
            </td>
            <td style="text-align:center; border: 1px solid #1c76bc;">
                <?= number_format((float)$row['rate'], $decimals, '.', '') ?>
            </td>
            <td style="text-align:center; border: 1px solid #1c76bc;">
                <?= number_format((float)$row['discount'], $decimals, '.', '') ?>
            </td>
            <td style="text-align:center; border: 1px solid #1c76bc;">
                <?= number_format((float)$row['total'], $decimals, '.', '') ?>
            </td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="3"></td>
            <td style="text-align:right; border: 1px solid #1c76bc;"><b><?= $totalQty ?></b></td>
            <td></td>
            <td style="text-align:right; border: 1px solid #1c76bc;"><b>Rs.<?= number_format((float)$totalDiscount, $decimals, '.', ' ') ?></b></td>
            <td style="text-align:right; border: 1px solid #1c76bc;"><b>Rs.<?= number_format((float)$totalAmount, $decimals, '.', ' ') ?></b></td>
        </tr>
    </tfoot>
</table>
