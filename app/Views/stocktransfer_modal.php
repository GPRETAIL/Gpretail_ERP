<div class="container">
    <?php
    // Use passed-in $user from controller instead of $this->user
    $rolr = $user->role;
    $db = \Config\Database::connect();
    $kkar = $db->query("SELECT * FROM permission_new WHERE nname='" . $rolr . "'")->getRowArray();
    ?>

    <hr>

    <div class="container">
        <?php
        $attributes = array('id' => 'addformkk', 'onsubmit' => 'refreshPage(event)');
        echo form_open_multipart('purchase/add_mul', $attributes);
        ?>

        <div class="panel-body" style="padding: 10px;">
            <div class="row">
                <div class="col-sm-2">
                    <div class="form-group">
                        <label for="Category"><?= label("Warehouses"); ?></label>
                        <select class="form-control" name="warehouse[]" id="warehouse_1">
                            <?php
                            $warehouses = $db->query("SELECT * FROM warehouses ORDER BY name ASC")->getResult();
                            foreach ($warehouses as $row) {
                            ?>
                                <option value="<?= $row->id; ?>"><?= $row->name; ?></option>
                            <?php } ?>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-sm-2">
                    <div class="form-group">
                        <label for="Category"><?= label("Store"); ?></label>
                        <select class="form-control" name="store_1" id="store_1" onchange="updateBrands(this.value, 1)">
                            <?php
                            $stores = $db->query("SELECT * FROM stores ORDER BY name ASC LIMIT 100")->getResult();
                            foreach ($stores as $row) {
                            ?>
                                <option value="<?= $row->id; ?>"><?= $row->name; ?></option>
                            <?php } ?>
                        </select>
                    </div>
                </div>
                <div class="col-sm-2">
                    <div class="form-group">
                        <label for="Category"><?= label("Brand"); ?></label>
                        <select class="form-control" name="brand[]" id="brand_1" onchange="updateProductsAndQty(this.value, 1);">
                            <option value="0">Select</option>
                            <?php
                            $brands = $db->query("SELECT * FROM brand ORDER BY name ASC")->getResult();
                            foreach ($brands as $row) {
                            ?>
                                <option value="<?= $row->id; ?>"><?= $row->name; ?></option>
                            <?php } ?>
                        </select>
                    </div>
                </div>
                <div class="col-sm-3">
                    <div class="form-group">
                        <label for="Category"><?= label("Product"); ?></label>
                        <select class="form-control" name="dishname[]" id="dishname_1" onchange="alqtcheck(this.value,this.id,1);">
                            <option value="0">Select</option>
                        </select>
                    </div>
                </div>
                <div class="col-sm-2">
                    <div class="form-group">
                        <label for="Category">Avl QTY</label>
                        <input type="text" readonly name="avlqty[]" class="form-control" id="avlqty_1" />
                    </div>
                </div>
                <div class="col-sm-2">
                    <div class="form-group">
                        <label for="Amount"><?= label("Transfer QTY"); ?></label>
                        <input type="number" step="any" name="transty[]" class="form-control" id="transty_1" />
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-sm-1">
                    <button id="addMoreRows_exp" class="btn btn-success" type="button" onclick="education_fields_exp();"> 
                        <span class="glyphicon glyphicon-plus" aria-hidden="true"></span> 
                    </button>
                </div>
            </div>
            
            <div id="education_fields_exp"></div>
            
            <div class="row" style="margin-top: 20px;">
                <div class="col-md-11">
                    <button type="submit" class="btn btn-add float-right"><?= label("Submit"); ?></button>
                </div>
            </div>
        </div>

        <?php echo form_close(); ?>
    </div>
</div>
