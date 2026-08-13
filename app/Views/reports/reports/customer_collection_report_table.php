<table id="chltkarr" class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme"><th colspan="6" class="text-center"><?= esc($companyName) ?></th></tr>
        <tr class="hideme text-center"><th colspan="6"><?= esc($storeAddress) ?></th></tr>
        <tr class="hideme text-center">
            <th colspan="6">Collection Reports from <?= esc(date("d-m-Y", strtotime($start))) ?> Till <?= esc(date("d-m-Y", strtotime($end))) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Customer Name</th>
            <th>Sales Man</th>
            <th>Sales ID</th>
            <th>Date</th>
            <th>Paid</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($results as $row): ?>
        <tr>
            <td><?= esc($row['customer']) ?></td>
            <td><?= esc($row['salesman']) ?></td>
            <td><?= esc($row['sale_id']) ?></td>
            <td><?= date("d-m-Y", strtotime($row['date'])) ?></td>
            <td class="text-end"><?= number_format($row['paid'], $decimals) ?></td>
        </tr>
        <?php endforeach; ?>
        <tr>
            <td colspan="4" class="text-end"><b>Total</b></td>
            <td class="text-end"><b><?= number_format($totalPaid, $decimals) ?></b></td>
        </tr>
    </tbody>
</table>
