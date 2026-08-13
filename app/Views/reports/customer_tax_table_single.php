<table class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="4" style="text-align:center"><?= esc($companyName) ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="4" style="text-align:center"><?= esc($companyAddress) ?></th>
        </tr>
        <tr class="hideme">
            <th colspan="4" style="text-align:center">Customer Report from <?= esc(date("d-m-Y", strtotime($startpp))) ?> to <?= esc(date("d-m-Y", strtotime($endpp))) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Party Name</th>
            <?php foreach ($rows as $row): ?>
                <th><?= esc($row['tottax']) ?>%</th>
            <?php endforeach; ?>
            <th>Total</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><?= esc($clientName) ?></td>
            <?php
            $total = 0;
            foreach ($rows as $row):
                $amt = $row['mmm'];
                $tax = $row['tottax'];
                $taxVal = ($amt * $tax) / 100;
                $total += ($amt + $taxVal);
            ?>
                <td style="text-align:right"><?= number_format($amt + $taxVal, $decimals) ?></td>
            <?php endforeach; ?>
            <td style="text-align:right"><b><?= number_format($total, $decimals) ?></b></td>
        </tr>
    </tbody>
</table>