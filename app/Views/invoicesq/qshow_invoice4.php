<?php

/**
 * qshowInvoice4 View - CodeIgniter 4 Version
 * This view receives all required variables from the controller
 * Example: $sale, $client, $store, $settings, $items, $taxSummary, etc.
 */
?>

<h2 style="text-align:center;margin-bottom:-15px;">TAX INVOICE</h2>
<div style="width:210mm;font-size:10px;margin-top:1px;margin-left: -10px;padding:30px;">
    <div style="border: 1px solid #333;padding:3px;">
        <table class="table" style="width:100%; border-style: dashed; margin-bottom: 5px; margin-top:30px;" cellspacing="0" border="0">
            <tr>
                <td style="width:55%;">
                    <table class="table" style="width:100%; border-style: dashed;" cellspacing="0" border="0">
                        <tr>
                            <td style="font-size:15px;color:#333;"><img src="<?= base_url('files/Setting/' . $settings->logo) ?>" alt="logo" style="max-height: 45px;"></td>
                        </tr>
                        <tr>
                            <td style="font-size:13px;color:#333;"><b><?= esc($store['name']) ?></b></td>
                        </tr>
                        <tr>
                            <td><?= nl2br(esc($store['adresse'])) . ', ' . esc($store['city']) . ', ' . esc($store['country']) ?></td>
                        </tr>
                        <?php if (!empty($store['phone'])): ?>
                            <tr>
                                <td>PHONE: <?= esc($store['phone']) ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if (!empty($settings->gstnoo)): ?>
                            <tr>
                                <td>GSTIN: <?= esc($settings->gstnoo) ?></td>
                            </tr>
                        <?php endif; ?>
                    </table>
                </td>
                <td style="width:44%;">
                    <table class="table" style="width:100%; border-style: dashed;" cellspacing="0" border="0">
                        <tr>
                            <td style="width:60%; font-size:15px;"><b>Quotation No</b></td>
                            <td style="font-size:13px;text-align:right;">#<?= esc($sale->id) ?></td>
                        </tr>
                        <tr style="background:#89b03e;color:#fff;">
                            <td>Amount Due</td>
                            <td style="text-align:right;">
                                <?= number_format((float)$sale->total, $settings->decimals, '.', '') ?>
                            </td>
                        </tr>
                        <tr>
                            <td>Quotation Date</td>
                            <td style="text-align:right;">
                                <?= date('M d, Y', strtotime($sale->created_at)) ?>
                            </td>
                        </tr>
                        <tr>
                            <td>Due Date</td>
                            <td style="text-align:right;">
                                <?= date('M d, Y', strtotime('+' . $sale->creddate . ' day', strtotime($sale->created_at))) ?>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <table class="table" style="width:100%; border-style: dashed; margin-bottom: 5px;" cellspacing="0" border="0">
            <tr>
                <td style="width:55%;">
                    <table class="table" style="width:100%; border-style: dashed; margin-bottom: 5px;" cellspacing="0" border="0">
                        <tr>
                            <td><b>Buyer</b></td>
                        </tr>
                        <?php if (!empty($sale->clientname)): ?>
                            <tr>
                                <td><?= esc($sale->clientname) ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if (!empty($client->customeraddress)): ?>
                            <tr>
                                <td><?= nl2br(esc($client->customeraddress)) ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if (!empty($sale->mobnnm)): ?>
                            <tr>
                                <td><?= label('Phone') . ': ' . esc($sale->mobnnm) ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if (!empty($client->gstno)): ?>
                            <tr>
                                <td><?= label('GST') . ': ' . esc($client->gstno) ?></td>
                            </tr>
                        <?php endif; ?>
                    </table>
                </td>
                <td style="width:44%;">
                    <table class="table" style="width:100%; border-style: dashed; margin-bottom: 5px;" cellspacing="0" border="0">
                        <tr>
                            <td><b>Ship To</b></td>
                        </tr>
                        <?php if (!empty($client->shppingad)): ?>
                            <tr>
                                <td><?= nl2br(esc($client->shppingad)) ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if (!empty($sale->mobnnm)): ?>
                            <tr>
                                <td><?= label('Phone') . ': ' . esc($sale->mobnnm) ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if (!empty($client->gstno)): ?>
                            <tr>
                                <td><?= label('GST') . ': ' . esc($client->gstno) ?></td>
                            </tr>
                        <?php endif; ?>
                    </table>
                </td>
            </tr>
        </table>
    </div>
</div>

<?php // The rest of the invoice tables and summary logic follows in similar structure 
?>