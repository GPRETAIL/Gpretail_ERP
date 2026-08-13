<table id="chltkarr" class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme"><th colspan="12" class="text-center"><?= esc($settings['companyname']) ?></th></tr>
        <tr class="hideme text-center"><th colspan="12"><?= esc($store['adresse'] ?? '') ?></th></tr>
        <tr class="hideme text-center"><th colspan="12">Supplier Payments Reports from <?= date("d-m-Y", strtotime($start)) ?> Till <?= date("d-m-Y", strtotime($end)) ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Date</th>
            <th>Supplier</th>
            <th>Invoice #</th>
            <th>Purchase #</th>
            <th>Bill Amount</th>
            <th>Cash</th>
            <th>Cheque</th>
            <th>Cheque No</th>
            <th>Bank</th>
            <th>Cheque Date</th>
            <th>Paid</th>
            <th>Balance</th>
        </tr>
    </thead>
    <tbody>
    <?php
        $totPaid = $billTotal = 0;
        $purchMap = [];

        foreach ($payments as $p):
            $supplier = $db->table('suppliers')->select('name')->getWhere(['id' => $p->sup_id])->getRow();
            $purchase = $db->table('purchases')->getWhere(['id' => $p->purchaid])->getRow();
            $return   = $db->table('purchases_return')->selectSum('total')->getWhere(['pur_id' => $p->purchaid])->getRow();
            $retAmount = floatval($return->total ?? 0);
            $pureTotal = $purchase->total - $retAmount;

            // Track paid amounts
            $purchMap[$p->purchaid] = ($purchMap[$p->purchaid] ?? 0) + $p->amtpaid;
            $balance = $pureTotal - $purchMap[$p->purchaid];

            $isCash = $p->methid == 0 ? $p->amtpaid : 0;
            $isChq  = $p->methid != 0 ? $p->amtpaid : 0;

            $billTotal += $purchase->total;
            $totPaid += $p->amtpaid;
    ?>
        <tr>
            <td><?= date('d-m-Y', strtotime($p->datet)) ?></td>
            <td><?= esc($supplier->name ?? 'Unknown') ?></td>
            <td><?= esc($p->invoicen) ?></td>
            <td><?= esc($p->purchaid) ?></td>
            <td><?= number_format($pureTotal, $decimals) ?></td>
            <td class="text-end"><?= number_format($isCash, $decimals) ?></td>
            <td class="text-end"><?= number_format($isChq, $decimals) ?></td>
            <td><?= esc($p->chechno) ?></td>
            <td><?= esc($p->bankname) ?></td>
            <td><?= esc($p->datetch) ?></td>
            <td class="text-end"><?= number_format($p->amtpaid, $decimals) ?></td>
            <td class="text-end"><?= number_format($balance, $decimals) ?></td>
        </tr>
    <?php endforeach ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="4" class="text-end"><b>Total</b></td>
            <td><b>Rs.<?= number_format($billTotal, $decimals) ?></b></td>
            <td colspan="5" class="text-end"><b>Total Paid</b></td>
            <td><b>Rs.<?= number_format($totPaid, $decimals) ?></b></td>
            <td><b>Rs.<?= number_format($billTotal - $totPaid, $decimals) ?></b></td>
        </tr>
    </tfoot>
</table>
