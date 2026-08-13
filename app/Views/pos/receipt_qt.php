<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title><?= esc($title) ?></title>
    <style>
        * {
            font-family: 'Courier New', Courier, monospace;
        }

        .center {
            text-align: center;
        }

        .bold {
            font-weight: bold;
        }

        .border {
            border-top: 1px dashed #000;
            margin-top: 10px;
            margin-bottom: 10px;
        }

        table {
            width: 100%;
            font-size: 12px;
        }

        .footer {
            font-size: 10px;
            text-align: center;
            margin-top: 10px;
        }
    </style>
</head>

<body onload="window.print();">

    <div class="center bold"><?= esc($store_name) ?></div>
    <div class="center"><?= esc($store_address) ?></div>
    <div class="center">Tel: <?= esc($store_phone) ?></div>
    <div class="border"></div>

    <div>Date: <?= esc($date) ?></div>
    <div>Invoice #: <?= esc($invoice_number) ?></div>
    <div>Customer: <?= esc($customer_name) ?></div>
    <div class="border"></div>

    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th class="center">Qty</th>
                <th class="center">Price</th>
                <th class="right">Total</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($items as $item): ?>
                <tr>
                    <td><?= esc($item['name']) ?></td>
                    <td class="center"><?= esc($item['quantity']) ?></td>
                    <td class="center"><?= esc($item['price']) ?></td>
                    <td class="right"><?= esc($item['total']) ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <div class="border"></div>
    <table>
        <tr>
            <td>Subtotal</td>
            <td class="right"><?= esc($subtotal) ?></td>
        </tr>
        <?php if (!empty($discount)): ?>
            <tr>
                <td>Discount</td>
                <td class="right"><?= esc($discount) ?></td>
            </tr>
        <?php endif; ?>
        <tr>
            <td>Total</td>
            <td class="right"><?= esc($total) ?></td>
        </tr>
        <?php if (!empty($paid)): ?>
            <tr>
                <td>Paid</td>
                <td class="right"><?= esc($paid) ?></td>
            </tr>
            <tr>
                <td>Due</td>
                <td class="right"><?= esc($due) ?></td>
            </tr>
        <?php endif; ?>
    </table>

    <div class="border"></div>
    <div class="footer">
        <?= nl2br(esc($footer_note)) ?>
    </div>

</body>

</html>