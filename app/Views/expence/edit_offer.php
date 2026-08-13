<div class="container container-small">
    <h3><?= label('Edit'); ?> <a style="float: right;" class="btn btn-primary btn-green" href="<?php echo base_url(); ?>offers"><?= label('Back'); ?></a>

    </h3>
    <hr>






    <?php

    $lmkk = $db->query("select * from offers where of_id='" . $iid . "' ")->getRowArray();
    $prod_dd = $db->query("select * from  products where id='" . $lmkk['of_proid'] . "' ")->getRowArray();

    $attributes = array('id' => 'addform');
    echo form_open_multipart('offers/updateedit/' . $iid, $attributes);
    ?>

    <div class="modal-body">



        <div class="form-group controls">
            <label for="Date"><?= label("Barcode"); ?></label>
            <input type="text" readonly="readonly" value="<?php echo isset($prod_dd['code']) ? $prod_dd['code'] : ''; ?>" class="form-control" />
        </div>
        <div class="form-group controls">
            <label for="Date"><?= label("Products"); ?> *</label>
            <input type="text" maxlength="30" readonly="readonly" name="name" value="<?php echo isset($prod_dd['name']) ? $prod_dd['name'] : ''; ?>" class="form-control" id="name" />
        </div>


        <div class="form-group controls">
            <label for="Date"><?= label("validfrom"); ?> *</label>
            <input type="text" maxlength="30" Required name="of_validfrom" value="<?php echo date("d-m-Y", strtotime($lmkk['of_validfrom'])); ?>" class="form-control" id="of_validfrom" placeholder="<?= label("Date"); ?>">
        </div>


        <div class="form-group controls">
            <label for="Date"><?= label("validtill"); ?> *</label>
            <input type="text" maxlength="30" Required name="of_validtill" value="<?php echo date("d-m-Y", strtotime($lmkk['of_validtill'])); ?>" class="form-control" id="of_validtill" placeholder="<?= label("Date"); ?>">
        </div>


        <div class="form-group controls">
            <label for="Date"><?= label("sellingprice"); ?> *</label>
            <input type="text" maxlength="30" readonly="readonly" name="of_sellingprice" value="<?php echo  $lmkk['of_sellingprice']; ?>" class="form-control" id="of_sellingprice" />
        </div>


        <div class="form-group controls">
            <label for="Date"><?= label("offerprice"); ?> *</label>
            <input type="text" maxlength="30" Required name="of_offerprice" value="<?php echo  $lmkk['of_offerprice']; ?>" class="form-control" id="of_offerprice" />
        </div>



        <div class="form-group">
            <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
        </div>
        <?php echo form_close(); ?>


    </div>


</div>

<script type="text/javascript">
    $(document).ready(function() {

        $('#of_validfrom').datepicker({
            todayHighlight: true,
            autoclose: true

        });

        $('#of_validtill').datepicker({
            todayHighlight: true,
            autoclose: true

        });


    });
</script>