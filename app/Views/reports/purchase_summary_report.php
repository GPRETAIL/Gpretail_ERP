<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="10" style="text-align:center;"><?= esc($settings['companyname']) ?></th></tr>
        <tr class="hideme" style="text-align:center;"><th colspan="10"><?= esc($store['adresse'] ?? '') ?></th></tr>
        <tr class="hideme" style="text-align:center;"><th colspan="10">Purchase Summary Reports from <?= $start ?> Till <?= $end ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label("Date") ?></th>
            <th><?= label("Bill") ?></th>
            <th><?= label("Bill") . ' ' . label("Amount") ?></th>
            <th><?= label("Tax") ?></th>
            <th><?= label("Discount") ?></th>
            <th><?= label("Amount") ?></th>
            <th><?= label("Return") . ' ' . label("Amount") ?></th>
            <th><?= label("Net") . ' ' . label("Amount") ?></th>
            <th><?= label("Paid") ?></th>
            <th><?= label("Balanceamt") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $billamt = $tottax = $discc = $toott = $paidd = $toott_rrr = $toott_net = 0;
        foreach ($summaries as $prd):
            $return = $prd->netamtt - $prd->baalll; // approximate (adjust if needed)
            $tax = $prd->cgg + $prd->sgg;
            $billamt += $prd->billamt;
            $tottax += $tax;
            $discc += $prd->dikct;
            $toott += $prd->netamtt;
            $paidd += $prd->baalll;
            $toott_net += $prd->netamtt;
        ?>
        <tr>
            <td><?= date('d-m-Y', strtotime($prd->DAY)) ?></td>
            <td style="text-align:center;"><?= $prd->bills ?></td>
            <td style="text-align:right;"><?= number_format($prd->billamt, $decimal) ?></td>
            <td style="text-align:right;"><?= number_format($tax, $decimal) ?></td>
            <td style="text-align:right;"><?= number_format($prd->dikct, $decimal) ?></td>
            <td style="text-align:right;"><?= number_format($prd->netamtt, $decimal) ?></td>
            <td style="text-align:right;">0.00</td>
            <td style="text-align:right;"><?= number_format($prd->netamtt, $decimal) ?></td>
            <td style="text-align:right;"><?= number_format($prd->baalll, $decimal) ?></td>
            <td style="text-align:right;"><?= number_format($prd->netamtt - $prd->baalll, $decimal) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="2"><b>Total</b></td>
            <td style="text-align:right;"><b><?= number_format($billamt, $decimal) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($tottax, $decimal) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($discc, $decimal) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($toott, $decimal) ?></b></td>
            <td style="text-align:right;"><b>0.00</b></td>
            <td style="text-align:right;"><b><?= number_format($toott_net, $decimal) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($paidd, $decimal) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($toott_net - $paidd, $decimal) ?></b></td>
        </tr>
    </tfoot>
</table>
