<!-- app/Views/invoices/invoice_view.php -->
<!DOCTYPE html>
<html>

<head>
    <title>Invoice #<?= esc($sale->id) ?></title>
    <style>
        /* Basic styles here. You can move this to a CSS file */
        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            border: 1px solid #333;
            padding: 5px;
            font-size: 12px;
        }

        h2,
        h4 {
            margin: 0;
        }
    </style>
</head>

<body>
    <h2 style="text-align:center;">TAX INVOICE</h2>

    <table>
        <tr>
            <td colspan="2">
                <strong>Store:</strong> <?= esc($store->name) ?><br>
                <?= nl2br(esc($store->adresse)) ?><br>
                <?= esc($store->city) ?>, <?= esc($store->country) ?><br>
                <?= esc($store->phone) ?><br>
                GSTIN: <?= esc($setting->gstnoo) ?>
            </td>
            <td colspan="2">
                <strong>Invoice No:</strong> <?= esc($sale->id) ?><br>
                <strong>Invoice Date:</strong> <?= date('d M, Y', strtotime($sale->created_at)) ?><br>
                <strong>Due Date:</strong> <?= date('d M, Y', strtotime("+{$sale->creddate} days", strtotime($sale->created_at))) ?><br>
                <strong>Amount Due:</strong> <?= number_format((float)$sale->total, $setting->decimals, '.', '') ?>
            </td>
        </tr>
        <tr>
            <td colspan="2">
                <strong>Buyer:</strong><br>
                <?= esc($sale->clientname) ?><br>
                <?= nl2br(esc($client->customeraddress ?? '')) ?><br>
                Phone: <?= esc($sale->mobnnm) ?><br>
                GST: <?= esc($client->gstno ?? '') ?>
            </td>
            <td colspan="2">
                <strong>Ship To:</strong><br>
                <?= nl2br(esc($client->shppingad ?? '')) ?><br>
                Phone: <?= esc($sale->mobnnm) ?><br>
                GST: <?= esc($client->gstno ?? '') ?>
            </td>
        </tr>
    </table>

    <br>

    <table>
        <thead>
            <tr>
                <th>S.No</th>
                <th>Description</th>
                <th>HSN</th>
                <th>GST %</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Per</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            <?php $i = 1;
            foreach ($posales as $item): ?>

                <tr>
                    <td><?= $i++ ?></td>
                    <td><?= esc($item->name) ?></td>
                    <td><?= esc($item->hsn ?? '0') ?></td>
                    <td><?= esc($item->cgst ?? $item->igstt) ?>%</td>
                    <td><?= esc($item->qt) ?></td>
                    <td><?= number_format((float)$item->price, $setting->decimals, '.', '') ?></td>
                    <td><?= esc($item->unit ?? '0') ?></td>
                    <td><?= number_format((float)($item->price * $item->qt), $setting->decimals, '.', '') ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <br>

    <table>
        <tr>
            <td colspan="7" style="text-align:right;"><strong>Total</strong></td>
            <td><?= number_format((float)$sale->subtotal, $setting->decimals, '.', '') ?></td>
        </tr>
        <tr>
            <td colspan="7" style="text-align:right;">Discount</td>
            <td><?= number_format((float)($sale->discountamount + $sale->discount_indujul), $setting->decimals, '.', '') ?></td>
        </tr>
        <?php if ((float)$sale->disamtssh > 0): ?>
            <tr>
                <td colspan="7" style="text-align:right;">Shipping</td>
                <td><?= number_format((float)$sale->disamtssh, $setting->decimals, '.', '') ?></td>
            </tr>
        <?php endif; ?>
        <tr>
            <td colspan="7" style="text-align:right;"><strong>Grand Total</strong></td>
            <td><strong><?= number_format((float)$sale->total, $setting->decimals, '.', '') ?></strong></td>
        </tr>
    </table>

    <br>

    <table>
        <tr>
            <td><strong>Received:</strong></td>
            <td><?= number_format((float)$sale->recivamt, $setting->decimals, '.', '') ?></td>
        </tr>
        <tr>
            <td><strong>Balance:</strong></td>
            <td><?= number_format((float)$sale->ballamtt, $setting->decimals, '.', '') ?></td>
        </tr>
    </table>

    <hr>

    <div style="text-align:center;">
        <?= nl2br(esc($setting->receiptfooter)) ?>
    </div>
</body>

</html>