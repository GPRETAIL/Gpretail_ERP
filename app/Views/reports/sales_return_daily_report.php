<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="7" style="text-align:center;"><?= esc($settings['companyname']) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="7"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="7">Sales Return Reports from <?= date('d-m-Y', strtotime($start)) ?> Till <?= date('d-m-Y', strtotime($end)) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border:1px solid #1c76bc;">
            <th style="border:1px solid #1c76bc;"><?= label("Date") ?></th>
            <th style="text-align:center;border:1px solid #1c76bc;"><?= label("Bill") . ' ' . label("Number") ?></th>
            <th style="border:1px solid #1c76bc;"><?= label("Store") . ' ' . label("Name") ?></th>
            <th style="text-align:center;border:1px solid #1c76bc;"><?= label("From") . ' ' . label("Sales") . ' ' . label("Number") ?></th>
            <th style="text-align:center;border:1px solid #1c76bc;"><?= label("To") . ' ' . label("Sales") . ' ' . label("Number") ?></th>
            <th style="text-align:center;border:1px solid #1c76bc;"><?= label("Qty") ?></th>
            <th style="text-align:right;border:1px solid #1c76bc;"><?= label("Bill") . ' ' . label("Amount") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($data as $row): ?>
            <tr>
                <td style="border:1px solid #1c76bc;"><?= esc($row['date']) ?></td>
                <td style="text-align:center;border:1px solid #1c76bc;"><?= esc($row['bill_no']) ?></td>
                <td style="text-align:left;border:1px solid #1c76bc;"><?= esc($row['store']) ?></td>
                <td style="text-align:center;border:1px solid #1c76bc;"><?= esc($row['from_sale']) ?></td>
                <td style="text-align:center;border:1px solid #1c76bc;"><?= esc($row['to_sale']) ?></td>
                <td style="text-align:center;border:1px solid #1c76bc;"><?= esc($row['qty']) ?></td>
                <td style="text-align:right;border:1px solid #1c76bc;"><?= number_format($row['amount'], $settings['decimals'], '.', '') ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="6" style="text-align:right;border:1px solid #1c76bc;"><strong>Total:</strong></td>
            <td style="text-align:right;border:1px solid #1c76bc;"><strong>Rs. <?= number_format($total, $settings['decimals'], '.', '') ?></strong></td>
        </tr>
    </tfoot>
</table>
