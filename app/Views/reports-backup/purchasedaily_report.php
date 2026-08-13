<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="9" style="text-align:center;"><?= esc($company) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="9"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="9">
                Purchase Reports from <?= esc($start) ?> Till <?= esc($end) ?>
            </th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th><?= label("Date") ?></th>
            <th><?= label("Dealer") ?> <?= label("Name") ?></th>
            <th><?= label("Bill") ?> <?= label("Number") ?></th>
            <th><?= label("Bill") ?> <?= label("Amount") ?></th>
            <th><?= label("Tax") ?></th>
            <th><?= label("Discount") ?></th>
            <th><?= label("Amount") ?></th>
            <th><?= label("Return") ?> <?= label("Amount") ?></th>
            <th><?= label("Net") ?> <?= label("Amount") ?></th>
            <th><?= label("Paid") ?></th>
            <th><?= label("Balanceamt") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $totalBillAmount = 0;
        $totalTax = 0;
        $totalDiscount = 0;
        $totalAmount = 0;
        $totalPaid = 0;
        $totalBalance = 0;

        foreach ($query as $prd):
            $supplier = $db->table('suppliers')->select('name')->where('id', $prd->supplier_id)->get()->getRow();
            $returns = $db->table('purchases_return')->selectSum('total')->where('pur_id', $prd->id)->get()->getRow();

            $returnAmount = $returns->total ?? 0;
            $netAmount = $prd->total - $returnAmount;
            $balance = $netAmount - $prd->paiddd;

            $totalBillAmount += $prd->betot;
            $totalTax += $prd->cgst * 2;
            $totalDiscount += $prd->discamt;
            $totalAmount += $prd->total;
            $totalPaid += $prd->paiddd;
            $totalBalance += $balance;
        ?>
        <tr>
            <td style="text-align:center;"><?= date("d-m-Y", strtotime($prd->purdat)) ?></td>
            <td style="text-align:center;"><?= esc($supplier->name) ?></td>
            <td style="text-align:center;"><?= esc($prd->id) ?></td>
            <td style="text-align:right;"><?= number_format($prd->betot, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($prd->cgst * 2, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($prd->discamt, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($prd->total, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($returnAmount, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($netAmount, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($prd->paiddd, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($balance, $decimals) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="3" style="text-align:right;"><?= label("Total") ?></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalBillAmount, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalTax, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalDiscount, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalAmount, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalPaid, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalBalance, $decimals) ?></b></td>
        </tr>
    </tfoot>
</table>
