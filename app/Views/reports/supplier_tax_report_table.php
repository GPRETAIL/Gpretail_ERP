<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="12" style="text-align:center"><?= esc($setting->companyname) ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="12" style="text-align:center"><?= esc($store->adresse ?? '') ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="12" style="text-align:center">Supplier Payments Reports from <?= date("d-m-Y", strtotime($start)) ?> to <?= date("d-m-Y", strtotime($end)) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label("Date") ?></th>
            <th><?= label("Supplier") ?></th>
            <th><?= label("Invoice") . ' ' . label("Number") ?></th>
            <th><?= label("Purchase") . ' ' . label("Number") ?></th>
            <th><?= label("Bill") . ' ' . label("Amount") ?></th>
            <th><?= label("Cash") ?></th>
            <th><?= label("Cheque") ?></th>
            <th><?= label("Cheque") . ' ' . label("Number") ?></th>
            <th><?= label("Bank") ?></th>
            <th><?= label("Date") ?></th>
            <th><?= label("Paid") ?></th>
            <th><?= label("Balanceamt") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $totalPaid = 0;
        $billTotal = 0;
        $newPurcId = 0;
        $ttip = 0;

        foreach ($payments as $prd):
            $supplier = $db->table('suppliers')->where('id', $prd->sup_id)->get()->getRowArray();
            $purchase = $db->table('purchases')->where('id', $prd->purchaid)->get()->getRowArray();
            // $returns = $db->table('purchases_return')
            //     ->selectSum('total', 'rrtty')
            //     ->where('pur_id', $prd->purchaid)
            //     ->get()->getRowArray();
            $return = ['rrtty' => 0];
            $returnAmt = $returns['rrtty'] ?? 0;
            $netTotal = ($purchase['total'] ?? 0) - $returnAmt;

            if ($ttip != $prd->purchaid) {
                $billTotal += $purchase['total'] ?? 0;
            }

            if ($newPurcId == $prd->purchaid) {
                $newretot += $prd->amtpaid;
            } else {
                $newPurcId = $prd->purchaid;
                $newretot = $prd->amtpaid;
            }

            $totalPaid += $prd->amtpaid;

            $cash = $prd->methid == 0 ? $prd->amtpaid : 0;
            $cheque = $prd->methid != 0 ? $prd->amtpaid : 0;

            $total = $purchase['total'] ?? 0;
            $balance = $total - $newretot - $returnAmt;

            $ttip = $prd->purchaid;
        ?>
            <tr>
                <td><?= date("d-m-Y", strtotime($prd->datet)) ?></td>
                <td><?= esc($supplier['name'] ?? '') ?></td>
                <td><?= esc($prd->invoicen) ?></td>
                <td><?= esc($prd->purchaid) ?></td>
                <td><?= number_format((float)$netTotal, $decimals, '.', '') ?></td>
                <td><?= number_format((float)$cash, $decimals, '.', '') ?></td>
                <td><?= number_format((float)$cheque, $decimals, '.', '') ?></td>
                <td><?= esc($prd->chechno) ?></td>
                <td><?= esc($prd->bankname) ?></td>
                <td><?= esc($prd->datetch) ?></td>
                <td><?= number_format((float)$prd->amtpaid, $decimals, '.', '') ?></td>
                <td><?= number_format((float)$balance, $decimals, '.', '') ?></td>
            </tr>
        <?php endforeach; ?>
        <tr>
            <td colspan="4" style="text-align:right"><?= label("Bill") . ' ' . label("Amount") ?></td>
            <td><?= number_format((float)$billTotal, $decimals, '.', '') ?></td>
            <td colspan="4" style="text-align:right"><?= label("Total") ?></td>
            <td><?= number_format((float)$totalPaid, $decimals, '.', '') ?></td>
            <td><?= number_format((float)($billTotal - $totalPaid), $decimals, '.', '') ?></td>
        </tr>
    </tbody>
</table>