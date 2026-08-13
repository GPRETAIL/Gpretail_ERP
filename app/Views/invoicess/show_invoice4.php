<?php
/** @var array $sale */
/** @var array $posales */
/** @var array|null $client */
/** @var array $store */
/** @var array $setting */
/** @var array $taxSummary */

use CodeIgniter\I18n\Time;

function label($text) {
    return ucfirst($text);
}

$rrarf = (new Time($sale['created_at']))->toDateString();
$payMethod = explode('~', $sale['paidmethod']);
$total = (float)$sale['total'];
$decimals = $setting['decimals'];

function amount_in_words($number)
{
    $no = floor($number);
    $decimal = round($number - $no, 2) * 100;
    $digits_length = strlen($no);
    $i = 0;
    $str = [];
    $words = [...]; // Insert word mapping array here.
    $digits = ['', 'hundred', 'thousand', 'lakh', 'crore'];
    while ($i < $digits_length) {
        $divider = ($i == 2) ? 10 : 100;
        $number = floor($no % $divider);
        $no = floor($no / $divider);
        $i += $divider == 10 ? 1 : 2;
        if ($number) {
            $plural = (count($str) && $number > 9) ? 's' : null;
            $hundred = (count($str) == 1 && $str[0]) ? ' and ' : null;
            $str[] = ($number < 21) ? $words[$number] . ' ' . $digits[count($str)] . $plural . ' ' . $hundred :
                $words[floor($number / 10) * 10] . ' ' . $words[$number % 10] . ' ' . $digits[count($str)] . $plural . ' ' . $hundred;
        } else {
            $str[] = null;
        }
    }
    $Rupees = implode('', array_reverse($str));
    $paise = ($decimal) ? " and $words[$decimal / 10] $words[$decimal % 10] Paise" : '';
    return ucwords("$Rupees Rupees$paise Only");
}

?>

<!-- HTML starts here -->
<div style="width:210mm;font-size:10px;margin:auto;padding:30px">
    <h2 style="text-align:center;font-size:16px;margin-bottom:10px">TAX INVOICE</h2>

    <table width="100%">
        <tr>
            <td width="55%">
                <img src="<?= base_url('/files/Setting/' . $setting['logo']) ?>" alt="logo" style="max-height: 45px;"><br>
                <strong><?= $store['name'] ?></strong><br>
                <?= nl2br($store['adresse']) ?>, <?= $store['city'] ?>, <?= $store['country'] ?><br>
                <?php if (!empty($store['phone'])): ?>
                    PHONE: <?= $store['phone'] ?><br>
                <?php endif; ?>
                <?php if (!empty($setting['gstnoo'])): ?>
                    GSTIN: <?= $setting['gstnoo'] ?><br>
                <?php endif; ?>
            </td>
            <td width="45%" style="text-align:right">
                Invoice No: <?= $sale['id'] ?><br>
                Invoice Date: <?= $rrarf ?><br>
                Amount Due: <?= number_format($total, $decimals, '.', '') ?><br>
            </td>
        </tr>
    </table>

    <hr>

    <table width="100%">
        <tr>
            <td width="55%">
                <strong>Buyer:</strong><br>
                <?= $sale['clientname'] ?><br>
                <?= $client['address'] ?? '' ?><br>
                <?= !empty($sale['mobnnm']) ? label("Phone") . ': ' . $sale['mobnnm'] . '<br>' : '' ?>
                <?= !empty($client['gstno']) ? label("GST") . ': ' . $client['gstno'] . '<br>' : '' ?>
            </td>
            <td width="45%">
                <?= !empty($client['shipping']) ? nl2br($client['shipping']) . '<br>' : '' ?>
                <?= !empty($client['gstno']) ? label("GST") . ': ' . $client['gstno'] . '<br>' : '' ?>
            </td>
        </tr>
    </table>

    <hr>

    <table border="1" cellpadding="5" cellspacing="0" width="100%">
        <thead>
            <tr style="background-color:#89b03e;color:white">
                <th>S.No</th>
                <th>Product Description</th>
                <th>HSN</th>
                <th>GST</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Per</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            <?php $i = 1; foreach ($posales as $item): ?>
                <tr>
                    <td><?= $i++ ?></td>
                    <td><?= $item['name'] ?></td>
                    <td><?= $item['hsn'] ?></td>
                    <td><?= $item['cgst'] + $item['sgst'] ?>%</td>
                    <td><?= $item['qt'] ?></td>
                    <td><?= number_format($item['price'], $decimals, '.', '') ?></td>
                    <td><?= $item['unit'] ?></td>
                    <td><?= number_format($item['qt'] * $item['price'], $decimals, '.', '') ?></td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>

    <br>

    <table width="100%">
        <tr>
            <td width="70%" style="text-align:right"><strong>Total Qty:</strong></td>
            <td width="30%" style="text-align:right"><?= $sale['totalitems'] ?></td>
        </tr>
        <tr>
            <td style="text-align:right"><strong>Total:</strong></td>
            <td style="text-align:right"><?= number_format($sale['subtotal'], $decimals, '.', '') ?></td>
        </tr>
        <tr>
            <td style="text-align:right">Discount:</td>
            <td style="text-align:right">
                <?= number_format($sale['discount_indujul'] + $sale['discountamount'], $decimals, '.', '') ?>
            </td>
        </tr>
        <tr>
            <td style="text-align:right"><strong>Grand Total:</strong></td>
            <td style="text-align:right">
                <strong><?= number_format($sale['total'], $decimals, '.', '') ?></strong>
            </td>
        </tr>
        <tr>
            <td style="text-align:right"><strong>In Words:</strong></td>
            <td style="text-align:right">
                <em><?= amount_in_words($sale['total']) ?></em>
            </td>
        </tr>
    </table>

    <hr>

    <?php if (!empty($taxSummary)): ?>
        <h4>Tax Summary</h4>
        <table border="1" cellpadding="5" cellspacing="0" width="60%">
            <thead>
                <tr>
                    <th>Tax Name</th>
                    <th>%</th>
                    <th>Amount</th>
                    <th>Tax From</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($taxSummary as $tax): ?>
                    <tr>
                        <td><?= $tax['taxname'] ?></td>
                        <td><?= number_format((float)$tax['taxpercent'], $decimals, '.', '') ?></td>
                        <td><?= number_format((float)$tax['taxamount'], $decimals, '.', '') ?></td>
                        <td><?= number_format((float)$tax['taxfrom'], $decimals, '.', '') ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>

    <br><br>
    <table width="100%" border="1">
        <tr>
            <td width="33%">Customer Seal & Sign</td>
            <td width="33%">
                <strong>Terms & Conditions:</strong><br>
                <?= nl2br($setting['declaration']) ?>
            </td>
            <td width="34%">
                <strong>Bank:</strong> <?= $setting['bbank'] ?><br>
                Acc No: <?= $setting['aaco'] ?><br>
                IFS: <?= $setting['iifs'] ?><br>
                Branch: <?= $setting['bbranch'] ?><br>
                PAN: <?= $setting['pann'] ?><br>
                <br>
                For <?= $setting['companyname'] ?>
            </td>
        </tr>
    </table>

    <div style="text-align:center;margin-top:30px;">
        <?= nl2br($setting['receiptfooter']) ?>
    </div>
</div>
