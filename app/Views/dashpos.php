<div class="container">



    <?php if ($user->role === "admin") {
    ?>
        <h3><?= label('Dashboard'); ?>
            <div style="float: right; display: inline-block;">

                <li class="dropdown" style="list-style: none;">
                    <a href="#" class="dropdown-toggle flat-box" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false"><i style="font-size: 17px;color:#1e73be; margin-right:3px;" class="fa fa-cogs"></i><span class="caret"></span></a>
                    <ul class="dropdown-menu  ">

                        <li class="flat-box">
                            <a href="<?= base_url() ?>categories/chageitt/1" class="check-filter">
                                <input style="display:inline-block;" <?php if ($user->d_s_re == 0) { ?> checked="checked" <?php } ?> type="checkbox" name="d_s_re" value="1">
                                <?= label("Sales"); ?>
                            </a>
                        </li>

                        <li class="flat-box">
                            <a href="<?= base_url() ?>categories/chageitt/2" class="check-filter">
                                <input style="display:inline-block;" <?php if ($user->d_p_re == 0) { ?> checked="checked" <?php } ?> type="checkbox" name="d_p_re" value="1">
                                <?= label("Purchase"); ?>
                            </a>
                        </li>

                        <li class="flat-box">
                            <a href="<?= base_url() ?>categories/chageitt/3" class="check-filter">
                                <input style="display:inline-block;" <?php if ($user->m_s_re == 0) { ?> checked="checked" <?php } ?> type="checkbox" name="m_s_re" value="1">
                                <?= label('Monthly'); ?> <?= label('Sales'); ?>
                            </a>
                        </li>

                        <li class="flat-box">
                            <a href="<?= base_url() ?>categories/chageitt/4" class="check-filter">
                                <input style="display:inline-block;" <?php if ($user->m_p_re == 0) { ?> checked="checked" <?php } ?> type="checkbox" name="m_p_re" value="1">
                                <?= label('Monthly'); ?> <?= label('Purchase'); ?>
                            </a>
                        </li>

                    </ul>

                </li>
            </div>






        </h3>
        <script type="text/javascript" src="<?php echo base_url(); ?>public/assets/loader.js"></script>
        <hr>

        <?php
        $arr = array();
        $ddat = date("Y-m-d");
        $from_date = date("Y-m-d", strtotime('-7 day', strtotime($ddat)));
        $till_date = date("Y-m-d", strtotime($ddat));



        $lkmm = $db->query(" select * from  settings where id=1 ")->getRowArray();


        if ($lkmm['themblock'] == 0) {
            $sales = "sales";
        } else {
            $sales = "dsales";
        }
        $ret_idd = $lkmm['themblock'];


        //sales start
        $arrv = array("Days", "");
        array_push($arr, $arrv);
        while (strtotime($from_date) <= strtotime($till_date)) {

            $sal_count = $db->query("SELECT SUM(total) AS count,created_at FROM " . $sales . " WHERE status!=3 and created_at='" . $from_date . "' GROUP BY created_at ORDER BY created_at")->getRowArray();
            $pur_count = $db->query("SELECT SUM(total) as count,date FROM purchases where date='" . $from_date . "' GROUP BY date ORDER BY date")->getRowArray();

            $ret_count = $db->query("SELECT SUM(tootal) as count,todate FROM returnss where    rsale_type='" . $ret_idd . "' AND  todate='" . $from_date . "' GROUP BY todate ORDER BY todate")->getRowArray();




            $date_for = date("d", strtotime($from_date));


            // Check if sal_count and ret_count are set and not empty
            if (isset($sal_count['count']) && isset($ret_count['count']) && !empty($sal_count['count']) && !empty($ret_count['count'])) {
                $date_for = date("d", strtotime($from_date));
                $point1 = array($date_for, intval($sal_count['count'] - $ret_count['count']));
                array_push($arr, $point1);
            }


            $from_date = date("Y-m-d", strtotime("+1 day", strtotime($from_date)));
        }
        $kmk = json_encode($arr);
        //sales end


        //purchase start
        $arrp = array();
        $ddat = date("Y-m-d");
        $from_date = date("Y-m-d", strtotime('-10 day', strtotime($ddat)));
        $till_date = date("Y-m-d", strtotime($ddat));
        $arrpd = array("Days", "");
        array_push($arrp, $arrpd);
        while (strtotime($from_date) <= strtotime($till_date)) {
            $sal_count = $db->query("SELECT SUM(total) as count,created_at FROM " . $sales . " where created_at='" . $from_date . "' GROUP BY created_at ORDER BY created_at")->getRowArray();
            $pur_count = $db->query("SELECT SUM(total) as count,date FROM purchases where date='" . $from_date . "' GROUP BY date ORDER BY date")->getRowArray();
            $date_for = date("d", strtotime($from_date));


            // Check if sal_count and ret_count are set and not empty
            if (isset($pur_count['count']) &&  !empty($pur_count['count'])) {
                $point1 = array($date_for, intval($pur_count['count']));
                array_push($arrp, $point1);
            }



            $from_date = date("Y-m-d", strtotime("+1 day", strtotime($from_date)));
        }
        $kmkp = json_encode($arrp);
        //purchase end

        //sales monthly report start
        $arr_sm = array();
        $ddat = date("Y-m-d");
        $from_date = date("Y-m-d", strtotime('-10 day', strtotime($ddat)));
        $till_date = date("Y-m-d", strtotime($ddat));
        $arrp_sm = array("Month", "");
        array_push($arr_sm, $arrp_sm);
        $txppm = 0;
        for ($ffm = 6; $ffm >= 0; $ffm--) {
            $new_datem = date("Y-m", strtotime("-$ffm months"));
            //$new_datem = date('Y-m', strtotime(date("Y-m")." - $ffm months"));
            $miomkm = $db->query("select *,sum(total) as smms from " . $sales . " where  status!=3 and  created_at like '" . $new_datem . "%'  ")->getResultArray();
            foreach ($miomkm as $miomkfm) {
                $ret_count = $db->query("SELECT SUM(tootal) as count,todate FROM returnss where   rsale_type='" . $ret_idd . "' and todate like '" . $new_datem . "%'  GROUP BY todate ")->getRowArray();

                //$tybbm=mysql_num_getRows(mysql_query("select * from ".$sales." where created_at like '".$new_datem."%' "));
                $date_for = date("m", strtotime($new_datem));



                if (isset($miomkfm['smms']) && isset($ret_count['count']) &&  !empty($ret_count['count']) &&  !empty($ret_count['count'])) {
                    $point1 = array($date_for, intval($miomkfm['smms'] - $ret_count['count']));
                    array_push($arr_sm, $point1);
                    $txppm = $miomkfm['smms'] + $txppm;
                }
            }
        }
        $kmkp_sm = json_encode($arr_sm);
        //sales monthly report end


        //Purchase monthly report start
        $arr_pm = array();
        $ddat = date("Y-m-d");
        $from_date = date("Y-m-d", strtotime('-10 day', strtotime($ddat)));
        $till_date = date("Y-m-d", strtotime($ddat));
        $arrp_pm = array("Month", "");
        array_push($arr_pm, $arrp_pm);
        $txppm = 0;
        for ($ffm = 6; $ffm >= 0; $ffm--) {
            $new_datem = date("Y-m", strtotime("-$ffm months"));
            //$new_datem = date('Y-m', strtotime(date("Y-m")." - $ffm months"));

            $miomkm = $db->query("select *,sum(total) as smms from purchases where date like '" . $new_datem . "%'  ")->getResultArray();

            foreach ($miomkm as $miomkm) {

                //$tybbm=mysql_num_getRows(mysql_query(" select * from purchases where date like '".$new_datem."%' "));

                if (isset($miomkfm['smms'])) {
                    $date_for = date("m", strtotime($new_datem));
                    $point1 = array($date_for, intval($miomkfm['smms']));
                    array_push($arr_pm, $point1);
                    $txppm = $miomkfm['smms'] + $txppm;
                }
            }
        }
        $kmkp_pm = json_encode($arr_pm);
        //sales monthly report end

        $rolr = $user->role;


        $kkar = $db->query("SELECT * from permission_new where nname='" . $rolr . "'  ")->getRowArray();


        $lkmm = $db->query(" select * from  settings where id=1 ")->getRowArray();

        if ($lkmm['themblock'] == 0) {
            $sales = "sales";
        } else {
            $sales = "dsales";
        }
        $ret_idd = $lkmm['themblock'];

        // $sales = 'sales';
        $month_sale = date("Y-m");
        // NOTE: was filtering on `selddate`, a column that is never populated
        // (always '0000-00-00' for every sale) - that made Monthly Sales
        // always compute as 0 minus this month's returns, i.e. always
        // negative. `created_at` is the column that actually holds the sale
        // date.
        $month_salef = $db->query("SELECT sum(total) as smms from " . $sales . " where status!=3 and created_at like '" . $month_sale . "-%'  ")->getRow();

        $monthhh_rettf = $db->query("SELECT SUM(tootal) AS smms FROM  returnss WHERE   rsale_type='" . $ret_idd . "' AND todate   like '" . $month_sale . "-%'  ")->getRow();

        $todat_sale = date("Y-m-d");
        $todat_salef = $db->query("SELECT sum(total) AS smms FROM " . $sales . " WHERE   created_at ='" . $todat_sale . "'  ")->getRow();

        $todddyd_rettf = $db->query("SELECT sum(tootal) as smms from  returnss where  rsale_type='" . $ret_idd . "' and todate  ='" . $todat_sale . "' ")->getRow();

        $todat_rett = date("Y-m-d");
        $todat_rettf = $db->query("SELECT sum(tootal) as smms from  returnss where   rsale_type='" . $ret_idd . "' and todate ='" . $todat_rett . "'  ")->getRow();

        $todat_rettfttf = $db->query("SELECT sum(returnss.tootal) as smms from  returnss left join $sales on  returnss.re_sales_id =" . $sales . ".id  where   rsale_type='" . $ret_idd . "' and " . $sales . ".created_at ='" . $todat_rett . "'  ")->getRow();

        $todat_pur = date("Y-m-d");
        $todat_purf = $db->query("SELECT sum(total) as smms from  purchases where date ='" . $todat_pur . "'  ")->getRow();

        $todat_expen = date("Y-m-d");
        $todat_expenf = $db->query("select sum(amount) as smms from  expences where date ='" . $todat_expen . "'  ")->getRow();

        $stock_valuef = $db->query("SELECT SUM(s.quantity * p.cost) AS val_cost, SUM(s.quantity * p.price) AS val_price FROM stocks s JOIN products p ON p.id = s.product_id")->getRow();

        ?>
        </head>

        <div class="form-group col-md-2">
            <div style="height: 170px;background: #f7a31f;color: #fff;text-align: center;">
                <i style="margin-top: 40px;font-size: 75px;" class="fa fa-shopping-cart"></i>
                <h4 style="margin-top: 5px;margin-bottom: 0px;font-size: 30px; ">
                    <?php
                    $month_salef_smms = $month_salef->smms ?? 0;
                    $monthhh_rettf_smms = $monthhh_rettf->smms ?? 0;

                    // Floor at 0 - a "Monthly Sales" figure should never
                    // display as negative even in a heavy-return month.
                    echo number_format(max(0, (float)$month_salef_smms - $monthhh_rettf_smms), $setting->decimals, '.', '');
                    ?>
                </h4>
                <h4 style="margin-top: 0px;margin-bottom: 0px;font-size: 11px;text-align: left; ">&nbsp;&nbsp;<?= label("Monthly"); ?> <?= label("Sales"); ?></h4>
            </div>
        </div>

        <div class="form-group col-md-k1">
            <div style="height: 83px;background: #358ee0;color: #f2f8fe;text-align: center;">
                <i style="margin-top: 22px;font-size: 30px;" class="fa fa-shopping-cart"></i>
                <h4 style="margin-top: 5px;margin-bottom: 0px;font-size: 10px; ">
                    <?php
                    $todat_salef_smms = $todat_salef->smms ?? 0;

                    echo number_format((float)$todat_salef_smms, $setting->decimals, '.', '');
                    ?>
                </h4>
                <h4 style="margin-top: 0px;margin-bottom: 0px;font-size: 9px;text-align: left; ">&nbsp;&nbsp; <?= label("TodaySale"); ?> </h4>
            </div>
        </div>

        <div class="form-group col-md-k1">
            <div style="height: 83px;background: #e51400;color: #f2f8fe;text-align: center;">
                <i style="margin-top: 22px;font-size: 30px;" class="fa fa-repeat"></i>
                <h4 style="margin-top: 5px;margin-bottom: 0px;font-size: 10px; ">
                    <?php
                    $todat_rettfttf_smms = $todat_rettfttf->smms ?? 0;

                    echo number_format((float)$todat_rettfttf_smms, $setting->decimals, '.', '');
                    ?>
                </h4>
                <h4 style="margin-top: 0px;margin-bottom: 0px;font-size: 9px;text-align: left; ">&nbsp;&nbsp;<?= label("Today Sales"); ?> <?= label("Return"); ?></h4>
            </div>
        </div>


        <div class="form-group col-md-k1">
            <div style="height: 83px;background: #e51400;color: #f2f8fe;text-align: center;">
                <i style="margin-top: 22px;font-size: 30px;" class="fa fa-repeat"></i>
                <h4 style="margin-top: 5px;margin-bottom: 0px;font-size: 10px; ">
                    <?php
                    $todat_rettf_smms = $todat_rettf->smms ?? 0;

                    echo number_format((float)$todat_rettf_smms, $setting->decimals, '.', '');
                    ?>
                </h4>
                <h4 style="margin-top: 0px;margin-bottom: 0px;font-size: 9px;text-align: left; ">&nbsp;&nbsp;<?= label("Today Total"); ?> <?= label("Return"); ?></h4>
            </div>
        </div>


        <div class="form-group col-md-k1">
            <div style="height: 83px;background: #a15001;color: #f2f8fe;text-align: center;">
                <i style="margin-top: 22px;font-size: 30px;" class="fa fa-cart-argetRow-down"></i>
                <h4 style="margin-top: 5px;margin-bottom: 0px;font-size: 10px; ">
                    <?php
                    $todat_purf_smms = $todat_purf->smms ?? 0;

                    echo number_format((float)$todat_purf_smms, $setting->decimals, '.', '');
                    ?>
                </h4>
                <h4 style="margin-top: 0px;margin-bottom: 0px;font-size: 9px;text-align: left; ">&nbsp;&nbsp;<?= label("todatpurchase"); ?></h4>
            </div>
        </div>


        <div class="form-group col-md-k1">
            <div style="height: 83px;background: #01abaa;color: #f2f8fe;text-align: center;">
                <i style="margin-top: 22px;font-size: 30px;" class="fa fa-shopping-cart"></i>
                <h4 style="margin-top: 5px;margin-bottom: 0px;font-size: 10px; ">
                    <?php
                    $todat_expenf_smms = $todat_expenf->smms ?? 0;

                    echo number_format((float)$todat_expenf_smms, $setting->decimals, '.', '');
                    ?>
                </h4>
                <h4 style="margin-top: 0px;margin-bottom: 0px;font-size: 9px;text-align: left; ">&nbsp;&nbsp;<?= label("Todays"); ?> <?= label("Expense"); ?></h4>
            </div>
        </div>


        <div class="form-group col-md-k1">
            <div style="height: 83px;background: #6c5ce7;color: #f2f8fe;text-align: center;">
                <i style="margin-top: 22px;font-size: 30px;" class="fa fa-cubes"></i>
                <h4 style="margin-top: 5px;margin-bottom: 0px;font-size: 10px; ">
                    <?php
                    $stock_valuef_cost = $stock_valuef->val_cost ?? 0;

                    echo number_format((float)$stock_valuef_cost, $setting->decimals, '.', '');
                    ?>
                </h4>
                <h4 style="margin-top: 0px;margin-bottom: 0px;font-size: 9px;text-align: left; ">&nbsp;&nbsp;<?= label("Stock"); ?> <?= label("Value"); ?> (<?= label("Cost"); ?>)</h4>
            </div>
        </div>

        <div class="form-group col-md-k1">
            <div style="height: 83px;background: #2ecc71;color: #f2f8fe;text-align: center;">
                <i style="margin-top: 22px;font-size: 30px;" class="fa fa-cubes"></i>
                <h4 style="margin-top: 5px;margin-bottom: 0px;font-size: 10px; ">
                    <?php
                    $stock_valuef_price = $stock_valuef->val_price ?? 0;

                    echo number_format((float)$stock_valuef_price, $setting->decimals, '.', '');
                    ?>
                </h4>
                <h4 style="margin-top: 0px;margin-bottom: 0px;font-size: 9px;text-align: left; ">&nbsp;&nbsp;<?= label("Stock"); ?> <?= label("Value"); ?> (<?= label("Selling Price"); ?>)</h4>
            </div>
        </div>


        <div class="clearfix"></div>
        <?php
        if ($user->d_s_re == 0) {   ?>
            <div class="form-group col-md-6" id="clss1">
                <div style="border: 1px solid #c5bdbd;">
                    <h4 style="border-bottom: 1px solid #c5bdbd;padding: 10px;background: #358ee0;color:#fff;margin-top: 0px;margin-bottom: 0px; ">
                        <i style="font-size: 18px;color:#fff; " class="fa fa-bar-chart"></i>
                        <?= label('Sales'); ?>
                        <div style="float: right;display: inline-block;">
                            <input type="hidden" name="hideeity1" id="hideeity1" value="<?php echo $user->d_s_sh; ?>" />
                            <input type="hidden" name="reload1" id="reload1" value="<?php echo $user->d_s_sh; ?>" />
                            <a href="javascript:void(0);" onclick="hideeit(1);" class=""><i style="font-size: 17px;color:#fff;" class="fa fa-chevron-down"></i></a>
                            <a href="javascript:void(0);" onclick="closseit(1);" class=""><i style="font-size: 17px;color:#fff;" class="fa fa-close"></i></a>
                        </div>
                    </h4>
                    <?php if ($user->d_s_sh == 0) { ?>
                        <div id="salesreport" style="height:400px;padding:10px;background:#fff;" class="hidde1"></div>
                    <?php } ?>
                </div>
            </div>
        <?php } ?>

        <?php
        if ($user->d_p_re == 0) { ?>
            <div class="form-group col-md-6" id="clss2">
                <div style="border: 1px solid #c5bdbd;">
                    <h4 style="border-bottom: 1px solid #c5bdbd;padding: 10px;background: #ea373a;margin-top: 0px;margin-bottom: 0px;color: #fff; ">
                        <i style="font-size: 18px;color:#fff; " class="fa fa-bar-chart"></i>
                        <?= label('Purchase'); ?>
                        <div style="float: right;display: inline-block;">
                            <input type="hidden" name="hideeity2" id="hideeity2" value="<?php echo $user->d_p_sh; ?>" />
                            <input type="hidden" name="reload2" id="reload2" value="<?php echo $user->d_p_sh; ?>" />
                            <a href="javascript:void(0);" onclick="hideeit(2);" class=""><i style="font-size: 17px;color:#fff;" class="fa fa-chevron-down"></i></a>
                            <a href="javascript:void(0);" onclick="closseit(2);" class=""><i style="font-size: 17px;color:#fff;" class="fa fa-close"></i></a>
                        </div>
                    </h4>
                    <?php if ($user->d_p_sh == 0) { ?>
                        <div id="purchasereport" style="height:400px;padding:10px;background:#fff;" class="hidde2"></div>
                    <?php } ?>
                </div>
            </div>

        <?php } ?>

        <?php
        if ($user->m_s_re == 0) {
        ?>


            <div class="form-group col-md-6" id="clss3">
                <div style="border: 1px solid #c5bdbd;">
                    <h4 style="border-bottom: 1px solid #c5bdbd;padding: 10px;background: #358ee0;margin-top: 0px;color:#fff;margin-bottom: 0px; ">
                        <i style="font-size: 18px;color:#fff; " class="fa fa-bar-chart"></i>
                        <?= label('Monthly'); ?> <?= label('Sales'); ?>
                        <div style="float: right;display: inline-block;">
                            <input type="hidden" name="hideeity3" id="hideeity3" value="<?php echo $user->m_s_sh; ?>" />
                            <input type="hidden" name="reload3" id="reload3" value="<?php echo $user->m_s_sh; ?>" />
                            <a href="javascript:void(0);" onclick="hideeit(3);" class=""><i style="font-size: 17px;color:#fff;" class="fa fa-chevron-down"></i></a>
                            <a href="javascript:void(0);" onclick="closseit(3);" class=""><i style="font-size: 17px;color:#fff;" class="fa fa-close"></i></a>
                        </div>
                    </h4>
                    <?php if ($user->m_s_sh == 0) { ?>
                        <div id="sal_monthreport" style="height:400px;padding:10px;background:#fff;" class="hidde3"></div>
                    <?php } ?>
                </div>
            </div>
        <?php } ?>

        <?php
        if ($user->m_p_re == 0) {
        ?>


            <div class="form-group col-md-6" id="clss4">
                <div style="border: 1px solid #c5bdbd;">
                    <h4 style="border-bottom: 1px solid #c5bdbd;padding: 10px;background: #ea373a;margin-top: 0px;color:#fff;margin-bottom: 0px; ">
                        <i style="font-size: 18px;color:#fff;" class="fa fa-bar-chart"></i>
                        <?= label('Monthly'); ?> <?= label('Purchase'); ?>
                        <div style="float: right;display: inline-block;">
                            <input type="hidden" name="hideeity4" id="hideeity4" value="<?php echo $user->m_p_sh; ?>" />
                            <input type="hidden" name="reload4" id="reload4" value="<?php echo $user->m_p_sh; ?>" />
                            <a href="javascript:void(0);" onclick="hideeit(4);" class=""><i style="font-size: 17px;color:#fff;" class="fa fa-chevron-down"></i></a>
                            <a href="javascript:void(0);" onclick="closseit(4);" class=""><i style="font-size: 17px;color:#fff;" class="fa fa-close"></i></a>
                        </div>
                    </h4>

                    <?php if ($user->m_p_sh == 0) { ?>
                        <div id="pur_monthreport" style="height:400px;padding:10px;background:#fff;display: block;" class="hidde4"></div>

                    <?php } ?>

                </div>
            </div>
        <?php } ?>


        <script>
            $('.check-filter').click(function(e) {
                var link = $(this).attr('href');
                window.location.href = link;

            });
        </script>


        <script type="text/javascript">
            function hideeit(er) {



                var iif = document.getElementById("hideeity" + er).value;
                var rrr = document.getElementById("reload" + er).value;




                var tttp = "<?php echo site_url('categories/ashh_chart') ?>/" + er;
                $.ajax({
                    url: tttp,
                    type: "POST",
                    data: {
                        name: er
                    },
                    success: function(data) {
                        if (rrr == 1) {
                            location.reload();
                        }

                        if (iif == 0) {
                            document.getElementById("hideeity" + er).value = 1;
                            document.getElementsByClassName("hidde" + er)[0].style.display = "none";

                        } else {

                            document.getElementById("hideeity" + er).value = 0;
                            document.getElementsByClassName("hidde" + er)[0].style.display = "block";


                        }



                    },
                    error: function(jqXHR, textStatus, errorThgetRown) {


                    }
                });



            }


            function closseit(er) {

                var tttp = "<?php echo site_url('categories/adel_chart') ?>/" + er;
                $.ajax({
                    url: tttp,
                    type: "POST",
                    data: {
                        name: er
                    },
                    success: function(data) {
                        $('#clss' + er).hide();

                    },
                    error: function(jqXHR, textStatus, errorThgetRown) {


                    }
                });

            }
            //sales start
            google.charts.load('current', {
                'packages': ['bar']
            });
            google.charts.setOnLoadCallback(salesChart);

            function salesChart() {
                var data = google.visualization.arrayToDataTable(<?php echo $kmk; ?>);

                var options = {
                    chart: {
                        title: ' Amount',
                        subtitle: '',
                    }
                };

                var chart = new google.charts.Bar(document.getElementById('salesreport'));

                chart.draw(data, google.charts.Bar.convertOptions(options));








            }
            //sales end

            //Purchase start
            google.charts.load('current', {
                'packages': ['bar']
            });
            google.charts.setOnLoadCallback(purchaseChart);

            function purchaseChart() {
                var data = google.visualization.arrayToDataTable(<?php echo $kmkp; ?>);
                var options = {
                    chart: {
                        title: ' Amount',
                        subtitle: '',
                    }
                };
                var chart = new google.charts.Bar(document.getElementById('purchasereport'));
                chart.draw(data, google.charts.Bar.convertOptions(options));
            }
            //Purchase start   

            //sales month start
            google.charts.load('current', {
                'packages': ['bar']
            });
            google.charts.setOnLoadCallback(sal_monChart);

            function sal_monChart() {
                var data = google.visualization.arrayToDataTable(<?php echo $kmkp_sm; ?>);
                var options = {
                    chart: {
                        title: 'Amount',
                        subtitle: '',
                    }
                };
                var chart = new google.charts.Bar(document.getElementById('sal_monthreport'));
                chart.draw(data, google.charts.Bar.convertOptions(options));
            }
            //sales month start 


            //sales month start
            google.charts.load('current', {
                'packages': ['bar']
            });
            google.charts.setOnLoadCallback(pur_monChart);

            function pur_monChart() {
                var data = google.visualization.arrayToDataTable(<?php echo $kmkp_pm; ?>);
                var options = {
                    chart: {
                        title: 'Amount',
                        subtitle: '',
                    }
                };
                var chart = new google.charts.Bar(document.getElementById('pur_monthreport'));
                chart.draw(data, google.charts.Bar.convertOptions(options));
            }
            //sales month start
        </script>

    <?php } else { ?>

        <h3><?= label('Dashboard'); ?> </h3>
        <hr>

        <h3>Welcome to GPRETAILS</h3>

    <?php } ?>

    </html>