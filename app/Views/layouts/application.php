<?php
//session_start();
$rolr = $user->role ?? '';
/*@$kkar=mysql_fetch_array($db->query("CALL getpermissionnew	('".$rolr."')  "));*/

if (date('Y-m-d', strtotime($setting->actd)) <= date('Y-m-d')) {
    $db->query("UPDATE settings SET phoneex2='' ,paskall='' WHERE  id=1 ");
    redirect('trial');
}

if (segment(1) == '' || segment(1) == 'quotation') {
    $kkar = $db->table('permission_new')->where('nname', $rolr)->get()->getRowArray();
} else {
    $xzxz = $db->query('SELECT * FROM report_stting  WHERE rsi=1 ')->getRowArray();
    $kkar = $db->table('permission_new')->where('nname', $rolr)->get()->getRowArray();
}

?>


<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="">
    <meta name="author" content="">
    <title> <?= $setting->companyname ?></title>
    <link href="<?php echo base_url('public/'); ?>assets/pos.ico" rel="shortcut icon">

    <!-- <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/loading.js"></script> -->
    <!-- jQuery 2.2.2 (2016) upgraded to 3.7.1 - a prior attempt at this
         exact swap was left commented out here already; completed it. -->
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
    <!-- jQuery's own official compatibility shim for the 1.x/2.x -> 3.x
         transition: patches most removed/changed APIs back to working at
         runtime and console-warns (does not crash) on anything it can't
         auto-fix. Safety net for the ~80 pages across this app that
         weren't individually re-tested against jQuery 3.x as part of
         this upgrade - remove once those have all been verified clean. -->
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery-migrate/3.5.2/jquery-migrate.min.js"></script>
    <!-- normalize & reset style -->

    <link rel="stylesheet" href="<?= base_url('public/') ?>assets/css/reset.min.css" type='text/css'>

    <?php if (segment(1) == '' || segment(1) == 'quotation') { ?>
        <link rel="stylesheet" href="<?= base_url('public/') ?>assets/css/normalize.min1.css" type='text/css'>

        <link rel="stylesheet" href="<?= base_url('public/') ?>assets/css/jquery-ui1.css" type='text/css'>
        <link href="<?= base_url('public/') ?>assets/css/bootstrap.min1.css" rel="stylesheet">
        <link href="<?= base_url('public/') ?>assets/css/bootstrap-horizon1.css" rel="stylesheet">

        <link rel="stylesheet" href="<?= base_url('public/') ?>assets/css/waves.min1.css">
        <link rel="stylesheet" href="<?= base_url('public/') ?>assets/css/app_custom1.css">
        <link href="<?= base_url('public/') ?>assets/css/select2.min1.css" rel="stylesheet">
        <link href="<?= base_url('public/') ?>assets/css/Style-<?= $setting->theme ?>1.css" rel="stylesheet">

    <?php } else {  ?>
        <link rel="stylesheet" href="<?= base_url('public/') ?>assets/css/normalize.min.css" type='text/css'>

        <link rel="stylesheet" href="<?= base_url('public/') ?>assets/css/jquery-ui.css" type='text/css'>
        <link href="<?= base_url('public/') ?>assets/css/bootstrap.min.css" rel="stylesheet">
        <link href="<?= base_url('public/') ?>assets/css/bootstrap-horizon.css" rel="stylesheet">

        <link rel="stylesheet" href="<?= base_url('public/') ?>assets/css/waves.min.css">

        <link href="<?= base_url('public/') ?>assets/css/select2.min.css" rel="stylesheet">
        <link href="<?= base_url('public/') ?>assets/css/Style-<?= $setting->theme ?>.css" rel="stylesheet">

    <?php } ?>

    <link rel="stylesheet" href="<?= base_url('public/') ?>assets/css/font-awesome.min.css">
    <!-- <link rel="stylesheet" href="<?= base_url('public/') ?>assets/css/fontawesome.min.css">
    <link rel="stylesheet" href="<?= base_url('public/') ?>assets/css/all.min.css"> -->
    <!--<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">-->

    <!-- google lato font -->
    <!--  <link href='https://fonts.googleapis.com/css?family=Lato:400,700,900,300' rel='stylesheet' type='text/css'> -->
    <!-- Bootstrap Core CSS -->



    <!-- bootstrap-horizon -->

    <!-- datatable style -->
    <!-- Was a local copy of DataTables 1.10.7 (~2015) - upgraded to the
         latest 1.13.x release via CDN, same major-version API surface as
         before (no init-code changes required for existing plugin-init
         calls elsewhere in the app), just ~9 years of bugfixes/security
         patches. Deliberately NOT jumping to DataTables 2.x here - the
         four pages rebuilt this session already load 2.x themselves and
         reclaim it after this file's own DataTables loads (see their
         loadScriptOnce() reclaim code), but ~80 other legacy pages still
         initialize DataTables using THIS shared copy directly, and 1.x -> 2.x
         has real breaking API changes untested against those pages. -->
    <link href="https://cdn.datatables.net/1.13.11/css/dataTables.bootstrap.css" rel="stylesheet">
    <!-- font awesome -->

    <!-- include summernote css-->
    <link href="<?= base_url('public/') ?>assets/css/summernote.css" rel="stylesheet">
    <!-- waves -->

    <!-- daterangepicker -->
    <link rel="stylesheet" type="text/css" href="<?= base_url('public/') ?>assets/css/daterangepicker.css" />
    <!-- css for the preview keyset extension -->
    <link href="<?= base_url('public/') ?>assets/css/keyboard-previewkeyset.css" rel="stylesheet">
    <!-- keyboard widget style -->
    <link href="<?= base_url('public/') ?>assets/css/keyboard.css" rel="stylesheet">
    <!-- Select 2 style -->


    <!-- Sweet alert swal -->
    <link rel="stylesheet" type="text/css" href="<?= base_url('public/') ?>assets/css/sweetalert.css">
    <!-- datepicker css -->
    <link rel="stylesheet" type="text/css" href="<?= base_url('public/') ?>assets/css/bootstrap-datepicker.min.css">
    <!-- Custom CSS -->


    <style>
        .icon-color li a {
            position: relative;
            padding-left: 25px;
            margin-left: 10px;
            line-height: 1.6;
        }

        .icon-color li a i {
            position: absolute;
            left: 0;
            top: 4px;
            font-size: 17px !important;
            color: #1e73be;
            margin-right: 5px;
        }

        .menu-top {
            padding-top: 5px;
        }

        .fa-stack i {
            color: red;
        }
    </style>
    </style>
</head>

<body>
    <aside>
        <nav class="navbar navbar-inverse sidebar navbar-fixed-top" role="navigation">
            <div class="nav-side-menu">
                <div class="brand">GPRETAILS</div>
                <i class="fa fa-bars fa-2x toggle-btn" data-toggle="collapse" data-target="#menu-content"></i>

                <div class="menu-list">

                    <ul id="menu-content" class="menu-content collapse out">

                        <li class="flat-box"><a href="<?= base_url() ?>dashboard/posview"><i
                                    style="font-size: 21px;margin-top: 5px;" class="fa fa-tachometer fa-lg btn"></i>
                                <?= label('Dashboard') ?></a></li>


                        <?php if (isset($kkar['ssa']) && $kkar['ssa'] == 1) { ?>
                            <li class="flat-box"><a href="<?= base_url() ?>">
                                    <i style="font-size: 21px;margin-top: 5px; "
                                        class="fa fa-shopping-cart fa-lg btn "></i>
                                    <?= label('Sales Entry') ?></a></li>
                        <?php } ?>

                        <?php if (isset($kkar['puv']) && $kkar['puv'] == 1) { ?>
                            <li class="flat-box"><a href="<?= base_url('purchase/add') ?>">
                                    <i style="font-size: 21px;margin-top: 5px; "
                                        class="fa fa-shopping-cart fa-lg btn "></i>
                                    <?= label('Purchase Entry') ?></a></li>
                        <?php } ?>


                        <li data-toggle="collapse" data-target="#Voucher" class="collapsed active">
                            <a href="#"><i style="font-size: 21px;margin-top: 5px;"
                                    class="fa fa-newspaper-o fa-lg btn "></i><?= label('Voucher') ?>


                            </a>
                            &nbsp;&nbsp;<span class="fa fa-angle-down full-right "></span>
                        </li>
                        <ul class="sub-menu collapse" id="Voucher">

                            <?php if (isset($kkar['ssv']) && $kkar['ssv'] == 1) { ?>

                                <li><a href="<?= base_url('sales') ?>"><i style=""
                                            class="fa fa-shopping-cart"></i><?= label('Sales') ?></a></li>

                            <?php } ?>

                            <?php if (isset($kkar['qtv']) && $kkar['qtv'] == 1) { ?>

                                <li><a href="<?= base_url() ?>quotationview"><i style=""
                                            class="fa fa-shopping-cart"></i><?= label('Quotation') ?></a></li>

                            <?php } ?>

                            <?php if (isset($kkar['puv']) && $kkar['puv'] == 1) { ?>

                                <li class="flat-box"><a href="<?= base_url() ?>purchase"><i style=""
                                            class="fa fa-cart-arrow-down"></i> <?= label('Purchase') ?></a></li>



                            <?php } ?>

                            <?php if (isset($kkar['excv']) && $kkar['excv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>categorieExpences"><i style=""
                                            class="fa fa-hdd-o"></i> <?= label('Expense') ?> <?= label('Type') ?></a></li>
                            <?php } ?>
                            <?php if (isset($kkar['exxv']) && $kkar['exxv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>expences"><i style=""
                                            class="fa fa-archive"></i> <?= label('Expense') ?></a></li><?php } ?>



                            <?php if ($setting->quotation == 1) { ?>

                                <li class="flat-box"><a href="<?= base_url() ?>quotation"><i style=""
                                            class="fa fa-archive"></i> <?= label('Add Quotation') ?></a></li>

                                <li class="flat-box"><a href="<?= base_url() ?>sales/quotation"><i style=""
                                            class="fa fa-archive"></i> <?= label('Quotation') ?></a></li>
                            <?php } ?>


                        </ul>


                        <li data-toggle="collapse" data-target="#module" class="collapsed active">
                            <a href="#"> <i style="font-size: 21px;margin-top: 5px;"
                                    class="fa fa-newspaper-o"></i><?= label('module') ?></a>&nbsp;&nbsp;&nbsp;&nbsp;<span
                                class="fa fa-angle-down full-right "></span>
                        </li>
                        <ul class="sub-menu collapse" id="module">

                            <?php
                            if ($setting->combo == 1 && isset($kkar['comv']) && $kkar['comv'] == 1) {
                            ?>
                                <li class="flat-box"><a href="<?= base_url() ?>combooffer"><i style=""
                                            class="fa fa-cart-arrow-down"></i> <?= label('combooffers') ?></a></li>
                            <?php } ?>

                            <?php
                            if ($setting->ooffr == 1 && isset($kkar['offv']) && $kkar['offv'] == 1) {
                            ?>
                                <li class="flat-box"><a href="<?= base_url() ?>offers"><i style=""
                                            class="fa fa-cart-arrow-down"></i> <?= label('offers') ?></a></li>
                            <?php } ?>
                        </ul>




                        <li data-toggle="collapse" data-target="#Master" class="collapsed active">
                            <a href="#"> <i style="font-size: 21px;margin-top: 5px;"
                                    class="fa fa-graduation-cap fa-lg btn "></i><?= label('Master') ?></a>&nbsp;&nbsp;&nbsp;&nbsp;<span
                                class="fa fa-angle-down full-right "></span>
                        </li>
                        <ul class="sub-menu collapse" id="Master">




                            <?php if (isset($kkar['brv']) && $kkar['brv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>brand"><i style=""
                                            class="fa fa-archive"></i><?= label('Brand') ?> </a></li><?php } ?>







                            <?php if (isset($kkar['caav']) && $kkar['caav'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>categories"><i style=""
                                            class="fa fa-archive"></i><?= label('Categories') ?></a></li>
                            <?php } ?>


                            <?php if (isset($kkar['taxv']) && $kkar['taxv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>tax"><i style=""
                                            class="fa fa-money"></i><?= label('tax') ?> </a></li><?php } ?>

                            <?php if (isset($kkar['suv']) && $kkar['suv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>suppliers"><i style=""
                                            class="fa fa-users"></i><?= label('Supplier') ?></a></li><?php } ?>




                            <?php if ($kkar['prv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>products"><i style=""
                                            class="fa fa-product-hunt"></i><?= label('Product') ?></a></li>
                            <?php } ?>

                            <?php if ($kkar['prv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>products/warehouseProducts "><i style=""
                                            class="fa fa-product-hunt"></i><?= label('Warehouses List') ?></a></li>
                            <?php } ?>

                            <?php if ($kkar['prinv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>productsInistock"><i style=""
                                            class="fa fa-product-hunt"></i><?= label('initial_stock') ?></a></li>
                            <?php } ?>
                            <?php if ($kkar['prinv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>purchase/purchase_stock_transfer"><i style=""
                                            class="fa fa-product-hunt"></i><?= label('Stock Transfer') ?></a></li>
                            <?php } ?>






                            <?php if ($kkar['promov'] == 1 && $setting->mlp_rss == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>price"><i style=""
                                            class="fa fa-archive"></i><?= label('price_method') ?></a></li>
                            <?php } ?>

                            <?php if ($kkar['proprp'] == 1 && $setting->mlp_rss == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>ProductsPrice"><i
                                            class="fa fa-product-hunt"></i><?= label('price_price') ?></a></li>
                            <?php } ?>

                            <?php if ($kkar['promrpp'] == 1 && $setting->mlp_rss == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>ProductsMrp"><i
                                            class="fa fa-product-hunt"></i><?= label('price_mrp') ?></a></li>
                            <?php } ?>



                            <?php if ($kkar['payv'] == 1 && $setting->mlp_rss == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>paymentMode"><i style=""
                                            class="fa fa-truck"></i><?= label('paymentMethod') ?></a></li>

                            <?php } ?>






                            <?php if ($kkar['cuv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>customers"><i style=""
                                            class="fa fa-user"></i>
                                        <?= label('Customers') ?></a></li><?php } ?>


                            <?php if ($kkar['brv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>roll"><i style=""
                                            class="fa fa-archive"></i><?= label('Roles') ?> </a></li>
                            <?php } ?>








                        </ul>
                        <li data-toggle="collapse" data-target="#Inventory" class="collapsed active">
                            <a href="#"><i style="font-size: 21px;margin-top: 5px;"
                                    class="fa fa-money fa-lg btn "></i><?= label('Inventory') ?> </a>
                            <span class="fa fa-angle-down full-right "></span>
                        </li>
                        <ul class="sub-menu collapse" id="Inventory">
                            <?php if ($kkar['phv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>PhysicalStock"><i
                                            class="fa fa-hand-o-right"></i> <?= label('Physical') ?> <?= label('Stock') ?>
                                    </a></li>
                            <?php } ?>
                            <?php if ($kkar['gov'] == 1) { ?>

                                <li class="flat-box"><a href="<?= base_url() ?>goodsout"><i class="fa fa-truck"></i>
                                        <?= label('GoodsOut') ?> </a></li>
                            <?php } ?>



                            <?php if ($kkar['salretv'] == 1) { ?>
                                <li class="flat-box"><a href="<?= base_url() ?>sales/proreturn"><i
                                            class="fa fa-repeat"></i> <?= label('Sales') ?> <?= label('Return') ?> </a>
                                </li>


                            <?php }

                            if ($kkar['prdenv'] == 1) { ?>
                                <!--  <li class="flat-box"><a href="<?= base_url() ?>production"><i class="fa fa-shopping-basket"></i> <?= label('Production') ?> <?= label('Entry') ?>  </a></li> -->
                            <?php } ?>


                        </ul>


                        <?php if (isset($kkar['rev']) && $kkar['rev'] == 1) {

                        ?>


                            <li data-toggle="collapse" data-target="#Reports" class="collapsed active">
                                <a href="#"><i style="font-size: 21px;margin-top: 5px;"
                                        class="fa fa-line-chart fa-lg btn "></i><?= label('Reports') ?>
                                </a>&nbsp;&nbsp;<span class="fa fa-angle-down full-right "></span>
                            </li>
                            <ul class="sub-menu collapse" id="Reports">
                                <li class="flat-box"><a href="<?= base_url() ?>report/brsearch"><i
                                            class="fa fa-money"></i> <?= label('Search BR') ?> </a></li>

                                <li class="flat-box"><a href="<?= base_url() ?>report/cashinhandreport"><i
                                            class="fa fa-shopping-cart"></i>
                                        <?= label('Cash in hand') ?> </a></li>




                                <?php if ($setting->creditstatus == 1) { ?>

                                    <!--   <li class="flat-box"><a href="<?= base_url() ?>report/creditstatus"><i class="fa fa-user"></i><?= label('Credit Status') ?></a></li>

                      <li class="flat-box"><a href="<?= base_url() ?>report/collection"><i class="fa fa-user"></i><?= label('Collection') ?></a></li>

                      <li class="flat-box"><a href="<?= base_url() ?>notification"><i class="fa fa-user"></i><?= label('Notification') ?></a></li> -->


                                <?php } ?>



                                <?php if ($xzxz['r2'] == 1) { ?>
                                    <!-- <li class="flat-box"><a href="<?= base_url() ?>report/productreport"><i class="fa fa-product-hunt"></i><?= label('Product') ?></a></li> -->

                                    <li class="flat-box">
                                        <a href="<?= base_url() ?>report/categoryreport"><i
                                                class="fa fa-product-hunt"></i><?= label('Category') ?></a>
                                    </li>

                                <?php } ?>


                                <?php if ($xzxz['r3'] == 1) { ?>

                                    <li class="flat-box"><a href="<?= base_url() ?>report/storereport"><i
                                                class="fa fa-power-off"></i><?= label('CloseRegister') ?></a></li>
                                <?php } ?>

                                <?php if ($xzxz['r13'] == 1) { ?>
                                    <li class="flat-box"><a href="<?= base_url() ?>report/stockallreport"><i
                                                class="fa fa-window-close"></i>
                                            <?= label('Closing') ?> <?= label('Stock') ?></a></li>
                                <?php } ?>


                                <?php if ($xzxz['r1'] == 1) { ?>

                                    <li class="flat-box"><a href="<?= base_url() ?>report/customerreport"><i
                                                class="fa fa-user"></i><?= label('Customer') ?></a></li>
                                <?php } ?>

                                <?php if ($xzxz['r5'] == 1) { ?>

                                    <li class="flat-box"><a href="<?= base_url() ?>report/customertaxreport"><i
                                                class="fa fa-money"></i><?= label('Customer') ?> <?= label('tax') ?> </a></li>


                                    <li class="flat-box"><a href="<?= base_url() ?>report/customertaxgstr3b"><i
                                                class="fa fa-money"></i>GSTR-3B</a></li>



                                <?php } ?>







                                <?php if ($xzxz['r12'] == 1) { ?>


                                    <!--   <li class="flat-box"><a href="<?= base_url() ?>report/stockstorereport"><i class="fa fa-window-close"></i>
                        <?= label('Closing') ?> <?= label('Stock') ?>-<?= label('Warehouses') ?>  </a></li> -->


                                <?php } ?>
                                <?php if ($xzxz['r4'] == 1) { ?>
                                    <li class="flat-box"><a href="<?= base_url() ?>report/fastreport"><i
                                                class="fa fa-window-close"></i><?= label('Fast Moving') ?> </a></li>
                                <?php } ?>

                                <?php if ($xzxz['r4'] == 1) { ?>
                                    <li class="flat-box"><a href="<?= base_url() ?>report/producttaxreport"><i
                                                class="fa fa-money"></i><?= label('Product') ?> <?= label('tax') ?> </a></li>
                                <?php } ?>


                                <?php if ($xzxz['r14'] == 1) { ?>
                                    <li class="flat-box"><a href="<?= base_url() ?>report/profitdailyreport"><i
                                                class="fa fa-money"></i><?= label('Profit') ?> </a></li>
                                <?php } ?>

                                <?php if ($xzxz['r10'] == 1) { ?>

                                    <li class="flat-box"><a href="<?= base_url() ?>report/totalpurchasereport"><i
                                                class="fa fa-cart-arrow-down"></i><?= label('Purchase') ?> </a></li>
                                <?php } ?>





                                <?php if ($xzxz['r6'] == 1) { ?>


                                    <!-- <li class="flat-box"><a href="<?= base_url() ?>report/purchasereport"><i class="fa fa-archive"></i><?= label('Purchase') ?></a></li> -->
                                <?php } ?>
                                <?php if ($xzxz['r7'] == 1) { ?>

                                    <!-- <li class="flat-box"><a href="<?= base_url() ?>report/purchasedailyreport"><i class="fa fa-archive"></i><?= label('Purchase') ?>(D)</a></li> -->
                                <?php } ?>


                                <?php if ($xzxz['r8'] == 1) { ?>


                                    <li class="flat-box"><a href="<?= base_url() ?>report/purchaseproductreport"><i
                                                class="fa fa-cart-arrow-down"></i><?= label('Purchase') ?>
                                            <?= label('Product') ?> </a></li>
                                <?php } ?>
                                <?php if ($xzxz['r9'] == 1) { ?>
                                    <li class="flat-box">
                                        <a href="<?= base_url() ?>report/purchasedealerreport"><i
                                                class="fa fa-user-plus"></i><?= label('Purchase') ?> <?= label('Dealer') ?>
                                        </a>
                                    </li>
                                <?php } ?>

                                <?php if ($xzxz['r10'] == 1) { ?>
                                    <!-- <li class="flat-box"><a href="<?= base_url() ?>report/purchasemonthlyreport"><i class="fa fa-archive"></i><?= label('Purchase') ?> (M) </a></li> -->

                                <?php } ?>

                                <?php if ($xzxz['r11'] == 1) { ?>

                                    <!-- <li class="flat-box"><a href="<?= base_url() ?>report/salesdailyreport"><i class="fa fa-archive"></i><?= label('Sales') ?> (D) </a></li> -->
                                <?php } ?>


                                <?php if ($xzxz['r16'] == 1) { ?>

                                    <li class="flat-box"><a href="<?= base_url() ?>report/totalsalesreport"><i
                                                class="fa fa-shopping-cart"></i>
                                            <?= label('Sales') ?> </a></li>
                                <?php } ?>

                                <?php if ($xzxz['r17'] == 1) { ?>

                                    <!-- <li class="flat-box"><a href="<?= base_url() ?>report/totalsalesreporthsn"><i class="fa fa-shopping-cart"></i>
                                            <?= label('HSN') ?> <?= label('Sales') ?> </a></li> -->
                                <?php } ?>





                                <?php if ($xzxz['r11'] == 1) { ?>

                                    <li class="flat-box"><a href="<?= base_url() ?>report/salesretunreport"><i
                                                class="fa fa-repeat"></i><?= label('Sales') ?> <?= label('Return') ?> </a></li>
                                <?php } ?>


                                <?php if ($xzxz['r15'] == 1) { ?>
                                    <li class="flat-box"><a href="<?= base_url() ?>report/supplierreport"><i
                                                class="fa fa-users"></i><?= label('Supplier') ?> <?= label('Payment') ?></a>
                                    </li>
                                <?php } ?>
                            </ul>
                        <?php } ?>
                        <?php if ($user->role === "admin") { ?>
                            <li class="flat-box"><a href="<?= base_url() ?>settings?tab=setting"><i
                                        style="font-size: 21px;margin-top: 5px;" class="fa fa-cogs fa-lg btn "></i>
                                    <?= label('Setting') ?></a></li>
                        <?php } ?>
                        <?php if ($setting->tallyy == 1) { ?>

                            <li data-toggle="collapse" data-target="#Tally" class="collapsed active">
                                <a href="#"><i style="font-size: 21px;margin-top: 5px;"
                                        class="fa fa-money fa-lg btn "></i><?= label('Tally') ?> </a>
                                <span class="fa fa-angle-down full-right "></span>
                            </li>
                            <ul class="sub-menu collapse" id="Tally">



                                <?php if ($kkar['tallypur'] == 1) { ?>
                                    <li class="flat-box"><a href="<?= base_url() ?>report/purchasetally"><i
                                                class="fa fa-truck"></i>Purchase</a></li><?php } ?>

                                <?php if ($kkar['tallypurlog'] == 1) { ?>
                                    <li class="flat-box"><a href="<?= base_url() ?>log/purchasetallylog"><i
                                                class="fa fa-truck"></i>Purchase Log</a></li><?php } ?>

                                <?php if ($kkar['tallysale'] == 1) { ?>
                                    <li class="flat-box"><a href="<?= base_url() ?>report/salestally"><i
                                                class="fa fa-truck"></i>Sales</a></li><?php } ?>

                                <?php if ($kkar['tallysalelog'] == 1) { ?>
                                    <li class="flat-box"><a href="<?= base_url() ?>log/salestallylog"><i
                                                class="fa fa-truck"></i>Sales Log</a></li><?php } ?>

                                <?php if ($kkar['tallyupallv'] == 1) { ?>
                                    <li class="flat-box"><a href="<?= base_url() ?>log/updateall"><i
                                                class="fa fa-truck"></i>Update All</a></li><?php } ?>

                            </ul>









                        <?php } ?>


                        <li data-toggle="collapse" data-target="#language" class="collapsed active">
                            <a href="#"><i style="font-size: 21px;margin-top: 5px;"
                                    class="fa fa-user fa-lg btn "></i><?= label('language') ?> </a>
                            <span class="fa fa-angle-down full-right "></span>
                        </li>
                        <ul class="sub-menu collapse" id="language">

                            <li class="flat-box"><a href="<?= base_url() ?>dashboard/change/english"><img
                                        src="<?= base_url('public/') ?>assets/img/flags/india.jpg" class="flag"
                                        alt="language"> English</a></li>

                            <li class="flat-box"><a href="<?= base_url() ?>dashboard/change/tamil"><img
                                        src="<?= base_url('public/') ?>assets/img/flags/india.jpg" class="flag"
                                        alt="language"> தமிழ் </a></li>

                            <li class="flat-box"><a href="<?= base_url() ?>dashboard/change/hindi"><img
                                        src="<?= base_url('public/') ?>assets/img/flags/india.jpg" class="flag"
                                        alt="language"> हिंदी </a></li>

                            <li class="flat-box"><a href="<?= base_url() ?>dashboard/change/malayalam"><img
                                        src="<?= base_url('public/') ?>assets/img/flags/india.jpg" class="flag"
                                        alt="language"> മലയാളം </a></li>

                            <li class="flat-box"><a href="<?= base_url() ?>dashboard/change/telugu"><img
                                        src="<?= base_url('public/') ?>assets/img/flags/india.jpg" class="flag"
                                        alt="language"> తెలుగు </a></li>

                            <li class="flat-box"><a href="<?= base_url() ?>dashboard/change/kannada"><img
                                        src="<?= base_url('public/') ?>assets/img/flags/india.jpg" class="flag"
                                        alt="language"> ಕನಾಡಾ </a></li>

                            <li class="flat-box"><a href="<?= base_url() ?>dashboard/change/arabic"><img
                                        src="<?= base_url('public/') ?>assets/img/flags/india.jpg" class="flag"
                                        alt="language"> عربى</a></li>


                        </ul>


                        <?php
                        //$db->query("ALTER TABLE permission_new ADD smsp varchar(255);");

                        if (isset($kkar['smsp']) && $kkar['smsp'] == 1) { ?>
                            <li class="flat-box"><a href="<?= base_url() ?>sms"><i
                                        style="font-size: 21px;margin-top: 5px;" class="fa fa-envelope fa-lg btn "></i>
                                    <?= label('SMS') ?></a></li>
                        <?php } ?>






                        <li class="flat-box">
                            <?php
                            if ($setting->apponords == 1) {
                                if ($setting->backuplogout == 1 && $setting->backcloud == 2) {
                            ?>
                                    <a href="javascript:void(0)" onclick="logoutses();" title="<?= label('LogOut') ?>"><i
                                            style="font-size: 21px;margin-top: 5px;"
                                            class="fa fa-sign-out fa-lg btn "></i><?= label('LogOut') ?> </a>
                                <?php
                                } else {

                                ?>
                                    <a href="<?php echo base_url(); ?>auth/logoutnext" title="<?= label('LogOut') ?>"><i
                                            style="font-size: 21px;margin-top: 5px;"
                                            class="fa fa-sign-out fa-lg btn "></i><?= label('LogOut') ?></a>

                                <?php
                                }
                            } else {
                                ?>
                                <a href="<?php echo base_url(); ?>auth/logouts" title="<?= label('LogOut') ?>"><i
                                        style="font-size: 21px;margin-top: 5px;" class="fa fa-sign-out fa-lg btn "></i>
                                    &nbsp;<?= label('LogOut') ?></a>

                            <?php
                            }
                            ?>
                        </li>







                    </ul>
                </div>
            </div>
        </nav>

    </aside>



    <div id="loadingimg"></div>



    <style type="text/css">
        /*header.navbar+nav.navbar {
            margin-top: 20px;
            same margin-bottom .navbar
        }*/

        .navbar.navbar-default.navbar-fixed-top {
            margin-top: 50px;
        }

        .sidebar.navbar-fixed-top {
            margin-top: 0px;
        }

        /*   @media (min-width: 768px) and (max-width: 998px){
       .navbar.navbar-default.navbar-fixed-top{
       margin-top: 100px;
       }
       .sidebar.navbar-fixed-top{
        margin-top: 150px;
       }
    }*/

        /* Custom navbar default: global*/

        .navbar.navbar-default {
            background-color: #f8f8f8;
            border-color: #e7e7e7;
            margin: 0;
            border-radius: 0;
        }

        .navbar.navbar-default .navbar-brand {
            color: #666;
            text-shadow: none;
            min-width: 150px;
        }

        .navbar.navbar-default .navbar-nav>li>a {
            color: #666;
            text-shadow: none;
        }

        .navbar.navbar-default .navbar-nav>li>a {
            color: #666;
            text-shadow: none;
        }

        .navbar.navbar-default .navbar-nav>li>a:hover {
            color: #acc47f;
        }

        .navbar.navbar-default .navbar-nav>.active>a {
            color: #fff;
            background-color: #acc47f;
        }

        .navbar.navbar-default .navbar-nav>.active>a:hover {
            color: #608224;
            background-color: #acc47f;
        }

        .navbar.navbar-default .caret {
            border-top-color: #ccc;
            border-bottom-color: #ccc;
        }

        .navbar.navbar-default .caret:hover {
            border-top-color: #333;
            border-bottom-color: #333;
        }


        /* Custom sidebar menu */

        /*Remove rounded coners*/

        nav.sidebar.navbar {
            border-radius: 0px;
        }

        nav.sidebar,
        .main {
            -webkit-transition: margin 200ms ease-out;
            -moz-transition: margin 200ms ease-out;
            -o-transition: margin 200ms ease-out;
            transition: margin 200ms ease-out;
        }

        /* Add gap to nav and right windows.*/
        .main {
            padding: 10px 10px 0 10px;
        }

        /* .....NavBar: Icon only with coloring/layout.....*/

        /*small/medium side display*/
        @media (min-width: 768px) {

            /*Allow main to be next to Nav*/
            .main {
                position: absolute;
                width: calc(100% - 40px);
                /*keeps 100% minus nav size*/
                margin-left: 40px;
                float: right;
            }

            /*lets nav bar to be showed on mouseover*/
            nav.sidebar:hover+.main {
                margin-left: 200px;
            }

            /*Center Brand*/
            nav.sidebar.navbar.sidebar>.container .navbar-brand,
            .navbar>.container-fluid .navbar-brand {
                margin-left: 0px;
            }

            /*Center Brand*/
            nav.sidebar .navbar-brand,
            nav.sidebar .navbar-header {
                text-align: center;
                width: 100%;
                margin-left: 0px;
            }

            /*Center Icons*/
            nav.sidebar a {
                padding: 13px;
                min-width: 100px;
            }

            /*custom sidebar nav*/
            nav.sidebar ul.nav.navbar-nav {
                margin: 0;
            }

            nav.sidebar.navbar-inverse .navbar-nav .open .dropdown-menu>li>a {
                color: white;
            }

            /*adds border top to first nav box */
            nav.sidebar .navbar-nav>li:first-child {
                border-top: 1px #e5e5e5 solid;
            }

            /*adds border to bottom nav boxes*/
            nav.sidebar .navbar-nav>li {
                border-bottom: 1px #e5e5e5 solid;
            }

            /*adds background on hover*/
            nav.sidebar .navbar-nav>li:hover {
                color: #fff;
                background-color: #43600E;
            }

            /*removes border last element*/
            nav.sidebar .navbar-nav>li.last {
                border-bottom: none;
            }

            /* Colors/style dropdown box*/
            nav.sidebar .navbar-nav .open .dropdown-menu {
                position: static;
                float: none;
                width: auto;
                margin-top: 0;
                background-color: transparent;
                border: 0;
                -webkit-box-shadow: none;
                box-shadow: none;
            }

            /*allows nav box to use 100% width*/
            nav.sidebar .navbar-collapse,
            nav.sidebar .container-fluid {
                padding: 0 0px 0 0px;
            }

            /*colors dropdown box text */
            .navbar-inverse .navbar-nav .open .dropdown-menu>li>a {
                color: #777;
            }

            /*O quanto o menu irá esconder á esquerda*/
            /*gives sidebar width/height*/
            nav.sidebar {
                width: 70px;
                height: 100%;

                float: left;
                z-index: 8000;
                margin-bottom: 0px;
            }

            /*give sidebar 100% width;*/
            nav.sidebar li {
                width: 100%;

                height: 50px;
                overflow: hidden;
            }

            /* Move nav to full on mouse over*/
            nav.sidebar:hover {
                margin-left: 0px;
            }

            /*for hiden things when navbar hidden*/
            .forAnimate {
                opacity: 0;
            }
        }

        /* .....NavBar: Fully showing nav bar..... */

        @media (min-width: 1330px) {

            /*     Allow main to be next to Nav
    .main{
      width: calc(100% - 200px); keeps 100% minus nav size
      margin-left: 200px;
    }

    Show all nav
    nav.sidebar{
      margin-left: 0px;
      float: left;
    }
    Show hidden items on nav
    nav.sidebar .forAnimate{
      opacity: 1;
    } */
        }

        nav.sidebar .navbar-nav .open .dropdown-menu>li>a:hover,
        nav.sidebar .navbar-nav .open .dropdown-menu>li>a:focus {
            color: #CCC;
            background-color: transparent;
        }

        nav:hover .forAnimate {
            opacity: 1;
        }


        /*---- FIM SLIDE MENU*/

        .nav-side-menu {

            font-family: verdana;
            font-size: 12px;
            font-weight: 200;
            background-color: #284255;
            position: fixed;
            overflow: hidden;
            top: 0px;
            width: 70px;
            height: 100%;
            color: #e1ffff;
        }


        .nav-side-menu .brand {

            border-left: 3px solid #358ee0;
            line-height: 50px;
            display: block;
            text-align: center;
            font-size: 14px;
        }

        .nav-side-menu .toggle-btn {
            display: none;
        }

        .nav-side-menu ul,
        .nav-side-menu li {
            list-style: none;
            padding: 0px;
            margin: 0px;
            line-height: 45px;
            cursor: pointer;




        }

        .nav-side-menu ul :not(collapsed) .arrow:before,
        .nav-side-menu li :not(collapsed) .arrow:before {
            font-family: FontAwesome;

            display: inline-block;
            padding-left: 10px;
            padding-right: 10px;
            vertical-align: middle;
            float: right;
        }

        .nav-side-menu ul :hover,
        .nav-side-menu li :hover {
            color: #fff;
        }

        .nav-side-menu ul .active,
        .nav-side-menu li .active {
            border-right: 3px solid #d19b3d;

            /*background-color: #4f5b69;*/
        }

        .nav-side-menu ul .sub-menu li.active,
        .nav-side-menu li .sub-menu li.active {
            color: #d19b3d;
        }

        .nav-side-menu ul .sub-menu li.active a,
        .nav-side-menu li .sub-menu li.active a {
            color: #d19b3d;
        }

        .nav-side-menu ul .sub-menu li,
        .nav-side-menu li .sub-menu li {
            background-color: #181c20;
            border: none;
            line-height: 28px;
            border-bottom: 1px solid #23282e;
            margin-left: 0px;
        }

        .nav-side-menu ul .sub-menu li:hover,
        .nav-side-menu li .sub-menu li:hover {
            background-color: #020203;
        }

        .nav-side-menu ul .sub-menu li,
        .nav-side-menu li .sub-menu li {

            width: 100%;
            height: 30px;
            overflow: hidden;
        }

        .nav-side-menu ul .sub-menu li:before,
        .nav-side-menu li .sub-menu li:before {
            font-family: FontAwesome;

            display: inline-block;
            padding-left: 10px;
            padding-right: 10px;
            vertical-align: middle;
        }

        .nav-side-menu li {
            padding-left: 0px;
            border-left: 3px solid #2e353d;
            /*border-bottom: 1px solid #23282e;*/
        }

        .nav-side-menu li a {
            text-decoration: none;
            color: #d7e7e7;
            margin-left: -10px;
        }

        .nav-side-menu li a i {
            padding-left: 16px;
            /*width: 20px;*/
            padding-right: 10px;
        }

        .nav-side-menu li:hover {
            border-left: 3px solid #d19b3d;
            background-color: #4f5b69;
            -webkit-transition: all 1s ease;
            -moz-transition: all 1s ease;
            -o-transition: all 1s ease;
            -ms-transition: all 1s ease;
            transition: all 1s ease;
        }

        @media (max-width: 767px) {
            .nav-side-menu {
                position: relative;
                width: 100%;

            }

            .nav-side-menu .toggle-btn {
                display: block;
                cursor: pointer;
                position: absolute;
                right: 10px;
                top: 10px;
                z-index: 10 !important;
                padding: 3px;
                background-color: #ffffff;
                color: #358ee0;
                width: 40px;
                text-align: center;
            }

            .brand {
                text-align: left !important;
                font-size: 22px;
                padding-left: 20px;
                line-height: 50px !important;
            }
        }

        @media (min-width: 767px) {
            .nav-side-menu .menu-list .menu-content {
                display: block;

            }

            .nav-side-menu:hover {
                overflow: auto;
                font-family: verdana;
                font-size: 12px;
                font-weight: 200;
                background-color: #284255;
                position: fixed;
                top: 0px;
                width: 180px;
                height: 100%;
                color: #e1ffff;
            }

            .nav-side-menu .brand {

                border-left: 3px solid #333;
                line-height: 50px;
                display: block;
                text-align: center;
                font-size: 14px;
            }
        }
    </style>

    <script type="text/javascript">
        function htmlbodyHeightUpdate() {
            var height3 = $(window).height()
            var height1 = $('.nav').height() + 50
            height2 = $('.main').height()
            if (height2 > height3) {
                $('html').height(Math.max(height1, height3, height2) + 10);
                $('body').height(Math.max(height1, height3, height2) + 10);
            } else {
                $('html').height(Math.max(height1, height3, height2));
                $('body').height(Math.max(height1, height3, height2));
            }

        }
        $(document).ready(function() {
            htmlbodyHeightUpdate()
            $(window).resize(function() {
                htmlbodyHeightUpdate()
            });
            $(window).scroll(function() {
                height2 = $('.main').height()
                htmlbodyHeightUpdate()
            });
        });
    </script>

    <style type="text/css">
        .dropdown-container {
            display: none;
            background-color: #262626;
            padding-left: 8px;
        }
    </style>

    <?= $yield ?>

    <!-- slim scroll script -->
    <?php if (segment(1) == '' || segment(1) == 'quotation') { ?>
        <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/jquery.slimscroll.min1.js"></script>
    <?php } else { ?>
        <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/jquery.slimscroll.min.js"></script>
    <?php } ?>


    <!-- waves material design effect -->
    <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/waves.min.js"></script>
    <!-- Bootstrap Core JavaScript -->
    <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/bootstrap.min.js"></script>
    <!-- keyboard widget dependencies -->

    <?php

    if (@$setting->keyboard == 1) {
    ?>
        <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/jquery.keyboard.js"></script>
    <?php
    }
    ?>
    <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/jquery.keyboard.extension-all.js"></script>
    <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/jquery.keyboard.extension-extender.js"></script>
    <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/jquery.keyboard.extension-typing.js"></script>
    <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/jquery.mousewheel.js"></script>
    <!-- select2 plugin script -->
    <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/select2.min.js"></script>
    <!-- dalatable scripts -->
    <script src="https://cdn.datatables.net/1.13.11/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.11/js/dataTables.bootstrap.js"></script>
    <!-- summernote js -->
    <script src="<?= base_url('public/') ?>assets/js/summernote.js"></script>
    <!-- chart.js script -->
    <script src="<?= base_url('public/') ?>assets/js/Chart.js"></script>
    <!-- moment JS -->
    <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/moment.min.js"></script>
    <!-- Include Date Range Picker -->
    <script type="text/javascript" src="<?= base_url('public/') ?>assets/js/daterangepicker.js"></script>
    <!-- Sweet Alert swal -->
    <script src="<?= base_url('public/') ?>assets/js/sweetalert.min.js"></script>
    <!-- datepicker script -->
    <script src="<?= base_url('public/') ?>assets/js/bootstrap-datepicker.min.js"></script>
    <!-- creditCardValidator script -->
    <script src="<?= base_url('public/') ?>assets/js/jquery.creditCardValidator.js"></script>
    <!-- creditCardValidator script -->
    <script src="<?= base_url('public/') ?>assets/js/credit-card-scanner.js"></script>
    <script src="<?= base_url('public/') ?>assets/js/jquery.redirect.js"></script>
    <!-- ajax form -->
    <script src="<?= base_url('public/') ?>assets/js/jquery.form.min.js"></script>
    <!-- custom script -->
    <script src="<?= base_url('public/') ?>assets/js/app.js"></script>


    <script type="text/javascript">
        document.onkeyup = KeyCheckkk;

        function KeyCheckkk(e) {
            var KeyID = (window.event) ? event.keyCode : e.keyCode;
            if (KeyID == 113) {
                // $('#productList').load("<?php //echo site_url('pos/load_posalesdd/0'); 
                                            ?>");
                // location.reload();
            }
        }
    </script>

    <script>
        document.addEventListener("keydown", function(event) {
            var KeyID = (window.event) ? event.keyCode : e.keyCode;
            let baseUrl = '<?= base_url(); ?>';
            let currentUrl = '<?= current_url(); ?>'
            console.log(currentUrl);

            if ((currentUrl != baseUrl && !currentUrl.includes('purchase/add') && !currentUrl.includes('purchase'))) {
                if (event.key === "F8" || event.keyCode === 119 || event.keyCode === 113 || event.keyCode === 115) {
                    event.preventDefault(); // Optional: prevent browser default
                    $.ajax({
                        url: "<?php echo site_url('settings/updateSalesType'); ?>",
                        type: "POST",
                        data: {
                            keyCode: KeyID
                        },
                        success: function(data) {
                            window.location.reload();
                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            alert("error");
                        }
                    });
                }
            }
        });

        function myFunction() {
            alert("F8 key was pressed!");
            // your actual logic here
        }
    </script>


    <?php
    if ($setting->apponords == 1) {
    ?>
        <script src="<?php echo base_url('public/'); ?>assets/build/bootstrap-waitingfor.js"></script>

        <?php
        $tycc = $setting->backcloud;
        $rmst = $setting->backtimfrecon;
        $ryors = $setting->backsorno;
        $rf = [];
        // for ($jj = $rmst; $jj < 25; ) {
        //     $rf[] = $jj * 3600;
        //     $jj = $rmst + $jj;
        // }
        ?>
        <script>
            var jArrayk = <?php echo json_encode($rf); ?>;
            var tycc = <?php echo $tycc; ?>;
            var ryors = <?php echo $ryors; ?>;
            setInterval(function() {
                var timeNow = new Date();
                var hours = timeNow.getHours();
                var minutes = timeNow.getMinutes();
                var seconds = timeNow.getSeconds();
                var rerr = parseInt(hours * 60 * 60) + parseInt(minutes * 60) + parseInt(seconds);
                for (var i = 0; i < jArrayk.length; i++) {
                    var name = jArrayk[i];
                    if (name == rerr) {
                        if (tycc == 2 && ryors == 1) {
                            timeses();
                        } else if (tycc == 2 && ryors == 0) {
                            timesesauto();
                        } else {
                            timeseslocalauto();
                        }


                    }
                }
            }, 1000);

            function timeseslocalauto() {
                waitingDialog.show('Backup is running. Please wait for it to complete....');
                $.ajax({
                    url: "<?php echo site_url('auth/logsesslocal'); ?>/",
                    type: "POST",

                    success: function(data) {
                        setTimeout(function() {
                            waitingDialog.hide();
                        }, 1000);


                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        alert('Error adding / update data');
                    }
                });

            }

            function timesesauto() {

                waitingDialog.show('Backup is running. Please wait for it to complete...');
                $.ajax({
                    url: "<?php echo site_url('auth/logsess'); ?>/",
                    type: "POST",

                    success: function(data) {
                        setTimeout(function() {
                            waitingDialog.hide();
                        }, 1000);


                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        alert('Error adding / update data');
                    }
                });

            }

            function timeses() {


                swal({
                        title: "Are you sure?",
                        text: "Do you want to perform  database backup !",
                        type: "warning",
                        showCancelButton: true,
                        confirmButtonColor: '#DD6B55',
                        confirmButtonText: 'Cloud and Local',
                        cancelButtonText: "Local Only",
                        closeOnConfirm: true,
                        closeOnCancel: true
                    },
                    function(isConfirm) {
                        if (isConfirm) {
                            waitingDialog.show('Backup is running. Please wait for it to complete.');
                            $.ajax({
                                url: "<?php echo site_url('auth/logsess'); ?>/",
                                type: "POST",

                                success: function(data) {
                                    setTimeout(function() {
                                        waitingDialog.hide();
                                    }, 1000);


                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert('Error adding / update data');
                                }
                            });

                        } else {
                            waitingDialog.show('Backup is running. Please wait for it to complete.');
                            $.ajax({
                                url: "<?php echo site_url('auth/logsesslocal'); ?>/",
                                type: "POST",

                                success: function(data) {
                                    setTimeout(function() {
                                        waitingDialog.hide();
                                    }, 1000);
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert('Error adding / update data');
                                }
                            });
                        }
                    });


            }


            function logoutses() {


                swal({
                        title: "Are you sure?",
                        text: "Do you want to perform  database backup !",
                        type: "warning",
                        showCancelButton: true,
                        confirmButtonColor: '#DD6B55',
                        confirmButtonText: 'Yes, I am sure!',
                        cancelButtonText: "No,Just Logout",
                        closeOnConfirm: true,
                        closeOnCancel: true
                    },
                    function(isConfirm) {
                        if (isConfirm) {
                            waitingDialog.show('Backup is running. Please wait for it to complete.');
                            $.ajax({
                                url: "<?php echo site_url('auth/logout'); ?>/",
                                type: "POST",

                                success: function(data) {

                                    window.location = "<?php echo site_url('auth/logoutnext'); ?>/";
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert('Error adding / update data');
                                }
                            });

                        } else {
                            window.location = "<?php echo site_url('auth/logoutnext'); ?>/";
                        }
                    });
            }
        </script>
    <?php
    }

    $connected = @fsockopen("www.google.com", 80);
    if ($connected) {
    ?>
        <!-- <script type="text/javascript">
    var mobile = '<?php echo $setting->phone; ?>';
    var idd = '<?php //echo str_replace('(', '', str_replace(')', '', GetVolumeLabel('c'))); 
                ?>';
    $.ajax({
        url: "http://chltech.in/retailenc/login/capcl_upp",
        type: "POST",
        data: {
            idd: idd,
            mobilee: mobile
        },
        success: function(data) {},
        error: function(jqXHR, textStatus, errorThrown) {}
    });
</script> -->
    <?php }
    ?>
</body>



</html>