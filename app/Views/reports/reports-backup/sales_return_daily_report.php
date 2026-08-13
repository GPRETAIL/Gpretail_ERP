<table class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="7" style="text-align:center;"><?= esc($setting['companyname']) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="7"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="7">Sales Return Reports from <?= date("d-m-Y", strtotime($start)) ?> to <?= date("d-m-Y", strtotime($end)) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label("Date") ?></th>
            <th><?= label("Bill") . ' ' . label("Number") ?></th>
            <th><?= label("Store") . ' ' . label("Name") ?></th>
            <th><?= label("From") . ' ' . label("Sales") . ' ' . label("Number") ?></th>
            <th><?= label("To") . ' ' . label("Sales") . ' ' . label("Number") ?></th>
            <th><?= label("Qty") ?></th>
            <th><?= label("Bill") . ' ' . label("Amount") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php $total = 0; ?>
        <?php foreach ($returns as $row): ?>
            <?php $storeName = $storeModel->find($row->storeid)->name ?? ''; ?>
            <tr>
                <td><?= date("d-m-Y", strtotime($row->todate)) ?></td>
                <td><?= esc($row->re_id) ?></td>
                <td><?= esc($storeName) ?></td>
                <td><?= esc($row->re_sales_id) ?></td>
                <td><?= esc($row->purcha_sales_id) ?></td>
                <td><?= esc($row->iteems) ?></td>
                <td style="text-align:right;"><?= number_format((float)$row->tootal, $setting['decimals'], '.', '') ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="6" style="text-align:right;"><strong>Total</strong></td>
            <td style="text-align:right;"><strong>Rs. <?= number_format((float)$totalAmount, $setting['decimals'], '.', ' ') ?></strong></td>
        </tr>
    </tfoot>
</table>
