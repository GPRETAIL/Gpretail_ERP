<?php
$decimals = $setting['decimals'] ?? 2;
foreach ($results as $prd):
    $billStyle = '';
    $statusLabel = "<span class='sales'>Sales</span>";
    if ($prd->ssstatus == 3) {
        $billStyle = "style='background:#e9c0c0;'";
        $statusLabel = "<span class='cancel'>Cancel</span>";
    }
    $attimeParts = explode(" ", $prd->attime);
    $taxLines = '';

    $taxQuery = $db->query("SELECT * FROM $tax_summary WHERE salesid='" . $prd->ssid . "'");
    foreach ($taxQuery->getResult() as $tax) {
        $taxLines .= $tax->taxname . '-' . number_format($tax->taxfrom, $decimals, '.', '') . '<br>';
    }

    $discountTotal = $prd->discountamount + $prd->discount_indujul;
?>
    <tr <?= $billStyle ?>>
        <td><?= esc($prd->ssid) ?></td>
        <td><?= esc($prd->ssname) ?></td>
        <td><?= esc($prd->cname) ?></td>
        <td><?= date("d-m-Y", strtotime($attimeParts[0])) ?></td>
        <td><?= esc($prd->totalitems) ?></td>
        <td><?= number_format($prd->subtotal, $decimals, '.', '') ?></td>
        <td><?= number_format($prd->tax, $decimals, '.', '') ?></td>
        <td><?= $taxLines ?></td>
        <td><?= number_format($discountTotal, $decimals, '.', '') ?></td>
        <td><?= number_format($prd->disamtssh, $decimals, '.', '') ?></td>
        <td><?= number_format($prd->total, $decimals, '.', '') ?></td>
        <td><?= $statusLabel ?></td>
        <td><?= number_format(0, $decimals, '.', '') ?></td> <!-- cancel -->
        <td><?= number_format(0, $decimals, '.', '') ?></td> <!-- exchange -->
        <td><?= number_format(0, $decimals, '.', '') ?></td> <!-- return -->
    </tr>
<?php endforeach ?>