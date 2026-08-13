<div class="container">

    <div class="">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="ticket"><?= label("StockTransfer"); ?></h4>
    </div>
    <?php
    $attributes = array('id' => 'addformkk');
    echo form_open_multipart('purchase/add_mul', $attributes);
    ?>
    <div class="row">

        <div class="col-sm-12">
            <div class="col-sm-2">
                <div class="form-group">
                    <label for="Category"><?= label("Store"); ?></label>
                    <select class="form-control" name="store_1" id="store_1">
                        <?php
                        $mkxcc = $this->db->query("SELECT * FROM   stores ORDER BY name ASC LIMIT 100 ");
                        $mkxccf = ($mkxcc->result());
                        foreach ($mkxccf as $row) {
                        ?>
                            <option value="<?= $row->id; ?>"><?= $row->name; ?></option>
                        <?php
                        } ?>
                    </select>
                </div>
            </div>
        </div>
        <div class="panel-body" style="padding: 1px;">
            <div class="col-sm-2">
                <div class="form-group">
                    <input type="hidden" name="countid_exp" id="countid_exp" value="1">
                    <label for="Category"><?= label("Warehouses"); ?></label>
                    <select class="form-control" name="warehouse[]" id="warehouse_1">
                        <?php
                        $mkxcc = $this->db->query("select * from   warehouses order by name asc   ");
                        $mkxccf = ($mkxcc->result());
                        foreach ($mkxccf as $row) {
                        ?>
                            <option value="<?= $row->id; ?>"><?= $row->name; ?></option>
                        <?php
                        } ?>
                    </select>
                </div>
            </div>
            <div class="col-sm-2">
                <div class="form-group">
                    <label for="Category"><?= label("Brand"); ?></label>
                    <select class="form-control" name="brand[]" id="brand_1" onchange="ger_subcatmmkk(this.value,this.id,1);">
                        <option value="0">select</option>
                        <?php
                        $mkxcc = $this->db->query("select * from   brand order by name   ");
                        $mkxccf = ($mkxcc->result());
                        foreach ($mkxccf as $row) {
                        ?>
                            <option value="<?= $row->id; ?>"><?= $row->name; ?></option>
                        <?php
                        } ?>
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
                    <label for="Category"> Avl QTY</label>

                    <input type="text" readonly name="avlqty[]" class="form-control" id="avlqty_1" />

                </div>
            </div>

            <div class="col-sm-2">
                <div class="form-group">
                    <label for="Amount"><?= label("Transferqt"); ?></label>
                    <input type="text" step="any" name="transty[]" class="form-control" id="transty_1" />
                </div>
            </div>


        </div>

        <div id="education_fields_exp">
        </div>


        <div class="panel-body" style="padding:1px;">
            <div class="col-sm-10">
                &nbsp;
            </div>
            <div class="col-sm-1 ">
                <button id="addMoreRows_exp" style="margin: 0px -29px 0px 0px;" class="btn btn-success" type="button" onclick="education_fields_exp();"> <span class="glyphicon glyphicon-plus" aria-hidden="true"></span> </button>
            </div>
        </div>
    </div>
    <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
        <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
    </div>
    <?php echo form_close(); ?>
    <div class="modal-footer">
        <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label("Close"); ?></button>


    </div>

</div>