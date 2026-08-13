<table id="chltkarr" class="table table-striped table-bordered" width="100%">
    <thead>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="text-align:center;border: 1px solid #1c76bc;">Product Name</th>
            <th style="text-align:center;border: 1px solid #1c76bc;">Barcode</th>
            <th style="text-align:center;border: 1px solid #1c76bc;">QT</th>
            <th style="text-align:center;border: 1px solid #1c76bc;">Price</th>
            <th style="border: 1px solid #1c76bc;text-align:center;">Sales ID</th>
            <th style="border: 1px solid #1c76bc;text-align:center;">Date Time</th>
        </tr>
    </thead>
    <tbody>
        <?php if (!empty($results)): ?>
            <?php foreach ($results as $prd): ?>
                <tr>
                    <td style="border: 1px solid #1c76bc;"><?= esc($prd->name) ?></td>
                    <td style="border: 1px solid #1c76bc;"><?= esc($prd->code) ?></td>
                    <td style="border: 1px solid #1c76bc;"><?= esc($prd->qt) ?></td>
                    <td style="border: 1px solid #1c76bc;"><?= esc($prd->subtotal) ?></td>
                    <td style="border: 1px solid #1c76bc;"><?= esc($prd->sale_id) ?></td>
                    <td style="border: 1px solid #1c76bc;"><?= date('d-m-Y', strtotime($prd->date)) ?></td>
                </tr>
            <?php endforeach; ?>
        <?php else: ?>
            <tr>
                <td colspan="6" class="text-center">No records found.</td>
            </tr>
        <?php endif; ?>
    </tbody>
</table>