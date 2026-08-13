<?php

/** @var object $sale */
/** @var array $posales */
/** @var object|null $client */
/** @var array $store */
/** @var object $settings */
/** @var string $customerAddress */
/** @var string $customerShipping */
/** @var string $customerGst */

use function esc;
?>

<div style="width:210mm;font-size:10px;margin-top:1px;margin-left: -10px;padding:30px;">
    <h2 style="text-align:center;margin-bottom:-15px;font-size:16px;">QUOTATION</h2>

    <div style="border: 1px solid #333;padding:3px;">
        <!-- Header: Store Info & Quotation Details -->
        <table style="width:100%;margin-bottom:5px;margin-top:30px;">
            <tr>
                <td style="width:55%;">
                    <img src="<?= base_url('files/Setting/' . $settings->logo) ?>" alt="logo" style="max-height: 45px;">
                    <p><b><?= esc($store['name']) ?></b><br>
                        <?= nl2br(esc($store['adresse'])) ?><br>
                        <?= esc($store['city']) ?>, <?= esc($store['country']) ?><br>
                        <?= $store['phone'] ? 'PHONE: ' . esc($store['phone']) . '<br>' : '' ?>
                        <?= $settings->gstnoo ? 'GSTIN: ' . esc($settings->gstnoo) : '' ?></p>
                </td>
                <td style="width:44%; text-align:right;">
                    <p><b>Quotation No:</b> <?= esc($sale->id) ?><br>
                        <b>Amount Due:</b> <?= number_format((float)$sale->total, $settings->decimals, '.', '') ?><br>
                        <b>Quotation Date:</b> <?= date('M d, Y', strtotime($sale->created_at)) ?><br>
                        <b>Due Date:</b> <?= date('M d, Y', strtotime("+{$sale->creddate} days", strtotime($sale->created_at))) ?>
                    </p>
                </td>
            </tr>
        </table>

        <!-- Buyer & Shipping -->
        <table style="width:100%;margin-bottom:5px;">
            <tr>
                <td style="width:55%;">
                    <b>Buyer</b><br>
                    <?= esc($sale->clientname) ?><br>
                    <?= nl2br(esc($customerAddress)) ?><br>
                    <?= $sale->mobnnm ? 'Phone: ' . esc($sale->mobnnm) . '<br>' : '' ?>
                    <?= $customerGst ? 'GST: ' . esc($customerGst) : '' ?>
                </td>
                <td style="width:44%;">
                    <b>Ship To</b><br>
                    <?= nl2br(esc($customerShipping)) ?><br>
                    <?= $sale->mobnnm ? 'Phone: ' . esc($sale->mobnnm) . '<br>' : '' ?>
                    <?= $customerGst ? 'GST: ' . esc($customerGst) : '' ?>
                </td>
            </tr>
        </table>

        <!-- Table headers -->
        <table style="width:100%;border:1px solid #333;border-collapse:collapse;">
            <thead>
                <tr style="background:#89b03e;color:#fff;">
                    <th style="border:1px solid #333;padding:4px;">S.No</th>
                    <th style="border:1px solid #333;padding:4px;">Product Description</th>
                    <th style="border:1px solid #333;padding:4px;">HSN</th>
                    <th style="border:1px solid #333;padding:4px;">GST %</th>
                    <th style="border:1px solid #333;padding:4px;">Qty</th>
                    <th style="border:1px solid #333;padding:4px;">Rate</th>
                    <th style="border:1px solid #333;padding:4px;">Per</th>
                    <th style="border:1px solid #333;padding:4px;">Total</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($posales as $index => $item): ?>
                    <tr>
                        <td style="border:1px solid #333;padding:4px;text-align:center;"><?= $index + 1 ?></td>
                        <td style="border:1px solid #333;padding:4px;"><?= esc($item->name) ?></td>
                        <td style="border:1px solid #333;padding:4px;text-align:right;"><?= esc($item->hsn) ?></td>
                        <td style="border:1px solid #333;padding:4px;text-align:right;"><?= $item->cgst ?? $item->igstt ?>%</td>
                        <td style="border:1px solid #333;padding:4px;text-align:right;"><?= $item->qt ?></td>
                        <td style="border:1px solid #333;padding:4px;text-align:right;"><?= number_format((float)$item->price, $settings->decimals, '.', '') ?></td>
                        <td style="border:1px solid #333;padding:4px;text-align:right;"><?= esc($item->unit ?? '') ?></td>
                        <td style="border:1px solid #333;padding:4px;text-align:right;">
                            <?= number_format((float)($item->qt * $item->price), $settings->decimals, '.', '') ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>