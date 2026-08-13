<table class="table table-striped table-bordered">
    <thead style="background:#1c76bc;color:#fff;">
        <tr>
            <th><?= label('Date'); ?></th>
            <th><?= label('Dealer') . ' ' . label('Name'); ?></th>
            <th><?= label('Bill') . ' ' . label('Number'); ?></th>
            <th class="text-end"><?= label('Bill') . ' ' . label('Amount'); ?></th>
            <th class="text-end"><?= label('Tax'); ?></th>
            <th class="text-end"><?= label('Discount'); ?></th>
            <th class="text-end"><?= label('Amount'); ?></th>
            <th class="text-end"><?= label('Paid'); ?></th>
            <th class="text-end"><?= label('Balanceamt'); ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($rows as $r):
            $taxBoth = (float)$r['cgst'] * 2;
            $bal     = (float)$r['total'] - (float)$r['paiddd'];
        ?>
            <tr>
                <td><?= date('d-m-Y', strtotime($r['purdat'])) ?></td>
                <td><?= esc($r['supplier_name']) ?></td>
                <td class="text-center"><?= esc($r['id']) ?></td>
                <td class="text-end"><?= number_format((float)$r['betot'], $decimals, '.', '') ?></td>
                <td class="text-end"><?= number_format($taxBoth, $decimals, '.', '') ?></td>
                <td class="text-end"><?= number_format((float)$r['discamt'], $decimals, '.', '') ?></td>
                <td class="text-end"><?= number_format((float)$r['total'], $decimals, '.', '') ?></td>
                <td class="text-end"><?= number_format((float)$r['paiddd'], $decimals, '.', '') ?></td>
                <td class="text-end"><?= number_format($bal, $decimals, '.', '') ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <th colspan="3" class="text-end"><?= label('Totals'); ?>:</th>
            <th class="text-end"><?= number_format((float)$totals['billamt'], $decimals, '.', '') ?></th>
            <th class="text-end"><?= number_format((float)$totals['tax'], $decimals, '.', '') ?></th>
            <th class="text-end"><?= number_format((float)$totals['disc'], $decimals, '.', '') ?></th>
            <th class="text-end"><?= number_format((float)$totals['amount'], $decimals, '.', '') ?></th>
            <th class="text-end"><?= number_format((float)$totals['paid'], $decimals, '.', '') ?></th>
            <th class="text-end"><?= number_format((float)$totals['bal'], $decimals, '.', '') ?></th>
        </tr>
    </tfoot>
</table>