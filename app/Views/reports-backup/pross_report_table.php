<?php /** @var array $reportData */ ?>
<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
    <tr class="hideme">
        <th colspan="7" style="text-align:center; "><?= esc($reportData['companyname']) ?></th>
    </tr>
    <tr class="hideme" style="text-align:center; ">
        <th colspan="7"><?= esc($reportData['store_address']) ?></th>
    </tr>
    <tr class="hideme" style="text-align:center; ">
        <th colspan="7">HSN Sales Reports from <?= esc($reportData['start_date']) ?> Till <?= esc($reportData['end_date']) ?></th>
    </tr>
    <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;">Bill Number</th>
        <th style="border: 1px solid #1c76bc;">HSN Name</th>
        <th style="border: 1px solid #1c76bc;">Date</th>
        <th style="border: 1px solid #1c76bc;">NoOfItems</th>
        <th style="text-align:center;border: 1px solid #1c76bc;">Rate</th>
        <th style="text-align:center;border: 1px solid #1c76bc;">Discount</th>
        <th style="text-align:center;border: 1px solid #1c76bc;">Total Amount</th>
    </tr>
    </thead>
    <tbody>
    <?php
    $billamt = $discc = $paidd = 0;
    foreach ($reportData['items'] as $item):
        $billamt += $item['qt'];
        $discc += $item['dis_amt'];
        $paidd += $item['subtotal'];
    ?>
        <tr>
            <td style="text-align:center;border: 1px solid #1c76bc;"><?= esc($item['bill_number']) ?></td>
            <td style="text-align:center;border: 1px solid #1c76bc;"><?= esc($item['hsn']) ?></td>
            <td style="text-align:center;border: 1px solid #1c76bc;"><?= esc($item['date']) ?></td>
            <td style="text-align:center;border: 1px solid #1c76bc;"><?= esc($item['qt']) ?></td>
            <td style="text-align:center;border: 1px solid #1c76bc;"><?= number_format((float)$item['price'], $reportData['decimals'], '.', '') ?></td>
            <td style="text-align:center;border: 1px solid #1c76bc;"><?= number_format((float)$item['dis_amt'], $reportData['decimals'], '.', '') ?></td>
            <td style="text-align:center;border: 1px solid #1c76bc;"><?= number_format((float)$item['subtotal'], $reportData['decimals'], '.', '') ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
    <tfoot>
    <tr>
        <td colspan="3" style="text-align:right;border: 1px solid #1c76bc;"><strong>Total</strong></td>
        <td style="text-align:right;border: 1px solid #1c76bc;"><strong><?= esc($billamt) ?></strong></td>
        <td style="border: 1px solid #1c76bc;"></td>
        <td style="text-align:right;border: 1px solid #1c76bc;"><strong>Rs. <?= number_format((float)$discc, $reportData['decimals'], '.', ' ') ?></strong></td>
        <td style="text-align:right;border: 1px solid #1c76bc;"><strong>Rs. <?= number_format((float)$paidd, $reportData['decimals'], '.', ' ') ?></strong></td>
    </tr>
    </tfoot>
</table>
