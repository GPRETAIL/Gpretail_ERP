<!-- app/Views/invoices/ticket.php -->
<div class="ticket">
    <hr>
    <table class="table" cellspacing="0" border="0">
        <thead>
            <tr style="background-color:#555;color:#fff;font-weight:600">
                <th style="text-align:left;width: 150px;"><?= label('Date') ?></th>
                <th style="text-align:right;"><?= label('Amounttopay') ?></th>
                <th style="text-align:right;"><?= label('Paid') ?></th>
            </tr>
        </thead>
        <tbody>
            <tr style="border: 1px solid #ede4e4;">
                <td style="text-align:left;border-top: 0px;">
                    <?= date('d-m-Y', strtotime($sale['created_at'])) ?> Initial
                </td>
                <td style="text-align:right;border-top: 0px;">
                    <?= number_format((float)$sale['total'], $setting->decimals, '.', '') ?>
                </td>
                <td style="text-align:right;border-top: 0px;">
                    <?= number_format((float)$sale['recivamt'], $setting->decimals, '.', '') ?>
                </td>
            </tr>
            <?php
            $ttt = $sale['total'] - $sale['recivamt'];
            $idd = $sale['created_at'];
            for ($i = 1; $i <= (int)$sale['creddate']; $i++):
                $dateCheck = date('Y-m-d', strtotime("+{$i} days", strtotime($idd)));
                $payment = $paymentsGrouped[$dateCheck] ?? null;
                $paidAmount = $payment ? $payment['kl'] : '--';
                $style = $payment ? 'color:white;background:#34495e;' : 'color:red;';
                if ($payment) $ttt -= $payment['kl'];
            ?>
                <tr style="<?= $style ?> border: 1px solid #ede4e4;">
                    <td style="text-align:left;border-top: 0px;">
                        <?= date('d-m-Y', strtotime($dateCheck)) ?>
                    </td>
                    <td style="text-align:right;border-top: 0px;">
                        <?= number_format((float)$ttt, $setting->decimals, '.', '') ?>
                    </td>
                    <td style="text-align:right;border-top: 0px;">
                        <?= $paidAmount ?>
                    </td>
                </tr>
            <?php endfor; ?>
            <tr style="border: 1px solid #ede4e4;background-color:#555;color:white;">
                <td style="text-align:left;border-top: 0px;">
                    <?= label('Balanceamt') ?>
                </td>
                <td style="text-align:right;border-top: 0px;">
                    <?= number_format((float)$ttt, $setting->decimals, '.', '') ?>
                </td>
                <td style="text-align:right;border-top: 0px;"> </td>
            </tr>
        </tbody>
    </table>
</div>