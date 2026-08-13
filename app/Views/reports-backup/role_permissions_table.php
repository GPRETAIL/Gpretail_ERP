<table id="table" class="table table-striped table-bordered" style="width: 50%;" cellspacing="0">
    <thead>
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
        function permRow($label, $prefix, $permissions, $add = true, $edit = true, $delete = true) {
            echo "<tr><td>" . label($label) . "</td>";
            echo '<td><input type="checkbox" name="' . $prefix . 'v" value="1" ' . (isset($permissions[$prefix . 'v']) && $permissions[$prefix . 'v'] == 1 ? 'checked' : '') . '></td>';
            echo $add ? '<td><input type="checkbox" name="' . $prefix . 'a" value="1" ' . (isset($permissions[$prefix . 'a']) && $permissions[$prefix . 'a'] == 1 ? 'checked' : '') . '></td>' : '<td>&nbsp;</td>';
            echo $edit ? '<td><input type="checkbox" name="' . $prefix . 'e" value="1" ' . (isset($permissions[$prefix . 'e']) && $permissions[$prefix . 'e'] == 1 ? 'checked' : '') . '></td>' : '<td>&nbsp;</td>';
            echo $delete ? '<td><input type="checkbox" name="' . $prefix . 'd" value="1" ' . (isset($permissions[$prefix . 'd']) && $permissions[$prefix . 'd'] == 1 ? 'checked' : '') . '></td>' : '<td>&nbsp;</td>';
            echo "</tr>";
        }

        permRow("Sales", "ss", $permissions);
        permRow("Quotation", "qt", $permissions);
        permRow("Purchase", "pu", $permissions);
        permRow("Expense Type", "exc", $permissions);
        permRow("Expense", "exx", $permissions);
        permRow("Brand", "br", $permissions);
        permRow("Category", "caa", $permissions);
        permRow("Tax", "tax", $permissions);
        permRow("Supplier", "su", $permissions);
        permRow("Product", "pr", $permissions);
        permRow("Initial Stock", "prin", $permissions, false, false, false);
        permRow("Price Method", "promo", $permissions, false, false, false);
        permRow("Price Price", "proprp", $permissions, false, false, false);
        permRow("Price MRP", "promrpp", $permissions, false, false, false);
        permRow("Payment Method", "pay", $permissions);
        permRow("Customer", "cu", $permissions);
        permRow("Roles", "roles", $permissions, true, true, false);
        permRow("Physical Stock", "ph", $permissions);
        permRow("GoodsOut", "go", $permissions);
        permRow("Sales Return", "salret", $permissions, false, false, false);
        permRow("Reports", "re", $permissions, false, false, false);
        permRow("Production Entry", "prden", $permissions);
        permRow("StockTransfer", "st", $permissions, false, false, false);

        if (isset($setting->combo) && $setting->combo == 1) {
            permRow("Combo Offers", "com", $permissions, true, false, true);
        }

        if (isset($setting->ooffr) && $setting->ooffr == 1) {
            permRow("Offers", "off", $permissions, true, true, false);
        }

        if (isset($setting->tallyy) && $setting->tallyy == 1) {
            permRow("Tally Purchase", "tallypur", $permissions, false, false, false);
            permRow("Tally Purchase Log", "tallypurlog", $permissions, false, false, false);
            permRow("Tally Sales", "tallysale", $permissions, false, false, false);
            permRow("Tally Sales Log", "tallysalelog", $permissions, false, false, false);
            permRow("Tally Update All", "tallyupallv", $permissions, false, false, false);
        }
        ?>
    </tbody>
</table>
