<?php if (!isset($decimals)) $decimals = 2; ?>

<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="14" style="text-align:center;">
                <?= esc($settings['companyname'] ?? '') ?>
            </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="14">
                <?= esc($store['adresse'] ?? '') ?>
            </th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="14">
                Daily Sales Reports from <?= esc($start) ?> Till <?= esc($end) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;width:100px;">Bill Number</th>
            <th style="border: 1px solid #1c76bc;width:100px;">Date</th>
            <th style="border: 1px solid #1c76bc;">Customer</th>
            <th style="border: 1px solid #1c76bc;">Particulars</th>
            <th style="border: 1px solid #1c76bc;">Total Items</th>
            <th style="text-align:center;border: 1px solid #1c76bc;">Total Amount</th>
            <th style="text-align:center;border: 1px solid #1c76bc;">Cash</th>
            <th style="text-align:center;border: 1px solid #1c76bc;">Card</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $total = $cashTotal = $cardTotal = $paidTotal = 0;
        $advance = 0;
        foreach ($sale_items as $sale):
            $items = db_connect()->table('sale_items')->where('sale_id', $sale->id)->get()->getResult();
            $particulars = '';
            foreach ($items as $item) {
                $particulars .= $item->qt . ' - ' . $item->name . '<br>';
            }

            $date = explode(' ', $sale->attime)[0];
            $dateFormatted = date('d-m-Y', strtotime($date));

            $cash = $card = 0;
            if ($sale->paidmethod == 1) {
                $card = $sale->paid;
            } elseif ($sale->paidmethod == 6) {
                // Point-based, skip for cash/card
            } elseif ($sale->paidmethod == 10) {
                // Coupon-based, skip for cash/card
            } else {
                $cash = $sale->paid;
            }

            $paidTotal += $sale->paid;
            $cashTotal += $cash;
            $cardTotal += $card;
            $total += $sale->total;
        ?>
            <tr>
                <td style="text-align:center;border: 1px solid #1c76bc;"><?= $sale->id ?></td>
                <td style="text-align:center;border: 1px solid #1c76bc;"><?= esc($dateFormatted) ?></td>
                <td style="text-align:left;border: 1px solid #1c76bc;"><?= esc($sale->clientname) ?></td>
                <td style="text-align:left;border: 1px solid #1c76bc;"><?= $particulars ?></td>
                <td style="text-align:right;border: 1px solid #1c76bc;"><?= esc($sale->totalitems) ?></td>
                <td style="text-align:right;border: 1px solid #1c76bc;">
                    <?= number_format((float)$sale->total, $decimals, '.', '') ?>
                </td>
                <td style="text-align:right;border: 1px solid #1c76bc;">
                    <?= number_format((float)$cash, $decimals, '.', ' ') ?>
                </td>
                <td style="text-align:right;border: 1px solid #1c76bc;">
                    <?= number_format((float)$card, $decimals, '.', ' ') ?>
                </td>
            </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="4" style="text-align:right;border: 1px solid #1c76bc;"><b>Total</b></td>
            <td></td>
            <td style="text-align:right;border: 1px solid #1c76bc;">
                <b><?= number_format((float)$total, $decimals, '.', ' ') ?></b>
            </td>
            <td style="text-align:right;border: 1px solid #1c76bc;">
                <b><?= number_format((float)$cashTotal, $decimals, '.', ' ') ?></b>
            </td>
            <td style="text-align:right;border: 1px solid #1c76bc;">
                <b><?= number_format((float)$cardTotal, $decimals, '.', ' ') ?></b>
            </td>
        </tr>
        <tr>
            <td colspan="4" style="text-align:right;border: 1px solid #1c76bc;"><b>Paid</b></td>
            <td></td>
            <td style="text-align:right;border: 1px solid #1c76bc;">
                <b><?= number_format((float)$paidTotal, $decimals, '.', ' ') ?></b>
            </td>
            <td colspan="2"></td>
        </tr>
        <tr>
            <td colspan="4" style="text-align:right;border: 1px solid #1c76bc;"><b>Advance</b></td>
            <td></td>
            <td style="text-align:right;border: 1px solid #1c76bc;">
                <b><?= number_format((float)$advance, $decimals, '.', ' ') ?></b>
            </td>
            <td colspan="2"></td>
        </tr>
        <tr>
            <td colspan="4" style="text-align:right;border: 1px solid #1c76bc;"><b>Balance</b></td>
            <td></td>
            <td style="text-align:right;border: 1px solid #1c76bc;">
                <b><?= number_format((float)($total - $paidTotal - $advance), $decimals, '.', ' ') ?></b>
            </td>
            <td colspan="2"></td>
        </tr>
    </tfoot>
</table>