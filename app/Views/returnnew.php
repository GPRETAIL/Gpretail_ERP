<?php
$countid = $_POST['countid'];
$sale_items = $_POST['sals_time'];
$yhe = $countid;
$lkl = $yhe;
$sals_time = isset($sals_time) ? $sals_time : '';

// $yh = explode("/", $yhe);
// $sals_timeexp=explode(":",$sals_time);
$sals_timeexp = $sals_time;
// $sals_timeexp = isset($sals_timeexp) ? $sals_timeexp : $sals_time;

// $sale['id']= isset($yh['0']) ? $yh['0'] : $yhe;
$sale['id'] = $yhe;


$lkmm = $db->query("select themblock from  settings where id=1 ")->getRowArray();

if ($lkmm['themblock'] == 0) {
    $sales = "sales";
    $sale_items = "sale_items";
} else {
    $sales = "dsales";
    $sale_items = "dsale_items";
}

$ret_idd = $lkmm['themblock'];
if ($sale['id'] > 0 && $sals_time != '') {

    $lklf = [];
    $mkm_num = $db->query("SELECT * FROM    sales WHERE id='" . $sale['id'] . "' AND status!=3 AND  HOUR(attime)='" . $sals_timeexp . "'AND  MINUTE(attime)='" . $sals_timeexp . "'  ")->getNumRows();

    //  print_r(mysql_fetch_array(mysql_query("select * from    sales where id='".$sale['id']."' and status!=3 and attime LIKE %$sals_timeexp%")));
    //  $lklf = $this->db->where(['id'=> $sale['id'], 'status !=' => 3])->like('attime', $sals_timeexp)->get('sales')->row_array();

    $sale_id = $sale['id'];

    // First try on "sales" table
    $builder = $db->table('sales');
    $builder->where('id', $sale_id);
    $builder->where('status !=', 3);
    $builder->like('attime', $sals_timeexp);
    $mkm_num = $builder->countAllResults(false); // false keeps the query

    if ($mkm_num == 1) {
        $lklf = $builder->get()->getRowArray();
        $sale_items = "sale_items";
        $ret_idd = 0;
    } else {
        $builder = $db->table('dsales');
        $builder->where('id', $sale_id);
        $builder->where('status !=', 3);
        $builder->like('attime', $sals_timeexp);
        $mkm_num = $builder->countAllResults(false);

        if ($mkm_num == 1) {
            $lklf = $builder->get()->getRowArray();
            $sale_items = "dsale_items";
            $ret_idd = 1;
        }
    }



    $lklfr = isset($lklf['client_id']) ? $lklf['client_id'] : 0;
    $diss = isset($lklf['discount']) ? $lklf['discount'] : 0;
    if ($diss == 0 || $diss == '') {
        $distt = 0;
    } else {
        $dissex = explode("%", $diss);
        $distt = $dissex['0'];
    }

    if ($lklfr > 0) {
        $lklfrg = $db->query("SELECT * FROM customers WHERE id='" . $lklfr . "' ")->getRowArray();
        $lklfrgg = $lklfrg['name'];
    } else {
        $lklfrgg = "Walk in Customer";
    }
}




?>




<div class="modal-dialog" role="document" style="width:900px;">
    <div class="modal-content">

        <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h4 class="modal-title" id="myModalLabel"><?= label("ListOfItems"); ?></h4>



        </div>

        <?php
        if (isset($mkm_num) && intval($mkm_num) == 1) {
            $lkmm = $db->query(" select * from  settings where id=1 ")->getRowArray();
            $themblock = $lkmm['themblock'];

        ?>

            <div class="modal-body" style="padding: 0;">


                <input id="myInput" onkeyup="myFunction()" class="klkl  form-control" placeholder="Search Barcode" type="text">

                <div style="overflow-y: scroll;height: 300px;width: 100%; ">


                    <table id="Table3" class="table table-striped table-bordered" style="    margin-top: 2px;" cellspacing="0" width="100%">
                        <thead>
                            <th class="hidden-xs"><?= label("ProductCode"); ?></th>
                            <th><?= label("Sales No"); ?></th>
                            <th colspan="2"><?= label("Product"); ?></th>

                            <th>Sold Price</th>
                            <th>Sold Qty</th>
                            <th>Return Qty</th>
                            <th>Total</th>
                        </thead>
                        <form method="POST" action="<?php echo base_url(); ?>returns/addre/<?php echo $lkl; ?>">
                            <tbody id="post-data">

                                <?php
                                $immff = 1;
                                $imm = $db->query("select * from  " . $sale_items . "  where sale_id='" . $sale['id'] . "' ")->getResultArray();
                                foreach ($imm as $immf) {
                                    $salid = $immf['id'];
                                    $sale_id = $immf['sale_id'];
                                    $qtyy = $immf['qt'];
                                    $ckkk = $db->query("select * from retunn_items where sl_id='" . $salid . "' and rsaleit_type='" . $ret_idd . "' ")->getResultArray();
                                    foreach ($ckkk as $ckkkf) {
                                        $qtyy = $qtyy - $ckkkf['sl_newqt'];
                                    }

                                    $immffq = $immf['product_id'];
                                    $prod = $db->query("select * from products where id='" . $immffq . "'  ")->getRowArray();
                                ?>
                                    <tr style="cursor: pointer;">
                                        <td class="hidden-xs productcode"><a href="javascript:void(0);"><?= esc($prod['code']) ?></a></td>
                                        <td><?= esc($sale_id) ?></td>
                                        <td colspan="2"><?= esc($prod['name']) ?></td>
                                        <td style="text-align: right;"> <input style="width:100%;" type="hidden" readonly="readonly" id="idd_<?= esc($immff) ?>" name="idd[]" value="<?= esc($salid) ?>" />
                                            <input class="form-control" style="text-align: right;width: 80px;" type="text" readonly="readonly" id="pric_<?= esc($immff) ?>" name="pric_<?= esc($immff) ?>" value="<?= esc($immf['price']) ?>" />
                                        </td>

                                        <td style="text-align: right;" class="hidden-xs"> <input class="form-control" style="width: 60px;text-align: center;" type="text" readonly="readonly" id="qty_<?= esc($immff) ?>" name="qty_<?= esc($immff) ?>" value="<?= esc($qtyy) ?>" /></td>


                                        <td style="text-align: right;" class="hidden-xs">
                                            <input class="form-control" style="width: 60px;text-align: center;" onkeypress="return isNumberKey(event)" onkeyup="getqqtt(this.value,this.id)" type="text" id="retq_<?= esc($immff) ?>" name="retq[]" value="" />
                                        </td>


                                        <td style="text-align: right;" class="hidden-xs"> <input class="form-control" style="text-align: right;width: 120px;" type="text" readonly="readonly" id="stot_<?= esc($immff) ?>" name="stot[]" value="" /></td>
                                    </tr>







                                <?php
                                    $immff++;
                                }
                                ?>



                            </tbody>
                    </table>
                    </form>

                </div>

            </div>

            <div class="modal-footer">




                <div class="panel-body" style="padding: 6px;">
                    <input type="hidden" readonly="readonly" id="numrowc" name="numrowc" value="<?= esc($immff) ?>" />


                    <div class="col-xs-2 nopadding"><span class="textPD"><?= label("SubTotal"); ?></span>
                        <br>
                        <input class="mnm" style="width: 100%;" type="text" readonly="readonly" id="gtot" name="gtot" value="" />
                    </div>


                    <input type="hidden" readonly="readonly" id="discper" name="discper" value="<?= esc($distt) ?>" />

                    <div class="col-xs-2 nopadding"><span class="textPD"><?= label("Discount"); ?></span>
                        <br>
                        <input class="mnm" style="width: 100%;" type="text" readonly="readonly" id="distot" name="distot" value="" />
                    </div>



                    <div class="col-xs-2 nopadding"><span class="textPD"><?= label("Total"); ?></span>
                        <br>
                        <input class="mnm" type="text" readonly="readonly" id="gltot" name="gltot" value="" />
                        <input class="ret_idd" type="hidden" readonly="readonly" id="ret_idd" name="ret_idd" value="<?= esc($ret_idd) ?>" />
                    </div>


                    <div class="col-xs-2 nopadding"><span class="textPD"><?= label("Return"); ?> <?= label("Type"); ?></span>
                        <br>


                        <select class="mnms" name="rrtyp" id="rrtyp">
                            <?php
                            $retunbill = $retunbill;
                            if ($retunbill == 2) {
                            ?>
                                <option value="2"><?= label("Exchange"); ?></option>
                            <?php } else { ?>
                                <option value="1"><?= label("Return"); ?></option>
                            <?php } ?>
                        </select>

                    </div>



                </div>





                <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
                <button id="retiddxz" class="retiddxz" onclick="gauthamm(<?= esc($lklf['id']) ?>);" type="button" class="btn btn-add"><?= label("Submit"); ?> & New</button>
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