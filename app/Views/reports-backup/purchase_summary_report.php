<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="9" style="text-align:center;"><?= esc($company) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="9"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="9">Purchase Summary Report from <?= esc($start) ?> Till <?= esc($end) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th style="border: 1px solid #1c76bc;"><?= label("Date") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Bills") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Bill") ?> <?= label("Amount") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Tax") ?> (CGST + SGST)</th>
            <th style="border: 1px solid #1c76bc;"><?= label("Discount") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Net") ?> <?= label("Amount") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Return") ?> <?= label("Amount") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Paid") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Balanceamt") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $totalBill = $totalTax = $totalDisc = $totalNet = $totalReturn = $totalPaid = $totalBalance = 0;

        foreach ($summary as $row):
            $date = $row->day;
            $retamt = $returns[$date] ?? 0;
            $balance = $row->netamtt - $retamt - $row->baalll;

            $totalBill += $row->billamt;
            $totalTax += $row->cgg + $row->sgg;
            $totalDisc += $row->dikct;
            $totalNet += $row->netamtt;
            $totalReturn += $retamt;
            $totalPaid += $row->baalll;
            $totalBalance += $balance;
        ?>
        <tr>
            <td style="text-align:center;"><?= esc(date('d-m-Y', strtotime($date))) ?></td>
            <td style="text-align:center;"><?= esc($row->bills) ?></td>
            <td style="text-align:right;"><?= number_format($row->billamt, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($row->cgg + $row->sgg, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($row->dikct, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($row->netamtt, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($retamt, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($row->baalll, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($balance, $decimals) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="2" style="text-align:right;"><b><?= label("Total") ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalBill, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalTax, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalDisc, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalNet, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalReturn, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalPaid, $decimals) ?></b></td>
            <td style="text-align:right;"><b>Rs.<?= number_format($totalBalance, $decimals) ?></b></td>
        </tr>
    </tfoot>
</table>
