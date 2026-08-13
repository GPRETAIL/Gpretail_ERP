<?php

$yhe = $_POST['countid'];
$yh = explode("/", $yhe);
$lkl = $yh['0'];
$lxzmm = $db->query("select * from settings where id=1 ")->getRowArray();
if ($lxzmm['themblock'] == 0) {
    $sales = "sales";
    $sale_items = "sale_items";
    $returnss = "returnss";
    $retunn_items = "retunn_items";
} else {
    $sales = "dsales";
    $sale_items = "dsale_items";
    $returnss = "returnss";
    $retunn_items = "retunn_items";
}
$mkm_num = $db->query("select * from    " . $sales . " where id='" . $lkl . "' and status!=3 ")->getNumRows();

$lklf = $db->query("select * from    " . $sales . " where id='" . $lkl . "' and status!=3 ")->getRowArray();
$lklfr = $lklf['client_id'];
$diss = $lklf['discount'];
if ($diss == 0 || $diss == '') {
    $distt = 0;
} else {
    $dissex = explode("%", $diss);
    $distt = $dissex['0'];
}

if ($lklfr > 0) {
    $lklfrg = $db->query("select * from customers where id='" . $lklfr . "' ")->getRowArray();
    $lklfrgg = $lklfrg['name'];
} else {
    $lklfrgg = "Walk in Customer";
}





?>




<div class="modal-dialog" role="document" style="width:700px;">
    <div class="modal-content">

        <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h4 class="modal-title" id="myModalLabel"><?= label("ListOfItems"); ?></h4>



        </div>

        <?php
        if (intval($mkm_num) == 1) {


            $lkmm = $db->query(" select * from  settings where id=1 ")->getRowArray();
            $themblock = $lkmm['themblock'];
            if ($themblock == 0) {
                $lkmm_nm = $db->query(" select * from  dsales where sales_org_id='" . $request->getPost('countid') . "' ")->getNumRows();
                if ($lkmm_nm > 0) {
                    echo "Sorry, Unable to return...";
                    exit;
                }
            }
        ?>

            <div class="modal-body" style="padding: 0;">

                <div class="col-xs-2 table-header">
                    <h3><?= label("Product"); ?></h3>
                </div>

                <div class="col-xs-2 table-header">
                    <h3><?= label("price"); ?></h3>
                </div>

                <div class="col-xs-2 table-header nopadding">
                    <h3 class="text-left"><?= label("Purchase"); ?><br> Qty</h3>
                </div>


                <div class="col-xs-1 table-header">
                    <h3><?= label("Return"); ?><br> Qty</h3>
                </div>


                <div class="col-xs-3 table-header nopadding">
                    <h3><?= label("Total"); ?></h3>
                </div>

            </div>





            <form method="POST" action="<?php echo base_url(); ?>returns/addre/<?php echo $lkl; ?>">
                <div class="modal-body" style="padding: 0;">
                    <?php
                    $immff = 1;
                    $imm = $db->query("select * from " . $sale_items . " where sale_id='" . $lkl . "' ")->getResultArray();
                    foreach ($imm as $immf) {
                        $salid = $immf['id'];
                        $qtyy = $immf['qt'];
                        $ckkk = $db->query("select * from " . $retunn_items . " where sl_id='" . $salid . "' and rsaleit_type='" . $lxzmm['themblock'] . "' ")->getResultArray();
                        foreach ($ckkk as $ckkkf) {
                            $qtyy = $qtyy - $ckkkf['sl_newqt'];
                        }




                        $immffq = $immf['product_id'];
                        $prod = $db->query("select * from products where id='" . $immffq . "'  ")->getRowArray();

                    ?>
                        <div class="col-xs-12">
                            <div class="panel panel-default product-details">
                                <div class="panel-body" style="padding: 6px;">


                                    <div class="col-xs-2 nopadding"><span class="textPD"><?php echo $prod['name']; ?></span></div>

                                    <div class="col-xs-2">
                                        <input style="width:100%;" type="hidden" readonly="readonly" id="idd_<?php echo $immff; ?>" name="idd[]" value="<?php echo $salid; ?>" />
                                        <input class="form-control" style="width:100%;" type="text" readonly="readonly" id="pric_<?php echo $immff; ?>" name="pric_<?php echo $immff; ?>" value="<?php echo $immf['price']; ?>" />
                                    </div>

                                    <div class="col-xs-2 nopadding ">

                                        <input class="form-control" style="width:100%;" type="text" readonly="readonly" id="qty_<?php echo $immff; ?>" name="qty_<?php echo $immff; ?>" value="<?php echo $qtyy; ?>" />


                                    </div>

                                    <div class="col-xs-1 padding ">
                                        <input class="form-control" style="width:100%;" onkeypress="return isNumberKey(event)" onkeyup="getqqtt(this.value,this.id)" type="text" id="retq_<?php echo $immff; ?>" name="retq[]" value="" />
                                    </div>


                                    <div class="col-xs-3 nopadding ">
                                        <input class="form-control" style="width:100%;" type="text" readonly="readonly" id="stot_<?php echo $immff; ?>" name="stot[]" value="" />
                                    </div>


                                </div>
                            </div>
                        </div>

                    <?php
                        $immff++;
                    }
                    ?>





                    <div class="modal-footer">
                        <br><br>
                        <input type="hidden" readonly="readonly" id="numrowc" name="numrowc" value="<?php echo $immff; ?>" />
                        <?= label("SubTotal"); ?> <input class="mnm" type="text" readonly="readonly" id="gtot" name="gtot" value="" />
                        <br><br>
                        <input type="hidden" readonly="readonly" id="discper" name="discper" value="<?php echo $distt; ?>" />
                        <?= label("Discount"); ?> <input class="mnm" type="text" readonly="readonly" id="distot" name="distot" value="" />
                        <br><br>
                        <?= label("Total"); ?> <input class="mnm" type="text" readonly="readonly" id="gltot" name="gltot" value="" />
                        <br><br>

                        <?= label("Return"); ?> <?= label("Type"); ?> <select class="mnms" name="rrtyp" id="rrtyp">

                            <option value="1"><?= label("Amount"); ?></option>
                        </select>
                        <br><br>


                        <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
                        <button onclick="gauthamm(<?php echo  $lklf['id']; ?>);" type="button" class="btn btn-add"><?= label("Submit"); ?></button>
                    </div>
                </div>
            </form>

        <?php } else { ?>


            <div class="modal-footer">
                <br><br>




                <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>


            </div>
    </div>
    </form>




<?php } ?>
</div>







<style type="text/css">
    .mnm {
        border-radius: 4px;
        padding: 6px 12px;
        background-color: #eee;
        text-align: center;
        width: 160px;
        margin: 0px 7px 0px 15px;
        height: 32px;
        border: 1px solid #ccc;
    }

    .mnms {
        border-radius: 4px;
        padding: 6px 12px;
        text-align: center;
        width: 160px;
        margin: 0px 7px 0px 15px;
        height: 32px;
        border: 1px solid #ccc;
    }
</style>


<!--  <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script> -->

<?php
exit;
?>