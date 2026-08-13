<?php

/** @var array $sale */
/** @var array $posales */
/** @var array $client */
/** @var array $store */
/** @var array $settings */
/** @var string $customerAddress */


?>
<div style="width:105mm;font-size:12px;margin:auto;">
    <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;">
        <tbody>
            <tr>
                <td style="text-align:center;border: 0; background-color: white;">
                    <?= esc($settings['receiptheader']) ?>
                </td>
            </tr>
            <tr>
                <td style="text-align:center;border: 0; background-color: white;">
                    <?= esc($store['name']) ?>
                </td>
            </tr>
            <?php if (!empty($settings['ddsp'])): ?>
                <tr>
                    <td style="text-align:center;border: 0; background-color: white;">
                        <?= esc($store['adresse']) ?>
                    </td>
                </tr>
                <tr>
                    <td style="text-align:center;border: 0; background-color: white;">
                        <?= esc($store['city']) ?> <?= esc($store['phone']) ?>
                    </td>
                </tr>
            <?php endif; ?>

            <?php if (!empty($settings['gstnoo'])): ?>
                <tr>
                    <td style="text-align:center;border: 0; background-color: white;">
                        <?= label("GST No") ?>: <?= esc($settings['gstnoo']) ?>
                    </td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>

    <table style="width:100%;">
        <tr>
            <td style="text-align:left;">
                <?= label("SaleNum") ?>: <?= esc($sale->id) ?>/<?= esc($sale->yyear) ?>
            </td>
            <td style="text-align:right;">
                <?= label("Date") ?>: <?= date("d-m-Y", strtotime($sale->attime)) ?>
            </td>
        </tr>
        <tr>
            <td style="text-align:left;">
                <?= label("Cashier") ?>: <?= esc($sale->created_by) ?>
            </td>
            <td style="text-align:right;">
                <?= label("Time") ?>: <?= date("H:i:s", strtotime($sale->attime)) ?>
            </td>
        </tr>
    </table>

    <?php if (!empty($client) || !empty($sale->mobnnm)): ?>
        <table style="margin:10px auto;">
            <thead>
                <tr>
                    <th colspan="2">Customer</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!empty($sale->clientname)): ?>
                    <tr>
                        <td><?= label("Name") ?></td>
                        <td>: <?= esc($sale->clientname) ?></td>
                    </tr>
                <?php endif; ?>
                <?php if (!empty($sale->custrrf)): ?>
                    <tr>
                        <td>Ref No</td>
                        <td>: <?= esc($sale->custrrf) ?></td>
                    </tr>
                <?php endif; ?>
                <?php if (!empty($customerAddress)): ?>
                    <tr>
                        <td><?= label("Address") ?></td>
                        <td>: <?= esc($customerAddress) ?></td>
                    </tr>
                <?php endif; ?>
                <?php if (!empty($sale->mobnnm)): ?>
                    <tr>
                        <td><?= label("Mobile") ?></td>
                        <td>: <?= esc($sale->mobnnm) ?></td>
                    </tr>
                <?php endif; ?>
                <?php if (!empty($client->gstno)): ?>
                    <tr>
                        <td><?= label("GST") ?></td>
                        <td>: <?= esc($client->gstno) ?></td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    <?php endif; ?>

    <table class="table" cellspacing="0" border="0">
        <thead>
            <tr style="background-color:#555;color:#fff;font-weight:600">
                <th><?= label("S.N") ?></th>
                <th><?= label("Product") ?></th>
                <th>Qty</th>
                <th><?= label("MRP") ?></th>
                <th><?= label("Rate") ?></th>
                <th><?= label("Total") ?></th>
            </tr>
        </thead>
        <tbody>
            <?php $i = 1;
            foreach ($posales as $item): ?>
                <tr>
                    <td><?= $i++ ?></td>
                    <td><?= esc($item->name) ?></td>
                    <td><?= esc($item->qt) ?></td>
                    <td><?= number_format((float)$item->mrpp, $settings['decimals'] ?? 2) ?></td>
                    <td><?= number_format((float)$item->price, $settings['decimals'] ?? 2) ?></td>
                    <td><?= number_format((float)$item->qt * $item->price, $settings['decimals'] ?? 2) ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <table class="table" cellspacing="0" border="0">
        <tbody>
            <tr>
                <td><?= label("TotalItems") ?></td>
                <td><?= esc($sale->totalitems) ?></td>
                <td><?= label("Total") ?></td>
                <td>Rs. <?= number_format((float)$sale->subtotal, $settings['decimals'] ?? 2) ?></td>
            </tr>
            <tr>
                <td colspan="2"></td>
                <td><?= label("Dis Amount") ?></td>
                <td>Rs. <?= number_format((float)($sale->discount_indujul + $sale->discountamount), $settings['decimals'] ?? 2) ?></td>
            </tr>
            <tr>
                <td colspan="2"></td>
                <td><?= label("GrandTotal") ?></td>
                <td><strong>Rs. <?= number_format((float)$sale->total, $settings['decimals'] ?? 2) ?></strong></td>
            </tr>
            <tr>
                <td colspan="2"></td>
                <td><?= label("Paid") ?></td>
                <td>Rs. <?= number_format((float)$sale->recivamt, $settings['decimals'] ?? 2) ?></td>
            </tr>
            <tr>
                <td colspan="2"></td>
                <td><?= label("Balanceamt") ?></td>
                <td>Rs. <?= number_format((float)$sale->ballamtt, $settings['decimals'] ?? 2) ?></td>
            </tr>
        </tbody>
    </table>

    <hr>
    <div style="text-align:center;">
        <?= esc($settings['receiptfooter']) ?>
    </div>
</div>