<?php
$tr = '';
$sub_total_amount = 0;
$tax_total = 0;
$discount_total = 0;
$shiping_total = 0;
$total_amount_ = 0;
$cancel_total = 0;
$exchange_total = 0;
$return_total = 0;
$grand_total_amount = 0;

foreach ($results as $prd) {
    // print_r($prd);
    // die;
    $custt_namef = $prd->cname ?? '';
    $bil_ststy = '';
    $sstaus_w = "<span class='sales'>Sales</span>";

    $return_ck = $db->query("SELECT * FROM returnss WHERE re_sales_id='{$prd->id}' AND rsale_type='{$ret_idd}'");

    if ($prd->status == 3) {
        $bil_ststy = "style='background:#e9c0c0;'";
        $sstaus_w = "<span class='cancel'>Cancel</span>";
    } elseif ($return_ck->getNumRows() > 0) {
        $bil_ststy = "style='background:#f86e50;'";
        $sstaus_w = "<span class='return'>Return</span>";
    }

    $tax_summary_q = $db->query("SELECT * FROM {$tax_summary} WHERE salesid='{$prd->id}'");
    $overal_tax = 0;
    $oltaxl = '';
    foreach ($tax_summary_q->getResult() as $tax) {
        $taxAmount = (float) $tax->taxfrom;
        $oltaxl .= "{$tax->taxname}-" . number_format($taxAmount, $settings->decimals, '.', '') . "<br>";
        $overal_tax += $taxAmount;
    }

    $dixxss = (float) $prd->discount_indujul + (float) $prd->discountamount;
    $cancel_amt = ($prd->status == 3) ? (float)$prd->total : 0;

    $billamtee = 0;
    $billamtrr = 0;
    if ($return_ck->getNumRows() > 0) {
        foreach ($return_ck->getResult() as $return_sal) {
            if ($return_sal->retrn_amt_mtd == 1) {
                $billamtrr += $return_sal->sutott;
            } else {
                $billamtee += $return_sal->sutott;
                $sstaus_w = "<span class='exchange'>Exchange</span>";
            }
        }
    }

    $sub_total_amount += $prd->subtotal;
    $tax_total += $overal_tax;
    $discount_total += $dixxss;
    $shiping_total += $prd->disamtssh;
    $total_amount_ += $prd->total;
    $cancel_total += $cancel_amt;
    $exchange_total += $billamtee;
    $return_total += $billamtrr;

    $grand_total_amount = $total_amount_ - ($cancel_total + $exchange_total + $return_total);

    $date = explode(' ', $prd->attime)[0];

    echo '<tr ' . $bil_ststy . '>';
    echo '<td>' . $prd->id . '</td>';
    echo '<td>' . ($prd->ssname ?? '') . '</td>';
    echo '<td>' . $custt_namef . '</td>';
    echo '<td>' . date("d-m-Y", strtotime($date)) . '</td>';
    echo '<td>' . $prd->totalitems . '</td>';
    echo '<td>' . number_format((float)$prd->subtotal, $settings->decimals, '.', '') . '</td>';
    echo '<td>' . number_format((float)$overal_tax, $settings->decimals, '.', '') . '</td>';
    echo '<td>' . $oltaxl . '</td>';
    echo '<td>' . number_format($dixxss, $settings->decimals, '.', '') . '</td>';
    echo '<td>' . number_format((float)$prd->disamtssh, $settings->decimals, '.', '') . '</td>';
    echo '<td>' . number_format((float)$prd->total, $settings->decimals, '.', '') . '</td>';
    echo '<td>' . $sstaus_w . '</td>';
    echo '<td>' . number_format($cancel_amt, $settings->decimals, '.', '') . '</td>';
    echo '<td>' . number_format($billamtee, $settings->decimals, '.', '') . '</td>';
    echo '<td>' . number_format($billamtrr, $settings->decimals, '.', '') . '</td>';
    echo '</tr>';
}
