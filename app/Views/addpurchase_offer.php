<script type="text/javascript" src="<?php echo base_url(); ?>public/assets/wildel/jquery-1.10.2.min.js"></script>
<script type="text/javascript" src="<?php echo base_url(); ?>public/assets/wildel/jquery-ui-1.10.3.custom.min.js"></script>

<div class="container">
    <div class="col-md-12">
        <?php $tab = (isset($_GET['tab'])) ? $_GET['tab'] : null; ?>
        <script type="text/javascript" src="https://www.google.com/jsapi"></script>

        <script type="text/javascript">
            google.load("elements", "1", {
                packages: "transliteration"
            });

            function onLoad() {
                var options = {
                    sourceLanguage: 'en', // or google.elements.transliteration.LanguageCode.ENGLISH,
                    destinationLanguage: ['<?= label("languagek"); ?>'], // or [google.elements.transliteration.LanguageCode.HINDI],
                    shortcutKey: 'ctrl+g',
                    transliterationEnabled: true
                };
                var control = new google.elements.transliteration.TransliterationControl(options);
                var ids = ["countryname_1m"];
                control.makeTransliteratable(ids);
                control.showControl('translControl');
            }
            google.setOnLoadCallback(onLoad);
        </script>


        <script language="javascript" type="text/javascript">
            function getXMLHTTP() {
                var xmlhttp = false;
                try {
                    xmlhttp = new XMLHttpRequest();
                } catch (e) {
                    try {
                        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
                    } catch (e) {
                        try {
                            xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
                        } catch (e1) {
                            xmlhttp = false;
                        }
                    }
                }
                return xmlhttp;
            }

            function getdetals(countryId, vvv) {
                var vvvxx = vvv;
                var itemss = vvvxx.split('_');
                var jjv = itemss[1];
                var strURL = "<?php echo base_url(); ?>purchase/findcctn?country=" + countryId;
                var req = getXMLHTTP();
                if (req) {
                    req.onreadystatechange = function() {
                        if (req.readyState == 4) {
                            if (req.status == 200) {
                                var data = req.responseText.split(",");
                                $('#cosst_' + jjv).val(data[0]);
                                $('#selling_' + jjv).val(data[1]);

                                $('#cgst_' + jjv).val(data[2]);
                                $('#sgst_' + jjv).val(data[3]);



                                $('#qty_' + jjv).val(0);
                                $('#subtt_' + jjv).val(0);



                            } else {
                                alert("There was a problem while using XMLHTTP:\n" + req.statusText);
                            }
                        }
                    }
                    req.open("GET", strURL, true);
                    req.send(null);
                }


            }

            function getState(countryId, jjj) {


                var idxx = jjj;

                var items = idxx.split('_');
                var jj = items[1];


                var strURL = "<?php echo base_url(); ?>purchase/findState?country=" + countryId;
                var req = getXMLHTTP();
                if (req) {
                    req.onreadystatechange = function() {
                        if (req.readyState == 4) {
                            if (req.status == 200) {

                                document.getElementById('statediv_' + jj).innerHTML = req.responseText;
                            } else {
                                alert("There was a problem while using XMLHTTP:\n" + req.statusText);
                            }
                        }
                    }
                    req.open("GET", strURL, true);
                    req.send(null);
                }
            }

            function getStatebrd(countryId, jjj) {


                var idxx = jjj;

                var items = idxx.split('_');
                var jj = items[1];


                var strURL = "<?php echo base_url(); ?>purchase/findStatebran?country=" + countryId;
                var req = getXMLHTTP();
                if (req) {
                    req.onreadystatechange = function() {
                        if (req.readyState == 4) {
                            if (req.status == 200) {

                                document.getElementById('customerSelect_' + jj).innerHTML = req.responseText;
                            } else {
                                alert("There was a problem while using XMLHTTP:\n" + req.statusText);
                            }
                        }
                    }
                    req.open("GET", strURL, true);
                    req.send(null);
                }
            }
        </script>
        <script>
            $(document).ready(function() {
                $(document).on("click", "#addMoreRows", function() { //alert("ddssss");
                    var inc = 1;
                    var vl = $('#countid').val();
                    var vl1 = (parseFloat(vl) + parseFloat(inc));
                    //alert(vl1);
                    //alert(vl);
                    $('#countid').val(vl1);
                    var datastring = 'countid=' + vl1;

                    $.ajax({
                        type: "POST",
                        url: "<?php echo base_url(); ?>purchase/addrow",
                        data: datastring,
                        cache: false,
                        success: function(result) {
                            // alert(result);

                            $('#education_fields').append(result);
                        }
                    });

                });

            });
        </script>


        <script type="text/javascript">
            function education_fields() {

                var ttyt = document.getElementById('totelemt').value;
                ttyt++;
                document.getElementById('totelemt').value = ttyt;
                document.getElementById('add' + ttyt).style.display = 'block';


            }

            function remove_education_fields(rid) {
                $.ajax({
                    url: "<?php echo site_url('pos/load_pogoodpurrdel_offer') ?>",
                    type: "POST",
                    data: {
                        rid: rid
                    },
                    success: function(data) {

                        $('#productListkar').html(data);
                        $('#countryname_1m').focus();


                        var amtt = 0;
                        var ttcgst = 0;
                        var ttsgst = 0;
                        var totitem = 0;
                        var cc1 = 0;
                        var ss1 = 0;
                        var ttyt = document.getElementById('ll').value;
                        var ss = ttyt.split(",");

                        for (var i in ss) {
                            xt = ss[i];
                            var elementExists = document.getElementById('subtt_' + xt);
                            if (elementExists != null) {
                                var rssss = document.getElementById('subtt_' + xt).value;
                                var xxz = document.getElementById('qty_' + xt).value;
                                amtt = parseFloat(amtt) + parseFloat(rssss);
                                totitem = parseFloat(totitem) + parseFloat(xxz);
                                var c1 = document.getElementById('cgst_' + xt).value;
                                var tty = (parseFloat(c1) * parseFloat(amtt)) / 100;
                                $("#ttcgst_" + xt).val(tty);
                                cc1 = parseFloat(cc1) + parseFloat(tty);
                                var s1 = document.getElementById('sgst_' + xt).value;
                                var sty = (parseFloat(s1) * parseFloat(amtt)) / 100;
                                $("#ttsgst_" + xt).val(sty);
                                ss1 = parseFloat(ss1) + parseFloat(sty);
                            }
                        }
                        var dd1 = document.getElementById('ddkst').value;
                        var flss1 = parseFloat(amtt) + parseFloat(cc1) + parseFloat(ss1) - parseFloat(dd1);
                        $("#betot").val(amtt.toFixed(<?= $setting->decimals; ?>));
                        $("#discct").val(totitem);
                        $("#cskgst").val(0);
                        $("#sskgst").val(ss1.toFixed(<?= $setting->decimals; ?>));
                        $("#afftot").val(amtt.toFixed(<?= $setting->decimals; ?>));
                        $("#innvamt").val(flss1.toFixed(<?= $setting->decimals; ?>));


                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        alert("error 4");
                    }
                });



            }


            function callds(cc, bb) {

                var va1 = document.getElementById('betot').value;
                var va2 = document.getElementById('cskgst').value;
                var va3 = document.getElementById('sskgst').value;


                var kmxx = parseFloat(va1) + parseFloat(va2) + parseFloat(va3) - parseFloat(cc);

                $("#afftot").val(kmxx.toFixed(<?= $setting->decimals; ?>));
                $("#innvamt").val(kmxx.toFixed(<?= $setting->decimals; ?>));





            }



            function callcc_qtt(cc, bb) {
                var ttyt = document.getElementById('totelemt').value;
                var items = bb.split('_');
                var jj = items[1];
                var va1 = document.getElementById('selling_' + jj).value;
                var va1_tt = va1;
                var tmm = document.getElementById('tax_methord_' + jj).value;
                var tctaxx = document.getElementById('cgst_' + jj).value;
                if (tmm == 1) {
                    va1_tt = parseFloat(va1) * (1 + (parseFloat(tctaxx) / parseFloat(100)));
                }

                var qqty = cc;
                var kmxx = parseFloat(va1_tt) * parseFloat(qqty);
                $("#subtt_" + jj).val(kmxx);

                var amtt = 0;
                var totitem = 0;
                var cc1 = 0;
                var ss1 = 0;
                var myStr = document.getElementById('ll').value;
                var strArray = myStr.split(",");
                for (var i = 0; i < strArray.length; i++) {
                    var xt = strArray[i];

                    var elementExists = document.getElementById('subtt_' + xt);
                    if (elementExists != null) {
                        var rssss = document.getElementById('subtt_' + xt).value;
                        var xxz = document.getElementById('qty_' + xt).value;

                        amtt = parseFloat(amtt) + parseFloat(rssss);
                        totitem = parseFloat(totitem) + parseFloat(xxz);

                        var c1 = document.getElementById('cgst_' + xt).value;
                        var tty = (parseFloat(c1) * parseFloat(rssss)) / 100;
                        $("#ttcgst_" + xt).val(tty);
                        cc1 = parseFloat(cc1) + parseFloat(tty);
                        var s1 = document.getElementById('sgst_' + xt).value;
                        var sty = (parseFloat(s1) * parseFloat(rssss)) / 100;
                        $("#ttsgst_" + xt).val(sty);
                        ss1 = parseFloat(ss1) + parseFloat(sty);

                    }
                }

                var dd1 = document.getElementById('ddkst').value;

                var flss1 = parseFloat(amtt) + parseFloat(cc1) + parseFloat(ss1) - parseFloat(dd1);

                $("#betot").val(amtt.toFixed(<?= $setting->decimals; ?>));
                $("#discct").val(totitem);
                $("#cskgst").val(0);
                $("#sskgst").val(ss1.toFixed(<?= $setting->decimals; ?>));
                $("#afftot").val(amtt.toFixed(<?= $setting->decimals; ?>));
                $("#innvamt").val(flss1.toFixed(<?= $setting->decimals; ?>));

            }



            function callcc_rss(cc, bb) {
                var ttyt = document.getElementById('totelemt').value;
                var items = bb.split('_');
                var jj = items[1];

                var va1 = cc;
                var va1_tt = va1;
                var tmm = document.getElementById('tax_methord_' + jj).value;
                var tctaxx = document.getElementById('cgst_' + jj).value;
                if (tmm == 1) {
                    va1_tt = parseFloat(va1) * (1 + (parseFloat(tctaxx) / parseFloat(100)));
                }


                var qqty = document.getElementById('qty_' + jj).value;

                var kmxx = parseFloat(va1_tt) * parseFloat(qqty);
                $("#subtt_" + jj).val(kmxx);

                var amtt = 0;
                var totitem = 0;
                var cc1 = 0;
                var ss1 = 0;


                var myStr = document.getElementById('ll').value;
                var strArray = myStr.split(",");
                for (var i = 0; i < strArray.length; i++) {
                    var xt = strArray[i];

                    var elementExists = document.getElementById('subtt_' + xt);
                    if (elementExists != null) {
                        var rssss = document.getElementById('subtt_' + xt).value;
                        var xxz = document.getElementById('qty_' + xt).value;

                        amtt = parseFloat(amtt) + parseFloat(rssss);
                        totitem = parseFloat(totitem) + parseFloat(xxz);

                        var c1 = document.getElementById('cgst_' + xt).value;
                        var tty = (parseFloat(c1) * parseFloat(rssss)) / 100;
                        $("#ttcgst_" + xt).val(tty);
                        cc1 = parseFloat(cc1) + parseFloat(tty);
                        var s1 = document.getElementById('sgst_' + xt).value;
                        var sty = (parseFloat(s1) * parseFloat(rssss)) / 100;
                        $("#ttsgst_" + xt).val(sty);
                        ss1 = parseFloat(ss1) + parseFloat(sty);

                    }
                }

                var dd1 = document.getElementById('ddkst').value;

                var flss1 = parseFloat(amtt) + parseFloat(cc1) + parseFloat(ss1) - parseFloat(dd1);

                $("#betot").val(amtt.toFixed(<?= $setting->decimals; ?>));
                $("#discct").val(totitem);
                $("#cskgst").val(0);
                $("#sskgst").val(ss1.toFixed(<?= $setting->decimals; ?>));
                $("#afftot").val(amtt.toFixed(<?= $setting->decimals; ?>));
                $("#innvamt").val(flss1.toFixed(<?= $setting->decimals; ?>));

            }



            function callcctt(cc, bb) {
                var rssss = document.getElementById('betot').value;

                var nmm = parseFloat(rssss);
                if (cx != '') {


                    $("#aftot").val(kmaa);

                } else {

                    $("#aftot").val(nmm);

                }
            }
        </script>











        <script>
            $(document).ready(function() {
                $.ajax({
                    url: "<?php echo site_url('Pos/load_posalesmsk_offers') ?>",
                    type: "POST",
                    data: {
                        producnum: 10
                    },
                    success: function(data) {

                        $('#productListkar').html(data);

                        var amtt = 0;
                        var totitem = 0;
                        var cc1 = 0;
                        var ss1 = 0;
                        var ttyt = document.getElementById('ll').value;
                        var ss = ttyt.split(",");
                        for (var i in ss) {
                            xt = ss[i];
                            var elementExists = document.getElementById('subtt_' + xt);
                            if (elementExists != null) {
                                var rssss = document.getElementById('subtt_' + xt).value;
                                var xxz = document.getElementById('qty_' + xt).value;
                                amtt = parseFloat(amtt) + parseFloat(rssss);
                                totitem = parseFloat(totitem) + parseFloat(xxz);
                                var c1 = document.getElementById('cgst_' + xt).value;
                                var tty = (parseFloat(c1) * parseFloat(rssss)) / 100;
                                $("#ttcgst_" + xt).val(tty);
                                cc1 = parseFloat(cc1) + parseFloat(tty);
                                var s1 = document.getElementById('sgst_' + xt).value;
                                var sty = (parseFloat(s1) * parseFloat(rssss)) / 100;
                                $("#ttsgst_" + xt).val(sty);
                                ss1 = parseFloat(ss1) + parseFloat(sty);
                            }
                        }
                        var dd1 = document.getElementById('ddkst').value;
                        var flss1 = parseFloat(amtt) + parseFloat(cc1) + parseFloat(ss1) - parseFloat(dd1);
                        $("#betot").val(amtt.toFixed(<?= $setting->decimals; ?>));
                        $("#discct").val(totitem);
                        $("#cskgst").val(0);
                        $("#sskgst").val(ss1.toFixed(<?= $setting->decimals; ?>));
                        $("#afftot").val(amtt.toFixed(<?= $setting->decimals; ?>));
                        $("#innvamt").val(flss1.toFixed(<?= $setting->decimals; ?>));



                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        alert("error 1");
                    }
                });

            });

            function ckkkr() {

                var kk = $("#discct").val();
                var mm = $("#betot").val();
                if (kk > 0)

                {

                    return true;
                } else {
                    alert("Please enter at least one purchase");
                    return false;
                }


            }



            function selectState(nam, m, idd, rss, cgg, sgg) {
                $("#country_" + m).val(nam);
                $("#cosst_" + m).val(rss);
                $("#proid_" + m).val(idd);
                $("#cgst_" + m).val(cgg);
                $("#sgst_" + m).val(sgg);
                $("#suggesstion-box_" + m).hide();
            }
        </script>





        </html>



        <style>
            .vvv ul {
                background-color: #f8f1f1;
                z-index: 1000;

                cursor: pointer;
                width: 90%;
                position: absolute;
                padding: 10px;
            }

            .vvv li {
                padding: 5px;

            }
        </style>

        <h3><?= label("Add"); ?> <?= label("offers"); ?> <a style="float: right;" class="btn btn-primary btn-red" href="<?php echo base_url(); ?>offers"><?= label("Back"); ?></a></h3>
        <hr>
        <input type="hidden" id="countid" value="1">


        <form method="post" action="<?php echo base_url(); ?>purchase/addtodbb_offers">

            <div class="panel-body">


                <?php
                $ikmm = $db->query("select id from purchases order by id desc ")->getRowArray();
                $knn = $ikmm['id'] + 1;
                ?>

                <input readonly="readonly" class="form-control" type="hidden" name="prcno" id="prcno" value="<?php echo $knn; ?>">
                <input class="form-control" type="hidden" name="pptye" id="pptye" value="0" />
                <input class="form-control" type="hidden" name="ref" id="ref" value="Offers" />
                <?php
                $kmkllll = mysql_fetch_array(mysql_query("select  id,warstore from settings where id=1 "));
                if ($kmkllll['warstore'] == 1) { ?>
                    <input class="form-control" type="hidden" name="warr" id="warr" value="1" />
                    <input type="hidden" id="storrid" name="storrid" value="0">
                <?php } else {
                ?>
                    <input type="hidden" id="warr" name="warr" value="0">
                    <input class="form-control" type="hidden" name="supp" id="storrid" required="storrid" value="1" />
                <?php  } ?>

                <input class="form-control" type="hidden" name="supp" id="supp" required="required" value="1" />

            </div>
            <div class="panel-body">
                <input class="form-control" type="hidden" name="innvno" id="innvno" required="required" value="1" />
                <input required="required" class="form-control" type="hidden" name="innvamt" id="innvamt" value="" />
                <div class="col-sm-12 ">
                    <div class="panel-body" style="padding: 0px;">
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th style="text-align: center;" class=" table-header">
                                        <span><?= label("Barcode or Product Fetch"); ?></span>
                                    </th>
                                    <th class=" table-header">
                                        <span><?= label("Selling"); ?> <?= label("Price"); ?> </span>

                                    </th>
                                    <?php
                                    $lxzmm = mysql_fetch_array(mysql_query("SELECT * FROM settings WHERE id=1 "));
                                    if ($lxzmm['gst_tax'] == 1) {
                                    ?>
                                        <th style="text-align: center;text-align: center;" class=" table-header">
                                            <span><?= label("tax"); ?></span>
                                        </th>


                                    <?php
                                    }
                                    ?>
                                    <th style="text-align: center;padding: 0px 0px;" style="text-align: center;" class=" table-header">
                                        <span><?= label("Valid From"); ?></span>
                                    </th>
                                    <th style="text-align: center;padding: 0px 0px;" style="text-align: center;" class=" table-header">
                                        <span><?= label("Valid To"); ?></span>
                                    </th>
                                    <th style="text-align: center;padding: 0px 0px;" style="text-align: center;" class=" table-header">
                                        <span><?= label("Offer"); ?> <?= label("Qty"); ?></span>
                                    </th>
                                    <th style="text-align: center;padding: 0px 0px;" style="text-align: center;" class=" table-header">
                                        <span><?= label("Available Qty"); ?></span>
                                    </th>
                                    <th class=" table-header">
                                        <span><?= label("Offer"); ?> <?= label("Price"); ?> </span>
                                    </th>

                                    <th class="col-xs-2 table-header">
                                        <span><?= label("Total"); ?> <?= label("Price"); ?> </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr id="add1" class="">

                                    <td class="" style="padding-right: 1px;padding-left: 1px;">
                                        <div class="form-group">
                                            <input onkeyup="return auromcv(this.value,this.id);" class="form-control" type='text' id='countryname_1m'>
                                            <input class="form-control" type='hidden' id="statediv_1m" />
                                        </div>
                                    </td>


                                    <script type="text/javascript">
                                        function barcodekar() {


                                            var producnum = $('#statediv_1m').val();
                                            if (producnum == '') {
                                                $('#countryname_1m').focus();
                                                return false;
                                            }

                                            var purrs = $('#cosst_1m').val();
                                            if (purrs == '') {
                                                $('#cosst_1m').focus();
                                                return false;
                                            }

                                            var sellrs = $('#selling_1m').val();
                                            if (sellrs == '') {
                                                $('#selling_1m').focus();
                                                return false;
                                            }

                                            var qqty = $('#qty_1m').val();
                                            if (qqty == '' || qqty == 0 || qqty == '0') {
                                                $('#qty_1m').focus();
                                                return false;
                                            }

                                            var cgstt = $('#cgst_1m').val();
                                            var sgst = $('#sgst_1m').val();


                                            var toto = $('#subtt_1m').val();
                                            if (toto == '') {
                                                $('#subtt_1m').focus();
                                                return false;
                                            }

                                            var atorr = $('#totelemt').val();
                                            var tax_t1 = $('#tax_t1').val();
                                            var pddate = $('#pddate').val();
                                            var innvdda = $('#innvdda').val();


                                            var nj = atorr++;
                                            $.ajax({
                                                url: "<?php echo site_url('pos/load_pogoodpurr_offer') ?>",
                                                type: "POST",
                                                data: {
                                                    pddate: pddate,
                                                    innvdda: innvdda,
                                                    tax_methord: tax_t1,
                                                    producnum: producnum,
                                                    purrs: purrs,
                                                    sellrs: sellrs,
                                                    qqty: qqty,
                                                    cgstt: cgstt,
                                                    sgst: sgst,
                                                    toto: toto
                                                },
                                                success: function(data) {

                                                    $('#productListkar').html(data);
                                                    $('#statediv_1m').val('');
                                                    $('#countryname_1m').val('');
                                                    $('#cosst_1m').val('');
                                                    $('#selling_1m').val('');
                                                    $('#qty_1m').val('');
                                                    $('#cgst_1m').val('');
                                                    $('#sgst_1m').val('');
                                                    $('#subtt_1m').val('');
                                                    $('#totelemt').val(nj);
                                                    $('#countryname_1m').focus();

                                                    var amtt = 0;
                                                    var totitem = 0;
                                                    var cc1 = 0;
                                                    var ss1 = 0;
                                                    var ttyt = document.getElementById('ll').value;
                                                    var ss = ttyt.split(",");
                                                    for (var i in ss) {
                                                        xt = ss[i];
                                                        var elementExists = document.getElementById('subtt_' + xt);
                                                        if (elementExists != null) {
                                                            var rssss = document.getElementById('subtt_' + xt).value;
                                                            var xxz = document.getElementById('qty_' + xt).value;
                                                            amtt = parseFloat(amtt) + parseFloat(rssss);
                                                            totitem = parseFloat(totitem) + parseFloat(xxz);
                                                            var c1 = document.getElementById('cgst_' + xt).value;
                                                            var tty = (parseFloat(c1) * parseFloat(rssss)) / 100;
                                                            $("#ttcgst_" + xt).val(tty);
                                                            cc1 = parseFloat(cc1) + parseFloat(tty);
                                                            var s1 = document.getElementById('sgst_' + xt).value;
                                                            var sty = (parseFloat(s1) * parseFloat(rssss)) / 100;
                                                            $("#ttsgst_" + xt).val(sty);
                                                            ss1 = parseFloat(ss1) + parseFloat(sty);
                                                        }
                                                    }
                                                    var dd1 = document.getElementById('ddkst').value;
                                                    var flss1 = parseFloat(amtt) + parseFloat(cc1) + parseFloat(ss1) - parseFloat(dd1);
                                                    $("#betot").val(amtt.toFixed(<?= $setting->decimals; ?>));
                                                    $("#discct").val(totitem);
                                                    $("#cskgst").val(0);
                                                    $("#sskgst").val(ss1.toFixed(<?= $setting->decimals; ?>));
                                                    $("#afftot").val(amtt.toFixed(<?= $setting->decimals; ?>));
                                                    $("#innvamt").val(flss1.toFixed(<?= $setting->decimals; ?>));



                                                },
                                                error: function(jqXHR, textStatus, errorThrown) {
                                                    alert("error 2");
                                                }
                                            });



                                        };

                                        $(document).ready(function() {
                                            $('#mexpdate_1m').datepicker({
                                                todayHighlight: true,
                                                autoclose: true
                                            });
                                        });

                                        $(document).ready(function() {
                                            $('#expdate_1m').datepicker({
                                                todayHighlight: true,
                                                autoclose: true
                                            });
                                        });
                                    </script>





                                    <script type="text/javascript">
                                        function caliuu(cc, bb) {

                                            var va1 = document.getElementById('cosst_1mex').value;
                                            var kmxx1 = parseFloat(va1) / parseFloat(cc);
                                            $("#cosst_1m").val(kmxx1.toFixed(2));

                                            var va2 = document.getElementById('selling_1mex').value;
                                            var kmxx2 = parseFloat(va2) / parseFloat(cc);
                                            $("#selling_1m").val(kmxx2.toFixed(2));

                                            var va3 = document.getElementById('stropex').value;
                                            var kmxx3 = parseFloat(cc) * parseFloat(va3);
                                            $("#qty_1m").val(kmxx3);



                                        }


                                        function calstrip(cc, bb) {

                                            var available_quantity = Number($('#available_quantity').val());

                                            if (cc >= available_quantity) {
                                                console.log(cc);
                                                console.log(available_quantity);

                                                alert("Offer quantity should less than available quantity");
                                                $('#' + bb).val(1);
                                                return false;
                                            }


                                            var va1 = document.getElementById('cosst_1m').value;


                                            var va1_tt = va1;
                                            var tax_t1 = document.getElementById('tax_t1').value;
                                            var cgst_1m = document.getElementById('cgst_1m').value;


                                            if (tax_t1 == 1) {
                                                va1_tt = parseFloat(va1) * (1 + (parseFloat(cgst_1m) / parseFloat(100)));
                                            }






                                            var kmxx = parseFloat(va1_tt) * parseFloat(cc);
                                            $("#subtt_1m").val(kmxx.toFixed(2));

                                        }

                                        function calstrip_c(cc, bb) {

                                            var cc_tot = cc;
                                            var tax_t1 = document.getElementById('tax_t1').value;
                                            var cgst_1m = document.getElementById('cgst_1m').value;


                                            if (tax_t1 == 1) {
                                                cc_tot = parseFloat(cc) * (1 + (parseFloat(cgst_1m) / parseFloat(100)));
                                            }


                                            var va1 = document.getElementById('qty_1m').value;
                                            var kmxx = parseFloat(va1) * parseFloat(cc_tot);
                                            $("#subtt_1m").val(kmxx.toFixed(2));

                                        }

                                        function calpurc(cc, bb) {
                                            var va1 = document.getElementById('stropex').value;
                                            var kmxx = parseFloat(va1) * parseFloat(cc);
                                            $("#subtt_1m").val(kmxx.toFixed(2));

                                            var va2 = document.getElementById('iuuex').value;
                                            var kmxx2 = parseFloat(cc) / parseFloat(va2);
                                            $("#cosst_1m").val(kmxx2.toFixed(2));
                                        }

                                        function calsell(cc, bb) {
                                            var va2 = document.getElementById('iuuex').value;
                                            var kmxx2 = parseFloat(cc) / parseFloat(va2);
                                            $("#selling_1m").val(kmxx2.toFixed(2));
                                        }
                                    </script>



                                    <td style="padding-right: 1px;padding-left: 1px;" class="">
                                        <div class="form-group">
                                            <input readonly="readonly" type="text" class="form-control" id="selling_1m" value="" placeholder="Cost"><br>
                                        </div>
                                    </td>


                                    <?php
                                    if ($lxzmm['gst_tax'] == 1) { ?>
                                        <td style="padding-right: 1px;padding-left: 1px;" class="">
                                            <div class="form-group">
                                                <input style="padding: 0px 0px;" readonly="readonly" type="text" class="form-control" id="cgst_1m" value="" placeholder="tax">
                                                <input style="padding: 0px 0px;" type="hidden" class="form-control" id="tax_t1" value="" />
                                            </div>
                                        </td>

                                        <input style="padding: 0px 0px;" readonly="readonly" type="hidden" class="form-control" id="sgst_1m" value="" placeholder="Sgst">



                                    <?php
                                    } else {
                                        #4488c9;

                                    ?>

                                        <input readonly="readonly" type="hidden" class="form-control" id="cgst_1m" value="0">

                                        <input type="hidden" id="tax_t1" value="0" />

                                        <input readonly="readonly" type="hidden" class="form-control" id="sgst_1m" value="0">


                                    <?php } ?>




                                    <td class="" style="padding-right: 1px;padding-left: 1px;">
                                        <div class="form-group">
                                            <input style="padding: 0px 0px;" type="text" class="form-control" name="pddate" id="pddate" value="<?php echo date("d-m-Y"); ?>" />
                                        </div>
                                    </td>
                                    <td class="" style="padding-right: 1px;padding-left: 1px;">
                                        <div class="form-group">
                                            <input style="padding: 0px 0px;" type="text" class="form-control" name="innvdda" id="innvdda" value="<?php echo date("d-m-Y"); ?>" />
                                        </div>
                                    </td>
                                    <td class="" style="padding-right: 1px;padding-left: 1px;">
                                        <div class="form-group">
                                            <input style="padding: 0px 0px;" type="text" onkeyup="return calstrip(this.value,this.id);" class="form-control" id="qty_1m" value="" placeholder="Quantity">
                                        </div>
                                    </td>
                                    <td class="" style="padding-right: 1px;padding-left: 1px;">
                                        <div class="form-group">
                                            <input style="padding: 0px 0px;" type="text" readonly class="form-control" id="available_quantity" value="" placeholder="">
                                        </div>
                                    </td>

                                    <td class="" style="padding-right: 1px;padding-left: 1px;">
                                        <div class="form-group">
                                            <input onkeyup="return calstrip_c(this.value,this.id);" type="text" class="form-control" id="cosst_1m" value="" placeholder="Cost"><br>
                                        </div>
                                    </td>



                                    <!-- <div class="col-sm-2 " style="padding-right: 1px;padding-left: 1px;">
                                    </div> -->

                                    <td class="" style="padding-right: 1px;padding-left: 1px;">
                                        <div class="input-group">
                                            <input readonly="readonly" type="text" class="form-control" value="0" id="subtt_1m" value="" placeholder="Cost">
                                            <div class="input-group-btn">
                                                <button class="btn btn-success" type="button" onclick="barcodekar()">
                                                    <span class="glyphicon glyphicon-plus" aria-hidden="true"></span></button>
                                            </div>
                                        </div>
                                    </td>

                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <input type="hidden" id="totelemt" name="totelemt" value="1" />
                    <div class="panel panel-default">

                        <div class="panel-heading"><?= label("Products"); ?> </div>
                        <div class="panel-body">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th style="text-align: center;" class="col-xs-3 table-header">
                                            <?= label("Product"); ?>
                                        </th>

                                        <th style="text-align: center;" class="col-xs-1 table-header">
                                            <?= label("Price"); ?>
                                        </th>
                                        <?php
                                        $lxzmm = mysql_fetch_array(mysql_query("SELECT * FROM settings WHERE id=1 "));
                                        if ($lxzmm['gst_tax'] == 1) {
                                        ?>
                                            <th style="text-align: center;text-align: center;" class="col-xs-1 table-header">
                                                <?= label("tax"); ?>
                                            </th>
                                        <?php
                                        }
                                        ?>
                                        <th style="text-align: center;" class="col-xs-1 table-header">
                                            <?= label("Quantity"); ?>
                                        </th>
                                        <th style="text-align: left;" class="col-xs-1 table-header">
                                            <?= label("Offer"); ?> <?= label("Price"); ?>
                                        </th>
                                        <th style="text-align: left;" class="col-xs-2 table-header">
                                            <?= label("Total"); ?> <?= label("Price"); ?>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="productListkar">
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th></th>
                                        <th></th>
                                        <!-- <div ></div> -->
                                        <?php
                                        if ($lxzmm['gst_tax'] == 1) { ?>
                                            <div></div>
                                            <div></div>
                                        <?php
                                        }
                                        ?>
                                        <th><?= label("TotalItems"); ?></th>
                                        <th><input readonly="readonly" type="text" class="form-control" id="discct" name="discct" value="" placeholder="Total">
                                        </th>
                                        <th><?= label("Total"); ?> </th>
                                        <th><input readonly="readonly" type="text" class="form-control" id="betot" name="betot" value="" placeholder="Total"></th>
                                    </tr>
                                </tfoot>
                            </table>

                            <br>
                            <br>
                            <br>

                            <?php
                            if ($lxzmm['gst_tax'] == 1) { ?>
                                <div class="col-xs-12">
                                    <div class="col-sm-2 "></div>
                                    <div class="col-sm-2 "></div>
                                    <div class="col-sm-1 "></div>
                                    <?php
                                    if ($lxzmm['gst_tax'] == 1) { ?>
                                        <div class="col-sm-1 "></div>
                                        <div class="col-sm-1 "></div>
                                    <?php
                                    }
                                    ?>
                                    <div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 "><br><input readonly="readonly" type="hidden" class="form-control" id="cskgst" name="cskgst" value="" placeholder="Total"></div>
                                    <?php
                                    if ($lxzmm['gst_tax'] == 1) { ?>
                                    <?php
                                    }
                                    ?>
                                    <input readonly="readonly" type="hidden" class="form-control" id="sskgst" name="sskgst" value="" placeholder="">
                                <?php } else { ?>

                                    <input readonly="readonly" type="hidden" class="form-control" id="cskgst" name="cskgst" value="" placeholder="Total">
                                    <input readonly="readonly" type="hidden" class="form-control" id="sskgst" name="sskgst" value="" placeholder="">

                                <?php
                            } ?>
                                <div class="col-xs-12">
                                    <div class="col-sm-2 "></div>
                                    <div class="col-sm-2 "></div>
                                    <div class="col-sm-1 "></div>
                                    <?php
                                    if ($lxzmm['gst_tax'] == 1) { ?>
                                        <div class="col-sm-1 "></div>
                                        <div class="col-sm-1 "></div>
                                    <?php
                                    }
                                    ?>
                                    <input onkeyup="return callds(this.value,this.id);" type="hidden" class="form-control" id="ddkst" name="ddkst" value="0" placeholder="">
                                    <input readonly="readonly" type="hidden" class="form-control" id="afftot" name="afftot" value="" placeholder="Total">
                                    <div class="col-xs-12">
                                        <div class="col-sm-2 "></div>
                                        <div class="col-sm-1 "></div>
                                        <!-- <div class="col-sm-1 "></div> -->
                                        <?php
                                        if ($lxzmm['gst_tax'] == 1) { ?>
                                            <div class="col-sm-1 "></div>
                                            <div class="col-sm-1 "></div>
                                        <?php
                                        }
                                        ?>
                                        <div class="col-sm-5 "></div>
                                        <div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 "><br><input onclick="return ckkkr();" type="submit" class="form-control btn btn-green" id="aftot" name="Submit" value="Save"></div>
                                        <div class="clear"></div>
                                    </div>
                                </div>
                                <div class="panel-footer"><small><em><a href="javascript:void(0);"></a></em></em></small></div>
                                </div>
                        </div>
                    </div>
                </div>
        </form>

        <script type="text/javascript">
            /******** passwors confirmation validation ****************/

            var currency = document.getElementById("currency");

            function validatecurrency() {
                if (currency.value.length < 3) {
                    currency.setCustomValidity("The Currency code must be at least 3 characters length");
                } else {
                    currency.setCustomValidity('');
                }
            }
            if (currency) currency.onchange = validatecurrency;

            $('.collapse').collapse()
        </script>



        <script type="text/javascript">
            function saleBtn(type) {

                var bbtna = $('#bkmfgbbcg').val();
                var ecpnn = $('#bkexpdate').val();
                var mecpnn = $('#bkmexpdate').val();
                var ecpame = $('#bkmfgname').val();

                $.ajax({
                    url: "<?php echo site_url('pos/savebatch') ?>/" + type,
                    type: "POST",
                    data: {
                        bbtna: bbtna,
                        ecpnn: ecpnn,
                        mecpnn: mecpnn,
                        ecpame: ecpame
                    },
                    success: function(data) {
                        $('#bkmfgbbcg').val('');
                        $('#bkexpdate').val('');
                        $('#bkmexpdate').val('');
                        $('#bkmfgname').val('');
                        $('#AddWarehouse').modal('hide');

                        $('#printSection').html(data);
                        $('#Addpayament').modal('show');

                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        alert("error 3");
                    }
                });

                $('#CreditCardNum').val('');
                $('#CreditCardHold').val('');
                $('#CreditCardYear').val('');
                $('#CreditCardMonth').val('');
                $('#CreditCardCODECV').val('');

            }

            function PrintTicket() {
                $('.modal-body').removeAttr('id');
                window.print();
                $('.modal-body').attr('id', 'modal-body');
            }


            $(document).ready(function() {
                $('#pddate').datepicker({
                    todayHighlight: true,
                    autoclose: true
                });
            });

            $(document).ready(function() {
                $('#innvdda').datepicker({
                    todayHighlight: true,
                    autoclose: true
                });

                $('#bkexpdate').datepicker({
                    todayHighlight: true,
                    autoclose: true
                });

                $('#bkmexpdate').datepicker({
                    todayHighlight: true,
                    autoclose: true
                });
            });
        </script>
        <script>
            function auromcv(kk, mm) {

                var items = mm.split('_');
                var jjv = items[1];

                $('#countryname_' + jjv).autocomplete({


                    source: function(request, response) {
                        $.ajax({
                            url: '<?php echo base_url(); ?>pos/searchitems_offer',
                            dataType: "json",
                            data: {
                                name_startsWith: request.term,
                                type: 'country_table',
                                row_num: 1
                            },
                            success: function(data) {

                                response($.map(data, function(item) {
                                    var code = item.split("|");
                                    return {
                                        label: code[0],
                                        value: code[0],
                                        data: item
                                    }
                                }));
                            }
                        });
                    },
                    autoFocus: true,
                    minLength: 0,
                    select: function(event, ui) {
                        var names = ui.item.data.split("|");

                        console.log(names[1], names[2], names[3]);

                        $('#statediv_1m').val(names[1]);

                        $('#selling_1m').val(names[2]);
                        $('#qty_1m').val(1);

                        $('#cgst_1m').val(names[4]);
                        $('#tax_t1').val(names[7]);
                        $('#sgst_1m').val(names[5]);
                        $('#available_quantity').val(names[8]);
                        $('#cosst_1m').val(0);





                    }
                });

            }


            function auromcvbat(kk, mm) {


                var items = mm.split('_');
                var jjv = items[1];

                $('#mfgbbcg_' + jjv).autocomplete({


                    source: function(request, response) {
                        $.ajax({
                            url: '<?php echo base_url(); ?>pos/searchitems3/',
                            dataType: "json",
                            data: {
                                name_startsWith: request.term,
                                type: 'country_table',
                                row_num: 1
                            },
                            success: function(data) {

                                response($.map(data, function(item) {
                                    var code = item.split("|");
                                    return {
                                        label: code[0],
                                        value: code[0],
                                        data: item
                                    }
                                }));
                            }
                        });
                    },
                    autoFocus: true,
                    minLength: 0,
                    select: function(event, ui) {


                        var names = ui.item.data.split("|");

                        console.log(names[1], names[2], names[3]);

                        $('#expdate_' + jjv).val(names[1]);
                        $('#mexpdate_' + jjv).val(names[2]);
                        $('#mfgname' + jjv).val(names[3]);






                    }
                });

            }
        </script>