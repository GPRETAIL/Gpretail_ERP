<div class="col-md-12">
    <div class="text-center"><?= esc($settings['receiptheader']) ?></div>
    <h4 class="text-center"><?= esc($store['name']) ?></h4>
    <h5 class="text-center"><?= esc($store['adresse']) ?></h5>
    <h4 class="text-center">Purchase No: <?= sprintf("%05d", $purchase['id']) ?></h4>
    <span class="float-left"><?= label("Date") ?>: <?= date("d-m-Y", strtotime($purchase['purdat'])) ?></span>

    <table class="table" cellspacing="0" border="0">
        <thead>
            <tr>
                <th><?= label("Product") ?></th>
                <th><?= label("Pur Rate") ?></th>
                <th>Qty</th>
                <?php if ($settings['gst_tax'] == 1): ?>
                    <th><?= label("tax") ?></th>
                <?php endif; ?>
                <th><?= label("Total") ?></th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($items as $item): ?>
                <tr>
                    <td><?= esc($item['name']) ?></td>
                    <td><?= esc($item['cost']) ?></td>
                    <td><?= esc($item['qty']) ?></td>
                    <?php if ($settings['gst_tax'] == 1): ?>
                        <td><?= esc($item['tax']) ?></td>
                    <?php endif; ?>
                    <td><?= number_format((float)($item['subtotal']), $decimals, '.', '') ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <table class="table">
        <tbody>
            <tr>
                <td><?= label("TotalItems") ?></td>
                <td><?= $totalQty ?></td>
                <td><?= label("Total") ?></td>
                <td>Rs.<?= number_format((float)$purchase['betot'], $decimals, '.', '') ?></td>
            </tr>
            <?php if ($settings['gst_tax'] == 1): ?>
                <tr>
                    <td colspan="2"></td>
                    <td><?= label("tax") ?></td>
                    <td>Rs.<?= number_format((float)$purchase['cgst'] * 2, $decimals, '.', '') ?></td>
                </tr>
            <?php endif; ?>
            <tr>
                <td colspan="2"></td>
                <td><?= label("Discount") ?> <?= label("Amount") ?></td>
                <td>Rs.<?= number_format((float)$purchase['discamt'], $decimals, '.', '') ?></td>
            </tr>
            <tr>
                <td colspan="2"><?= label("GrandTotal") ?></td>
                <td colspan="2" style="font-weight:bold;">Rs.<?= number_format((float)$purchase['total'], $decimals, '.', '') ?></td>
            </tr>
        </tbody>
    </table>

    <div style="border-top:1px solid #000; padding-top:10px;">
        <span class="float-left"><?= esc($companyName) ?></span>
        <span class="float-right"><?= label("Tel") ?> <?= esc($phone) ?></span>
        <div class="text-center" style="background-color:#000;padding:5px;width:85%;color:#fff;margin:0 auto;border-radius:3px;margin-top:40px;">
            <?= esc($footer) ?>
        </div>
    </div>
</div>