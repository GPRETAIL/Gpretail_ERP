<div class="col-md-6">
    <footer><b><?= label("Openedby") ?></b></footer>
    <p><?= esc($createdBy) ?></p>
</div>
<div class="col-md-6">
    <footer><b><?= label("closedBy") ?></b></footer>
    <p><?= esc($closedBy) ?></p>
</div>

<div class="col-md-12" style="height: 400px; overflow: scroll;">
    <div class="col-md-8">
        <h1 style="text-align:center; font-size:18px; margin-top:2px; margin-bottom:1px;"><b><?= label("PaymentsSummary") ?></b></h1>

        <table class="table table-striped">
            <tr>
                <th width="25%"><?= label("PayementType") ?></th>
                <th style="text-align:right;" width="25%"><?= label("EXPECTED") ?> (<?= esc($currency) ?>)</th>
                <th style="text-align:right;" width="25%"><?= label("COUNTED") ?> (<?= esc($currency) ?>)</th>
                <th style="text-align:right;" width="25%"><?= label("DIFFERENCES") ?> (<?= esc($currency) ?>)</th>
            </tr>

            <?php foreach ($payments as $pay): ?>
                <tr>
                    <td><?= esc($pay['name']) ?></td>
                    <td style="text-align:right;"><?= esc($pay['expected']) ?></td>
                    <td style="text-align:right;"><?= esc($pay['counted']) ?></td>
                    <td style="text-align:right;"><?= esc($pay['diff']) ?></td>
                </tr>
            <?php endforeach; ?>

            <?php if ($ret1): ?>
                <tr>
                    <td>Return</td>
                    <td style="text-align:right;"><?= number_format($ret1['expectedcash'] ?? 0, $decimals, '.', '') ?></td>
                    <td style="text-align:right;"><?= number_format($ret1['countedcash'] ?? 0, $decimals, '.', '') ?></td>
                    <td style="text-align:right;">0</td>
                </tr>
            <?php endif; ?>

            <?php if ($ret3): ?>
                <tr>
                    <td>Return</td>
                    <td style="text-align:right;"><?= number_format($ret3['expectedcash'] ?? 0, $decimals, '.', '') ?></td>
                    <td style="text-align:right;"><?= number_format($ret3['countedcash'] ?? 0, $decimals, '.', '') ?></td>
                    <td style="text-align:right;">0</td>
                </tr>
            <?php endif; ?>

            <?php if ($ret2): ?>
                <tr>
                    <td>Total</td>
                    <td style="text-align:right;"><?= number_format($ret2['expectedcash'] ?? 0, $decimals, '.', '') ?></td>
                    <td style="text-align:right;"><?= number_format($ret2['countedcash'] ?? 0, $decimals, '.', '') ?></td>
                    <td style="text-align:right;"><?= number_format($ret2['diffcash'] ?? 0, $decimals, '.', '') ?></td>
                </tr>
            <?php endif; ?>
        </table>
    </div>

    <div class="col-md-4">
        <h1 style="text-align:center; font-size:18px; margin-top:2px; margin-bottom:1px;"><b><?= label("Cash") ?></b></h1>

        <table class="table table-striped">
            <?php foreach ($notes as $note): ?>
                <tr>
                    <td style="text-align: right;" width="30%"><?= esc($note['name']) ?> X</td>
                    <td width="25%"><?= esc($note['counted']) ?></td>
                    <td width="35%" style="text-align:right;"><?= esc($note['diff']) ?></td>
                </tr>
            <?php endforeach; ?>
            <tr>
                <td></td>
                <td>Total</td>
                <td style="text-align:right;"><?= esc($denoTotal) ?></td>
            </tr>
        </table>

        <div>
            <h2><?= label("note") ?></h2>
            <?= esc($noteText) ?>
        </div>
    </div>
</div>

<div class="form-group">&nbsp;</div>
