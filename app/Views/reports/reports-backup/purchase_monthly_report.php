<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="10" style="text-align:center;"><?= esc($setting['companyname']) ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="10" style="text-align:center;"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="10" style="text-align:center;">Purchase Monthly Summary Reports from <?= esc($start) ?> till <?= esc($end) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border:1px solid #1c76bc;">
            <th>Date</th>
            <th>Bill Count</th>
            <th>Bill Amount</th>
            <th>Tax</th>
            <th>Discount</th>
            <th>Total</th>
            <th>Return</th>
            <th>Net Amount</th>
            <th>Paid</th>
            <th>Balance</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $billamt = $tottax = $discc = $toott = $paidd = $paidd_rrr = 0;
        foreach ($monthlyData as $row):
            $month = $row->month;
            $returnAmt = $returns[$month] ?? 0;
            $tax = $row->cgg + $row->sgg;
            $net = $row->netamtt - $returnAmt;
            $balance = $net - $row->baalll;
        ?>
        <tr>
            <td><?= date('m-Y', strtotime($month)) ?></td>
            <td style="text-align:center;"><?= $row->bills ?></td>
            <td style="text-align:right;"><?= number_format($row->billamt, $setting['decimals']) ?></td>
            <td style="text-align:right;"><?= number_format($tax, $setting['decimals']) ?></td>
            <td style="text-align:right;"><?= number_format($row->dikct, $setting['decimals']) ?></td>
            <td style="text-align:right;"><?= number_format($row->netamtt, $setting['decimals']) ?></td>
            <td style="text-align:right;"><?= number_format($returnAmt, $setting['decimals']) ?></td>
            <td style="text-align:right;"><?= number_format($net, $setting['decimals']) ?></td>
            <td style="text-align:right;"><?= number_format($row->baalll, $setting['decimals']) ?></td>
            <td style="text-align:right;"><?= number_format($balance, $setting['decimals']) ?></td>
        </tr>
        <?php
            $billamt += $row->billamt;
            $tottax += $tax;
            $discc += $row->dikct;
            $toott += $row->netamtt;
            $paidd += $row->baalll;
            $paidd_rrr += $returnAmt;
        endforeach;
        ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="2"><b>Total</b></td>
            <td style="text-align:right;"><b><?= number_format($billamt, $setting['decimals']) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($tottax, $setting['decimals']) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($discc, $setting['decimals']) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($toott, $setting['decimals']) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($paidd_rrr, $setting['decimals']) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($toott - $paidd_rrr, $setting['decimals']) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($paidd, $setting['decimals']) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($toott - $paidd - $paidd_rrr, $setting['decimals']) ?></b></td>
        </tr>
    </tfoot>
</table>
