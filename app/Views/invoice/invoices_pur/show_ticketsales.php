<div class="col-md-12">
    <div class="text-center"><?= esc($setting->receiptheader) ?></div>
    <div style="clear:both;"></div>
    <h4 class="text-center"><?= esc($store['name']) ?></h4>
    <h5 class="text-center"><?= esc($store['adresse']) ?></h5>
    <h4 class="text-center"><?= label("Return") ?> ID: <?= esc($sale['re_id']) ?></h4>
    <span class="float-left"><?= label("Date") ?>: <?= date('d-m-Y', strtotime($sale['todate'])) ?></span>

    <table class="table" cellspacing="0" border="0">
        <thead>
            <tr>
                <th><em>B.code</em></th>
                <th><?= label("Product") ?></th>
                <th>Qty</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($items as $item): ?>
                <tr>
                    <td style="text-align:center; width:30px;"><?= esc($item['product_id']) ?></td>
                    <td style="text-align:left; width:100px;"><?= esc($item['name']) ?></td>
                    <td style="text-align:center; width:50px;"><?= esc($item['quantity']) ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>