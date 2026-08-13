<!-- app/Views/invoices/payments.php -->
<div class="row">
    <div class="col-md-12">
        <h4>
            <b><?= label('Total') ?>:</b> <?= number_format((float)$sale['total'], DECIMALS, '.', '') ?> &emsp;
            <b><?= label('Paid') ?>:</b> Rs. <?= number_format((float)$sale['paid'], DECIMALS, '.', '') ?> &emsp;
            <b><?= label('Balance') ?>:</b> Rs. <?= number_format((float)($sale['total'] - $sale['paid']), DECIMALS, '.', '') ?>
        </h4>
        <input type="hidden" id="balall" value="<?= number_format((float)($sale['total'] - $sale['paid']), DECIMALS, '.', '') ?>" />
    </div>
</div>

<div class="col-md-12">
    <table class="table">
        <thead>
            <tr>
                <th width="20%"><?= label('Date') ?></th>
                <th width="30%"><?= label('Createdby') ?></th>
                <th width="20%"><?= label('Amount') ?></th>
                <th width="20%"><?= label('method') ?></th>
                <th width="10%"></th>
            </tr>
        </thead>
        <tbody class="itemslist">
            <tr>
                <td><?= date('d-m-Y', strtotime($sale['created_at'])) ?></td>
                <td><?= esc($sale['created_by']) ?></td>
                <td><?= number_format((float)$sale['firstpayement'], DECIMALS, '.', '') ?></td>
                <td>
                    <?php
                    $pm = explode('~', $sale['paidmethod']);
                    echo match ($pm[0]) {
                        '1' => label('CreditCard'),
                        '2' => label('Cheque'),
                        default => label('Cash')
                    };
                    ?>
                </td>
                <td></td>
            </tr>
            <?php foreach ($payements as $pay): ?>
                <tr>
                    <td><?= $pay['date'] instanceof DateTime ? $pay['date']->format('d-m-Y') : date('d-m-Y', strtotime($pay['date'])) ?></td>
                    <td><?= esc($pay['created_by']) ?></td>
                    <td><?= number_format((float)$pay['paid'], DECIMALS, '.', '') ?></td>
                    <td>
                        <?php
                        $pm = explode('~', $pay['paidmethod']);
                        echo match ($pm[0]) {
                            '0' => 'Cash',
                            '1' => 'Credit Card',
                            '2' => 'Cheque',
                            '4' => 'Exchange',
                            '10' => 'Coupon',
                            default => 'Other'
                        };
                        ?>
                    </td>
                    <td><a href="javascript:void(0)" onclick="deletepayement(<?= $pay['id'] ?>)"><i class="fa fa-trash" aria-hidden="true"></i></a></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>

<?php if (($sale['total'] - $sale['paid']) > 0): ?>
    <button class="btn btn-add col-md-12" onclick="addpymntBtn()" style="margin-bottom:0">
        <?= label('AddPayement') ?>
    </button>
<?php endif; ?>