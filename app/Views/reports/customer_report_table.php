<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme">
            <!-- <th colspan="<//?//= 11 + count($selectedModeIds) ?>" class="text-center"><//?=// esc($settings['companyname']) ?></th> -->
            <th colspan="<?= 11 + (is_array($selectedModeIds) ? count($selectedModeIds) : 0) ?>" class="text-center">
                <?= esc($settings['companyname']) ?>
            </th>
        </tr>
        <tr class="hideme text-center">
            <th colspan="<?= 11 + (is_array($selectedModeIds) ? count($selectedModeIds) : 0) ?>">
                <?= esc($store['adresse'] ?? '') ?>
            </th>
            <!-- <th colspan="</?= 11 + count($selectedModeIds) ?>"></?= esc($store['adresse'] ?? '') ?></th> -->
        </tr>
        <tr class="hideme text-center">
            <th colspan="<?= 11 + (is_array($selectedModeIds) ? count($selectedModeIds) : 0) ?>">
                Customer Reports from <?= date('d-m-Y', strtotime($start)) ?> Till <?= date('d-m-Y', strtotime($end)) ?>
            </th>
            <!-- <th colspan="</?= 11 + count($selectedModeIds) ?>">Customer Reports from </?= date('d-m-Y', strtotime($start)) ?> Till </?= date('d-m-Y', strtotime($end)) ?></th> -->
        </tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th>Bill Number</th>
            <th>Customer</th>
            <th>Date</th>
            <th>No Of Items</th>
            <th>Total Amount</th>
            <th>Tax</th>
            <th>Summary</th>
            <th>Discount</th>
            <th>Shipping</th>
            <th>Total</th>
            <th>Cash</th>
            <?php foreach ($paymentModes as $mode): ?>
                <!-- </?php if (in_array($mode['id'], $selectedModeIds)): ?> -->
                <?php if (is_array($selectedModeIds) && in_array($mode['id'], $selectedModeIds)): ?>
                    <th><?= esc($mode['name']) ?></th>
                <?php endif; ?>
            <?php endforeach; ?>
            <th>Status</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($salesRecords as $prd): ?>
            <?php print_r($prd) ?>

            <?php
            // Prepare status
            $statusLabel = 'Sales';
            $rowStyle = '';

            $returnCheck = db_connect()->table('returnss')
                ->where(['re_sales_id' => $prd->ssid, 'rsale_type' => $themeBlock])
                ->get()->getNumRows();

            if ($prd->status == 3) {
                $statusLabel = 'Cancel';
                $rowStyle = 'background:#e9c0c0;';
            } elseif ($returnCheck > 0) {
                $statusLabel = 'Return';
                $rowStyle = 'background:#f86e50;';
            }

            // Customer name
            $customer = ($prd->client_id > 0)
                ? db_connect()->table('customers')->getWhere(['id' => $prd->client_id])->getRow('name')
                : 'Walk in Customer';

            // Tax summary
            $taxRows = db_connect()->table('tax_summary')->where('salesid', $prd->ssid)->get()->getResultArray();
            $taxSummaryHtml = '';
            $totalTax = 0;
            foreach ($taxRows as $tax) {
                $taxSummaryHtml .= esc($tax['taxname']) . '-' . number_format($tax['taxfrom'], $decimals) . '<br>';
                $totalTax += $tax['taxfrom'];
            }

            // Payment method name
            $paymentParts = explode('~', $prd->paidmethod);
            $cashReceived = $prd->recivamt;
            ?>
            <tr style="<?= $rowStyle ?>">
                <td class="text-center"><?= esc($prd->ssid) ?></td>
                <td class="text-center"><?= esc($customer) ?></td>
                <td class="text-center"><?= date('d-m-Y', strtotime($prd->attime)) ?></td>
                <td class="text-end"><?= esc($prd->totalitems) ?></td>
                <td class="text-end"><?= number_format($prd->subtotal, $decimals) ?></td>
                <td class="text-end"><?= number_format($totalTax, $decimals) ?></td>
                <td class="text-start" style="padding: 0;"><?= $taxSummaryHtml ?></td>
                <td class="text-end"><?= number_format($prd->discountamount + $prd->discount_indujul, $decimals) ?></td>
                <td class="text-end"><?= number_format($prd->disamtssh, $decimals) ?></td>
                <td class="text-end"><?= number_format($prd->total, $decimals) ?></td>
                <td class="text-end"><?= number_format($cashReceived, $decimals) ?></td>

                <?php foreach ($paymentModes as $mode): ?>
                    <?php if (in_array($mode['id'], $selectedModeIds)): ?>
                        <td class="text-end">
                            <?= ($paymentParts[0] == $mode['id']) ? number_format($prd->recivamt2, $decimals) : '0.00' ?>
                        </td>
                    <?php endif; ?>
                <?php endforeach; ?>

                <td class="text-center"><?= $statusLabel ?></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>