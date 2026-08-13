<div class="row">
    <div class="col-md-12">
        <h4>
            <b><?= label("Total") ?>:</b> <?= number_format($sale['total'], $settings['decimals'], '.', '') ?> <?= esc($settings['currency']) ?>
            <b>&emsp;<?= label("Paid") ?>:</b> <?= number_format($sale['paid'], $settings['decimals'], '.', '') ?> <?= esc($settings['currency']) ?>
            <b>&emsp;<?= label("Change") ?>:</b> <?= number_format(($sale['total'] - $sale['paid']), $settings['decimals'], '.', '') ?> <?= esc($settings['currency']) ?>
        </h4>
    </div>
</div>

<div class="col-md-12">
    <table class="table">
        <thead>
            <tr>
                <th width="20%"><?= label("Date") ?></th>
                <th width="30%"><?= label("Createdby") ?></th>
                <th width="20%"><?= label("Amount") ?></th>
                <th width="20%"><?= label("Method") ?></th>
                <th width="10%"></th>
            </tr>
        </thead>
        <tbody class="itemslist">
            <tr>
                <td><?= date('d-m-Y', strtotime($sale['created_at'])) ?></td>
                <td><?= esc($sale['created_by']) ?></td>
                <td><?= number_format($initialPay, $settings['decimals'], '.', '') ?></td>
                <td><?= esc($initialMethod) ?></td>
                <td></td>
            </tr>

            <?php foreach ($payments as $pay):
                $pm = explode('~', $pay['paidmethod']);
                $method = match ($pm[0] ?? '0') {
                    '1' => 'Credit Card',
                    '2' => 'Cheque',
                    '4' => 'Exchange',
                    default => 'Cash',
                };
            ?>
                <tr>
                    <td><?= date('d-m-Y', strtotime($pay['date'])) ?></td>
                    <td><?= esc($pay['created_by']) ?></td>
                    <td><?= number_format($pay['paid'], $settings['decimals'], '.', '') ?></td>
                    <td><?= esc($method) ?></td>
                    <td><a href="javascript:void(0)" onclick="deletepayement(<?= $pay['id'] ?>)"><i class="fa fa-trash" aria-hidden="true"></i></a></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>

<button class="btn btn-add col-md-12" onclick="addpymntBtn()" style="margin-bottom:0">
    <?= label("AddPayement") ?>
</button>