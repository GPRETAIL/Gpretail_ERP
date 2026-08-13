<!DOCTYPE html>
<html>

<head>
    <title>Sale Ticket</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }

        .receipt {
            width: 300px;
            margin: auto;
            padding: 10px;
            border: 1px solid #ccc;
        }

        .receipt h2 {
            text-align: center;
        }

        .line {
            border-top: 1px dashed #000;
            margin: 10px 0;
        }
    </style>
</head>

<body>
    <div class="receipt">
        <h2>Sale Receipt</h2>
        <div class="line"></div>

        <p><strong>Customer:</strong> <?= esc($saleData['clientname']) ?> (<?= esc($saleData['mobnnm']) ?>)</p>
        <p><strong>Total Items:</strong> <?= esc($saleData['totalitems']) ?></p>
        <p><strong>Total:</strong> <?= esc($saleData['total']) ?></p>
        <p><strong>Discount:</strong> <?= esc($saleData['discount']) ?></p>
        <p><strong>GST:</strong> <?= esc($saleData['gst']) ?></p>
        <p><strong>Payment:</strong> <?= esc($saleData['payment']) ?></p>

        <div class="line"></div>
        <h4>Items</h4>
        <ul>
            <?php foreach ($items as $item): ?>
                <li><?= esc($item['item_name']) ?> × <?= esc($item['qt']) ?> @ <?= esc($item['price']) ?></li>
            <?php endforeach; ?>
        </ul>

        <div class="line"></div>
        <p><strong>Sale ID:</strong> <?= $sale_id ?></p>
        <p><strong>Date:</strong> <?= date('Y-m-d H:i:s') ?></p>
    </div>

    <center>
        <h1 style="color:#34495E">Empty</h1>
    </center>

</body>

</html>