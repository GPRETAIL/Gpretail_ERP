<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="5" style="text-align:center;"><?= esc($setting['companyname']) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="5"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="5">
                Sales Return Summary Reports from <?= esc($startpp) ?> Till <?= esc($endpp) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border:1px solid #1c76bc;">
            <th style="border:1px solid #1c76bc;">Date</th>
            <th style="text-align:center;border:1px solid #1c76bc;">Total Bill</th>
            <th style="border:1px solid #1c76bc;">Store Name</th>
            <th style="text-align:center;border:1px solid #1c76bc;">Total Qty</th>
            <th style="text-align:center;border:1px solid #1c76bc;">Total Bill Amount</th>
        </tr>
    </thead>
    <tbody>
        <?php $paidd = 0; ?>
        <?php foreach ($reportData as $row): ?>
            <?php $paidd += $row->billamt; ?>
            <tr>
                <td style="border:1px solid #1c76bc;"><?= date("d-m-Y", strtotime($row->todate)) ?></td>
                <td style="text-align:center;border:1px solid #1c76bc;"><?= $row->bills ?></td>
                <td style="text-align:left;border:1px solid #1c76bc;"><?= esc($storeNames[$row->storeid] ?? '') ?></td>
                <td style="text-align:center;border:1px solid #1c76bc;"><?= $row->iteemst ?></td>
                <td style="text-align:right;border:1px solid #1c76bc;">
                    <?= number_format((float)$row->billamt, $decimals, '.', '') ?>
                </td>
            </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="4" style="text-align:right;border:1px solid #1c76bc;"><strong>Total:</strong></td>
            <td style="text-align:right;border:1px solid #1c76bc;">
                <b>Rs.<?= number_format((float)$paidd, $decimals, '.', '') ?></b>
            </td>
        </tr>
    </tfoot>
</table>