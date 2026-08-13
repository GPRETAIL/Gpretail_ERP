<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="12" style="text-align:center;"><?= esc($companyname) ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="12" style="text-align:center;"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="12" style="text-align:center;">Dealer Purchase Report from <?= esc($startDate) ?> till <?= esc($endDate) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th><?= label('Date') ?></th>
            <th><?= label('Dealer') ?> <?= label('Name') ?></th>
            <th><?= label('Bill') ?> <?= label('Number') ?></th>
            <th><?= label('Invoice') ?> <?= label('Number') ?></th>
            <th><?= label('Bill') ?> <?= label('Amount') ?></th>
            <th><?= label('Tax') ?></th>
            <th><?= label('Discount') ?></th>
            <th><?= label('Amount') ?></th>
            <th><?= label('Return') ?> <?= label('Amount') ?></th>
            <th><?= label('Net') ?> <?= label('Amount') ?></th>
            <th><?= label('Paid') ?></th>
            <th><?= label('Balanceamt') ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $billamt = $tottax = $discc = $toott = $toott_return = $toott_ggg = $paidd = 0;

        foreach ($purchases as $p):
            $supplierName = $suppliers[$p->supplier_id] ?? '-';
            $tax = $p->cgst + $p->sgst;
            $returnAmt = 0; // Placeholder until return logic added
            $netAmt = $p->total - $returnAmt;
            $balance = $netAmt - $p->paiddd;
        ?>
        <tr>
            <td><?= date("d-m-Y", strtotime($p->purdat)) ?></td>
            <td><?= esc($supplierName) ?></td>
            <td style="text-align:center;"><?= esc($p->id) ?></td>
            <td style="text-align:center;"><?= esc($p->invno) ?></td>
            <td style="text-align:right;"><?= number_format($p->betot, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($tax, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($p->discamt, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($p->total, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($returnAmt, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($netAmt, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($p->paiddd, $decimals) ?></td>
            <td style="text-align:right;"><?= number_format($balance, $decimals) ?></td>
        </tr>
        <?php
            $billamt += $p->betot;
            $tottax += $tax;
            $discc += $p->discamt;
            $toott += $p->total;
            $toott_return += $returnAmt;
            $toott_ggg += $netAmt;
            $paidd += $p->paiddd;
        endforeach;
        ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="4" style="text-align:right;"><b>Total</b></td>
            <td style="text-align:right;"><b><?= number_format($billamt, $decimals) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($tottax, $decimals) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($discc, $decimals) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($toott, $decimals) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($toott_return, $decimals) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($toott_ggg, $decimals) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($paidd, $decimals) ?></b></td>
            <td style="text-align:right;"><b><?= number_format($toott_ggg - $paidd, $decimals) ?></b></td>
        </tr>
    </tfoot>
</table>
