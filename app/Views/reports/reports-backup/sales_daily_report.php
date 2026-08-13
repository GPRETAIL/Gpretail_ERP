<?php /** @var array $reportData */ ?>

<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="14" style="text-align:center;"> <?= esc($reportData['companyName']) ?> </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="14"> <?= esc($reportData['companyAddress']) ?> </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="14">Daily Sales Reports from <?= esc($reportData['start']) ?> Till <?= esc($reportData['end']) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;width:100px;">Bill Number</th>
            <th style="border: 1px solid #1c76bc;width:100px;">Date</th>
            <th style="border: 1px solid #1c76bc;">Customer</th>
            <th style="border: 1px solid #1c76bc;">Particulars</th>
            <th style="border: 1px solid #1c76bc;">Total Items</th>
            <th style="border: 1px solid #1c76bc;">Total Amount</th>
            <th style="border: 1px solid #1c76bc;">Cash</th>
            <th style="border: 1px solid #1c76bc;">Card</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($reportData['rows'] as $row): ?>
            <tr <?= $row['rowStyle'] ?? '' ?>>
                <td style="text-align:center;border: 1px solid #1c76bc;"> <?= esc($row['billId']) ?> </td>
                <td style="text-align:center;border: 1px solid #1c76bc;"> <?= esc($row['date']) ?> </td>
                <td style="text-align:left;border: 1px solid #1c76bc;"> <?= esc($row['customer']) ?> </td>
                <td style="text-align:left;border: 1px solid #1c76bc;"> <?= $row['particulars'] ?> </td>
                <td style="text-align:right;border: 1px solid #1c76bc;"> <?= esc($row['totalItems']) ?> </td>
                <td style="text-align:right;border: 1px solid #1c76bc;"> <?= esc($row['totalAmount']) ?> </td>
                <td style="text-align:right;border: 1px solid #1c76bc;"> <?= esc($row['cash']) ?> </td>
                <td style="text-align:right;border: 1px solid #1c76bc;"> <?= esc($row['card']) ?> </td>
            </tr>
        <?php endforeach; ?>

        <tr>
            <td colspan="4" style="text-align:right;border: 1px solid #1c76bc;"></td>
            <td style="text-align:center;border: 1px solid #1c76bc;"><b>Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($reportData['totals']['total']) ?></b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($reportData['totals']['cash']) ?></b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($reportData['totals']['card']) ?></b></td>
        </tr>

        <tr>
            <td colspan="4" style="text-align:right;border: 1px solid #1c76bc;"></td>
            <td style="text-align:center;border: 1px solid #1c76bc;"><b>Paid</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($reportData['totals']['paid']) ?></b></td>
            <td colspan="2"></td>
        </tr>

        <tr>
            <td colspan="4" style="text-align:right;border: 1px solid #1c76bc;"></td>
            <td style="text-align:center;border: 1px solid #1c76bc;"><b>Advance</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($reportData['totals']['advance']) ?></b></td>
            <td colspan="2"></td>
        </tr>

        <tr>
            <td colspan="4" style="text-align:right;border: 1px solid #1c76bc;"></td>
            <td style="text-align:center;border: 1px solid #1c76bc;"><b>Balance</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><b><?= esc($reportData['totals']['balance']) ?></b></td>
            <td colspan="2"></td>
        </tr>
    </tbody>
</table>
