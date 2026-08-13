<?php
/**
 * @var array $reportData - associative array with all values passed from the controller
 *
 * Required keys:
 * - companyName
 * - storeAddress
 * - dateRangeText
 * - paymentModes (array)
 * - rows (array of rows)
 * - totals (array)
 */
?>
<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="14" style="text-align:center;">
                <?= esc($reportData['companyName']) ?>
            </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="14">
                <?= esc($reportData['storeAddress'] ?? '') ?>
            </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="14">
                <?= esc($reportData['dateRangeText']) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;"><?= label('Bill') . ' ' . label('Number') ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label('customers') ?></th>
            <th style="border: 1px solid #1c76bc;width:100px;"><?= label('Date') ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label('NoOfItems') ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc; "><?= label('Total') . ' ' . label('Amount') ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc; "><?= label('tax') ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc; "><?= label('Summary') ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc; "><?= label('Discount') ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc; "><?= label('Shipping') ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc; "><?= label('Total') . ' ' . label('Amount') ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc; "><?= label('Cash') ?></th>
            <?php foreach ($reportData['paymentModes'] as $mode): ?>
                <th style="border: 1px solid #1c76bc;"><?= esc($mode['name']) ?></th>
            <?php endforeach; ?>
            <th style="text-align:center;border: 1px solid #1c76bc; "><?= label('Status') ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($reportData['rows'] as $row): ?>
            <tr <?= $row['rowStyle'] ?? '' ?>>
                <td style="text-align:center;border: 1px solid #1c76bc;"> <?= esc($row['ssid']) ?> </td>
                <td style="text-align:center;border: 1px solid #1c76bc;"> <?= esc($row['customer']) ?> </td>
                <td style="text-align:center;border: 1px solid #1c76bc;"> <?= esc($row['date']) ?> </td>
                <td style="text-align:right;border: 1px solid #1c76bc;"> <?= esc($row['items']) ?> </td>
                <td style="text-align:right;border: 1px solid #1c76bc;"> <?= esc($row['subtotal']) ?> </td>
                <td style="text-align:right;border: 1px solid #1c76bc;"> <?= esc($row['tax']) ?> </td>
                <td style="text-align:left;border: 1px solid #1c76bc;padding: 0px;"> <?= $row['tax_summary'] ?> </td>
                <td style="text-align:right;border: 1px solid #1c76bc;"> <?= esc($row['discount']) ?> </td>
                <td style="text-align:right;border: 1px solid #1c76bc;"> <?= esc($row['shipping']) ?> </td>
                <td style="text-align:right;border: 1px solid #1c76bc;"> <?= esc($row['total']) ?> </td>
                <td style="text-align:right;border: 1px solid #1c76bc;"> <?= esc($row['cash']) ?> </td>
                <?php foreach ($reportData['paymentModes'] as $mode): ?>
                    <td style="text-align:right;border: 1px solid #1c76bc;"> <?= esc($row['payments'][$mode['id']] ?? '0.00') ?> </td>
                <?php endforeach; ?>
                <td style="text-align:center;border: 1px solid #1c76bc;"> <?= esc($row['status']) ?> </td>
            </tr>
        <?php endforeach; ?>
    </tbody>
    <?php foreach ($reportData['totals'] as $section => $totalRow): ?>
        <tr>
            <td colspan="3"></td>
            <td style="text-align:center;border: 1px solid #1c76bc;"><b><?= ucfirst($section) ?></b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($totalRow['subtotal']) ?></b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($totalRow['tax']) ?></b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($totalRow['discount']) ?></b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($totalRow['shipping']) ?></b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($totalRow['total']) ?></b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($totalRow['cash']) ?></b></td>
            <?php foreach ($reportData['paymentModes'] as $mode): ?>
                <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($totalRow['payments'][$mode['id']] ?? '') ?></b></td>
            <?php endforeach; ?>
            <td style="text-align:right;border: 1px solid #1c76bc;"></td>
        </tr>
    <?php endforeach; ?>
</table>
