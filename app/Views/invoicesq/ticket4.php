<?php

/** @var array $sale, $posales, $client, $store, $settings, $customerAddress, $taxSummary */ ?>

<div style="width:105mm;font-size:12px;margin:auto;">
    <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;">
        <tbody>
            <tr>
                <td style="text-align:center;border:0;background-color:white;">
                    <?= esc($settings['receiptheader']) ?></td>
            </tr>
            <tr>
                <td style="text-align:center;border:0;background-color:white;">
                    <?= esc($store['name']) ?></td>
            </tr>
            <?php if ($settings['ddsp'] > 0): ?>
                <tr>
                    <td style="text-align:center;border:0;background-color:white;">
                        <?= esc($store['adresse']) ?></td>
                </tr>
                <tr>
                    <td style="text-align:center;border:0;background-color:white;">
                        <?= esc($store['city']) . ' ' . esc($store['phone']) ?></td>
                </tr>
            <?php endif; ?>

            <?php if ($settings['gstnoo']): ?>
                <tr>
                    <td style="text-align:center;border:0;background-color:white;">
                        <?= label("GST No") ?>: <?= esc($settings['gstnoo']) ?></td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>

    <table style="width:100%;">
        <tr>
            <td style="text-align:left;border:0;">
                <?= label("SaleNum") ?>: <?= esc($sale['id']) ?>/<?= esc($sale['yyear']) ?></td>
            <td style="text-align:left;border:0;width:135px;">
                <?= label("Date") ?>: <?= date('d-m-Y', strtotime($sale['attime'])) ?></td>
        </tr>
        <tr>
            <td style="text-align:left;border:0;">
                <?= label("Cashier") ?>: <?= esc($sale['created_by']) ?></td>
            <td style="text-align:left;border:0;width:135px;">
                <?= label("Time") ?>: <?= date('H:i:s', strtotime($sale['attime'])) ?></td>
        </tr>
        <tr>
            <td colspan="2" style="text-align:left;border:0;">
                <?php
                $pay = explode('~', $sale['paidmethod']);
                $methods = [
                    '0' => label("Cash"),
                    '1' => label("CreditCard"),
                    '2' => label("Cheque"),
                    '3' => label("DebitCard"),
                    '4' => label("Exchange"),
                    '5' => label("Net Banking"),
                    '6' => label("COD"),
                    '7' => label("Online Pay"),
                    '10' => label("Coupon")
                ];
                echo label("PAYEMENT") . ': ' . ($methods[$pay[0]] ?? label("Unknown"));
                ?>
            </td>
        </tr>
    </table>

    <?php if ($settings['ddspct'] == 1): ?>
        <table style="margin:10px auto;" class="table" cellspacing="0" border="0">
            <thead>
                <tr>
                    <th colspan="2" style="border-top:1px solid #ddd;border-bottom:1px solid #ddd;">
                        <?= label("Customer") ?></th>
                </tr>
            </thead>
            <tbody>
                <?php if ($sale['clientname']): ?>
                    <tr>
                        <td style="width:60px;">Name</td>
                        <td>: <?= esc($sale['clientname']) ?></td>
                    </tr>
                <?php endif; ?>
                <?php if ($sale['custrrf']): ?>
                    <tr>
                        <td>Ref No</td>
                        <td>: <?= esc($sale['custrrf']) ?></td>
                    </tr>
                <?php endif; ?>
                <?php if ($customerAddress): ?>
                    <tr>
                        <td>Address</td>
                        <td>: <?= esc($customerAddress) ?></td>
                    </tr>
                <?php endif; ?>
                <?php if ($sale['mobnnm']): ?>
                    <tr>
                        <td>Mobile</td>
                        <td>: <?= esc($sale['mobnnm']) ?></td>
                    </tr>
                <?php endif; ?>
                <?php if (!empty($client['gstno'])): ?>
                    <tr>
                        <td>GST</td>
                        <td>: <?= esc($client['gstno']) ?></td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    <?php endif; ?>

    <table class="table" cellspacing="0" border="0">
        <thead>
            <tr style="background-color:#555;color:#fff;font-weight:600">
                <th>S.N</th>
                <th><?= label("Product") ?></th>
                <th>Qty</th>
                <th>MRP</th>
                <th>Rate</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($posales as $i => $item): ?>
                <tr>
                    <td><?= $i + 1 ?></td>
                    <td colspan="4"> <?= esc($item['name']) ?> </td>
                </tr>
                <tr>
                    <td></td>
                    <td></td>
                    <td><?= (int)$item['qt'] ?></td>
                    <td><?= number_format($item['mrpp'], $settings['decimals']) ?></td>
                    <td><?= number_format($item['price'], $settings['decimals']) ?></td>
                    <td><?= number_format($item['qt'] * $item['price'], $settings['decimals']) ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <table class="table" cellspacing="0" border="0">
        <tr>
            <td><?= label("TotalItems") ?></td>
            <td><?= $sale['totalitems'] ?></td>
            <td><?= label("Total") ?></td>
            <td>Rs. <?= number_format($sale['subtotal'], $settings['decimals']) ?></td>
        </tr>
        <tr>
            <td colspan="2">Dis <?= label("Amount") ?></td>
            <td colspan="2">Rs. <?= number_format($sale['discount_indujul'] + $sale['discountamount'], $settings['decimals']) ?></td>
        </tr>
        <?php if ($sale['disamtssh']): ?>
            <tr>
                <td colspan="2">Shipping</td>
                <td colspan="2">Rs. <?= number_format($sale['disamtssh'], $settings['decimals']) ?></td>
            </tr>
        <?php endif; ?>
        <tr>
            <td colspan="2"><strong><?= label("GrandTotal") ?></strong></td>
            <td colspan="2"><strong>Rs. <?= number_format($sale['total'], $settings['decimals']) ?></strong></td>
        </tr>
        <tr>
            <td colspan="2">Received</td>
            <td colspan="2">Rs. <?= number_format($sale['recivamt'], $settings['decimals']) ?></td>
        </tr>
        <tr>
            <td colspan="2">Balance</td>
            <td colspan="2">Rs. <?= number_format($sale['ballamtt'], $settings['decimals']) ?></td>
        </tr>
        <tr>
            <td colspan="2"><strong><?= label("Saving") ?></strong></td>
            <td colspan="2"><strong>:Rs. <?= number_format($sale['subtotal'] - $sale['total'], $settings['decimals']) ?></strong></td>
        </tr>
    </table>

    <?php if (!empty($taxSummary)): ?>
        <table class="table" cellspacing="0" border="0">
            <thead>
                <tr style="background-color:#555;color:#fff;font-weight:600">
                    <th>Tax Name</th>
                    <th>%</th>
                    <th>Amt</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($taxSummary as $tax): ?>
                    <tr>
                        <td><?= esc($tax['taxname']) ?></td>
                        <td><?= round($tax['taxpercent'], 2) ?></td>
                        <td><?= round($tax['taxamount'], 2) ?></td>
                        <td><?= round($tax['taxfrom'], 2) ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>

    <table class="table" cellspacing="0" border="0">
        <tr>
            <td></td>
            <td><?= esc($settings['receiptfooter']) ?></td>
        </tr>
    </table>
</div>