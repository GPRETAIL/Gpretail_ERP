<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="100%" style="text-align:center;"><?= esc($company) ?></th></tr>
        <tr class="hideme"><th colspan="100%" style="text-align:center;"><?= esc($address) ?></th></tr>
        <tr class="hideme"><th colspan="100%" style="text-align:center;">Close Register Reports from <?= esc($start) ?> Till <?= esc($end) ?></th></tr>

        <tr style="background: #1c76bc;color: #fff;">
            <th><?= label("Openingtime") ?></th>
            <th><?= label("closedat") ?></th>
            <th><?= label("StoreName") ?></th>
            <th><?= label("Openedby") ?></th>
            <th><?= label("CashinHand") ?></th>
            <?php foreach ($paymentModes as $mode): ?>
                <th><?= esc($mode['name']) ?></th>
            <?php endforeach; ?>
            <th>Return</th>
            <th>Expense</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($data as $row): ?>
            <tr>
                <td><?= date("d-m-Y H:i:s", strtotime($row['opening_time'])) ?></td>
                <td><?= $row['closing_time'] ? date("d-m-Y H:i:s", strtotime($row['closing_time'])) : label("Stillopen") ?></td>
                <td><?= esc($row['store_name']) ?></td>
                <td><?= esc($row['opened_by']) ?></td>
                <td style="text-align:center;"><?= number_format($row['cash_in_hand'], 2) ?></td>
                <?php foreach ($paymentModes as $mode): ?>
                    <td><?= number_format($row['payments'][$mode['name']] ?? 0, 2) ?></td>
                <?php endforeach; ?>
                <td><?= number_format($row['return'], 2) ?></td>
                <td><?= number_format($row['expense'], 2) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
