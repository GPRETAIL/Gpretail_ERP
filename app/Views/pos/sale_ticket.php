<?php

/**
 * Variables passed from controller:
 * @var \App\Entities\Sale $sale
 * @var array $posales
 * @var array $store
 * @var array $settings
 * @var array $customer
 * @var array $paymentInfo
 * @var array $taxSummary
 */

$widthMap = [
    '1' => '210mm',
    '2' => '125mm',
    '3' => '95mm',
];
$paddingMap = [
    '1' => '30px',
    '2' => '20px',
    '3' => '10px',
];

$width = $widthMap[$settings['printersizew']] ?? '125mm';
$padding = $paddingMap[$settings['printersizew']] ?? '20px';

function formatCurrency($amount, $decimals)
{
    return 'Rs.' . number_format((float) $amount, $decimals, '.', '');
}
?>

<div style="width:<?= $width ?>;font-size:12px;margin:10px auto;padding:10px;">
    <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;">
        <tbody>
            <tr>
                <td style="text-align:center;border: 0;background-color: white;"><?= $settings['receiptheader'] ?></td>
            </tr>
            <tr>
                <td style="text-align:center;border: 0;background-color: white;"><?= $store['name'] ?></td>
            </tr>
            <?php if ($settings['ddsp'] > 0): ?>
                <tr>
                    <td style="text-align:center;border: 0;background-color: white;"><?= $store['adresse'] ?></td>
                </tr>
                <tr>
                    <td style="text-align:center;border: 0;background-color: white;"><?= $store['city'] ?>, <?= $store['phone'] ?></td>
                </tr>
            <?php endif; ?>
            <tr>
                <td style="border: 0; background-color: white;">
                    <table style="width: 100%;">
                        <tr>
                            <td style="text-align:left;">Sale No.: <?= $sale->id ?>/<?= $sale->yyear ?></td>
                            <td style="text-align:right;">Date: <?= date('d-m-Y', strtotime($sale->attime)) ?></td>
                        </tr>
                        <tr>
                            <td style="text-align:left;">Cashier: <?= $sale->created_by ?></td>
                            <td style="text-align:right;">Time: <?= date('H:i:s', strtotime($sale->attime)) ?></td>
                        </tr>
                        <tr>
                            <td colspan="2">GST No: <?= $settings['gstnoo'] ?></td>
                        </tr>
                        <tr>
                            <td colspan="2">PAYMENT: <?= $paymentInfo['method'] ?></td>
                        </tr>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>

    <?php if ($settings['ddspct'] == 1 && !empty($customer)): ?>
        <table style="margin:10px auto;" class="table" cellspacing="0" border="0">
            <thead>
                <tr>
                    <th colspan="2" style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;">Customer Details</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($customer['name'])): ?>
                    <tr>
                        <td>Name</td>
                        <td>: <?= esc($customer['name']) ?></td>
                    </tr>
                <?php endif; ?>
                <?php if (!empty($customer['refno'])): ?>
                    <tr>
                        <td>Ref No</td>
                        <td>: <?= esc($customer['refno']) ?></td>
                    </tr>
                <?php endif; ?>
                <?php if (!empty($customer['address'])): ?>
                    <tr>
                        <td>Address</td>
                        <td>: <?= esc($customer['address']) ?></td>
                    </tr>
                <?php endif; ?>
                <?php if (!empty($customer['phone'])): ?>
                    <tr>
                        <td>Phone</td>
                        <td>: <?= esc($customer['phone']) ?></td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    <?php endif; ?>

    <table class="table" cellspacing="0" border="0">
        <thead>
            <tr>
                <th style="width:5px;">S.N</th>
                <th>Product</th>
                <th>QTY</th>
                <th style="text-align:right;">MRP</th>
                <th style="text-align:right;">Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            <?php $i = 1;
            $totalDiscount = 0;
            $totalSaving = 0; ?>
            <?php foreach ($posales as $item): ?>
                <tr>
                    <td><?= $i++ ?></td>
                    <td><?= esc($item['name']) ?></td>
                    <td style="text-align:center;"><?= $item['qt'] ?></td>
                    <td style="text-align:right;"><?= number_format($item['mrp'], $settings['decimals']) ?></td>
                    <td style="text-align:right;"><?= number_format($item['price'], $settings['decimals']) ?></td>
                    <td style="text-align:right;"><?= number_format($item['price'] * $item['qt'], $settings['decimals']) ?></td>
                </tr>
                <?php
                $totalDiscount += $item['dis_amt'] ?? 0;
                $totalSaving += ($item['mrp'] * $item['qt']) - ($item['price'] * $item['qt']);
                ?>
            <?php endforeach; ?>
        </tbody>
    </table>

    <table class="table" cellspacing="0" border="0">
        <tbody>
            <tr>
                <td>Total Items</td>
                <td style="text-align:right;"><?= $sale->totalitems ?></td>
            </tr>
            <tr>
                <td>Total</td>
                <td style="text-align:right;"><?= formatCurrency($sale->subtotal, $settings['decimals']) ?></td>
            </tr>
            <?php if ($sale->discount): ?>
                <tr>
                    <td>Overall Discount</td>
                    <td style="text-align:right;"><?= formatCurrency(($sale->subtotal * $sale->discount / 100), $settings['decimals']) ?></td>
                </tr>
            <?php endif; ?>
            <?php if ($settings['disc_pro'] == 1): ?>
                <tr>
                    <td>Discount Amount</td>
                    <td style="text-align:right;"><?= formatCurrency($totalDiscount, $settings['decimals']) ?></td>
                </tr>
            <?php endif; ?>
            <tr>
                <td><strong>Grand Total</strong></td>
                <td style="text-align:right;"><strong><?= formatCurrency($sale->total, $settings['decimals']) ?></strong></td>
            </tr>
        </tbody>
    </table>

    <p style="text-align:center;"><?= nl2br($settings['receiptfooter']) ?></p>
</div>