<style>
    input[type=checkbox] {
        display: block;
    }
</style>

<table id="table" class="table table-striped table-bordered dataTable no-footer" role="grid" style="width: 50%;" width="50%" cellspacing="0">
    <thead class="thead-inverse">
        <tr role="row">
            <th><?= label("Menu"); ?></th>
            <th><?= label("View"); ?></th>
            <th><?= label("Add"); ?></th>
            <th><?= label("Edit"); ?></th>
            <th><?= label("Delete"); ?></th>
        </tr>
    </thead>
    <tbody>
        <?php
        $modules = [
            'ss' => 'Sales',
            'qt' => 'Quotation',
            'pu' => 'Purchase',
            'exc' => 'Expense Type',
            'exx' => 'Expense',
            'com' => 'Combo Offers',
            'off' => 'Offers',
            'br' => 'Brand',
            'caa' => 'Category',
            'tax' => 'Tax',
            'cu' => 'Customer',
            'su' => 'Supplier',
            'pr' => 'Product',
            'prin' => 'Initial Stock',
            'promo' => 'Price Method',
            'propr' => 'Price Price',
            'promrp' => 'Price MRP',
            'pay' => 'PaymentMethod',
            'roles' => 'Roles',
            'ph' => 'Physical Stock',
            'go' => 'GoodsOut',
            'salret' => 'Sales Return',
            're' => 'Reports',
            'prden' => 'Production Entry',
            'st' => 'StockTransfer',
            'tallypur' => 'Sales Tally Purchase',
            'tallypurlog' => 'Tally Purchase Log',
            'tallysale' => 'Tally Sales',
            'tallysalelog' => 'Tally Sales Log',
            'tallyupallv' => 'Tally Update All',
        ];

        foreach ($modules as $key => $label) :
            $viewKey = $key . 'v';
            $addKey = $key . 'a';
            $editKey = $key . 'e';
            $deleteKey = $key . 'd';

            // Skip if not enabled by settings (combo/offr/tallyy)
            if (
                ($key == 'com' && $setting->combo != 1) ||
                ($key == 'off' && $setting->ooffr != 1) ||
                (str_starts_with($key, 'tally') && $setting->tallyy != 1)
            ) {
                continue;
            }
        ?>
            <tr>
                <td><?= label($label); ?></td>
                <td><input <?= !empty($oyu[$viewKey]) ? 'checked' : ''; ?> type="checkbox" name="<?= $viewKey; ?>" value="1"></td>
                <td><input <?= !empty($oyu[$addKey]) ? 'checked' : ''; ?> type="checkbox" name="<?= $addKey; ?>" value="1"></td>
                <td><input <?= !empty($oyu[$editKey]) ? 'checked' : ''; ?> type="checkbox" name="<?= $editKey; ?>" value="1"></td>
                <td><input <?= !empty($oyu[$deleteKey]) ? 'checked' : ''; ?> type="checkbox" name="<?= $deleteKey; ?>" value="1"></td>
            </tr>
        <?php endforeach; ?>
    </tbody>
</table>