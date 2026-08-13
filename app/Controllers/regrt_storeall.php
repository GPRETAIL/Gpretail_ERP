<?php
// closing_stock_report.php - View file

?>
<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="9" style="text-align:center;"><?php echo $settings['companyname']; ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="9"><?php echo $store['adresse'] ?? ''; ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="9">Closing Stock Reports from <?php echo $start_date; ?> Till <?php echo $end_date; ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;">ID</th>
            <th style="border: 1px solid #1c76bc;">Product Name</th>
            <th style="border: 1px solid #1c76bc;">Initial</th>
            <th style="border: 1px solid #1c76bc;">Opening</th>
            <th style="border: 1px solid #1c76bc;">Purchase</th>
            <th style="border: 1px solid #1c76bc;">Sales</th>
            <th style="border: 1px solid #1c76bc;">Cancel</th>
            <th style="border: 1px solid #1c76bc;">Return</th>
            <th style="border: 1px solid #1c76bc;">Closing</th>
            <th style="border: 1px solid #1c76bc;">Price</th>
            <th style="border: 1px solid #1c76bc;">Value</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($products as $product): ?>
            <tr>
                <td style="border: 1px solid #1c76bc;text-align:left;"><?= $product['id']; ?></td>
                <td style="border: 1px solid #1c76bc;text-align:left;"><?= $product['name']; ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($product['initial']); ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($product['opening']); ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($product['purchase']); ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($product['sales']); ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($product['cancel']); ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($product['return']); ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($product['closing']); ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($product['price']); ?></td>
                <td style="border: 1px solid #1c76bc;"><?= floatval($product['value']); ?></td>
            </tr>
        <?php endforeach; ?>
        <tr>
            <td colspan="9" style="border: 1px solid #1c76bc;text-align:right;">Total</td>
            <td style="border: 1px solid #1c76bc;">Total</td>
            <td style="border: 1px solid #1c76bc;"><?= floatval($total_value); ?></td>
        </tr>
    </tbody>
</table>
