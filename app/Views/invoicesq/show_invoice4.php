<!-- app/Views/invoices/show_invoice4.php -->

<!DOCTYPE html>
<html>

<head>
    <title>Quotation</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
        }

        td,
        th {
            padding: 5px;
            font-size: 10pt;
            border: 1px solid #333;
        }

        .header,
        .footer {
            border: none;
        }
    </style>
</head>

<body>
    <h2 style="text-align:center;margin-bottom:-15px;font-size:16px;">Quotation</h2>

    <div style="width:210mm;font-size:10px;margin-top:1px;padding:30px;">
        <div style="border: 1px solid #333;padding:3px;">
            <!-- Store Info & Quotation Header -->
            <table class="header" cellspacing="0">
                <tr>
                    <td style="width:55%;">
                        <img src="<?= base_url('files/Setting/' . $setting->logo) ?>" style="max-height: 45px;"><br>
                        <strong><?= $store['name'] ?></strong><br>
                        <?= nl2br($store['adresse'] . ', ' . $store['city'] . ', ' . $store['country']) ?><br>
                        <?php if ($store['phone']) : ?>
                            PHONE: <?= $store['phone'] ?><br>
                        <?php endif; ?>
                        <?php if ($setting->gstnoo) : ?>
                            GSTIN: <?= $setting->gstnoo ?>
                        <?php endif; ?>
                    </td>
                    <td style="width:45%;">
                        <table class="header">
                            <tr>
                                <td><b>Quotation No:</b></td>
                                <td style="text-align:right;"><?= $sale->id ?></td>
                            </tr>
                            <tr style="background:#89b03e;color:#fff;">
                                <td>Amount Due</td>
                                <td style="text-align:right;"><?= number_format($sale->total, $setting->decimals) ?></td>
                            </tr>
                            <tr>
                                <td>Quotation Date</td>
                                <td style="text-align:right;"><?= date('M d, Y', strtotime($sale->created_at)) ?></td>
                            </tr>
                            <tr>
                                <td>Due Date</td>
                                <td style="text-align:right;"><?= date('M d, Y', strtotime("+{$sale->creddate} day", strtotime($sale->created_at))) ?></td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Buyer / Ship To Info -->
            <table class="header" style="margin-top:10px;">
                <tr>
                    <td style="width:55%;">
                        <strong>Buyer</strong><br>
                        <?= $sale->clientname ?><br>
                        <?= nl2br($client->customeraddress ?? '') ?><br>
                        <?= $sale->mobnnm ? 'Phone: ' . $sale->mobnnm : '' ?><br>
                        <?= $client->gstno ? 'GST: ' . $client->gstno : '' ?>
                    </td>
                    <td style="width:45%;">
                        <strong>Ship To</strong><br>
                        <?= nl2br($client->shppingad ?? '') ?><br>
                        <?= $sale->mobnnm ? 'Phone: ' . $sale->mobnnm : '' ?><br>
                        <?= $client->gstno ? 'GST: ' . $client->gstno : '' ?>
                    </td>
                </tr>
            </table>

            <!-- Items Table -->
            <table>
                <thead>
                    <tr style="background:#89b03e;color:#fff;">
                        <th>S.No</th>
                        <th>Description</th>
                        <th>HSN</th>
                        <th>GST</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Per</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <?php $i = 1;
                    $totalQty = 0;
                    $subtotal = 0; ?>
                    <?php foreach ($posales as $item) :
                        $product = $item->product; // Assuming eager-loaded or joined
                        $total = $item->qt * $item->price;
                        $subtotal += $total;
                        $totalQty += $item->qt;
                    ?>
                        <tr>
                            <td><?= $i++ ?></td>
                            <td><?= esc($item->name) ?></td>
                            <td><?= esc($product['hsn']) ?></td>
                            <td><?= esc($item->cgst + $item->sgst) ?>%</td>
                            <td style="text-align:right;"><?= (int)$item->qt ?></td>
                            <td style="text-align:right;"><?= number_format($item->price, $setting->decimals) ?></td>
                            <td style="text-align:right;"><?= esc($product['unit']) ?></td>
                            <td style="text-align:right;"><?= number_format($total, $setting->decimals) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <!-- Totals Section -->
            <table style="margin-top:10px;">
                <tr>
                    <td colspan="4" style="text-align:right;"><b>Total Qty:</b></td>
                    <td style="text-align:right;"><?= $totalQty ?></td>
                    <td colspan="2"><b>Subtotal:</b></td>
                    <td style="text-align:right;"><?= number_format($subtotal, $setting->decimals) ?></td>
                </tr>
                <tr>
                    <td colspan="6" style="text-align:right;">Discount:</td>
                    <td colspan="2" style="text-align:right;"><?= number_format($sale->discount_indujul + $sale->discountamount, $setting->decimals) ?></td>
                </tr>
                <?php if ($sale->disamtssh > 0) : ?>
                    <tr>
                        <td colspan="6" style="text-align:right;">Shipping:</td>
                        <td colspan="2" style="text-align:right;"><?= number_format($sale->disamtssh, $setting->decimals) ?></td>
                    </tr>
                <?php endif; ?>
                <tr>
                    <td colspan="6" style="text-align:right;"><b>Grand Total:</b></td>
                    <td colspan="2" style="text-align:right;"><b><?= number_format($sale->total, $setting->decimals) ?></b></td>
                </tr>
            </table>

            <!-- Footer Section -->
            <table style="margin-top:30px;">
                <tr>
                    <td style="width:25%;">Customer Seal & Sign</td>
                    <td style="width:40%;">
                        <b>Terms & Conditions:</b><br>
                        <?= nl2br($setting->declaration) ?>
                    </td>
                    <td style="width:30%;">
                        <b>Bank Info:</b><br>
                        Bank: <?= $setting->bbank ?><br>
                        Acc No: <?= $setting->aaco ?><br>
                        IFS: <?= $setting->iifs ?><br>
                        Branch: <?= $setting->bbranch ?><br>
                        PAN: <?= $setting->pann ?>
                    </td>
                    <td style="text-align:right;">
                        For <?= ucwords($setting->companyname) ?>
                    </td>
                </tr>
            </table>

            <p style="text-align:center;margin-top:30px;"><?= nl2br($setting->receiptfooter) ?></p>
        </div>
    </div>
</body>

</html>