<!DOCTYPE html>
<html>

<head>
    <title>Receipt #<?= $sale['id'] ?></title>
    <style>
        body {
            font-family: monospace;
            padding: 10px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        td,
        th {
            padding: 4px;
            text-align: left;
        }

        .center {
            text-align: center;
        }

        .bold {
            font-weight: bold;
        }

        @media print {
            button {
                display: none;
            }
        }
    </style>
</head>

<body onload="window.print()">

    <div class="center bold"><?= esc($store['name']) ?></div>
    <div class="center"><?= esc($store['adresse']) ?> - <?= esc($store['city']) ?></div>
    <div class="center"><?= lang('Sale Number') ?>: <?= $sale['id'] ?>/<?= $sale['yyear'] ?></div>
    <div class="center"><?= lang('Date') ?>: <?= date('d-m-Y H:i', strtotime($sale['attime'])) ?></div>
    <hr>

    <table>
        <thead>
            <tr>
                <th><?= lang('Item') ?></th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($posales as $item): ?>
                <tr>
                    <td><?= esc($item['name']) ?></td>
                    <td><?= $item['qt'] ?></td>
                    <td><?= number_format($item['price'], 2) ?></td>
                    <td><?= number_format($item['price'] * $item['qt'], 2) ?></td>
                </tr>
            <?php endforeach ?>
        </tbody>
    </table>

    <hr>
    <p><strong>Subtotal:</strong> <?= number_format($sale['subtotal'], 2) ?></p>
    <p><strong>Discount:</strong> <?= number_format($discount, 2) ?></p>
    <p><strong>Total:</strong> <?= number_format($sale['total'], 2) ?></p>

    <div class="center"><?= esc($this->setting->receiptfooter) ?></div>

    <div class="center"><button onclick="window.print()">Print Again</button></div>

</body>

</html>