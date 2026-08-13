<!-- app/Views/reports/customer_credit_report.php -->
<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="10" style="text-align:center;"><?= esc($settings['companyname']) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="10"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="10">
                <?= lang('Reports.credit_status_report') ?> <?= lang('from') ?>
                <?= esc(date('d-m-Y', strtotime($start))) ?> <?= lang('till') ?>
                <?= esc(date('d-m-Y', strtotime($end))) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border:1px solid #1c76bc;">
            <th><?= label('CustomerName') ?></th>
            <th><?= label('Sales Man') ?></th>
            <th><?= label('sales') . ' ' . label('Number') ?></th>
            <th><?= label('date') ?></th>
            <th><?= label('Credit') . ' ' . label("day's") ?></th>
            <th><?= label('Total') ?></th>
            <th><?= label('Paid') ?></th>
            <th><?= label('Unpaid') ?></th>
            <th><?= label('Action') ?></th>
        </tr>
    </thead>
    <tbody>
        <?php $totalAmount = 0; ?>
        <?php foreach ($sales as $sale): ?>
            <?php
                $statusLabel = match ((int)$sale->status) {
                    1 => 'unpaid',
                    2 => 'Partiallypaid',
                    default => 'paid',
                };

                $salespersonName = isset($users[$sale->salesperson]) 
                    ? $users[$sale->salesperson]->firstname . ' ' . $users[$sale->salesperson]->lastname 
                    : '----';

                $createdDate = date('d-m-Y', strtotime($sale->created_at));
                $unpaid = $sale->total - $sale->paid;
                $totalAmount += $sale->total;
            ?>
            <tr style="border: 1px solid #1c76bc;">
                <td><?= esc($sale->clientname) ?></td>
                <td><?= esc($salespersonName) ?></td>
                <td><?= esc($sale->id) ?></td>
                <td><?= esc($createdDate) ?></td>
                <td><?= esc($sale->creddate) ?></td>
                <td><?= number_format((float)$sale->total, $decimals, '.', '') ?></td>
                <td><?= number_format((float)$sale->paid, $decimals, '.', '') ?></td>
                <td><?= number_format((float)$unpaid, $decimals, '.', '') ?></td>
                <td>
                    <span style="padding: 8px;"><?= label($statusLabel) ?></span>
                    <a href="javascript:void(0)" onclick="showTicket4('<?= $sale->id ?>')" data-toggle="dropdown"><?= lang('View') ?></a>
                </td>
            </tr>
        <?php endforeach; ?>
        <tr style="border: 1px solid #1c76bc;">
            <td colspan="6" style="border: 1px solid #1c76bc;">
                <?= label('Total') ?> Rs.:
                <span><?= number_format((float)$totalAmount, $decimals, '.', '') ?></span>
            </td>
        </tr>
    </tbody>
</table>
