<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="12" style="text-align:center;"><?= esc($company) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="12"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="12">
                Supplier Payments Reports from <?= esc($start) ?> Till <?= esc($end) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label("Date") ?></th>
            <th><?= label("Supplier") ?></th>
            <th><?= label("Invoice") ?> <?= label("Number") ?></th>
            <th><?= label("Purchase") ?> <?= label("Number") ?></th>
            <th><?= label("Bill") ?> <?= label("Amount") ?></th>
            <th><?= label("Cash") ?></th>
            <th><?= label("Cheque") ?></th>
            <th><?= label("Cheque") ?> <?= label("Number") ?></th>
            <th><?= label("Bank") ?></th>
            <th><?= label("Date") ?></th>
            <th><?= label("Paid") ?></th>
            <th><?= label("Balanceamt") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $db = \Config\Database::connect();
        $totalPaid = 0;
        $totalBill = 0;
        $prevPurchaseId = null;
        $purchasePaidMap = [];

        foreach ($payments as $prd):
            $supplier = $db->table('suppliers')->select('name')->where('id', $prd->sup_id)->get()->getRow();
            $purchase = $db->table('purchases')->where('id', $prd->purchaid)->get()->getRow();
            $returns = $db->table('purchases_return')->selectSum('total')->where('pur_id', $prd->purchaid)->get()->getRow();

            $billAmount = ($purchase->total ?? 0) - ($returns->total ?? 0);
            $paymentMethod = $prd->methid == 0 ? 'cash' : 'cheque';

            // Track amount paid per purchase
            $purchasePaidMap[$prd->purchaid] = ($purchasePaidMap[$prd->purchaid] ?? 0) + $prd->amtpaid;
            $balance = $billAmount - $purchasePaidMap[$prd->purchaid];

            if ($prd->purchaid !== $prevPurchaseId) {
                $totalBill += $billAmount;
            }

            $totalPaid += $prd->amtpaid;
            $prevPurchaseId = $prd->purchaid;
        ?>
        <tr>
            <td style="text-align:center;"><?= date('d-m-Y', strtotime($prd->datet)) ?></td>
            <td style="text-align:center;"><?= esc($supplier->name ?? '-') ?></td>
            <td style="text-align:center;"><?= esc($prd->invoicen) ?></td>
            <td style="text-align:center;"><?= esc($prd->purchaid) ?></td>
            <td style="text-align:center;"><?= number_format($billAmount, $decimals) ?></td>
            <td style="text-align:right;"><?= $paymentMethod === 'cash' ? number_format($prd->amtpaid, $decimals) : '0.00' ?></td>
            <td style="text-align:right;"><?= $paymentMethod === 'cheque' ? number_format($prd->amtpaid, $decimals) : '0.00' ?></td>
            <td style="text-align:right;"><?= esc($prd->chechno) ?></td>
            <td style="text-align:right;"><?= esc($prd->bankname) ?></td>
            <td style="text-align:right;"><?= esc($prd->datetch) ?></td>
            <td style="text-align:right;"><?= number_format($prd->amtpaid, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($balance, $decimals) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="4" style="text-align:right;"><?= label("Bill") ?> <?= label("Amount") ?></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalBill, $decimals) ?></b></td>
            <td colspan="4"></td>
            <td style="text-align:right;"><?= label("Total") ?></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalPaid, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalBill - $totalPaid, $decimals) ?></b></td>
        </tr>
    </tfoot>
</table>
