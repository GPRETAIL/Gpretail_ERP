<div class="container">
    <div class="row" style="margin-top:20px;">
        <?php
        $customer_tab = $this->db->query("select * from customers where id='" . $myidd . "'  ")->row_array();
        ?>



        <h3 style="text-align: center;margin-top: 0px;">

            <a style="float: left;" class="btn btn-default float-left" href="#" onclick="history.back(-1)">
                <i class="fa fa-arrow-left"></i>
                <?= label("Back"); ?>
            </a>


            <?= label("customerdetails"); ?>



            <?php

            $rolr = $this->user->role;
            $kkar = $this->db->query("select * from permission_new where nname='" . $rolr . "'  ")->row_array();

            if ($kkar['cue'] == 1) { ?>

                <a href="<?php echo base_url(); ?>customers/edit/<?php echo $myidd; ?>" style="float: right;" class="btn   btn-default">
                    <?= label("Edit"); ?></a>

            <?php } ?>

        </h3>
        <hr>
        <div class="col-md-12">
            <div class="col-md-1">
                <img class="img-circle topbar-userpic hidden-xs" src="<?= base_url() . 'assets/img/Avatar.jpg' ?>" width="80px" height="80px">
            </div>
            <div class="col-md-11">
                <h3 style="margin-top: 0px;margin-bottom: 0px;">
                    <?php echo ucfirst($customer_tab['name']); ?>
                    (ID:<?php echo ucfirst($customer_tab['id']); ?>)

                </h3>
                <h5 style="margin-top: 5px;margin-bottom: 5px;"><i class="fa fa-phone " style="color: #1bbc9b;"></i> <?php echo $customer_tab['phone']; ?> </h5>
                <h5> <i class="fa fa-envelope " style="color: #1bbc9b;"></i> <?php echo $customer_tab['email']; ?></h5>
                <h5> <i class="fa fa-map-marker fa-lg " style="color: #1bbc9b;"></i> <?php echo $customer_tab['customeraddress'];    ?></h5>
            </div>


        </div>

        <div class="col-md-12">
            <!-- tab navigation -->
            <?php $tab = (isset($_GET['tab'])) ? $_GET['tab'] : null; ?>
            <ul class="nav nav-tabs">
                <li class="<?php echo ($tab == 'setting') ? 'active' : ''; ?>"><a href="#setting" data-toggle="tab"><i class="fa fa-cog" aria-hidden="true"></i> <b><?= label("Overview"); ?></b></a></li>





                <li class="<?php echo ($tab == 'users') ? 'active' : ''; ?>"><a href="#users" data-toggle="tab"><i class="fa   fa-shopping-cart" aria-hidden="true"></i><b> <?= label("OrderHistory"); ?></b></a></li>




                <li class="<?php echo ($tab == 'rededptions') ? 'active' : ''; ?>"><a href="#rededptions" data-toggle="tab"><i class="fa fa-building" aria-hidden="true"></i> <b><?= label("Rededptions"); ?></b></a></li>

            </ul>

            <!-- tab sections -->
            <div class="tab-content">



                <div class="col-md-6 tab-pane fade in <?php echo ($tab == 'rededptions') ? 'active' : ''; ?>" id="rededptions" style="height: 400px;overflow: auto;">


                    <table id="Table2" class="table table-striped table-bordered" cellspacing="0" width="100%">
                        <thead class="thead-inverse">
                            <tr style="text-align: center;">
                                <th style="padding: 8px;text-align: center;"><?= label('Date'); ?></th>
                                <th style="padding: 8px;text-align: center;"><?= label('Sales ID'); ?></th>
                                <th style="padding: 8px;text-align: center;"><?= label('Redeemed'); ?></th>


                            </tr>

                        <tbody>

                            <?php


                            $query = $this->db->query("SELECT *  FROM redeem_tab where rr_custid='" . $myidd . "' and rr_soldid>0  order by rr_id desc ");
                            $list = $query->result();
                            foreach ($list as $invoice) {
                            ?>
                                <tr role="row" class="odd">
                                    <td style="padding: 8px;text-align: center;"><?php echo date("d-m-Y", strtotime($invoice->rr_datetime)); ?></td>
                                    <td style="padding: 8px;text-align: center;"><?php echo $invoice->rr_soldid; ?></td>
                                    <td style="padding: 8px;text-align: center;"><?php echo $invoice->rr_usedpoint; ?></td>
                                </tr>
                            <?php
                            }
                            ?>
                        </tbody>
                    </table>



                </div>









                <div class="tab-pane fade in <?php echo ($tab == 'users') ? 'active' : ''; ?>" id="users">


                    <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
                        <thead class="thead-inverse">
                            <tr style="text-align: center;">
                                <th style="padding: 8px;"><?= label('Date'); ?></th>
                                <th style="padding: 8px;"><?= label('Number'); ?></th>
                                <th style="padding: 8px;"><?= label('TotalItems'); ?></th>

                                <th style="padding: 8px;"><?= label('Amount'); ?></th>

                                <?php
                                $lxzmm = $this->db->query("select * from settings where id=1 ")->row_array();
                                if ($lxzmm['gst_tax'] == 1) {
                                ?>



                                <?php
                                }
                                if ($lxzmm['disc_all'] == 1) {
                                ?>

                                    <th style="padding: 8px;"><?= label('Discount'); ?></th>
                                <?php
                                }
                                if ($lxzmm['disc_pro'] == 1) {
                                ?>

                                    <th style="padding: 8px;"><?= label('Discount'); ?></th>
                                <?php    } ?>


                                <th style="padding: 8px;"><?= label('Total'); ?></th>
                                <th style="padding: 8px;"><?= label('Customer'); ?></th>
                                <th style="padding: 8px;"><?= label('Createdby'); ?></th>
                                <th style="padding: 8px;"><?= label('Store'); ?></th>

                                <th style="padding: 8px;"><?= label('Status'); ?></th>

                            </tr>

                        <tbody>

                            <?php
                            $lxzmm = $this->db->query(("select * from settings where id=1 "))->row_array();
                            $rolr = $this->user->role;
                            $kkar = $this->db->query(("select * from permission_new where nname='" . $rolr . "'  "))->row_array();

                            $query = $this->db->query("SELECT *  FROM sales where client_id='" . $myidd . "'  order by id desc ");
                            $list = $query->result();
                            foreach ($list as $invoice) {


                                $lkl = $this->db->query(("select * from registers where id='" . $invoice->register_id . "' "))->row_array();

                                $lklx = $this->db->query(("select * from stores where id='" . $lkl['store_id'] . "' "))->row_array();


                            ?>

                                <tr role="row" class="odd">


                                    <td style="padding: 8px;"><?php echo date("d-m-Y", strtotime($invoice->created_at)); ?></td>
                                    <td style="padding: 8px;"><?php echo $invoice->id; ?></td>

                                    <td style="padding: 8px;"><?php echo $invoice->totalitems; ?></td>
                                    <td style="padding: 8px;"><?php echo $invoice->subtotal; ?>


                                        <span style="display: none;">

                                            <?php
                                            $olsdd = mysql_query("select * from sale_items where sale_id='" . $invoice->id . "' ");
                                            while ($olsddf = mysql_fetch_object($olsdd)) {



                                                echo $olsddf->name . " ";
                                            }
                                            ?>

                                        </span>


                                    </td>




                                    <td style="padding: 8px;"><?php echo $invoice->discount_indujul + $invoice->discountamount; ?></td>


                                    <?php

                                    $toral_taxxx = 0;

                                    $reg_ffr = $invoice->register_id;

                                    $reg_ffrf = $this->db->query(("select id,store_id from registers where id='" . $reg_ffr . "'  "))->row_array();
                                    $store_idf = $reg_ffrf['store_id'];
                                    $store_idd = $this->db->query(("select id,name from stores where id='" . $store_idf . "'  "))->row_array();
                                    $stoc_idf = $store_idd['name'];


                                    $mkmmmm = mysql_query("select * from tax_summary where salesid='" . $invoice->id . "' ");
                                    while ($mkmmmmf = mysql_fetch_array($mkmmmm)) {
                                        $toral_taxxx = $toral_taxxx + $mkmmmmf['taxfrom'];
                                    }

                                    switch ($invoice->status) {
                                        case 1: // case Credit Card
                                            $satus = 'unpaid';
                                            break;
                                        case 2: // case ckeck
                                            $satus = 'Partiallypaid';
                                            break;
                                        case 3: // case ckeck
                                            $satus = 'Cancelled';
                                            break;
                                        default:
                                            $satus = 'paid';
                                    }

                                    ?>
                                    <td style="padding: 8px;"><?php echo  number_format((float)$invoice->total, $this->setting->decimals, '.', ''); ?></td>

                                    <td style="padding: 8px;"><?php echo  $invoice->clientname; ?></td>
                                    <td style="padding: 8px;"><?php echo  $invoice->created_by; ?></td>
                                    <td style="padding: 8px;"><?php echo  $stoc_idf; ?></td>

                                    <td style="padding: 8px;"><?php echo  '<span class="' . $satus . '">' . label($satus) . '<span>'; ?></td>
                                </tr>


                            <?php
                            }
                            ?>
                        </tbody>

                    </table>



                </div>

                <div class="tab-pane fade in <?php echo ($tab == 'setting') ? 'active' : ''; ?>" id="setting">
                    <fieldset style="border: 1px solid #e4e3e3;">
                        <legend style="border: 0px black solid;margin-left: 1em;width:auto;color: #1e73be;margin-bottom: 5px;  ">
                            <?= label("CustomerHighlights"); ?>
                        </legend>
                        <?php
                        $count_fromsal = $this->db->query(("select count(*) as cctv,sum(total) as tttoal from sales where client_id='" . $myidd . "'  "))->row_array();

                        $visit_fromsal = $this->db->query(("select  client_id,attime,id  from sales where client_id='" . $myidd . "' order by id desc  "))->row_array();
                        $visit_tillfromsal = $this->db->query(("select  client_id,attime,id  from sales where client_id='" . $myidd . "' order by id asc  "))->row_array();
                        $diff = isset($visit_tillfromsal['attime']) ? strtotime($visit_tillfromsal['attime']) - strtotime($visit_fromsal['attime']) : 0;
                        $diffc = intval(abs(round(($diff / 86400)) / floatval($count_fromsal['cctv'] - 1)));

                        $mcolor = "#13b912";
                        ?>


                        <div class="form-group col-md-4">
                            <h2 style="text-align: center;color: <?php echo $mcolor; ?>;margin: 0px 0px 0px 0px;"><?php echo $count_fromsal['cctv']; ?> </h2>
                            <h4 style="text-align: center;margin-top: 0px;"><?= label("Orders"); ?></h4>
                        </div>

                        <div class="form-group col-md-4">
                            <h2 style="text-align: center;color: <?php echo $mcolor; ?>;margin: 0px 0px 0px 0px;"><?php $avgg = ($count_fromsal['cctv'] != 0 && $count_fromsal['tttoal']) ? $count_fromsal['tttoal'] / $count_fromsal['cctv'] : 0;
                                                                                                                    echo number_format((float)$avgg, $this->setting->decimals, '.', '');
                                                                                                                    ?> </h2>
                            <h4 style="text-align: center;margin-top: 0px;"><?= label("AverageAmount"); ?></h4>
                        </div>

                        <div class="form-group col-md-4">
                            <h2 style="text-align: center;color: <?php echo $mcolor; ?>;margin: 0px 0px 0px 0px;"> <?php $tottall = $count_fromsal['tttoal'];
                                                                                                                    echo number_format((float)$tottall, $this->setting->decimals, '.', '');
                                                                                                                    ?></h2>
                            <h4 style="text-align: center;margin-top: 0px;"><?= label("StoreCredit"); ?></h4>
                        </div>






                        <div class="form-group col-md-4">
                            <h2 style="text-align: center;color: <?php echo $mcolor; ?>;margin: 0px 0px 0px 0px;"> <?php

                                                                                                                    if (isset($visit_fromsal['attime']) && $visit_fromsal['attime'] != '') {
                                                                                                                        echo  date("d-m-Y", strtotime($visit_fromsal['attime']));
                                                                                                                    } else {
                                                                                                                        echo "----";
                                                                                                                    }

                                                                                                                    ?></h2>

                            <h4 style="text-align: center;margin-top: 0px;"><?= label("LastVisit"); ?></h4>
                        </div>






                        <div class="form-group col-md-4">
                            <h2 style="text-align: center;color: <?php echo $mcolor; ?>;margin: 0px 0px 0px 0px;"> <?php



                                                                                                                    echo  $diffc;

                                                                                                                    ?></h2>

                            <h4 style="text-align: center;margin-top: 0px;"><?= label("AverageVisit"); ?></h4>
                        </div>






                        <div class="form-group col-md-4">
                            <h2 style="text-align: center;color: <?php echo $mcolor; ?>;margin: 0px 0px 0px 0px;"><?php
                                                                                                                    $cared_on = $this->db->query(("select count(*) as ddd from redeem_tab where rr_custid='" . $myidd . "'  and rr_soldid>0 "))->row_array();
                                                                                                                    echo  $cared_on['ddd']; ?></h2>

                            <h4 style="text-align: center;margin-top: 0px;"><?= label("Cardsonfile"); ?></h4>
                        </div>

                    </fieldset>

                    <br>

                    <fieldset style="border: 1px solid #e4e3e3;">
                        <legend style="border: 0px black solid;margin-left: 1em;width:auto;color: #1e73be;margin-bottom: 5px;  ">Reward Status</legend>



                        <?php
                        $ct_month = $this->setting->ct_month;
                        $min_ponint = $this->setting->min_ponint;
                        $customer = $this->db->query(("select *,sum(avail_point) as avlppit from sales where client_id='" . $myidd . "'  and attime > DATE_SUB(now(), INTERVAL '" . $ct_month . "' MONTH) "))->row_array();

                        $amtt = 0;
                        $inser = 0;
                        $amtt = $customer['avlppit'];
                        ?>
                        <div class="form-group col-md-4">
                            <h2 style="text-align: center;color: <?php echo $mcolor; ?>;margin: 0px 0px 0px 0px;">
                                <?php
                                echo !empty($amtt) ? round($amtt) : 0; ?></h2>
                            <h4 style="text-align: center;margin-top: 0px;"><?= label("AvailablePoints"); ?></h4>
                        </div>







                        <div class="form-group col-md-4">
                            <h2 style="text-align: center;color: <?php echo $mcolor; ?>;margin: 0px 0px 0px 0px;"><?php
                                                                                                                    echo $customer_tab['tot_creaditpoint']; ?></h2>

                            <h4 style="text-align: center;margin-top: 0px;"><?= label("LifeTimePoints"); ?></h4>
                        </div>



                        <div class="form-group col-md-4">
                            <h2 style="text-align: center;color: <?php echo $mcolor; ?>;margin: 0px 0px 0px 0px;">
                                <?php
                                $totredeem_on = $this->db->query(("select sum(rr_usedpoint) as ddd from redeem_tab where rr_custid='" . $myidd . "'  and rr_soldid>0 "))->row_array();
                                echo  $totredeem_on['ddd']; ?>
                            </h2>
                            <h4 style="text-align: center;margin-top: 0px;"><?= label("TotalRedeemedPoints"); ?></h4>
                        </div>




                        <div class="form-group col-md-4">
                            <h2 style="text-align: center;color: <?php echo $mcolor; ?>;margin: 0px 0px 0px 0px;">
                                <?php
                                $totredeem_tion = $this->db->query(("select count(*) as ddd from redeem_tab where rr_custid='" . $myidd . "'  and rr_soldid>0 "))->row_array();
                                echo  $totredeem_tion['ddd']; ?>
                            </h2>
                            <h4 style="text-align: center;margin-top: 0px;"><?= label("Rededptions"); ?></h4>
                        </div>








                        <div class="form-group col-md-4">
                            <h2 style="text-align: center;color: <?php echo $mcolor; ?>;margin: 0px 0px 0px 0px;">
                                <?php
                                $lastt_tion = $this->db->query("select * from redeem_tab where rr_custid='" . $myidd . "'  and rr_soldid>0 order by rr_id desc");
                                if ($lastt_tion->num_rows() == 0) {
                                    echo "---";
                                } else {

                                    $lastt_tionf = $lastt_tion->row_array();
                                    echo  date("d-m-Y", strtotime($lastt_tionf['rr_datetime']));
                                }

                                ?>
                            </h2>
                            <h4 style="text-align: center;margin-top: 0px;"><?= label("LastRededptions"); ?></h4>
                        </div>

                    </fieldset>
                </div>