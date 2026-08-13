<div class="row">
    <div class="col-md-12">
        <h4>
            <b><?= label("Total") ?>:</b> Rs.<?= number_format($purchase['total'], $settings['decimals'], '.', '') ?> &emsp;
            <b><?= label("Paid") ?>:</b> Rs.<?= number_format($totalPaid, $settings['decimals'], '.', '') ?> &emsp;
            <b><?= label("Change") ?>:</b> Rs.<?= number_format($balance, $settings['decimals'], '.', '') ?>
        </h4>
    </div>
</div>

<div class="col-md-12">
    <table class="table">
        <thead>
            <tr>
                <th width="15%"><?= label("Date") ?></th>
                <th width="25%"><?= label("Createdby") ?></th>
                <th width="20%"><?= label("Amount") ?></th>
                <th width="10%"><?= label("method") ?></th>
                <th width="15%"><?= label("Cheque No") ?></th>
                <th width="15%"><?= label("Bank") ?></th>
                <th width="10%"></th>
            </tr>
        </thead>
        <tbody class="itemslist">
            <?php foreach ($payments as $pay):
                $method = match ((int)$pay['methid']) {
                    2 => 'Cheque',
                    default => 'Cash'
                };
            ?>
                <tr>
                    <td><?= date('d-m-Y', strtotime($pay['datet'])) ?></td>
                    <td><?= esc($pay['bycrted']) ?></td>
                    <td><?= number_format($pay['amtpaid'], $settings['decimals'], '.', '') ?></td>
                    <td><?= esc($method) ?></td>
                    <td><?= esc($pay['chechno']) ?></td>
                    <td><?= esc($pay['bankname']) ?></td>
                    <td>
                        <a href="javascript:void(0)" onclick="deletepayementrrr(<?= $pay['idd'] ?>)">
                            <i class="fa fa-trash" aria-hidden="true"></i>
                        </a>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>

<button class="btn btn-add col-md-12" onclick="addpymntBtn()" style="margin-bottom:0">
    <?= label("AddPayement") ?>
</button>