<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="7" style="text-align:center;"><?= esc($companyname) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="7"><?= esc($store_address) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="7">Monthly Summary HSN Sales Reports from <?= esc($start_date) ?> Till <?= esc($end_date) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;"><?= label('Total') ?> <?= label('Bill') ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label('HSN') ?> <?= label('Name') ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label('Date') ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label('NoOfItems') ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc;"><?= label('MRP') ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc;"><?= label('Discount') ?></th>
            <th style="text-align:center;border: 1px solid #1c76bc;"><?= label('Total') ?> <?= label('Amount') ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($reportData as $row): ?>
        <tr>
            <td style="border: 1px solid #1c76bc;"><?= esc($row['bills']) ?></td>
            <td style="border: 1px solid #1c76bc;"><?= esc($row['hsn']) ?></td>
            <td style="border: 1px solid #1c76bc;"><?= esc($row['month']) ?></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><?= esc($row['total_items']) ?></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><?= esc($row['mrp']) ?></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><?= esc($row['discount']) ?></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><?= esc($row['total_amount']) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="3" style="text-align:right;border: 1px solid #1c76bc;"><strong>Total</strong></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><strong><?= esc($totals['total_items']) ?></strong></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><strong>Rs. <?= esc($totals['discount']) ?></strong></td>
            <td style="text-align:right;border: 1px solid #1c76bc;"><strong>Rs. <?= esc($totals['total_amount']) ?></strong></td>
        </tr>
    </tfoot>
</table>
