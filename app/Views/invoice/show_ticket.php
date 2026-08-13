<div class="col-md-12">
    <div class="text-center"><?= esc($settings->receiptheader) ?></div>
    <h4 class="text-center"><?= esc($store['name']) ?></h4>
    <h5 class="text-center"><?= esc($store['adresse']) ?></h5>
    <h4 class="text-center">Purchase No: <?= sprintf("%05d", $purchase['id']) ?></h4>
    <span class="float-left"><?= label("Date") ?>: <?= date("d-m-Y", strtotime($purchase['purdat'])) ?></span>

    <table class="table table-bordered mt-3">
        <thead>
            <tr>
                <th><?= label("Product") ?></th>
                <th><?= label("Pur Rate") ?></th>
                <th>Qty</th>
                <?php if ($settings->gst_tax == 1): ?>
                    <th><?= label("tax") ?></th>
                <?php endif; ?>
                <th><?= label("Total") ?></th>
            </tr>
        </thead>
        <tbody>
            <?php
            $totalQty = 0;
            foreach ($items as $item):
                $product = db_connect()->table('products')->where('id', $item['product_id'])->get()->getRowArray();
                $totalQty += $item['qt'];
            ?>
                <tr>
                    <td><?= esc($product['name']) ?></td>
                    <td><?= number_format($item['cost'], $settings->decimals) ?></td>
                    <td><?= $item['qt'] ?></td>
                    <?php if ($settings->gst_tax == 1): ?>
                        <td><?= $item['cgst'] ?></td>
                    <?php endif; ?>
                    <td><?= number_format($item['qt'] * $item['cost'], $settings->decimals) ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <table class="table">
        <tr>
            <td><?= label("TotalItems") ?></td>
            <td><?= $totalQty ?></td>
            <td><?= label("Total") ?></td>
            <td>Rs. <?= number_format($purchase['betot'], $settings->decimals) ?></td>
        </tr>
        <tr>
            <td colspan="2"></td>
            <td><?= label("Discount") ?> <?= label("Amount") ?></td>
            <td>Rs. <?= number_format($purchase['discamt'], $settings->decimals) ?></td>
        </tr>
        <tr>
            <td colspan="2"></td>
            <td><strong><?= label("GrandTotal") ?></strong></td>
            <td><strong>Rs. <?= number_format($purchase['total'], $settings->decimals) ?></strong></td>
        </tr>
    </table>

    <div class="text-center mt-4">
        <strong><?= esc($settings->companyname) ?> | <?= label("Tel") ?> <?= esc($settings->phone) ?></strong>
        <div class="text-center mt-2 bg-dark text-white p-2 rounded"><?= esc($settings->receiptfooter) ?></div>
    </div>
</div>