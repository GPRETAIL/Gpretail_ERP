<?php

/** @var object $sale */
/** @var array $posales */
/** @var object $client */
/** @var array $store */
/** @var string $customerAddress */
/** @var string $customerShipping */
/** @var string $customerGst */
/** @var object $printSetup */
/** @var object $settings */

?>

<div style="width:<?= esc($printSetup->dp_pt_width) ?>mm;font-size:<?= esc($printSetup->font_size_l) ?>px;margin-left:<?= esc($printSetup->margin_left) ?>px;padding:0px;">
    <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;">
        <tbody>
            <?php if ($printSetup->logo_sh): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($printSetup->logo_p) ?>;border: 0;background-color: white;">
                        <img src="<?= base_url('files/Setting/' . $settings->logo) ?>" alt="logo" style="max-height: 25px;">
                    </td>
                </tr>
            <?php endif; ?>

            <?php if ($printSetup->reciptheader_sh): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($printSetup->reciptheader_p) ?>;border: 0;background-color: white;">
                        <?= esc($settings->receiptheader) ?>
                    </td>
                </tr>
            <?php endif; ?>

            <?php if ($printSetup->companyname_sh): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($printSetup->companyname_p) ?>;border: 0;background-color: white;font-size:<?= esc($printSetup->font_size_b) ?>px;">
                        <b><?= esc($store['name']) ?></b>
                    </td>
                </tr>
            <?php endif; ?>

            <?php if ($printSetup->address_sh): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($printSetup->address_p) ?>;border: 0;background-color: white;">
                        <?= esc($store['adresse']) ?>
                    </td>
                </tr>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($printSetup->address_p) ?>;border: 0;background-color: white;">
                        <?= esc($store['city']) ?>, <?= esc($store['phone']) ?>
                    </td>
                </tr>
            <?php endif; ?>

            <?php if ($printSetup->gst_sh): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($printSetup->gst_p) ?>;border: 0;background-color: white;">
                        <?= label("GST No") ?>: <?= esc($settings->gstnoo) ?>
                    </td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>

    <!-- Add here additional logic: customer, product items, totals etc. -->
    <!-- Continue splitting from ShowTickett full logic to this view -->
</div>