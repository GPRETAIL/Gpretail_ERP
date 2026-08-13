<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;">Date (A)</th>
            <th style="border: 1px solid #1c76bc;">Total Sales (B)</th>
            <th style="border: 1px solid #1c76bc;">Paid Amount (C)</th>
            <th style="border: 1px solid #1c76bc;">Total Cancelled (D)</th>
            <th style="border: 1px solid #1c76bc;">Paid Cancelled (E)</th>
            <th style="border: 1px solid #1c76bc;">Exchange Return (F)</th>
            <th style="border: 1px solid #1c76bc;">Amount Return (G)</th>
            <th style="border: 1px solid #1c76bc;">Cash In Hand (H = C - E - G)</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td style="text-align:center;border: 1px solid #1c76bc;">
                <?= esc($date) ?>
            </td>
            <td style="text-align:center;border: 1px solid #1c76bc;">
                <?= number_format((float)$today_sales, $decimals, '.', '') ?>
            </td>
            <td style="text-align:center;border: 1px solid #1c76bc;">
                <?= number_format((float)$totalpaid, $decimals, '.', '') ?>
            </td>
            <td style="text-align:center;border: 1px solid #1c76bc;">
                <?= number_format((float)$cancelledamt, $decimals, '.', '') ?>
            </td>
            <td style="text-align:center;border: 1px solid #1c76bc;">
                <?= number_format((float)$totcancelled, $decimals, '.', '') ?>
            </td>
            <td style="text-align:center;border: 1px solid #1c76bc;">
                <?= number_format((float)$exchange_return, $decimals, '.', '') ?>
            </td>
            <td style="text-align:center;border: 1px solid #1c76bc;">
                <?= number_format((float)$amt_return, $decimals, '.', '') ?>
            </td>
            <td style="text-align:center;border: 1px solid #1c76bc;">
                <?= number_format((float)$cash_in_hand, $decimals, '.', '') ?>
            </td>
        </tr>
    </tbody>
</table>
