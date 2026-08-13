<table id="chltkarr" class="table table-striped table-bordered" cellspacing="0" width="100%">
    <thead>
        <tr class="hideme"><th colspan="7" style="text-align:center"><?= esc($company) ?></th></tr>
        <tr class="hideme" style="text-align:center"><th colspan="7"><?= esc($address) ?></th></tr>
        <tr class="hideme" style="text-align:center"><th colspan="7"><?= esc($reportTitle) ?></th></tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th><?= label("Total") . ' ' . label("Bill") ?></th>
            <th><?= label("HSN") . ' ' . label("Name") ?></th>
            <th><?= label("Date") ?></th>
            <th><?= label("NoOfItems") ?></th>
            <th><?= label("MRP") ?></th>
            <th><?= label("Discount") ?></th>
            <th><?= label("Total") . ' ' . label("Amount") ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $billamt = $tottax = $tottaxs = $tottaxi = $discc = $toott = $paidd = 0;
        $db = \Config\Database::connect();

        foreach ($products as $prd):
            $productData = $db->table('products')->where('id', $prd->product_id)->get()->getRowArray();
            $hsn = $productData['hsn'] ?? '';
            $rowTotal = $prd->price * $prd->qqt;

            $taxQuery = $db->table('sale_items')
                ->where('product_id', $prd->product_id)
                ->where('date', $prd->date)
                ->get()->getResultArray();

            $csub2 = $ssub2 = $isub2 = 0;
            foreach ($taxQuery as $tx) {
                $csub2 += ($tx['subtotal2'] * (int)$tx['cgst']) / 100;
                $ssub2 += ($tx['subtotal2'] * $tx['sgst']) / 100;
                $isub2 += ($tx['subtotal2'] * (int)$tx['igstt']) / 100;
            }
        ?>
        <tr>
            <td><?= $prd->bills ?></td>
            <td><?= esc($hsn) ?></td>
            <td><?= date("d-m-Y", strtotime($prd->date)) ?></td>
            <td style="text-align:right"><?= $prd->qqt ?></td>
            <td style="text-align:right"><?= number_format($prd->price, $setting['decimals'], '.', '') ?></td>
            <td style="text-align:right"><?= number_format($prd->ddis_amt, $setting['decimals'], '.', '') ?></td>
            <td style="text-align:right"><?= number_format($rowTotal, $setting['decimals'], '.', '') ?></td>
        </tr>
        <?php
            $billamt += $prd->qqt;
            $tottax += $csub2;
            $tottaxs += $ssub2;
            $tottaxi += $isub2;
            $discc += $prd->ddis_amt;
            $toott += $prd->price;
            $paidd += $rowTotal;
        endforeach;
        ?>
    </tbody>
    <tfoot>
        <tr>
            <td colspan="3"></td>
            <td style="text-align:right"><b><?= $billamt ?></b></td>
            <td></td>
            <td style="text-align:right"><b>Rs. <?= number_format($discc, $setting['decimals'], '.', '') ?></b></td>
            <td style="text-align:right"><b>Rs. <?= number_format($paidd, $setting['decimals'], '.', '') ?></b></td>
        </tr>
    </tfoot>
</table>
