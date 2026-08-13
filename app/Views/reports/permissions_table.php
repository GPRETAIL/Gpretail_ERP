<table id="table" class="table table-striped table-bordered dataTable no-footer" role="grid" style="width: 50%;" cellspacing="0">
    <thead class="thead-inverse">
        <tr>
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
            'Sales' => ['ssv', 'ssa', 'sse', 'ssd'],
            'Quotation' => ['qtv', 'qta', 'qte', 'qtd'],
            'Purchase' => ['puv', 'pua', 'pue', 'pud'],
            'Expense Type' => ['excv', 'exca', 'exce', 'excd'],
            'Expense' => ['exxv', 'exxa', 'exxe', 'exxd'],
            'Combo Offers' => ['comv', 'coma', '', 'comd'],
            'Offers' => ['offv', 'offa', 'offe', ''],
            'Brand' => ['brv', 'bra', 'bre', 'brd'],
            'Category' => ['caav', 'caaa', 'caae', 'caad'],
            'Tax' => ['taxv', 'taxa', 'taxe', 'taxd'],
            'Supplier' => ['suv', 'sua', 'sue', 'sud'],
            'Customer' => ['cuv', 'cua', 'cue', 'cud'],
            'Roles' => ['rolesv', 'rolesa', 'rolese', ''],
            'Physical Stock' => ['phv', 'pha', 'phe', 'phd'],
            'GoodsOut' => ['gov', 'goa', 'goe', 'god'],
            'Sales Return' => ['salretv', '', '', ''],
            'Reports' => ['rev', '', '', ''],
            'Production Entry' => ['prdenv', 'prdena', 'prdene', 'prdend'],
            'StockTransfer' => ['stv', '', '', ''],
            'Initial Stock' => ['prinv', '', '', ''],
            'Price Method' => ['promov', '', '', ''],
            'Price Price' => ['proprp', '', '', ''],
            'Price MRP' => ['promrpp', '', '', ''],
            'Payment Method' => ['payv', 'paya', 'paye', 'payd']
        ];

        foreach ($modules as $label => $keys): ?>
            <tr>
                <td><?= label($label); ?></td>
                <?php foreach ($keys as $key): ?>
                    <td>
                        <?php if ($key): ?>
                            <input type="checkbox" name="<?= esc($key) ?>" value="1"
                                <?= isset($permissions[$key]) && $permissions[$key] == 1 ? 'checked' : '' ?> />
                        <?php else: ?>
                            &nbsp;
                        <?php endif; ?>
                    </td>
                <?php endforeach; ?>
            </tr>
        <?php endforeach; ?>

        <?php if ($setting->tallyy == 1): ?>
            <?php
            $tallyModules = [
                'SalesTally Purchase' => 'tallypur',
                'Tally Purchase Log' => 'tallypurlog',
                'Tally Sales' => 'tallysale',
                'Tally Sales Log' => 'tallysalelog',
                'Tally Update All' => 'tallyupallv'
            ];
            foreach ($tallyModules as $label => $key): ?>
                <tr>
                    <td><?= label($label); ?></td>
                    <td><input type="checkbox" name="<?= $key ?>" value="1"
                            <?= isset($permissions[$key]) && $permissions[$key] == 1 ? 'checked' : '' ?> /></td>
                    <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                </tr>
            <?php endforeach; ?>
        <?php endif; ?>
    </tbody>
</table>
