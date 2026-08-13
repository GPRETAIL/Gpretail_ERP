<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="6" style="text-align:center;"><?= esc($company) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="6"><?= esc($address) ?></th>
        </tr>
        <tr class="hideme" style="text-align:center;">
            <th colspan="6">Fast Moving Reports from <?= date('d-m-Y', strtotime($start)) ?> Till <?= date('d-m-Y', strtotime($end)) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;"><?= label("Category") ?></th>
            <th style="border: 1px solid #1c76bc;"><?= label("Product") ?></th>
            <th style="border: 1px solid #1c76bc;text-align:center;"><?= label("Sales") ?></th>
            <th style="border: 1px solid #1c76bc;text-align:center;"><?= label("Cancel") ?></th>
            <th style="border: 1px solid #1c76bc;text-align:center;"><?= label("Return") ?></th>
            <th style="border: 1px solid #1c76bc;text-align:center;"><?= label("Total") . ' ' . label("Sales") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($rows as $row): ?>
            <tr style="border: 1px solid #1c76bc;">
                <td style="border: 1px solid #1c76bc;"><?= esc($row['category']) ?></td>
                <td style="border: 1px solid #1c76bc;"><?= esc($row['product']) ?></td>
                <td style="border: 1px solid #1c76bc;text-align:center;"><?= esc($row['sales']) ?></td>
                <td style="border: 1px solid #1c76bc;text-align:center;"><?= esc($row['cancel']) ?></td>
                <td style="border: 1px solid #1c76bc;text-align:center;"><?= esc($row['return']) ?></td>
                <td style="border: 1px solid #1c76bc;text-align:center;"><?= esc($row['total']) ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>
