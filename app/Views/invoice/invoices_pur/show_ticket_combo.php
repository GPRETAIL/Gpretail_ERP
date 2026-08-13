<div class="col-md-12">
    <div class="text-center"><?= esc($setting->receiptheader ?? '') ?></div>

    <div style="clear:both;"></div>

    <h4 class="text-center"><?= esc($store['name'] ?? '') ?></h4>
    <h5 class="text-center"><?= esc($store['adresse'] ?? '') ?></h5>
    <h4 class="text-center"> No: <?= sprintf("%05d", $id) ?></h4>

    <div style="clear:both;"></div>
    <span class="float-left"><?= label("Date") ?>: <?= date("d-m-Y", strtotime($purchase['purdat'])) ?></span>
    <div style="clear:both;"></div>

    <table class="table" cellspacing="0" border="0">
        <thead>
            <tr>
                <th><?= label("Product") ?></th>
                <th>Combo<br>Price</th>
                <th>Qty</th>
                <?php if ($setting->gst_tax == 1): ?>
                    <th><?= label("tax") ?></th>
                <?php endif; ?>
                <th><?= label("Total") ?></th>
            </tr>
        </thead>
        <tbody>

            <?php foreach ($items as $item): ?>
                <tr>
                    <td style="text-align:left; width:180px;"><?= esc($item['product_name']) ?></td>
                    <td style="text-align:left; width:180px;"><?= esc($item['selling']) ?></td>
                    <td style="text-align:center; width:50px;"><?= esc($item['qt']) ?></td>
                    <?php if ($setting->gst_tax == 1): ?>
                        <td style="text-align:left; width:180px;"><?= esc($item['tax']) ?></td>
                    <?php endif; ?>
                    <td style="text-align:right; width:70px;">
                        <?= number_format((float) $item['subtot'], $setting->decimals, '.', '') ?>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;">
        <tbody>
            <tr>
                <td style="text-align:left;"><?= label("TotalItems") ?></td>
                <td style="text-align:right; padding-right:1.5%;"><?= esc($totalQty) ?></td>
                <td style="text-align:left; padding-left:1.5%;"><?= label("Total") ?></td>
                <td style="text-align:right;font-weight:bold;">
                    Rs.<?= number_format((float) $purchase['betot'], $setting->decimals, '.', '') ?>
                </td>
            </tr>
        </tbody>
    </table>

    <div style="border-top:1px solid #000; padding-top:10px;">
        <span class="float-left"><?= esc($setting->companyname) ?></span>
        <span class="float-right"><?= label("Tel") ?> <?= esc($setting->phone) ?></span>
    </div>

    <div style="clear:both;"></div>
    <div class="text-center" style="background-color:#000;padding:5px;width:85%;color:#fff;margin:0 auto;border-radius:3px;margin-top:40px;">
        <?= esc($setting->receiptfooter) ?>
    </div>
</div>