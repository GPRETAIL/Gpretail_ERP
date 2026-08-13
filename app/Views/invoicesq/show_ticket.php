<div style="width:<?= esc($print->dp_pt_width) ?>mm; font-size:<?= esc($print->font_size_l) ?>px;">
    <table class="table" cellspacing="0" border="0">
        <tbody>
            <?php if ($print->logo_sh): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->logo_p) ?>;">
                        <img src="<?= base_url('files/Setting/' . $setting->logo) ?>" alt="logo" style="max-height:25px;">
                    </td>
                </tr>
            <?php endif; ?>

            <?php if ($print->reciptheader_sh): ?>
                <tr>
                    <td colspan="6" style="text-align:<?= esc($print->reciptheader_p) ?>;">
                        <?= $setting->receiptheader ?>
                    </td>
                </tr>
            <?php endif; ?>

            <!-- Add other rows here using the $store, $sale, $customer, $posales variables -->

        </tbody>
    </table>
</div>