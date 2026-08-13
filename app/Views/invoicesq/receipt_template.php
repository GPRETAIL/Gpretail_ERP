<?php

/** 
 * @var object $sale
 * @var array $posales
 * @var object|null $client
 * @var object $setting
 * @var array $store
 * @var array $payements
 * @var array $taxSummary
 * @var array $iimyrtax
 * @var float $ik3
 */
?>

<div style="width:210mm;height:290mm;font-size:15px;margin-top:20px;margin-left:-10px;">
    <table class="table-striped" cellspacing="0" border="0" style="width:70%;">
        <tr style="text-align:center;font-size:18px;">
            <td>SALES TAXABLE INVOICE</td>
        </tr>
    </table>
    <br>
    <table class="table-striped" cellspacing="0" border="0" style="width:70%;">
        <tr align="right">
            <td style="text-align:center;padding:3px;background-color:white;font-size:15px;">
                <?= esc($store['name']) ?>
            </td>
        </tr>
        <tr>
            <td style="text-align:center;padding:3px;background-color:white;">
                <?= esc($store['adresse']) ?>
            </td>
        </tr>
    </table>
    <br>
    <table class="table-striped" cellspacing="0" border="0" style="width:60%;">
        <tr>
            <td style="width:5px;"></td>
            <td style="width:150mm;">SaleNum: <?= esc($sale->id) ?>/<?= esc($sale->yyear) ?></td>
            <td style="width:170px;">Date: <?= esc($sale->attime->format('d-m-Y')) ?></td>
        </tr>
        <tr>
            <td></td>
            <td>Cashier: <?= esc($sale->created_by) ?></td>
            <td>Time: <?= esc(date('d-m-Y', strtotime($sale->attime))) ?></td>
        </tr>
        <tr>
            <td></td>
            <td>Customer: <?= esc($sale->clientname) ?></td>
            <td>Ph: <?= esc($sale->mobnnm) ?></td>
        </tr>
        <tr>
            <td></td>
            <td>Address: <?= esc($client ? $client->customeraddress : '') ?></td>
        </tr>
        <tr>
            <td></td>
            <td>GST No: <?= esc($setting->gstnoo) ?></td>
        </tr>
    </table>
    <hr>

    <table class="table" cellspacing="0" border="0">
        <thead>
            <tr style="background-color:#555;color:#fff;font-weight:600;">
                <th style="width:50mm;">Product</th>
                <th style="width:15mm;">Qty</th>
                <th style="width:15mm;">MRP</th>
                <th style="width:20mm;">Rate</th>
                <th style="width:20mm;">Total</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($posales as $item): ?>
                <tr>
                    <td><?= esc($item->name) ?></td>
                    <td><?= esc((int)$item->qt) ?></td>
                    <td><?= esc($item->mrpp) ?></td>
                    <td><?= esc((int)$item->price) ?></td>
                    <td><?= number_format((float)$item->qt * (float)$item->price, $setting->decimals, '.', '') ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <table class="table table-striped" cellspacing="0" border="0">
        <tr>
            <td style="width:35mm;">TotalItems: <?= esc($sale->totalitems) ?></td>
            <td style="width:30mm;font-weight:bold;">Total: Rs.<?= number_format((float)$sale->subtotal, $setting->decimals, '.', '') ?></td>
        </tr>
        <?php if ((int)$sale->discount): ?>
            <tr>
                <td>Discount (<?= esc($sale->discount) ?>%)</td>
                <td>Rs.<?= number_format((float)$sale->subtotal * $sale->discount / 100, $setting->decimals, '.', '') ?></td>
            </tr>
        <?php endif; ?>
        <tr style="font-weight:600;font-size:15px">
            <td colspan="2" style="text-align:right;">Total: Rs.<?= number_format((float)$sale->total, $setting->decimals, '.', '') ?></td>
        </tr>
    </table>

    <table class="table table-striped" cellspacing="0" border="0">
        <tr>
            <td>Received amount</td>
            <td style="text-align:right;">Rs.<?= number_format((float)$sale->recivamt, $setting->decimals, '.', '') ?></td>
        </tr>
        <tr>
            <td>Balance amount</td>
            <td style="text-align:right;">Rs.<?= number_format((float)$sale->ballamtt, $setting->decimals, '.', '') ?></td>
        </tr>
        <tr>
            <td>You saved</td>
            <td style="text-align:right;">Rs.<?= number_format((float)$ik3, $setting->decimals, '.', '') ?></td>
        </tr>
    </table>

    <div class="text-center" style="clear:both;padding:10px;background-color:#eee">
        <span style="font-size:9px;text-transform:uppercase;letter-spacing:4px;">
            <?= esc($setting->companyname) ?><br><?= esc($setting->phone) ?>
        </span>
    </div>
</div>