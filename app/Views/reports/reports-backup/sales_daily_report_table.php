<?php /** @var array \$salesData */ ?>

<table id="serverside" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="16" style="text-align:center;">
                <?= esc(\$settings['companyname'] ?? '') ?>
            </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="16">
                <?= esc(\$store['adresse'] ?? '') ?>
            </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="16">
                Daily Sales Report from <?= esc(\$startDate) ?> to <?= esc(\$endDate) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th><?= label('Bill') ?> <?= label('Number') ?></th>
            <th><?= label('Store') ?></th>
            <th><?= label('Customer') ?></th>
            <th><?= label('Date') ?></th>
            <th><?= label('Total Items') ?></th>
            <th><?= label('Subtotal') ?></th>
            <th><?= label('Tax') ?></th>
            <th><?= label('Tax Summary') ?></th>
            <th><?= label('Discount') ?></th>
            <th><?= label('Shipping') ?></th>
            <th><?= label('Total Amount') ?></th>
            <?php foreach (\$paymentModes as \$mode): ?>
                <th><?= esc(\$mode['name']) ?></th>
            <?php endforeach; ?>
            <th><?= label('Status') ?></th>
            <th><?= label('Cancel Amount') ?></th>
            <th><?= label('Exchange Amount') ?></th>
            <th><?= label('Return Amount') ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach (\$salesData as \$row): ?>
            <tr>
                <?php foreach (\$row as \$col): ?>
                    <td><?= esc(\$col) ?></td>
                <?php endforeach; ?>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
