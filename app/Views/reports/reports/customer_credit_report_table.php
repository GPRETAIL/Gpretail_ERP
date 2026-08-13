<table id="chltkarr" class="table table-striped table-bordered" width="100%">
    <thead>
        <tr class="hideme">
            <th colspan="10" class="text-center"><?= esc($settings['companyname']) ?></th>
        </tr>
        <tr class="hideme text-center">
            <th colspan="10"><?= esc($store['adresse'] ?? '') ?></th>
        </tr>
        <tr class="hideme text-center">
            <th colspan="10">Credit Status Reports from <?= date('d-m-Y', strtotime($start)) ?> Till <?= date('d-m-Y', strtotime($end)) ?></th>
        </tr>
        <tr style="background:#1c76bc;color:#fff;">
            <th>Customer Name</th>
            <th>Sales Man</th>
            <th>Sales Number</th>
            <th>Date</th>
            <th>Credit Days</th>
            <th>Total</th>
            <th>Paid</th>
            <th>Unpaid</th>
            <th>Action</th>
        </tr>
    </thead>
    <tbody>
        <?php $totals = 0; ?>
        <?php foreach ($sales as $sale): ?>
            <?php
                switch ($sale->status) {
                    case 1: $status = 'unpaid'; break;
                    case 2: $status = 'Partiallypaid'; break;
                    default: $status = 'paid';
                }
                $saleDate = date("d-m-Y", strtotime($sale->created_at));
                $unpaid = $sale->total - $sale->paid;
                $totals += $sale->total;
            ?>
            <tr>
                <td><?= esc($sale->clientname) ?></td>
                <td><?= esc($sale->salesperson_name) ?></td>
                <td><?= esc($sale->id) ?></td>
                <td><?= $saleDate ?></td>
                <td><?= esc($sale->creddate) ?></td>
                <td><?= number_format($sale->total, $decimals) ?></td>
                <td><?= number_format($sale->paid, $decimals) ?></td>
                <td><?= number_format($unpaid, $decimals) ?></td>
                <td>
                    <span><?= label($status) ?></span>
                    <a href="javascript:void(0)" onclick="showTicket4('<?= $sale->id ?>')">View</a>
                </td>
            </tr>
        <?php endforeach; ?>
        <tr>
            <td colspan="6"><b>Total Rs.:</b></td>
            <td colspan="3"><?= number_format($totals, $decimals) ?></td>
        </tr>
    </tbody>
</table>
