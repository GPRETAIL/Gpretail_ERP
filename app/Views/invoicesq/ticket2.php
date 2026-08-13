<?php

/** @var array $sale, $posales, $client, $store, $setting, $register, $print, $customerAddress, $paymentModeName, $paymentModeRef, $paymentModeExtra, $latestSale, $paymentDetails, $taxSummary, $productDetails, $taxProList */ ?>

<div style="width:<?= esc($print->dp_pt_width) ?>mm;font-size:<?= esc($print->font_size_l) ?>px;margin-left:<?= esc($print->margin_left) ?>px;padding:0px;">
    <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;">
        <tbody>
            <?php if ($print->logo_sh == 1): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->logo_p) ?>;border:0;background:white;">
                        <img src="<?= base_url('/files/Setting/' . $setting['logo']) ?>" alt="logo" style="max-height:25px;">
                    </td>
                </tr>
            <?php endif; ?>

            <?php if ($print->reciptheader_sh == 1): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->reciptheader_p) ?>;border:0;background:white;">
                        <?= esc($setting['receiptheader']) ?>
                    </td>
                </tr>
            <?php endif; ?>

            <?php if ($print->companyname_sh == 1): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->companyname_p) ?>;border:0;background:white;font-size:<?= esc($print->font_size_b) ?>px;"><b><?= esc($store['name']) ?></b></td>
                </tr>
            <?php endif; ?>

            <?php if ($print->address_sh == 1): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->address_p) ?>;border:0;background:white;">
                        <?= esc($store['adresse']) ?></td>
                </tr>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->address_p) ?>;border:0;background:white;">
                        <?= esc($store['city']) . ', ' . esc($store['phone']) ?></td>
                </tr>
            <?php endif; ?>

            <?php if ($print->gst_sh == 1): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->gst_p) ?>;border:0;background:white;">
                        <?= label("GST No") ?>: <?= esc($setting['gstnoo']) ?></td>
                </tr>
            <?php endif; ?>

            <tr>
                <td colspan="6" style="text-align:<?= esc($print->paymentmode_p) ?>;border:0;background:white;">
                    <?= label("PAYEMENT") ?>: <?= esc($paymentModeName) ?>
                </td>
            </tr>
        </tbody>
    </table>

    <table class="table" cellspacing="0" border="0">
        <tbody>
            <tr>
                <td colspan="6" style="text-align:<?= esc($print->customer_p) ?>;border:0;background:white;">
                    <?= label("Customer") ?></td>
            </tr>
            <?php if (!empty($sale['clientname'])): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->customer_p) ?>;border:0;background:white;">
                        <?= label("Name") ?>: <?= esc($sale['clientname']) ?></td>
                </tr>
            <?php endif; ?>
            <?php if (!empty($sale['custrrf'])): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->customer_p) ?>;border:0;background:white;">
                        <?= label("Ref No") ?>: <?= esc($sale['custrrf']) ?></td>
                </tr>
            <?php endif; ?>
            <?php if (!empty($customerAddress)): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->customer_p) ?>;border:0;background:white;">
                        <?= label("Address") ?>: <?= esc($customerAddress) ?></td>
                </tr>
            <?php endif; ?>
            <?php if (!empty($sale['mobnnm'])): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->customer_p) ?>;border:0;background:white;">
                        <?= label("Mobile") ?>: <?= esc($sale['mobnnm']) ?></td>
                </tr>
            <?php endif; ?>
            <?php if (!empty($client['gstno'])): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->customer_p) ?>;border:0;background:white;">
                        <?= label("GST") ?>: <?= esc($client['gstno']) ?></td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>

    <!-- Sale summary table header -->
    <table class="table" cellspacing="0" border="0">
        <thead>
            <tr>
                <?php if ($print->product_sh): ?><th><?= label("Product") ?></th><?php endif; ?>
                <?php if ($print->qt_sh): ?><th><?= label("QTY") ?></th><?php endif; ?>
                <?php if ($print->mrp_sh): ?><th><?= label("MRP") ?></th><?php endif; ?>
                <?php if ($print->rate_sh): ?><th><?= label("Rate") ?></th><?php endif; ?>
                <?php if ($print->tax_sh): ?><th><?= label("Tax") ?></th><?php endif; ?>
                <?php if ($print->amt_sh): ?><th><?= label("Amount") ?></th><?php endif; ?>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($posales as $item): ?>
                <?php $product = $productDetails[$item['product_id']] ?? null; ?>
                <?php if (!$product) continue; ?>
                <tr>
                    <?php if ($print->product_sh): ?><td><?= esc($item['name']) ?></td><?php endif; ?>
                    <?php if ($print->qt_sh): ?><td><?= (int)$item['qt'] ?></td><?php endif; ?>
                    <?php if ($print->mrp_sh): ?><td><?= number_format($product['rrate'], $setting['decimals']) ?></td><?php endif; ?>
                    <?php if ($print->rate_sh): ?><td><?= number_format($item['price'], $setting['decimals']) ?></td><?php endif; ?>
                    <?php if ($print->tax_sh): ?><td><?= esc($product['tax']) ?>%</td><?php endif; ?>
                    <?php if ($print->amt_sh): ?><td><?= number_format($item['price'] * $item['qt'], $setting['decimals']) ?></td><?php endif; ?>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <!-- Totals -->
    <table class="table" cellspacing="0" border="0">
        <tr>
            <td><b><?= label("TotalItems") ?></b></td>
            <td><?= $sale['totalitems'] ?></td>
            <td><b><?= label("Total") ?></b></td>
            <td>Rs. <?= number_format($sale['subtotal'], $setting['decimals']) ?></td>
        </tr>
        <tr>
            <td colspan="2">Shipping</td>
            <td colspan="2">Rs. <?= number_format($sale['disamtssh'], $setting['decimals']) ?></td>
        </tr>
        <tr>
            <td colspan="2">Discount</td>
            <td colspan="2">Rs. <?= number_format($sale['discount_indujul'] + $sale['discountamount'], $setting['decimals']) ?></td>
        </tr>
        <tr>
            <td colspan="2"><b><?= label("GrandTotal") ?></b></td>
            <td colspan="2"><b>Rs. <?= number_format($sale['total'], $setting['decimals']) ?></b></td>
        </tr>
        <tr>
            <td colspan="2">Received</td>
            <td colspan="2">Rs. <?= number_format($latestSale['recivamt'], $setting['decimals']) ?></td>
        </tr>
        <tr>
            <td colspan="2">Balance</td>
            <td colspan="2">Rs. <?= number_format($latestSale['ballamtt'], $setting['decimals']) ?></td>
        </tr>
    </table>

    <!-- Tax Summary -->
    <?php if ($print->taxx_sh == 1 && !empty($taxSummary)): ?>
        <table class="table" cellspacing="0" border="0">
            <thead>
                <tr>
                    <?php if ($print->taxname_sh): ?><th>Tax Name</th><?php endif; ?>
                    <?php if ($print->taxpersontage_sh): ?><th>%</th><?php endif; ?>
                    <?php if ($print->taxamt_sh): ?><th>Amt</th><?php endif; ?>
                    <?php if ($print->taxtotal_sh): ?><th>Total</th><?php endif; ?>
                    <th>&nbsp;</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($taxSummary as $tax): ?>
                    <tr>
                        <?php if ($print->taxname_sh): ?><td><?= esc($tax['taxname']) ?></td><?php endif; ?>
                        <?php if ($print->taxpersontage_sh): ?><td><?= round($tax['taxpercent'], 2) ?></td><?php endif; ?>
                        <?php if ($print->taxamt_sh): ?><td><?= round($tax['taxamount'], 2) ?></td><?php endif; ?>
                        <?php if ($print->taxtotal_sh): ?><td><?= round($tax['taxfrom'], 2) ?></td><?php endif; ?>
                        <td>&nbsp;</td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>

    <table class="table" cellspacing="0" border="0">
        <tr>
            <td></td>
            <td><?= esc($setting['receiptfooter']) ?></td>
        </tr>
    </table>
</div>