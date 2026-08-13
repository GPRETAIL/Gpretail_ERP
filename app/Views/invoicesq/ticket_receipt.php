<?php

/** @var object $sale */ ?>

<hr>
<table class="table" cellspacing="0" border="0">
    <thead>
        <tr style="background-color:#555;color:#fff;font-weight:600">
            <th style="text-align:left;width: 150px;">
                <?= label('Date') ?>
            </th>
            <th style="text-align:right;">
                <?= label('Amounttopay') ?>
            </th>
            <th style="text-align:right;">
                <?= label('Paid') ?>
            </th>
        </tr>
    </thead>
    <tbody>
        <tr style="border: 1px solid #ede4e4;">
            <td style="text-align:left;">
                <?= date("d-m-Y", strtotime($sale->created_at)) ?> Initial
            </td>
            <td style="text-align:right;">
                <?= number_format($sale->total, 2) ?>
            </td>
            <td style="text-align:right;">
                <?= number_format($sale->recivamt, 2) ?>
            </td>
        </tr>

        <?php
        $remaining = $sale->total - $sale->recivamt;
        $datePointer = $sale->created_at;
        for ($i = 1; $i <= $sale->creddate; $i++):
            $payment = $payments[$datePointer] ?? null;
            $isPaid = isset($payment);
            $rowColor = $isPaid ? '#34495e' : 'red';
            $textColor = $isPaid ? 'white' : '#000';
            $amountPaid = $isPaid ? $payment : '--';

            if ($isPaid) {
                $remaining -= $payment;
            }
        ?>
            <tr style="background-color:<?= $rowColor ?>;color:<?= $textColor ?>;border: 1px solid #ede4e4;">
                <td style="text-align:left;">
                    <?= date('d-m-Y', strtotime($datePointer)) ?>
                </td>
                <td style="text-align:right;">
                    <?= number_format($remaining, 2) ?>
                </td>
                <td style="text-align:right;">
                    <?= $amountPaid ?>
                </td>
            </tr>
        <?php
            $datePointer = date('Y-m-d', strtotime('+1 day', strtotime($datePointer)));
        endfor;
        ?>

        <tr style="border: 1px solid #ede4e4;background-color:#555;color:white;">
            <td style="text-align:left;">
                <?= label('Balanceamt') ?>
            </td>
            <td style="text-align:right;">
                <?= number_format($remaining, 2) ?>
            </td>
            <td style="text-align:right;"></td>
        </tr>
    </tbody>
</table>