<?php if (!isset($data)) return; ?>

<table id="serverside" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="18" style="text-align:center;">
                <?= esc($settings['companyname']) ?? '' ?>
            </th>
        </tr>
        <tr class="hideme">
            <th colspan="18" style="text-align:center;">
                <?= esc($storeInfo['adresse'] ?? '') ?>
            </th>
        </tr>
        <tr class="hideme">
            <th colspan="18" style="text-align:center;">
                Daily Sales Reports from <?= esc(date('d-m-Y', strtotime($this->request->getPost('Range')))) ?> to <?= esc(date('d-m-Y', strtotime($this->request->getPost('Range1')))) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label('Bill') . ' ' . label('Number') ?></th>
            <th><?= label('Store') ?></th>
            <th><?= label('customers') ?></th>
            <th><?= label('Date') ?></th>
            <th><?= label('NoOfItems') ?></th>
            <th><?= label('Subtotal') ?></th>
            <th><?= label('Tax') ?></th>
            <th><?= label('Summary') ?></th>
            <th><?= label('Discount') ?></th>
            <th><?= label('Shipping') ?></th>
            <th><?= label('Total Amount') ?></th>
            <?php foreach ($pamode_id as $id): ?>
                <th><?= esc(getPaymentModeName($id)) ?></th>
            <?php endforeach; ?>
            <th><?= label('Status') ?></th>
            <th><?= label('Cancel') ?></th>
            <th><?= label('Exchange') ?></th>
            <th><?= label('Return') ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($data as $row): ?>
            <tr>
                <?php foreach ($row as $col): ?>
                    <td><?= esc($col) ?></td>
                <?php endforeach; ?>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
