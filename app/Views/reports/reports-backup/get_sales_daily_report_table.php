<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="18" style="text-align:center;">
                <?= esc($companyName) ?>
            </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="18">
                <?= esc($storeAddress ?? '') ?>
            </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="18">
                <?= "Daily Sales Reports from $startDate Till $endDate" ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th><?= label('Bill') ?> <?= label('Number') ?></th>
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
            <?php foreach ($paymentModes as $mode): ?>
                <th><?= esc($mode['name']) ?></th>
            <?php endforeach; ?>
            <th><?= label('Status') ?></th>
            <th><?= label('Cancel') ?></th>
            <th><?= label('Exchange') ?></th>
            <th><?= label('Return') ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($salesData as $row): ?>
            <tr <?= $row['status_class'] ?? '' ?>>
                <td><?= esc($row['bill_no']) ?></td>
                <td><?= esc($row['store']) ?></td>
                <td><?= esc($row['customer']) ?></td>
                <td><?= esc($row['date']) ?></td>
                <td><?= esc($row['items']) ?></td>
                <td><?= esc($row['subtotal']) ?></td>
                <td><?= esc($row['tax']) ?></td>
                <td><?= $row['summary'] ?></td>
                <td><?= esc($row['discount']) ?></td>
                <td><?= esc($row['shipping']) ?></td>
                <td><?= esc($row['total']) ?></td>
                <?php foreach ($paymentModes as $mode): ?>
                    <td><?= esc($row['payments'][$mode['id']] ?? '0.00') ?></td>
                <?php endforeach; ?>
                <td><?= esc($row['status']) ?></td>
                <td><?= esc($row['cancel']) ?></td>
                <td><?= esc($row['exchange']) ?></td>
                <td><?= esc($row['return']) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
