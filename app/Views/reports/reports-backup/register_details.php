<div class="row">
    <div class="col-md-6">
        <footer><b><?= esc($openedByLabel) ?></b></footer>
        <p><?= esc($createdBy) ?></p>
    </div>
    <div class="col-md-6">
        <footer><b><?= esc($closedByLabel) ?></b></footer>
        <p><?= esc($closedBy) ?></p>
    </div>
</div>

<div class="col-md-12" style="height: 400px; overflow-y: scroll;">
    <div class="col-md-8">
        <h1 style="text-align:center; font-size:18px; margin-top: 2px; margin-bottom: 1px;"><b><?= esc($paymentsSummaryLabel) ?></b></h1>

        <table class="table table-striped">
            <tr>
                <th width="25%"><?= esc($paymentTypeLabel) ?></th>
                <th style="text-align:right;" width="25%"><?= esc($expectedLabel) ?> (<?= esc($currency) ?>)</th>
                <th style="text-align:right;" width="25%"><?= esc($countedLabel) ?> (<?= esc($currency) ?>)</th>
                <th style="text-align:right;" width="25%"><?= esc($differenceLabel) ?> (<?= esc($currency) ?>)</th>
            </tr>

            <?php foreach ($paymentModes as $mode): ?>
                <tr>
                    <td><?= esc($mode['name']) ?></td>
                    <td style="text-align:right;"><?= number_format($mode['expected'], $decimals, '.', '') ?></td>
                    <td style="text-align:right;"><?= number_format($mode['counted'], $decimals, '.', '') ?></td>
                    <td style="text-align:right;"><?= number_format($mode['difference'], $decimals, '.', '') ?></td>
                </tr>
            <?php endforeach; ?>

            <?php foreach ($returnModes as $ret): ?>
                <tr>
                    <td><?= esc($ret['label']) ?></td>
                    <td style="text-align:right;"><?= number_format($ret['expected'], $decimals, '.', '') ?></td>
                    <td style="text-align:right;"><?= number_format($ret['counted'], $decimals, '.', '') ?></td>
                    <td style="text-align:right;">0</td>
                </tr>
            <?php endforeach; ?>

            <tr>
                <td>Total</td>
                <td style="text-align:right;"><?= number_format($totalExpected, $decimals, '.', '') ?></td>
                <td style="text-align:right;"><?= number_format($totalCounted, $decimals, '.', '') ?></td>
                <td style="text-align:right;"><?= number_format($totalDifference, $decimals, '.', '') ?></td>
            </tr>
        </table>
    </div>

    <div class="col-md-4">
        <h1 style="text-align:center; font-size:18px; margin-top: 2px; margin-bottom: 1px;"><b><?= esc($cashLabel) ?></b></h1>

        <table class="table table-striped">
            <?php foreach ($currencyDenominations as $row): ?>
                <tr>
                    <td style="text-align:right;" width="30%"><?= esc($row['label']) ?> X</td>
                    <td width="25%"><?= esc($row['count']) ?></td>
                    <td width="35%" style="text-align:right;"><?= number_format($row['total'], $decimals, '.', '') ?></td>
                </tr>
            <?php endforeach; ?>
            <tr>
                <td></td>
                <td>Total</td>
                <td style="text-align:right;"><?= number_format($currencyTotal, $decimals, '.', '') ?></td>
            </tr>
        </table>

        <div>
            <h2><?= esc($noteLabel) ?></h2>
            <?= esc($registerNote) ?>
        </div>
    </div>
</div>
