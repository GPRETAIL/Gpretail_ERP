<?php if (!isset($isExport)) $isExport = false; ?>

<table <?= $isExport ? '' : 'id="chltkarr"' ?> class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="<?= $isExport ? '' : 'hideme' ?>">
            <th colspan="42" style="text-align:center;"><?= esc($company) ?></th>
        </tr>
        <tr class="<?= $isExport ? '' : 'hideme' ?>" style="text-align:center;">
            <th colspan="42"><?= esc($address) ?></th>
        </tr>
        <tr class="<?= $isExport ? '' : 'hideme' ?>" style="text-align:center;">
            <th colspan="42">Sales Daily Report - From <?= esc($startDate) ?> To <?= esc($endDate) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Bill No</th>
            <th>Store</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Items</th>
            <th>Subtotal</th>
            <th>Tax</th>
            <th>Tax Summary</th>
            <th>Discount</th>
            <th>Shipping</th>
            <th>Total</th>
            <?php foreach ($paymentModes as $mode): ?>
                <th><?= esc($mode['name']) ?></th>
            <?php endforeach; ?>
            <th>Status</th>
            <th>Cancel</th>
            <th>Exchange</th>
            <th>Return</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($rows as $row): ?>
            <tr <?= $row['status_style'] ?? '' ?>>
                <td><?= esc($row['bill_no']) ?></td>
                <td><?= esc($row['store_name']) ?></td>
                <td><?= esc($row['customer_name']) ?></td>
                <td><?= esc($row['date']) ?></td>
                <td class="text-end"><?= esc($row['total_items']) ?></td>
                <td class="text-end"><?= esc($row['subtotal']) ?></td>
                <td class="text-end"><?= esc($row['tax']) ?></td>
                <td><?= $row['tax_summary'] ?></td>
                <td class="text-end"><?= esc($row['discount']) ?></td>
                <td class="text-end"><?= esc($row['shipping']) ?></td>
                <td class="text-end"><?= esc($row['total']) ?></td>
                <?php foreach ($paymentModes as $mode): ?>
                    <td class="text-end"><?= esc($row['payments'][$mode['id']] ?? '0.00') ?></td>
                <?php endforeach; ?>
                <td><?= esc($row['status']) ?></td>
                <td class="text-end"><?= esc($row['cancel']) ?></td>
                <td class="text-end"><?= esc($row['exchange']) ?></td>
                <td class="text-end"><?= esc($row['return']) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <th colspan="5">Totals</th>
            <th class="text-end"><b><?= esc($summary['subtotal']) ?></b></th>
            <th class="text-end"><b><?= esc($summary['tax']) ?></b></th>
            <th></th>
            <th class="text-end"><b><?= esc($summary['discount']) ?></b></th>
            <th class="text-end"><b><?= esc($summary['shipping']) ?></b></th>
            <th class="text-end"><b><?= esc($summary['total']) ?></b></th>
            <?php foreach ($paymentModes as $mode): ?>
                <th class="text-end"><b><?= esc($summary['payments'][$mode['id']] ?? '0.00') ?></b></th>
            <?php endforeach; ?>
            <th></th>
            <th class="text-end"><b><?= esc($summary['cancel']) ?></b></th>
            <th class="text-end"><b><?= esc($summary['exchange']) ?></b></th>
            <th class="text-end"><b><?= esc($summary['return']) ?></b></th>
        </tr>
        <tr>
            <th colspan="<?= 11 + count($paymentModes) ?>" class="text-end">Grand Total</th>
            <th colspan="4" class="text-end"><b><?= esc($summary['grand_total']) ?></b></th>
        </tr>
    </tfoot>
</table>
