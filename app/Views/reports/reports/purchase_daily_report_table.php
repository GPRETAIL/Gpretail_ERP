<table class="table table-striped table-bordered" id="chltkarr" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="11" class="text-center"><?= esc($settings['companyname']) ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="11" class="text-center"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="11" class="text-center">Purchase Reports from <?= esc($start) ?> to <?= esc($end) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Date</th>
            <th>Dealer Name</th>
            <th>Bill No</th>
            <th>Bill Amount</th>
            <th>Tax</th>
            <th>Discount</th>
            <th>Amount</th>
            <th>Return Amount</th>
            <th>Net Amount</th>
            <th>Paid</th>
            <th>Balance</th>
        </tr>
    </thead>
    <tbody>
        <?php
        $billamt = $tottax = $discc = $toott = $paidd = $toott_rrr = $toott_ssss = 0;

        foreach ($purchases as $purchase):
            $supplier = $db->table('suppliers')->where('id', $purchase->supplier_id)->get()->getRowArray();
            $return = $db->table('purchases_return')->selectSum('total')->where('pur_id', $purchase->id)->get()->getRowArray();
            $returnAmt = $return['total'] ?? 0;

            $billTotal = $purchase->betot;
            $totalAmt  = $purchase->total;
            $netAmt    = $totalAmt - $returnAmt;
            $balance   = $netAmt - $purchase->paiddd;

            $billamt   += $billTotal;
            $tottax    += $purchase->cgst;
            $discc     += $purchase->discamt;
            $toott     += $totalAmt;
            $toott_rrr += $returnAmt;
            $toott_ssss += $netAmt;
            $paidd     += $purchase->paiddd;
        ?>
        <tr>
            <td><?= date("d-m-Y", strtotime($purchase->purdat)) ?></td>
            <td><?= esc($supplier['name'] ?? '-') ?></td>
            <td class="text-center"><?= $purchase->id ?></td>
            <td class="text-end"><?= number_format($billTotal, $settings['decimals']) ?></td>
            <td class="text-end"><?= number_format($purchase->cgst * 2, $settings['decimals']) ?></td>
            <td class="text-end"><?= number_format($purchase->discamt, $settings['decimals']) ?></td>
            <td class="text-end"><?= number_format($totalAmt, $settings['decimals']) ?></td>
            <td class="text-end"><?= number_format($returnAmt, $settings['decimals']) ?></td>
            <td class="text-end"><?= number_format($netAmt, $settings['decimals']) ?></td>
            <td class="text-end"><?= number_format($purchase->paiddd, $settings['decimals']) ?></td>
            <td class="text-end"><?= number_format($balance, $settings['decimals']) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="3"></td>
            <td class="text-end"><b>Rs.<?= number_format($billamt, $settings['decimals']) ?></b></td>
            <td class="text-end"><b>Rs.<?= number_format($tottax * 2, $settings['decimals']) ?></b></td>
            <td class="text-end"><b>Rs.<?= number_format($discc, $settings['decimals']) ?></b></td>
            <td class="text-end"><b>Rs.<?= number_format($toott, $settings['decimals']) ?></b></td>
            <td class="text-end"><b>Rs.<?= number_format($toott_rrr, $settings['decimals']) ?></b></td>
            <td class="text-end"><b>Rs.<?= number_format($toott_ssss, $settings['decimals']) ?></b></td>
            <td class="text-end"><b>Rs.<?= number_format($paidd, $settings['decimals']) ?></b></td>
            <td class="text-end"><b>Rs.<?= number_format($toott_ssss - $paidd, $settings['decimals']) ?></b></td>
        </tr>
    </tfoot>
</table>
