<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt</title>
    <style>
        /* Add your styling here */
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            padding: 5px;
            border: 1px solid #333;
            text-align: left;
        }
    </style>
</head>

<body>
    <h2 style="text-align: center;">TAX INVOICE</h2>

    <div style="text-align: center;">
        <img src="<?= base_url('files/Setting/' . $setting->logo) ?>" alt="Logo" style="max-height: 45px;">
        <h3><?= $store->name ?></h3>
        <p><?= nl2br($store->adresse) ?>, <?= $store->city ?>, <?= $store->country ?></p>
        <p>Phone: <?= $store->phone ?></p>
        <p>GSTIN: <?= $setting->gstnoo ?></p>
    </div>

    <table>
        <tr>
            <td><b>Quotation No:</b> <?= $sale->id ?></td>
            <td><b>Quotation Date:</b> <?= date('M d,Y', strtotime($sale->created_at)) ?></td>
        </tr>
        <tr>
            <td><b>Amount Due:</b> <?= number_format($sale->total, 2) ?></td>
            <td><b>Due Date:</b> <?= date('M d,Y', strtotime("+" . $sale->creddate . " days", strtotime($sale->created_at))) ?></td>
        </tr>
    </table>

    <h4>Buyer</h4>
    <p><b>Name:</b> <?= $sale->clientname ?></p>
    <p><b>Address:</b> <?= $client->customeraddress ?></p>
    <p><b>Phone:</b> <?= $sale->mobnnm ?></p>
    <p><b>GST:</b> <?= $client->gstno ?></p>

    <h4>Ship To</h4>
    <p><b>Shipping Address:</b> <?= $client->shppingad ?></p>
    <p><b>Phone:</b> <?= $sale->mobnnm ?></p>
    <p><b>GST:</b> <?= $client->gstno ?></p>

    <table>
        <thead>
            <tr>
                <th>S.No</th>
                <th>Product Description</th>
                <th>HSN</th>
                <th>GST</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($posales as $index => $posale): ?>
                <tr>
                    <td><?= $index + 1 ?></td>
                    <td><?= $posale->name ?></td>
                    <td><?= $posale->hsn ?></td>
                    <td><?= $posale->gst ?>%</td>
                    <td><?= $posale->qt ?></td>
                    <td><?= number_format($posale->price, 2) ?></td>
                    <td><?= number_format($posale->qt * $posale->price, 2) ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <h3>Total: <?= number_format($sale->total, 2) ?></h3>

    <div style="text-align: center;">
        <p>Thank you for your purchase!</p>
        <p><?= $setting->receiptfooter ?></p>
    </div>
</body>

</html>