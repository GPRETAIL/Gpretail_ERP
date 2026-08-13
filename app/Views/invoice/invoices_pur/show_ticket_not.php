<div id="stockcontent">
    <div class="col-md-12">
        <table class="table table-striped">
            <thead>
                <tr>
                    <th width="40%"><?= label("Store") ?></th>
                    <th width="30%"><?= label("Quantity") ?></th>
                    <th width="30%"><?= label("Price") ?></th>
                </tr>
            </thead>
            <tbody class="itemslist">
                <?php foreach ($stores as $store): ?>
                    <tr>
                        <td><?= esc($store['name']) ?></td>
                        <td><input id="quantity" store-id="<?= $store['id'] ?>" value="0" type="number"></td>
                        <td><input id="pricestr" store-id="<?= $store['id'] ?>" value="0" type="number"></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

    <div class="col-md-12">
        <table class="table table-striped">
            <thead>
                <tr>
                    <th width="40%"><?= label("Warehouses") ?></th>
                    <th width="30%"><?= label("Quantity") ?></th>
                    <th width="30%"><?= label("Price") ?></th>
                </tr>
            </thead>
            <tbody class="itemslist">
                <?php foreach ($warehouses as $warehouse): ?>
                    <tr>
                        <td><?= esc($warehouse['name']) ?></td>
                        <td><input id="quantityw" warehouse-id="<?= $warehouse['id'] ?>" value="0" type="number"></td>
                        <td><input id="pricew" value="" disabled="true" type="number"></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

    <input id="prodctID" value="<?= esc($product_id) ?>" type="hidden">
</div>