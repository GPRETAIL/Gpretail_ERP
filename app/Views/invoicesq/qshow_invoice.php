<?php
/** @var \App\Models\Saleq $sale */
/** @var \App\Models\CustomerModel|null $client */
/** @var array $store */
/** @var object $setting */
/** @var array $posales */
?>

<div style="width:148mm;font-size:10px;margin:25px auto;padding:15px;">
    <h2 style="text-align:center;margin-bottom:-15px;font-size:16px;">Quotation</h2>

    <div style="border: 1px solid #333;padding:3px;">
        <table style="width:100%; border-style: dashed; margin-bottom: 5px; margin-top:30px;" cellspacing="0" border="0">
            <tr>
                <td style="width:55%;">
                    <table style="width:100%; border-style: dashed;" cellspacing="0" border="0">
                        <tr>
                            <td style="font-size:15px;color:#333;">
                                <img src="<?= base_url('files/Setting/' . esc($setting->logo)) ?>" alt="logo" style="max-height:45px;">
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size:13px;color:#333;"><b><?= esc($store['name']) ?></b></td>
                        </tr>
                        <tr>
                            <td><?= nl2br(esc($store['adresse'])) ?>, <?= esc($store['city']) ?>, <?= esc($store['country']) ?></td>
                        </tr>
                        <?php if (!empty($store['phone'])): ?>
                            <tr>
                                <td>PHONE: <?= esc($store['phone']) ?></td>
                            </tr>
                        <?php endif; ?>
                        <?php if (!empty($setting->gstnoo)): ?>
                            <tr>
                                <td>GSTIN: <?= esc($setting->gstnoo) ?></td>
                            </tr>
                        <?php endif; ?>
                    </table>
                </td>

                <td style="width:44%;">
                    <table style="width:100%; border-style: dashed;" cellspacing="0" border="0">
                        <tr>
                            <td style="width:60%; font-size:15px;"><b>Quotation No</b></td>
                            <td style="font-size:13px; text-align:right;">#<?= esc($sale->id) ?></td>
                        </tr>
                        <tr style="background:#89b03e !important;color:#fff;">
                            <td style="font-size:13px;">Amount Due</td>
                            <td style="font-size:13px; text-align:right;">
                                <?= number_format((float)$sale->total, $setting->decimals, '.', '') ?>
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size:13px;">Quotation Date</td>
                            <td style="font-size:13px; text-align:right;">
                                <?= date('M d, Y', strtotime($sale->created_at)) ?>
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size:13px;">Due Date</td>
                            <td style="font-size:13px; text-align:right;">
                                <?= date('M d, Y', strtotime($sale->created_at . ' + ' . $sale->creddate . ' days')) ?>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>

    <!-- Continue rendering the buyer/ship info and item table similarly using <?= ?> and control structures -->

</div>
