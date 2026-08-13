<!-- app/Views/reports/cashinhand_daily_report.php -->

<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> <?= label("Date") ?> (A) </th>
        <th style="border: 1px solid #1c76bc;"> <?= label("Total Sales") ?> (B) </th>
        <th style="border: 1px solid #1c76bc;"> <?= label("Paid Amount") ?> (C) </th>
        <th style="border: 1px solid #1c76bc;"> Total <?= label("Cancelled") ?> (D)</th>
        <th style="border: 1px solid #1c76bc;"> Paid <?= label("Cancelled") ?> (E)</th>
        <th style="border: 1px solid #1c76bc;"> <?= label("Exchange Return") ?> (F)</th>
        <th style="border: 1px solid #1c76bc;"> <?= label("Amount Return") ?> (G)</th>
        <th style="border: 1px solid #1c76bc;"> <?= label("Cash In Hand") ?> (G=C-E-G)</th>
    </tr>
    <tr>
        <td style="text-align:center;border: 1px solid #1c76bc;"><?= esc($date) ?></td>
        <td style="text-align:center;border: 1px solid #1c76bc;"><?= number_format((float)$today_sales, $decimals, '.', '') ?></td>
        <td style="text-align:center;border: 1px solid #1c76bc;"><?= number_format((float)$totalpaid, $decimals, '.', '') ?></td>
        <td style="text-align:center;border: 1px solid #1c76bc;"><?= number_format((float)$cancelledamt, $decimals, '.', '') ?></td>
        <td style="text-align:center;border: 1px solid #1c76bc;"><?= number_format((float)$totcancelled, $decimals, '.', '') ?></td>
        <td style="text-align:center;border: 1px solid #1c76bc;"><?= number_format((float)$exchange_return, $decimals, '.', '') ?></td>
        <td style="text-align:center;border: 1px solid #1c76bc;"><?= number_format((float)$amt_return, $decimals, '.', '') ?></td>
        <td style="text-align:center;border: 1px solid #1c76bc;"><?= number_format((float)$cash_in_hand, $decimals, '.', '') ?></td>
    </tr>
</table>