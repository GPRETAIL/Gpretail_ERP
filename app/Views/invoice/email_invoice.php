<!-- app/Views/invoices/email_invoice.php -->
<!DOCTYPE html>
<html>

<head>
    <title>Email Invoice</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 14px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 8px;
        }

        th {
            background-color: #f2f2f2;
        }

        h2 {
            text-align: center;
        }
    </style>
</head>

<body>
    <h2><?= label('SaleNum') ?>: <?= esc($sale['id']) ?>/<?= esc($sale['yyear']) ?></h2>

    <p><strong><?= label('Date') ?>:</strong> <?= date('d-m-Y', strtotime($sale['attime'])) ?></p>
    <p><strong><?= label('Time') ?>:</strong> <?= date('H:i:s', strtotime($sale['attime'])) ?></p>
    <p><strong><?= label('Customer') ?>:</strong> <?= esc($sale['clientname']) ?></p>
    <p><strong><?= label('Ph') ?>:</strong> <?= esc($sale['mobnnm']) ?></p>
    <p><strong><?= label('Address') ?>:</strong> <?= esc($client['customeraddress'] ?? '') ?></p>
    <p><strong><?= label('GST No') ?>:</strong> <?= esc($setting->gstnoo) ?></p>

    <hr>

    <table>
        <thead>
            <tr>
                <th><?= label('Product') ?></th>
                <th><?= label('Qty') ?></th>
                <th>MRP</th>
                <th><?= label('Rate') ?></th>
                <th><?= label('Total') ?></th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($posales as $item): ?>
                <tr>
                    <td><?= esc($item['name']) ?></td>
                    <td><?= esc($item['qt']) ?></td>
                    <td><?= number_format((float)$item['mrpp'], $setting->decimals, '.', '') ?></td>
                    <td><?= number_format((float)$item['price'], $setting->decimals, '.', '') ?></td>
                    <td><?= number_format((float)($item['qt'] * $item['price']), $setting->decimals, '.', '') ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <p><strong><?= label('TotalItems') ?>:</strong> <?= esc($sale['totalitems']) ?></p>
    <p><strong><?= label('Total') ?>:</strong> Rs. <?= number_format((float)$sale['subtotal'], $setting->decimals, '.', '') ?></p>

    <?php if ((float)$sale['discount']): ?>
        <p><strong><?= label('Discount') ?> (<?= $sale['discount'] ?>%):</strong> Rs. <?= number_format((float)($sale['subtotal'] * $sale['discount'] / 100), $setting->decimals, '.', '') ?></p>
    <?php endif; ?>

    <p><strong><?= label('Grand Total') ?>:</strong> Rs. <?= number_format((float)$sale['total'], $setting->decimals, '.', '') ?></p>
    <p><strong><?= label('Receivedamount') ?>:</strong> Rs. <?= number_format((float)$sale['recivamt'], $setting->decimals, '.', '') ?></p>
    <p><strong><?= label('Balanceamt') ?>:</strong> Rs. <?= number_format((float)$sale['ballamtt'], $setting->decimals, '.', '') ?></p>

    <hr>

    <div style="text-align:center">
        <?= nl2br(esc($setting->receiptfooter)) ?>
    </div>
</body>

</html>