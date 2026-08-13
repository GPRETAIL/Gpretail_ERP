<!-- Page Content -->
<div class="container">

    <?php

    $mmik = $this->db->query('select * from products order by id desc ')->row_array();
    $lxzmm = $this->db->query('select * from settings where id=1 ')->row_array();
    if ($lxzmm['expi'] == 1) {
        $smkt = 2;
        $smko = 1;
    } else {
        $smkt = 3;
        $smko = 2;
    }

    ?>
    <div class="row" style="margin-top:10px;">
        <div class="col-md-12" style="padding: 0px;padding-right: 1px;padding-left: 1px;">
            <!-- tab navigation -->
            <?php $tab = isset($_GET['tab']) ? $_GET['tab'] : null; ?>

            <script>
                $(document).ready(function() {
                    $('#loadingimg').remove();
                })
            </script>

            <script type="text/javascript" src="https://www.google.com/jsapi"></script>
            <script type="text/javascript">
                google.load("elements", "1", {
                    packages: "transliteration"
                });

                function onLoad() {
                    var options = {
                        sourceLanguage: 'en', // or google.elements.transliteration.LanguageCode.ENGLISH,
                        destinationLanguage: [
                            '<?= label('languagek') ?>'
                        ], // or [google.elements.transliteration.LanguageCode.HINDI],
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
                        $('#countid').val(vl1);
                        var datastring = 'countid=' + vl1;

                        $.ajax({
                            type: "POST",
                            url: "<?php echo base_url(); ?>purchase/addrow",
                            data: datastring,
                            cache: false,
                            success: function(result) {
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
                        url: "<?php echo site_url('pos/load_pogoodpurrdel'); ?>/",
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
                            var total_discount = 0;
                            for (var i in ss) {
                                xt = ss[i];
                                var elementExists = document.getElementById('subtt_' + xt);
                                if (elementExists != null) {
                                    var rssss = document.getElementById('subtt_' + xt).value;
                                    var xxz = document.getElementById('qty_' + xt).value;
                                    amtt = parseFloat(amtt) + parseFloat(rssss);
                                    totitem = parseFloat(totitem) + parseFloat(xxz);
                                    total_discount += parseFloat($('.discount_amount_' + xt).val());

                                    var qw1 = document.getElementById('tttpye_' + xt).value;


                                    var c1 = document.getElementById('cgst_' + xt).value;


                                    var tty = ((parseFloat(c1) * parseFloat(rssss)) / 100) / 2;




                                    $("#ttcgst_" + xt).val(tty);
                                    cc1 = parseFloat(cc1) + parseFloat(tty);
                                    var s1 = document.getElementById('sgst_' + xt).value;
                                    var sty = (parseFloat(s1) * parseFloat(amtt)) / 100;
                                    $("#ttsgst_" + xt).val(tty);
                                    ss1 = parseFloat(ss1) + parseFloat(sty);
                                }
                            }
                            $("#ddkst").val(total_discount.toFixed(2));
                            var ccrt1 = parseFloat(cc1) / 2;
                            var dd1 = document.getElementById('ddkst').value;
                            var flss1 = parseFloat(amtt) + (parseFloat(cc1) * 2) - parseFloat(dd1);
                            $("#betot").val(amtt.toFixed(2));
                            // $('#innvamt').val(flss1.toFixed(2));

                            $("#discct").val(totitem.toFixed(2));
                            $("#cskgst").val(ccrt1.toFixed(2));
                            $("#sskgst").val(ccrt1.toFixed(2));
                            $("#afftot").val(flss1.toFixed(2));






                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            alert("error");
                        }
                    });



                }

                // $('#afftot').change(function(e) {
                //     e.preventDefault();
                //     var total = $(this).val();
                //     $('#innvamt').val(total);
                // });

                function callds(cc, bb) {

                    var va1 = document.getElementById('betot').value;
                    var va2 = document.getElementById('cskgst').value;
                    var va3 = document.getElementById('sskgst').value;


                    var kmxx = parseFloat(va1) + parseFloat(va2) + parseFloat(va3) - parseFloat(cc);

                    $("#afftot").val(kmxx.toFixed(2));





                }

                function callcc(cc, bb) {
                    var items = bb.split('_');
                    var jj = items[1];
                    var rssss = document.getElementById('cosst_' + jj).value;
                    var qqty = cc;
                    var kmxx = parseFloat(rssss) * parseFloat(qqty);
                    $("#subtt_" + jj).val(kmxx);
                    var amtt = 0;
                    var totitem = 0;
                    var cc1 = 0;
                    var ss1 = 0;
                    /*var ttyt=document.getElementById('totelemt').value;*/

                    var ttyt = document.getElementById('ll').value;
                    var ss = ttyt.split(",");
                    var total_discount = 0;
                    for (var i in ss) {
                        xt = ss[i];
                        var elementExists = document.getElementById('subtt_' + xt);
                        if (elementExists != null) {
                            var elementExists = document.getElementById('subtt_' + xt);
                            if (elementExists != null) {
                                var rssss = document.getElementById('subtt_' + xt).value;
                                var xxz = document.getElementById('qty_' + xt).value;
                                total_dicount += parseFloat($('.discount_amount_' + xt).val());

                                amtt = parseFloat(amtt) + parseFloat(rssss);
                                totitem = parseFloat(totitem) + parseFloat(xxz);

                                var qw1 = document.getElementById('tttpye_' + xt).value;
                                var c1 = document.getElementById('cgst_' + xt).value;



                                var tty = parseFloat(c1) * parseFloat(xxz);


                                $("#ttcgst_" + xt).val(tty);
                                cc1 = parseFloat(cc1) + parseFloat(tty);



                                var s1 = document.getElementById('sgst_' + xt).value;
                                var sty = (parseFloat(s1) * parseFloat(rssss)) / 100;
                                $("#ttsgst_" + xt).val(sty);
                                ss1 = parseFloat(ss1) + parseFloat(sty);

                            }
                        }
                    }
                    $("#ddkst").val(total_dicount.toFixed(2));
                    var ccrt1 = parseFloat(cc1) / 2;
                    var dd1 = document.getElementById('ddkst').value;

                    var flss1 = parseFloat(amtt) + parseFloat(cc1) + parseFloat(ss1) - parseFloat(dd1);

                    $("#betot").val(amtt.toFixed(2));

                    $("#discct").val(totitem.toFixed(2));
                    $("#cskgst").val(ccrt1.toFixed(2));
                    $("#sskgst").val(ccrt1.toFixed(2));
                    $("#afftot").val(flss1.toFixed(2));




                    $.ajax({
                        url: "<?php echo site_url('pos/load_pogood_upd'); ?>/",
                        type: "POST",
                        data: {
                            cc: cc,
                            jj: jj,
                            kmxx: kmxx
                        },
                        success: function(data) {},
                        error: function(jqXHR, textStatus, errorThrown) {}
                    });


                }




                function callccp(cc, bb) {

                    var items = bb.split('_');
                    var jj = items[1];
                    var rssss = document.getElementById('qty_' + jj).value;
                    var qqty = cc;
                    var kmxx = parseFloat(rssss) * parseFloat(qqty);
                    $("#subtt_" + jj).val(kmxx);
                    var amtt = 0;
                    var totitem = 0;
                    var cc1 = 0;
                    var ss1 = 0;
                    /*var ttyt=document.getElementById('totelemt').value;*/

                    var ttyt = document.getElementById('ll').value;
                    var ss = ttyt.split(",");
                    for (var i in ss) {
                        xt = ss[i];
                        var elementExists = document.getElementById('subtt_' + xt);
                        if (elementExists != null) {
                            var elementExists = document.getElementById('subtt_' + xt);
                            if (elementExists != null) {
                                var rssss = document.getElementById('subtt_' + xt).value;
                                var xxz = document.getElementById('qty_' + xt).value;

                                amtt = parseFloat(amtt) + parseFloat(rssss);
                                totitem = parseFloat(totitem) + parseFloat(xxz);

                                var qw1 = document.getElementById('tttpye_' + xt).value;
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
                    }
                    var ccrt1 = parseFloat(cc1) / 2;
                    var dd1 = document.getElementById('ddkst').value;

                    var flss1 = parseFloat(amtt) + parseFloat(cc1) + parseFloat(ss1) - parseFloat(dd1);

                    $("#betot").val(amtt.toFixed(2));

                    $("#discct").val(totitem.toFixed(2));
                    $("#cskgst").val(ccrt1.toFixed(2));
                    $("#sskgst").val(ccrt1.toFixed(2));
                    $("#afftot").val(flss1.toFixed(2));




                    $.ajax({
                        url: "<?php echo site_url('pos/load_pogood_updf'); ?>/",
                        type: "POST",
                        data: {
                            cc: cc,
                            jj: jj,
                            kmxx: kmxx
                        },
                        success: function(data) {},
                        error: function(jqXHR, textStatus, errorThrown) {}
                    });


                }



                function callcctt_fibnal(cc, bb) {
                    var rssss = document.getElementById('betot').value;
                    var innvno = document.getElementById('innvno').value;
                    var discct = document.getElementById('discct').value;
                    var innvamt = document.getElementById('innvamt').value;
                    var afftot = document.getElementById('afftot').value;
                    var discount_amount = document.getElementById('ddkst').value;


                    if (innvno == '') {
                        $('#innvno').focus();
                        return false;
                    }



                    if (discct < 1) {
                        alert("No Items Selected...");
                        return false;
                    }


                    if (innvamt != afftot) {

                        swal({
                                title: '<?= label('Areyousure') ?>',
                                text: 'Invoice amount not match...',
                                type: "warning",
                                showCancelButton: true,
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: '<?= label('yesiam') ?>',
                                closeOnConfirm: false
                            },
                            function() {
                                var pddate = document.getElementById('pddate').value;
                                var pptye = document.getElementById('pptye').value;
                                var storrid = document.getElementById('storrid').value;
                                var warr = document.getElementById('warr').value;
                                var supp = document.getElementById('supp').value;
                                var innvno = document.getElementById('innvno').value;
                                var innvdda = document.getElementById('innvdda').value;
                                var discct = document.getElementById('discct').value;
                                var betot = document.getElementById('betot').value;
                                var cskgst = document.getElementById('cskgst').value;
                                var sskgst = document.getElementById('sskgst').value;
                                var ddkst = document.getElementById('ddkst').value;
                                var afftot = document.getElementById('afftot').value;

                                // $.ajax({
                                //     url: "<?php echo site_url('purchase/addtodbb'); ?>/",
                                //     type: "POST",
                                //     data: {
                                //         pddate: pddate,
                                //         pptye: pptye,
                                //         storrid: storrid,
                                //         warr: warr,
                                //         supp: supp,
                                //         innvno: innvno,
                                //         innvdda: innvdda,
                                //         discct: discct,
                                //         betot: betot,
                                //         cskgst: cskgst,
                                //         sskgst: sskgst,
                                //         ddkst: ddkst,
                                //         afftot: afftot
                                //     },
                                //     success: function(data) {
                                //         window.location.href = "<?php echo site_url(); ?>purchase";
                                //     },
                                //     error: function(jqXHR, textStatus, errorThrown) {}
                                // });
                            });

                    } else {

                        var pddate = document.getElementById('pddate').value;
                        var pptye = document.getElementById('pptye').value;
                        var storrid = document.getElementById('storrid').value;
                        var warr = document.getElementById('warr').value;
                        var supp = document.getElementById('supp').value;
                        var innvno = document.getElementById('innvno').value;
                        var innvdda = document.getElementById('innvdda').value;
                        var discct = document.getElementById('discct').value;
                        var betot = document.getElementById('betot').value;
                        var cskgst = document.getElementById('cskgst').value;
                        var sskgst = document.getElementById('sskgst').value;
                        var ddkst = document.getElementById('ddkst').value;
                        var afftot = document.getElementById('afftot').value;
                        var discount_percent = document.getElementById('discount_percent').value;

                        console.log(discount_percent);


                        $.ajax({
                            url: "<?php echo site_url('purchase/addtodbb'); ?>/",
                            type: "POST",
                            data: {
                                pddate: pddate,
                                pptye: pptye,
                                storrid: storrid,
                                warr: warr,
                                supp: supp,
                                innvno: innvno,
                                innvdda: innvdda,
                                discct: discct,
                                betot: betot,
                                cskgst: cskgst,
                                sskgst: sskgst,
                                ddkst: ddkst,
                                afftot: afftot
                            },
                            success: function(data) {
                                window.location.href = "<?php echo site_url(); ?>purchase";
                            },
                            error: function(jqXHR, textStatus, errorThrown) {

                            }
                        });

                    }



                }
            </script>
            <script>
                $(document).ready(function() {
                    $.ajax({
                        url: "<?php echo site_url('pos/load_posalesmsk'); ?>/",
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
                            var total_dicount = 0;
                            for (var i in ss) {
                                xt = ss[i];
                                var elementExists = document.getElementById('subtt_' + xt);
                                if (elementExists != null) {
                                    var rssss = document.getElementById('subtt_' + xt).value;
                                    var xxz = document.getElementById('qty_' + xt).value;
                                    amtt = parseFloat(amtt) + parseFloat(rssss);
                                    totitem = parseFloat(totitem) + parseFloat(xxz);
                                    total_dicount += parseFloat($('.discount_amount_' + xt).val());

                                    var qw1 = document.getElementById('tttpye_' + xt).value;
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

                            $("#ddkst").val(total_dicount.toFixed(2));
                            var ccrt1 = parseFloat(cc1) / 2;
                            var dd1 = document.getElementById('ddkst').value;
                            var flss1 = parseFloat(amtt) + parseFloat(cc1) + parseFloat(ss1) - parseFloat(dd1);
                            $("#betot").val(amtt.toFixed(2));
                            // $('#innvamt').val(flss1.toFixed(2));

                            $("#discct").val(totitem.toFixed(2));
                            $("#cskgst").val(ccrt1.toFixed(2));
                            $("#sskgst").val(ccrt1.toFixed(2));
                            $("#afftot").val(flss1.toFixed(2));



                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            alert("error");
                        }
                    });

                });

                function ckkkr() {

                    var bbb = $("#barcodee").val();

                    if (bbb != '') {
                        $.ajax({
                            url: "<?php echo site_url('pos/searchitems_bar'); ?>/",
                            type: "POST",
                            data: {
                                bbb: bbb
                            },
                            success: function(data) {
                                var names = data.split("|");

                                $('#countryname_1m').val(names[1]);
                                $('#statediv_1m').val(names[2]);
                                $('#selling_1m').val(names[3]);
                                $('#cgst_1m').val(names[5]);
                                $('#sgst_1m').val(names[6]);
                                $('#cosst_1m').val(names[4]);
                                $('#qty_1m').focus();
                                return false;

                            },
                            error: function(jqXHR, textStatus, errorThrown) {

                            }
                        });
                    } else {


                        var kk = $("#discct").val();
                        var mm = $("#betot").val();
                        if (kk > 0) {
                            return true;
                        } else {
                            return false;
                        }
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

            <h3 style="padding: 10px; <?php
                                        if ($lxzmm['purchase_type'] == '0') { ?>background: #7ec9ff;<?php
                                                                                                }
                                                                                                    ?>"><?= label('Add') ?>
                <?= label('Purchase') ?>

                <?php
                if ($lxzmm['purchase_type'] == '0') {
                    echo '(Stock)';
                }
                ?>


                <a style="float: right;" class="btn btn-primary btn-red" href="<?php echo base_url(); ?>purchase"><?= label('Back') ?></a>
            </h3>
            <hr>
            <input type="hidden" id="countid" value="1">

            <script type="text/javascript">
                function barcodekargg() {

                    var bbb = $('.barcode').val();

                    if (bbb != '') {
                        $.ajax({
                            url: "<?php echo site_url('pos/searchitems_bar'); ?>/",
                            type: "POST",
                            data: {
                                bbb: bbb
                            },
                            success: function(data) {
                                var names = data.split("|");

                                $('#countryname_1m').val(names[1]);
                                $('#statediv_1m').val(names[2]);
                                $('#selling_1m').val(names[3]);
                                $('#cgst_1m').val(names[5]);
                                $('#sgst_1m').val(names[6]);
                                $('#cosst_1m').val(names[4]);
                                $('#qty_1m').focus();
                                return false;

                            },
                            error: function(jqXHR, textStatus, errorThrown) {

                            }
                        });
                    }
                }
            </script>









            <div class="panel-body" style="padding: 0px; padding-right: 1px;padding-left: 1px;">

                <div class="col-sm-2 ">
                    <div class="form-group"><?= label('Purchase') ?> <?= label('Number') ?>
                        <?php
                        $ikmm = $this->db->query('SELECT id FROM purchases ORDER BY id DESC')->row_array();
                        $knn = (isset($ikmm['id']) ? $ikmm['id'] : 0) + 1;
                        ?>
                        <input readonly="readonly" class="form-control" type="text" name="prcno" id="prcno" value="<?php echo $knn; ?>">


                    </div>
                </div>



                <div class="col-sm-2 ">
                    <div class="form-group"><?= label('Purchase') ?> <?= label('Date') ?>
                        <input type="text" maxlength="30" value="<?php echo date('d-m-Y'); ?>" name="pddate" class="form-control" id="pddate" placeholder="<?= label('Date') ?>">



                    </div>
                </div>


                <div class="col-sm-2 ">
                    <div class="form-group"><?= label('Purchase') ?> <?= label('Type') ?>
                        <select class="form-control" id="pptye" name="pptye">
                            <option value="0">Cash </option>
                            <option value="1">Credit card</option>
                            <option value="2">Cheque</option>
                        </select>
                    </div>
                </div>

                <div class="col-sm-2 pptye_1">
                    <div class="form-group"><?= label('Credit') ?> <?= label('Card') ?> <?= label('No') ?>
                        <input type="text" name="credit_card_no" id="credit_card_no" class="form-control" placeholder="Credit Card No">
                    </div>
                </div>
                <div class="col-sm-2 pptye_1">
                    <div class="form-group"><?= label('Card') ?> <?= label('Holder') ?> <?= label('Name') ?>
                        <input type="text" name="card_holder_name" id="card_holder_name" class="form-control" placeholder="Card Holder Name">
                    </div>
                </div>
                <div class="col-sm-2 pptye_2">
                    <div class="form-group"><?= label('Cheque') ?> <?= label('No') ?>
                        <input type="text" name="cheque_no" id="cheque_no" class="form-control" placeholder="Cheque No">
                    </div>
                </div>
                <div class="col-sm-2 pptye_">
                    <div class="form-group"><?= label('Ref') ?> <?= label('Num') ?>
                        <input type="text" name="ref_num" id="ref_num" class="form-control" placeholder="Ref Num">
                    </div>
                </div>
                <script>
                    $(document).ready(function() {
                        $('.pptye_1').hide();
                        $('.pptye_2').hide();
                        $('.pptye_').hide();
                    });
                    $('#pptye').change(function(e) {
                        e.preventDefault();
                        var pptye = $(this).val();
                        if (pptye == '1') {
                            $('.pptye_' + pptye).show();
                            $('.pptye_2').hide();
                            $('.pptye_').show();
                        } else if (pptye == '2') {
                            $('.pptye_' + pptye).show();
                            $('.pptye_1').hide();
                            $('.pptye_').show();
                        } else {
                            $('.pptye_').hide();
                            $('.pptye_1').hide();
                            $('.pptye_2').hide();
                        }
                    });
                </script>



                <?php
                $kmkllll = $this->db->query("select  id,warstore from settings where id=1 ")->row_array();
                if ($kmkllll['warstore'] == 1) { ?>
                    <div class="col-sm-2 ">
                        <div class="form-group"><?= label('Warehouses') ?>
                            <input type="hidden" id="storrid" name="storrid" value="0">
                            <select class="form-control" id="warr" name="warr">

                                <?php
                                $mjm = $this->db->query("select * from warehouses order by name asc ")->result_array();
                                foreach ($mjm as $mjmf) {
                                ?>
                                    <option value="<?php echo $mjmf['id']; ?>"><?php echo $mjmf['name']; ?></option>
                                <?php
                                }
                                ?>

                            </select>


                        </div>
                    </div>
                <?php } else {
                ?>
                    <input type="hidden" id="warr" name="warr" value="0">
                    <div class="col-sm-2 ">
                        <div class="form-group"><?= label('Store') ?>
                            <select class="form-control" id="storrid" name="storrid">
                                <?php
                                $mjms = $this->db->query("select * from stores order by name asc ")->result_array();
                                foreach ($mjms as $mjmfs) {
                                ?>
                                    <option value="<?php echo $mjmfs['id']; ?>"><?php echo $mjmfs['name']; ?></option>
                                <?php
                                }
                                ?>
                            </select>
                        </div>
                    </div>
                <?php  } ?>

                <div class="col-sm-2 ">
                    <div class="form-group"><?= label('Suppliers') ?><a href="javascript:void(0)" data-toggle="modal" data-target="#AddSupplier">
                            <span class="fa-stack fa-lg" data-toggle="tooltip" data-placement="top" style="height: 1em;
    line-height: 1em;" title="" data-original-title="Add New Suppliers">

                                <i style="color: #89b03e;" class="fa fa-user-plus fa-stack-1x  "></i>
                            </span>
                        </a>
                        <select class="form-control" id="supp" name="supp">
                            <?php
                            $mjm = $this->db->query("select * from suppliers order by name asc ")->result_array();
                            foreach ($mjm as $mjmf) {
                            ?>
                                <option value="<?php echo $mjmf['id']; ?>"><?php echo $mjmf['name']; ?></option>
                            <?php

                            }
                            ?>
                        </select>
                    </div>
                </div>
            </div>


            <div class="panel-body" style="padding: 0px;padding-right: 1px;padding-left: 1px;">
                <div class="col-sm-2 ">
                    <div class="form-group"><?= label('Invoice') ?> <?= label('No') ?>
                        <input class="form-control topTab" type="text" name="innvno" id="innvno" value="" data-index="1">
                    </div>
                </div>

                <div class="col-sm-2 ">
                    <div class="form-group"><?= label('Invoice') ?> <?= label('Amount') ?>
                        <input class="form-control topTab" type="text" name="innvamt" id="innvamt" value="0" data-index="2">
                    </div>
                </div>


                <div class="col-sm-2 ">
                    <div class="form-group"><?= label('Invoice') ?> <?= label('Date') ?>
                        <input class="form-control" type="text" name="innvdda" id="innvdda" value="<?php echo date('d-m-Y'); ?>" />
                    </div>
                </div>

                <div class="col-sm-2 ">
                    <div class="form-group">

                        <span title="Add New Product" style="cursor: pointer;margin-top: 13px;font-size: 25px;color: #89b03 !important;" class="float-left" data-toggle="modal" data-target="#Addproduct">
                            <i class="fa fa-plus"></i></span>
                    </div>
                </div>







                <div class="col-sm-12 " style="padding: 0px; padding-right: 1px;padding-left: 1px;">
                    <div class="panel-body" style="background-color: #FFF;">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <?php if ($lxzmm['cat_pur'] == 1) {
                                    ?>
                                        <th><?= label('Category') ?></th>
                                    <?php } else { ?>
                                        <th><?= label('Barcode') ?></th>
                                    <?php } ?>
                                    <th><?= label('Product') ?></th>
                                    <th><?= label('Brand') ?></th>
                                    <th><?= label('Qty') ?></th>
                                    <th><?= label('Tax') ?></th>
                                    <th><?= label('Pur') ?> <?= label('Price') ?></th>
                                    <?php
                                    if ($lxzmm['expi'] == 1) {
                                    ?>
                                        <th><?= label('BatchNo') ?></th>
                                        <th><?= label('Packed') ?></th>
                                        <th><?= label('Expire') ?></th>
                                    <?php } ?>
                                    <th><?= label('Sel') ?> <?= label('Price') ?> </th>
                                    <th><?= label('Dis Amt') ?></th>
                                    <th><?= label('Dis %') ?></th>
                                    <?php
                                    if ($lxzmm['expi'] == 1) {
                                    ?>
                                        <th><?= label('MRP') ?> <?= label('') ?> </th>
                                    <?php } else {
                                    ?>
                                        <th><?= label('Total') ?> <?= label('Price') ?> </th>
                                    <?php } ?>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <?php
                                        if ($lxzmm['cat_pur'] == 1) {
                                        ?>
                                            <div>
                                                <div class="form-group">
                                                    <select class="form-control" id="cattff" name="cattff">
                                                        <option value="0">Select </option>
                                                        <?php
                                                        $mjmc = $this->db->query("select * from categories order by name asc ")->result_array();
                                                        foreach ($mjmc as $mjmcf) {
                                                        ?>
                                                            <option value="<?php echo $mjmcf['id']; ?>"><?php echo $mjmcf['name']; ?></option>
                                                        <?php
                                                        }
                                                        ?>
                                                    </select>
                                                </div>
                                            </div>
                                        <?php
                                        } else {
                                        ?>
                                            <div>
                                                <div class="form-group">

                                                    <form onsubmit="return barcodekar1()">
                                                        <input style="margin-top:0px;" type="text" autofocus="" id="" class="form-control barcode" placeholder="Barcode Scanner">
                                                    </form>
                                                </div>
                                            </div>
                                            <input class="form-control" type='hidden' id="cattff" name="cattff" />
                                        <?php
                                        }
                                        ?>
                                    </td>
                                    <td>
                                        <div>
                                            <div class="form-group">
                                                <input style="padding: 0px 0px;" autocomplete="off" onkeyup="return auromcv(this.value,this.id);" class="form-control inputTab" type='text' id='countryname_1m' data-index="1">
                                                <input value="0" class="form-control" type='hidden' id="statediv_1m" />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <div class="form-group">
                                                <input type="text" id="brandInput" name="brandInput" onkeyup="return brandNew(this.value,this.id);" class="form-control  inputTab" data-index="2">
                                                <input type="hidden" id="branddd" name="branddd" value="">
                                            </div>
                                        </div>

                                    </td>
                                    <td>
                                        <div>
                                            <div class="form-group">
                                                <input style="padding: 0px 0px;" type="text" onkeyup="return calstrip(this.value,this.id);" class="form-control inputTab" id="qty_1m" value="" placeholder="Quantity" data-index="3">
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <?php
                                        if ($lxzmm['gst_tax'] == 1) { ?>
                                            <div>
                                                <div class="form-group">
                                                    <input style="padding: 0px 0px;" readonly="readonly" type="text" class="form-control inputTab" id="cgst_1m" value="" placeholder="tax">
                                                </div>
                                            </div>
                                            <input style="padding: 0px 0px;" readonly="readonly" type="hidden" class="form-control" id="sgst_1m" value="" placeholder="Sgst">
                                        <?php
                                        } else {
                                        ?>
                                            <input readonly="readonly" type="hidden" class="form-control" id="cgst_1m" value="0">
                                            <input readonly="readonly" type="hidden" class="form-control" id="sgst_1m" value="0">
                                        <?php } ?>
                                    </td>
                                    <td>
                                        <div>
                                            <div class="form-group">
                                                <input type="text" class="form-control inputTab" id="cosst_1m" value="" placeholder="Cost" data-index="4"><br>
                                            </div>
                                        </div>
                                    </td>
                                    <?php
                                    if ($lxzmm['expi'] == 1) {
                                    ?>
                                        <td>
                                            <div>
                                                <div class="form-group">
                                                    <input style="padding: 0px 0px;" type="text" class="form-control inputTab" id="batch_1m" value="" placeholder="Batch No">
                                                </div>
                                            </div>
                                            <div>
                                                <div class="form-group">
                                                    <input style="padding: 0px 0px;" type="date" class="form-control " id="packed_1m" value="<?php echo date('Y-m-d'); ?>" placeholder="Packed">
                                                </div>
                                            </div>
                                            <div>
                                                <div class="form-group">
                                                    <input style="padding: 0px 0px;" type="date" class="form-control " id="expire_1m" value="<?php echo date('Y-m-d'); ?>" placeholder="Expire">
                                                </div>
                                            </div>
                                        <?php } else { ?>
                                            <input type="hidden" id="batch_1m" value="0" />
                                            <input type="hidden" id="packed_1m" value="0" />
                                            <input type="hidden" id="expire_1m" value="0" />
                                        </td>
                                    <?php  } ?>
                                    <td>
                                        <input style="padding: 0px 0px;" type="hidden" class="form-control" id="lev_1m" value="1" placeholder="Level">
                                        <input style="padding: 0px 0px;" value="1" type="hidden" class="form-control" id="rack_1m" value="" placeholder="Rack">
                                        <div>
                                            <div class="form-group">
                                                <input style="padding: 0px 0px;" type="text" class="form-control inputTab" id="selling_1m" value="" placeholder="Selling Price" data-index="5"><br>
                                            </div>
                                        </div>
                                    </td>
                                    <?php
                                    if ($lxzmm['expi'] == 1) {
                                    ?>
                                        <td>
                                            <div class="form-group">
                                                <input style="padding: 0px 0px;" type="text" class="form-control" id="mrp_1m inputTab" value="" placeholder="MRP"><br>
                                            </div>
                                        </td>
                                    <?php
                                    } else {
                                    ?>
                                        <input style="padding: 0px 0px;" type="hidden" class="form-control" id="mrp_1m" value="" placeholder="MRP">
                                    <?php } ?>
                                    <td>
                                        <div class="input-group">
                                            <input style="padding: 0px 0px;width:100px;" type="text" class="form-control inputTab text-center" id="product_discount" value="" placeholder="Dis Amt">
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <div class="input-group">
                                                <input style="padding: 0px 0px;width:100px;" type="text" class="form-control inputTab text-center" id="product_percentage" value="" placeholder="Dis %" data-index="6">
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="input-group">
                                            <input style="padding: 0px 0px;width:100px;" readonly="readonly" type="text" class="form-control inputTab" value="0" id="subtt_1m" value="" placeholder="Cost">
                                            <div class="input-group-btn">
                                                <button class="btn btn-success" type="button" onclick="barcodekar();" data-index="7">
                                                    <span class="glyphicon glyphicon-plus" aria-hidden="true"></span></button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <script>
                            function brandNew(kk, mm) {
                                var iklm = $('#cattff').val();
                                var items = mm.split('_');
                                var jjv = items[1];
                                var brandName = $('#brandInput').val();
                                $('#brandInput').autocomplete({
                                    source: function(request, response) {
                                        $.ajax({
                                            url: '<?php echo base_url(); ?>pos/brandSearch/',
                                            dataType: "json",
                                            data: {
                                                brandName: brandName,
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
                                        $('#branddd').val(names[1]);
                                    }
                                });

                            }
                        </script>
                        <!-- <?php
                                if ($lxzmm['cat_pur'] == 1) {
                                ?>

                            <div style="text-align: center;" class="col-xs-1 table-header">
                                <h7><?= label('Category') ?></h7>
                            </div>

                        <?php } else { ?>

                            <div style="text-align: center;" class="col-xs-1 table-header">
                                <h7><?= label('Barcode') ?></h7>
                            </div>

                        <?php } ?>

                        <div style="text-align: center;" class="col-xs-2 table-header">
                            <h7><?= label('Product') ?></h7>
                        </div>





                        <div class="col-xs-1 table-header">
                            <h7>Brand</h7>
                        </div>
                        <div style="text-align: left;padding: 0px 0px;" style="text-align: center;" class="col-xs-1 table-header">
                            <h7><?= label('Qty') ?></h7>
                        </div>




                        <?php

                        if ($lxzmm['gst_tax'] == 1) {
                        ?>
                            <div style="text-align: center;text-align: left;width:60px;" class="col-xs-1 table-header">
                                <h7><?= label('tax') ?></h7>
                            </div>



                        <?php
                        }
                        ?>


                        <div class="col-xs-1 table-header">
                            <h7><?= label('Pur') ?> <?= label('Price') ?> </h7>

                        </div>





                        <?php
                        if ($lxzmm['expi'] == 1) {
                        ?>

                            <div class="col-xs-1 table-header">
                                <h7><?= label('BatchNo') ?> </h7>
                            </div>

                            <div class="col-xs-1 table-header">
                                <h7><?= label('Packed') ?> </h7>
                            </div>

                            <div class="col-xs-1 table-header">
                                <h7><?= label('Expire') ?> </h7>
                            </div>

                        <?php } ?>

                        <div class="col-xs-1 table-header">
                            <h7><?= label('Sel') ?> <?= label('Price') ?> </h7>
                        </div>
                        <div class="col-xs-1 table-header">
                            <h7><?= label('Dis Amt') ?></h7>
                        </div>
                        <div class="col-xs-1 table-header">
                            <h7><?= label('Dis %') ?></h7>
                        </div>

                        <?php
                        if ($lxzmm['expi'] == 1) {
                        ?>

                            <div class="col-xs-1 table-header">
                                <h7><?= label('MRP') ?> <?= label('') ?> </h7>
                            </div>

                        <?php } else {
                        ?>


                            <div class="col-xs-1 table-header">
                                <h7><?= label('Total') ?> <?= label('Price') ?> </h7>
                            </div>
                        <?php } ?> -->







                        <!-- <div id="add1" class="col-xs-12">
                            <?php
                            if ($lxzmm['cat_pur'] == 1) {
                            ?>
                                <div class="col-sm-1 " style="padding-right: 1px;padding-left: 1px;">
                                    <div class="form-group">
                                        <select class="form-control" id="cattff" name="cattff">
                                            <option value="0">Select </option>
                                            <?php
                                            $mjmc = $this->db->query("select * from categories order by name asc ")->result_array();
                                            foreach ($mjmc as $mjmcf) {
                                            ?>
                                                <option value="<?php echo $mjmcf['id']; ?>"><?php echo $mjmcf['name']; ?></option>
                                            <?php
                                            }
                                            ?>
                                        </select>
                                    </div>
                                </div>
                            <?php
                            } else {
                            ?>
                                <div class="col-sm-1 " style="padding-right: 1px;padding-left: 1px;">
                                    <div class="form-group">

                                        <form onsubmit="return barcodekar1()">
                                            <input style="margin-top:0px;" type="text" autofocus="" id="" class="form-control barcode" placeholder="Barcode Scanner">
                                        </form>
                                    </div>
                                </div>
                                <input class="form-control" type='hidden' id="cattff" name="cattff" />
                            <?php
                            }
                            ?>
                            <div class="col-sm-2 " style="padding-right: 1px;padding-left: 1px;">
                                <div class="form-group">
                                    <input style="padding: 0px 0px;" autocomplete="off" onkeyup="return auromcv(this.value,this.id);" class="form-control inputTab" type='text' id='countryname_1m' data-index="1">
                                    <input value="0" class="form-control" type='hidden' id="statediv_1m" />
                                </div>
                            </div>
                            <div style="padding-right: 1px;padding-left: 1px;" class="col-sm-1 ">
                                <div class="form-group">
                                    <input type="text" id="brandInput" name="brandInput" onkeyup="return brandNew(this.value,this.id);" class="form-control  inputTab" data-index="2">
                                    <input type="hidden" id="branddd" name="branddd" value="">
                                </div>
                            </div>

                            <script>
                                function brandNew(kk, mm) {
                                    var iklm = $('#cattff').val();
                                    var items = mm.split('_');
                                    var jjv = items[1];
                                    var brandName = $('#brandInput').val();
                                    $('#brandInput').autocomplete({
                                        source: function(request, response) {
                                            $.ajax({
                                                url: '<?php echo base_url(); ?>pos/brandSearch/',
                                                dataType: "json",
                                                data: {
                                                    brandName: brandName,
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
                                            $('#branddd').val(names[1]);
                                        }
                                    });

                                }
                            </script>




                            <div class="col-sm-1" style="padding-right: 1px;padding-left: 1px;">
                                <div class="form-group">
                                    <input style="padding: 0px 0px;" type="text" onkeyup="return calstrip(this.value,this.id);" class="form-control inputTab" id="qty_1m" value="" placeholder="Quantity" data-index="3">
                                </div>
                            </div>
                            <?php
                            if ($lxzmm['gst_tax'] == 1) { ?>
                                <div style="padding-right: 1px;padding-left: 1px;width:50px;" class="col-sm-1">
                                    <div class="form-group">
                                        <input style="padding: 0px 0px;" readonly="readonly" type="text" class="form-control inputTab" id="cgst_1m" value="" placeholder="tax">
                                    </div>
                                </div>
                                <input style="padding: 0px 0px;" readonly="readonly" type="hidden" class="form-control" id="sgst_1m" value="" placeholder="Sgst">
                            <?php
                            } else {
                            ?>
                                <input readonly="readonly" type="hidden" class="form-control" id="cgst_1m" value="0">
                                <input readonly="readonly" type="hidden" class="form-control" id="sgst_1m" value="0">
                            <?php } ?>
                            <div style="padding-right: 1px;padding-left: 1px;" class="col-sm-1 ">
                                <div class="form-group">
                                    <input type="text" class="form-control inputTab" id="cosst_1m" value="" placeholder="Cost" data-index="4"><br>
                                </div>
                            </div>

                            <?php
                            if ($lxzmm['expi'] == 1) {
                            ?>
                                <div class="col-sm-1 " style="padding-right: 1px;padding-left: 1px;">
                                    <div class="form-group">
                                        <input style="padding: 0px 0px;" type="text" class="form-control inputTab" id="batch_1m" value="" placeholder="Batch No">
                                    </div>
                                </div>
                                <div class="col-sm-1 " style="padding-right: 1px;padding-left: 1px;">
                                    <div class="form-group">
                                        <input style="padding: 0px 0px;" type="date" class="form-control " id="packed_1m" value="<?php echo date('Y-m-d'); ?>" placeholder="Packed">
                                    </div>
                                </div>
                                <div class="col-sm-1 " style="padding-right: 1px;padding-left: 1px;">
                                    <div class="form-group">
                                        <input style="padding: 0px 0px;" type="date" class="form-control " id="expire_1m" value="<?php echo date('Y-m-d'); ?>" placeholder="Expire">
                                    </div>
                                </div>
                            <?php } else { ?>
                                <input type="hidden" id="batch_1m" value="0" />
                                <input type="hidden" id="packed_1m" value="0" />
                                <input type="hidden" id="expire_1m" value="0" />
                            <?php  } ?>
                            <input style="padding: 0px 0px;" type="hidden" class="form-control" id="lev_1m" value="1" placeholder="Level">
                            <input style="padding: 0px 0px;" value="1" type="hidden" class="form-control" id="rack_1m" value="" placeholder="Rack">
                            <div class="col-sm-1 " style="padding-right: 1px;padding-left: 1px;">
                                <div class="form-group">
                                    <input style="padding: 0px 0px;" type="text" class="form-control inputTab" id="selling_1m" value="" placeholder="Cost" data-index="5"><br>
                                </div>
                            </div>
                            <?php
                            if ($lxzmm['expi'] == 1) {
                            ?>
                                <div class="col-sm-1 " style="padding-right: 1px;padding-left: 1px;">
                                    <div class="form-group">
                                        <input style="padding: 0px 0px;" type="text" class="form-control" id="mrp_1m inputTab" value="" placeholder="MRP"><br>
                                    </div>
                                </div>
                            <?php
                            } else {
                            ?>
                                <input style="padding: 0px 0px;" type="hidden" class="form-control" id="mrp_1m" value="" placeholder="MRP">

                            <?php } ?>
                            <div class="col-sm-1 " style="padding-right: 1px;padding-left: 1px;">
                                <div class="input-group">
                                    <input style="padding: 0px 0px;width:100px;" type="text" class="form-control inputTab text-center" id="product_discount" value="" placeholder="Dis Amt">
                                </div>
                            </div>
                            <div class="col-sm-1 " style="padding-right: 1px;padding-left: 1px;">
                                <div class="input-group">
                                    <input style="padding: 0px 0px;width:100px;" type="text" class="form-control inputTab text-center" id="product_percentage" value="" placeholder="Dis %" data-index="6">
                                </div>
                            </div>

                            <div class="col-sm-1 " style="padding-right: 1px;padding-left: 1px;">
                                <div class="input-group">
                                    <input style="padding: 0px 0px;width:100px;" readonly="readonly" type="text" class="form-control inputTab" value="0" id="subtt_1m" value="" placeholder="Cost">
                                    <div class="input-group-btn">
                                        <button class="btn btn-success" type="button" onclick="barcodekar();" data-index="7">
                                            <span class="glyphicon glyphicon-plus" aria-hidden="true"></span></button>
                                    </div>
                                </div>
                            </div>
                        </div> -->



                    </div>
                    <script>
                        $('#product_discount').keyup(function(e) {
                            var quantity = $('#qty_1m').val();
                            var pur_price = $('#cosst_1m').val();
                            var product_discount = $(this).val();
                            var sub_total = quantity * pur_price;
                            var cal_percent = product_discount / sub_total * 100;
                            $('#product_percentage').val(Math.round(cal_percent));
                            var st_total = sub_total - product_discount;
                            $('#subtt_1m').val(st_total);
                        });

                        $('#product_percentage').keyup(function(e) {
                            var quantity = $('#qty_1m').val();
                            var pur_price = $('#cosst_1m').val();
                            var product_discount = $(this).val();
                            var sub_total = quantity * pur_price;
                            var st = sub_total / 100 * product_discount;
                            $('#product_discount').val(st);
                            var st_total = sub_total - st;
                            $('#subtt_1m').val(st_total);
                            console.log(st_total);
                        });
                    </script>





                    <input type="hidden" id="totelemt" name="totelemt" value="1" />
                    <div class="panel panel-default">
                        <div class="panel-heading"><?= label('Products') ?> </div>
                        <div class="panel-body" style="padding: 0px;">
                            <!-- echo $smkt -->
                            <div style="text-align: center;" class="col-xs-1" table-header">
                                <h7><?= label('Barcode') ?></h7>
                            </div>
                            <div style="text-align: center;" class="col-xs-1" table-header">
                                <h7><?= label('Brand') ?></h7>
                            </div>
                            <div style="text-align: center;" class="col-xs-1" table-header">
                                <h7><?= label('Product') ?></h7>
                            </div>
                            <div style="text-align: center;" class="col-xs-1 table-header">
                                <h7><?= label('Quantity') ?></h7>
                            </div>
                            <div style="text-align: center;" class="col-xs-1 table-header">
                                <h7><?= label('TAX-CGST') ?></h7>
                            </div>
                            <div style="text-align: center;" class="col-xs-1 table-header">
                                <h7><?= label('TAX-SGST') ?></h7>
                            </div>
                            <div style="text-align: center;" class="col-xs-1 table-header">
                                <h7><?= label('Pur') ?> <?= label('Price') ?> </h7>

                            </div>

                            <?php
                            $lxzmm = $this->db->query("select * from settings where id=1 ")->row_array();
                            if ($lxzmm['gst_tax'] == 1) {
                            ?>
                                <div style="text-align: center;text-align: center;" class="col-xs-1 table-header">
                                    <h7><?= label('tax') ?></h7>
                                </div>



                            <?php
                            }
                            ?>





                            <?php
                            if ($lxzmm['expi'] == 1) {
                            ?>

                                <div style="text-align: left;" class="col-xs-1 table-header">
                                    <h7><?= label('BatchNo') ?> </h7>
                                </div>
                                <div style="text-align: left;" class="col-xs-1 table-header">
                                    <h7><?= label('Packed') ?> </h7>
                                </div>
                                <div style="text-align: left;" class="col-xs-1 table-header">
                                    <h7><?= label('Expire') ?> </h7>
                                </div>

                            <?php } ?>




                            <div style="text-align: left;" class="col-xs-1 table-header">
                                <h7><?= label('Selling') ?> <?= label('Price') ?> </h7>
                            </div>
                            <div style="text-align: left;" class="col-xs-1 table-header">
                                <h7><?= label('Dis Amt') ?> </h7>
                            </div>
                            <div style="text-align: left;" class="col-xs-1 table-header">
                                <h7><?= label('Dis%') ?> </h7>
                            </div>

                            <?php
                            if ($lxzmm['expi'] == 1) {
                            ?>
                                <div style="text-align: left;" class="col-xs-<?php echo $smko; ?> table-header">
                                    <h7>MRP</h7>
                                </div>
                            <?php } ?>

                            <div style="text-align: left;" class="col-xs-<?php echo $smkt; ?> table-header">
                                <h7><?= label('Total') ?> <?= label('Price') ?> </h7>
                            </div>





                            <script type="text/javascript" src="<?php echo base_url(); ?>assets/wildel/jquery-1.10.2.min.js"></script>
                            <script type="text/javascript" src="<?php echo base_url(); ?>assets/wildel/jquery-ui-1.10.3.custom.min.js"></script>

                            <div id="productListkar">


                            </div>





                            <br>
                            <br>
                            <br>




                            <div class="col-xs-12">

                                <div class="col-sm-2 "></div>

                                <div class="col-sm-1 "></div>
                                <div class="col-sm-1 "></div>


                                <?php
                                if ($lxzmm['gst_tax'] == 1) { ?>
                                    <div class="col-sm-1 "></div>




                                <?php
                                }
                                ?>
                                <div class="col-sm-1 "><?= label('TotalItems') ?></div>
                                <div style="padding-left: 0px;padding-right: 0px;" class="col-sm-1 "><input readonly="readonly" type="text" class="form-control" id="discct" name="discct" value="" placeholder="Total">
                                </div>



                                <div class="col-sm-2 "><?= label('Total') ?> </div>

                                <div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 "><input readonly="readonly" type="text" class="form-control" id="betot" name="betot" value="" placeholder="Total"></div>

                            </div>



                            <?php
                            if ($lxzmm['gst_tax'] == 1) { ?>

                                <div class="col-xs-12">

                                    <div class="col-sm-2 "></div>

                                    <div class="col-sm-2 "></div>
                                    <div class="col-sm-2 "></div>

                                    <?php
                                    if ($lxzmm['gst_tax'] == 1) { ?>
                                        <div class="col-sm-1 "></div>




                                    <?php
                                    }
                                    ?>





                                    <div class="col-sm-2 "><br><?= label('CGST') ?> </div>

                                    <div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 "><br>

                                        <input readonly="readonly" type="text" class="form-control" id="cskgst" name="cskgst" value="" placeholder="Total">




                                    </div>

                                </div>


                                <div class="col-xs-12">
                                    <div class="col-sm-2 "></div>
                                    <div class="col-sm-2 "></div>

                                    <div class="col-sm-2 "></div>


                                    <?php
                                    if ($lxzmm['gst_tax'] == 1) { ?>
                                        <div class="col-sm-1 "></div>




                                    <?php
                                    }
                                    ?>




                                    <div class="col-sm-2 "><br><?= label('SGST') ?> </div>

                                    <div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 "><br>



                                        <input readonly="readonly" type="text" class="form-control" id="sskgst" name="sskgst" value="" placeholder="">

                                    </div>

                                </div>



                            <?php } else { ?>

                                <input readonly="readonly" type="hidden" class="form-control" id="cskgst" name="cskgst" value="" placeholder="Total">
                                <input readonly="readonly" type="hidden" class="form-control" id="sskgst" name="sskgst" value="" placeholder="">

                            <?php

                            } ?>

                            <div class="col-xs-12">

                                <div class="col-sm-2 "></div>

                                <div class="col-sm-2 "></div>
                                <div class="col-sm-2 "></div>


                                <?php
                                if ($lxzmm['gst_tax'] == 1) { ?>
                                    <div class="col-sm-1 "></div>




                                <?php
                                }
                                ?>




                                <div class="col-sm-2 "><br><?= label('Discount') ?> <?= label('Amount') ?> </div>

                                <div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 "><br><input onkeyup="return callds(this.value,this.id);" type="text" readonly class="form-control" id="ddkst" name="ddkst" value="0" placeholder=""></div>

                            </div>


                            <div class="col-xs-12">

                                <div class="col-sm-2 "></div>

                                <div class="col-sm-2 "></div>


                                <div class="col-sm-2 "></div>
                                <?php
                                if ($lxzmm['gst_tax'] == 1) { ?>
                                    <div class="col-sm-1 "></div>




                                <?php
                                }
                                ?>



                                <div class="col-sm-2 "><br><?= label('Total') ?></div>

                                <div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 "><br><input readonly="readonly" type="text" class="form-control" id="afftot" name="afftot" value="" placeholder="Total"></div>

                            </div>




                            <div class="col-xs-12">

                                <div class="col-sm-2 "></div>

                                <div class="col-sm-2 "></div>
                                <div class="col-sm-2 "></div>


                                <?php
                                if ($lxzmm['gst_tax'] == 1) { ?>
                                    <div class="col-sm-1 "></div>




                                <?php
                                }
                                ?>




                                <div class="col-sm-2 "></div>

                                <div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 "><br><input type="Submit" class="form-control btn btn-green" id="aftot" name="Submit" value="Save" onclick="callcctt_fibnal();"></div>















                                <div class="clear"></div>

                            </div>
                        </div>

                        <div class="panel-footer"><small><em><a href="javascript:void(0);"></a></em></em></small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </form>






        <script type="text/javascript">
            $(function() {
                $('#branddd').select2();
            });

            $('.select2-search__field').keypress(function(e) {
                var key = e.which;
                if (key == 13) // the enter key code
                {
                    var brand = $('.search__field').val();
                    console.log(brand);

                    $('input[name = butAssignProd]').click();
                    return false;
                }
            });

            function barcodekar1() {
                var code = $('.barcode').val();
                $.ajax({
                    url: "<?php echo site_url('pos/searchitems_bar'); ?>/" + code,
                    type: "POST",
                    dataType: "JSON",
                    success: function(data) {
                        var names = data.split("|");

                        $('#countryname_1m').val(names[1]);
                        $('#statediv_1m').val(names[2]);
                        $('#selling_1m').val(names[3]);
                        $('#cgst_1m').val(names[5]);
                        $('#sgst_1m').val(names[6]);
                        $('#mrp_1m').val(names[7]);
                        $('#cosst_1m').val(names[4]);
                        $('#qty_1m').focus();
                        return false;

                    },
                    error: function(jqXHR, textStatus, errorThrown) {

                    }
                });




                return false;
            };



            function barcodekar() {

                // var producnum = $('#statediv_1m').val();
                var producnum = 0;
                var countryname_1m = $('#countryname_1m').val();
                if (countryname_1m == '') {
                    $('#countryname_1m').focus();
                    return false;
                }

                var purrs = $('#cosst_1m').val();
                if (purrs == '' || purrs == '0') {
                    $('#cosst_1m').focus();
                    return false;
                }


                var brandInput = $('#brandInput').val();
                if (brandInput == '' || brandInput == 0 || brandInput == '0') {
                    $('#brandInput').focus();
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


                var lev_1m = $('#lev_1m').val();
                if (lev_1m == '' || lev_1m == 0 || lev_1m == '0') {
                    $('#lev_1m').focus();
                    return false;
                }

                var rack_1m = $('#rack_1m').val();
                if (rack_1m == '' || rack_1m == 0 || rack_1m == '0') {
                    $('#rack_1m').focus();
                    return false;
                }



                var cgstt = $('#cgst_1m').val();
                var sgst = $('#sgst_1m').val();
                var mrpp = $('#mrp_1m').val();

                var toto = $('#subtt_1m').val();
                if (toto == '') {
                    $('#subtt_1m').focus();
                    return false;
                }

                var atorr = $('#totelemt').val();
                var lev_1m = $('#lev_1m').val();
                var rack_1m = $('#rack_1m').val();

                var batch_1m = $('#batch_1m').val();
                var supp = $('#supp').val();
                var packed_1m = $('#packed_1m').val();
                var expire_1m = $('#expire_1m').val();
                var barcodecc = $('.barcode').val();
                var branddd = $('#branddd').val();
                var product_percentage = $('#product_percentage').val();
                var discount_amount = $('#product_discount').val();









                var nj = atorr++;
                $.ajax({
                    url: "<?php echo site_url('pos/load_pogoodpurr'); ?>/",
                    type: "POST",
                    data: {
                        brandInput: brandInput,
                        branddd: branddd,
                        supp: supp,
                        countryname_1m: countryname_1m,
                        barcodecc: barcodecc,
                        packed_1m: packed_1m,
                        expire_1m: expire_1m,
                        lev_1m: lev_1m,
                        rack_1m: rack_1m,
                        producnum: producnum,
                        purrs: purrs,
                        sellrs: sellrs,
                        qqty: qqty,
                        cgstt: cgstt,
                        sgst: sgst,
                        mrpp: mrpp,
                        toto: toto,
                        batch_1m: batch_1m,
                        discount_amount: discount_amount,
                        discount_percentage: product_percentage
                    },
                    success: function(data) {
                        $('#productListkar').html(data);
                        $('#statediv_1m').val(0);
                        $('#countryname_1m').val('');
                        $('#cosst_1m').val('');
                        $('#selling_1m').val('');
                        $('#qty_1m').val('');
                        $('#cgst_1m').val(0);
                        $('#sgst_1m').val(0);
                        $('#mrp_1m').val(0);
                        $('#subtt_1m').val('');
                        $('#barcodee').val('');
                        $('.barcode').val('');
                        $('.batch_1m').val('');
                        $('#brandInput').val('')
                        $('#branddd').val('')
                        $('#product_percentage').val('');
                        $('#product_discount').val('');


                        $('#totelemt').val(nj);
                        $('#countryname_1m').focus();

                        var amtt = 0;
                        var totitem = 0;
                        var cc1 = 0;
                        var ss1 = 0;
                        var ttyt = document.getElementById('ll').value;
                        var ss = ttyt.split(",");
                        var total_dicount = 0;
                        for (var i in ss) {
                            xt = ss[i];
                            var elementExists = document.getElementById('subtt_' + xt);
                            if (elementExists != null) {
                                var rssss = document.getElementById('subtt_' + xt).value;
                                var xxz = document.getElementById('qty_' + xt).value;
                                amtt = parseFloat(amtt) + parseFloat(rssss);
                                totitem = parseFloat(totitem) + parseFloat(xxz);
                                total_dicount += parseFloat($('.discount_amount_' + xt).val());
                                var qw1 = document.getElementById('tttpye_' + xt).value;


                                var c1 = document.getElementById('cgst_' + xt).value;




                                var tty = parseFloat(c1) * parseFloat(rssss) * 0.01;







                                $("#ttcgst_" + xt).val(tty);
                                cc1 = parseFloat(cc1) + parseFloat(tty);
                                var s1 = document.getElementById('sgst_' + xt).value;
                                var sty = (parseFloat(s1) * parseFloat(rssss)) / 100;
                                $("#ttsgst_" + xt).val(sty);
                                ss1 = parseFloat(ss1) + parseFloat(sty);
                            }
                        }
                        $("#ddkst").val(total_dicount.toFixed(2));
                        var ccrt1 = parseFloat(cc1) / 2;
                        var dd1 = document.getElementById('ddkst').value;
                        var flss1 = parseFloat(amtt) + parseFloat(cc1) + parseFloat(ss1) - parseFloat(dd1);
                        $("#betot").val(amtt.toFixed(2));
                        // $('#innvamt').val(flss1.toFixed(2));

                        $("#discct").val(totitem.toFixed(2));
                        $("#cskgst").val(ccrt1.toFixed(2));
                        $("#sskgst").val(ccrt1.toFixed(2));
                        $("#afftot").val(flss1.toFixed(2));



                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        alert("error");
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

                var va1 = document.getElementById('cosst_1m').value;
                var kmxx = parseFloat(va1) * parseFloat(cc);
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
                    url: "<?php echo site_url('pos/savebatch'); ?>/" + type,
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
                        alert("error");
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

                $('#packed_1m').datepicker({
                    todayHighlight: true,
                    autoclose: true
                });

                $('#expire_1m').datepicker({
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
                var iklm = $('#cattff').val();
                var items = mm.split('_');
                var jjv = items[1];
                $('#countryname_' + jjv).autocomplete({
                    source: function(request, response) {
                        $.ajax({
                            url: '<?php echo base_url(); ?>pos/searchitems2/',
                            dataType: "json",
                            data: {
                                name_startsWith: request.term,
                                type: 'country_table',
                                iklm: iklm,
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
                        $('#cgst_1m').val(names[4]);
                        $('#sgst_1m').val(names[5]);
                        $('#mrp_1m').val(names[6]);
                        $('#cosst_1m').val(names[3]);
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


        <div class="modal fade" id="Addproduct" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                        <h4 class="modal-title" id="myModalLabel"><?= label('AddProduct') ?></h4>
                    </div>
                    <?php
                    $attributes = ['id' => 'addform'];
                    echo form_open_multipart('productcontroller/addn_frompur', $attributes);
                    ?>
                    <div class="modal-body">
                        <input type="hidden" name="type" value="0" id="type">
                        <?php
                        $mmik = $this->db->query('select * from products order by id desc ')->row_array();
                        ?>
                        <div class="form-group controls">

                            <div class="col-xs-4">
                                <label for="ProductCode"><?= label('ProductCode') ?></label>

                                <input type="text" value="<?php echo (@$mmik['id'] + 1) ?? 1; ?>" Required name="code" class="form-control" id="ProductCode" placeholder="<?= label('ProductCode') ?>">


                                <p id="codeError" class="red" hidden><?= label('codeerror') ?></p>
                            </div>

                            <div class="col-xs-4">
                                <label for="ProductName"><?= label('ProductName') ?></label>
                                <input autofocus type="text" name="name" maxlength="50" Required class="form-control" id="ProductName" placeholder="<?= label('ProductName') ?>">
                            </div>



                            <div class="col-xs-4">
                                <label for="ProductCode"><?= label('HSN') ?></label>
                                <input type="text" maxlength="30" value="0" Required name="hsn" class="form-control" id="hsn" placeholder="<?= label('HSN') ?>">
                                <p id="codeError" class="red" hidden><?= label('codeerror') ?></p>
                            </div>





                        </div>



                        <div class="form-group">
                            <div class="col-xs-4">
                                <label for="Category">Brand</label>
                                <select class="form-control" name="brandd" id="brandd">
                                    <option value="0">Select</option>

                                    <?php
                                    $imnn = $this->db->query("select * from brand order by name asc")->result_array();
                                    foreach ($imnn as $imnnf) {
                                    ?>
                                        <option value="<?php echo $imnnf['id']; ?>"><?php echo $imnnf['name']; ?></option>
                                    <?php
                                    }
                                    ?>
                                </select>

                                <a href="javascript:void(0)" data-toggle="modal" data-target="#Addbrand">
                                    <span class="fa-stack fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Brand">

                                        <i style="color: #89b03e;" class="fa fa-plus fa-stack-1x  "></i>
                                    </span>
                                </a>

                            </div>



                            <div class="col-xs-4">
                                <label for="Category"><?= label('Category') ?></label>
                                <select class="form-control" name="category" id="Category">
                                    <option value="0">Select</option>
                                    <?php foreach ($categories as $category) : ?>
                                        <option value="<?= $category->id ?>"><?= $category->name ?></option>
                                    <?php endforeach; ?>
                                </select>

                                <a href="javascript:void(0)" data-toggle="modal" data-target="#Addcategory">
                                    <span class="fa-stack fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Category">

                                        <i style="color: #89b03e;" class="fa fa-plus fa-stack-1x  "></i>
                                    </span>
                                </a>
                            </div>



                            <div class="col-xs-4" id="supply">
                                <label for="Supplier"><?= label('Supplier') ?></label>
                                <select class="form-control" name="supplier" id="Supplier">
                                    <option value="0">Select</option>
                                    <?php foreach ($suppliers as $supplier) : ?>
                                        <option value="<?= $supplier->id ?>"><?= $supplier->name ?></option>
                                    <?php endforeach; ?>
                                </select>

                                <a href="javascript:void(0)" data-toggle="modal" data-target="#AddSupplier">
                                    <span class="fa-stack fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Suppliers">

                                        <i style="color: #89b03e;" class="fa fa-user-plus fa-stack-1x  "></i>
                                    </span>
                                </a>
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="col-xs-4">
                                <label for="PurchasePrice"><?= label('PurchasePrice') ?></label>
                                <input type="number" step="any" Required value="0" Required name="cost" class="form-control" id="PurchasePrice" placeholder="<?= label('PurchasePrice') ?>">
                            </div>

                            <div class="col-xs-4">
                                <label for="Price"><?= label('Selling') ?> <?= label('Price') ?></label>
                                <input type="number" step="any" value="0" Required name="price" class="form-control" id="Price" placeholder="<?= label('Price') ?>">
                            </div>

                            <div class="col-xs-4">
                                <label for="Price"><?= label('MRP') ?></label>
                                <input type="number" step="any" value="0" Required name="rrate" class="form-control" id="rrate" placeholder="<?= label('MRP') ?>">
                            </div>


                        </div>



                        <?php
                        $mkzz = $this->db->query("select * from settings where id=1 ")->row_array();
                        if ($mkzz['gst_tax'] == 1) {
                        ?>
                            <div class="form-group">

                                <div class="col-xs-12">
                                    <label for="Tax">Tax %</label>
                                    <a href="javascript:void(0)" data-toggle="modal" data-target="#Addtax">
                                        <span class="fa-stack fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Tax">

                                            <i style="color: #89b03e;" class="fa fa-plus fa-stack-1x  "></i>
                                        </span>
                                    </a>



                                    <div style="height: 70px;overflow-y: scroll;" id="ttaxx">
                                        <?php
                                        $taxx = $this->db->query("select * from tax where status=1 order by name asc")->result_array();
                                        foreach ($taxx as $taxxf) {
                                        ?>
                                            <div class="col-xs-4">
                                                <span style="float: left;width: 10%">
                                                    <input type="checkbox" style="display: block;" name="ckk[]" id="ckc" value="<?php echo $taxxf['id']; ?>">
                                                </span>
                                                <span style="float: left;width:80%;margin-left:5%;">
                                                    <?php echo $taxxf['name']; ?>-<?php echo $taxxf['valueper']; ?>%
                                                </span>
                                            </div>
                                        <?php
                                        }
                                        ?>


                                    </div>

                                </div>
                                <input type="hidden" value="0" maxlength="10" name="stax" class="form-control" id="sTax" placeholder="In %">
                                <input type="hidden" value="0" maxlength="2" name="igst" class="form-control" id="igst" placeholder="In %">


                            </div>

                        <?php } else {
                        ?>
                            <input type="hidden" name="tax" id="Tax" value="0">
                            <input type="hidden" name="stax" id="sTax" value="0">
                            <input type="hidden" name="taxmethod" id="taxmethod" value="0">
                            <input type="hidden" name="igst" id="igst" value="0">


                        <?php  } ?>





                        <div class="form-group">

                            <div class="col-xs-4">
                                <label for="Price"><?= label('Discount') ?> %</label>
                                <input maxlength="2" type="number" step="any" Required value="0" name="dispx" class="form-control" id="dispx" placeholder="<?= label('Price') ?>">
                            </div>



                            <div class="col-xs-4">
                                <label for="Unit"><?= label('Unit') ?></label>
                                <input Required type="text" step="any" name="unit" value="0" class="form-control" id="Unit" placeholder="<?= label('Unit') ?>">
                            </div>

                            <div class="col-xs-4">
                                <label for="AlertQt"><?= label('AlertQt') ?></label>
                                <input type="number" value="0" name="alertqt" class="form-control" id="AlertQt" placeholder="<?= label('AlertQt') ?>">
                            </div>


                        </div>



                        <div class="form-group">
                            <div class="col-xs-4">
                                <label for="taxType"><?= label('TaxMethod') ?></label>
                                <select class="form-control" name="taxmethod" id="taxType">
                                    <option value="0"><?= label('inclusive') ?></option>
                                    <option value="1"><?= label('exclusive') ?></option>
                                </select>
                            </div>



                            <input value="1" type="hidden" name="measur" class="form-control" id="measur">



                        </div>
                        <div class="form-group">

                            <label for="exampleInputFile"><?= label('Imageinput') ?></label>
                            <input type="file" name="userfile" id="ImageInput">
                        </div>


                        <div class="col-xs-12">

                            <label for="ProductDescription"><?= label('ProductDescription') ?></label>
                            <textarea id="summernoted" class="form-control" name="description"></textarea>

                        </div>

                        <input type="hidden" name="color" id="option7" value="color07" autocomplete="off">


                        <style type="text/css">
                            .modal-footer {
                                border-top: 0px solid #e5e5e5;
                            }
                        </style>
                        <div class="modal-footer">

                            <button type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?= label('Submit') ?></button>

                            <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?= label('Close') ?></button>

                        </div>
                        <?php echo form_close(); ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- /.Modal -->

    <!-- Modal -->
    <div class="modal fade" id="ImportProducts" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title" id="myModalLabel"><?= label('AddProduct') ?></h4>
                </div>
                <?php
                $attributes = ['id' => 'addform'];
                echo form_open_multipart('products/importcsvnew', $attributes);
                ?>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="exampleInputFile"><?= label('Uploadxlsfile') ?></label>
                        <input type="file" name="userfile" id="ImageInput">
                        <p class="help-block"><a href="<?= site_url('files/product.xls') ?>"><?= label('DownloadSample') ?></a></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal"><?= label('Close') ?></button>
                    <button type="submit" class="btn btn-add"><?= label('Submit') ?></button>
                </div>
                <?php echo form_close(); ?>
            </div>
        </div>
    </div>
    <!-- /.Modal -->




    <!-- Modal -->


    <div class="modal fade" id="AddSupplier" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title" id="myModalLabel"><?= label('Add') ?></h4>
                </div>

                <div class="modal-body">
                    <div class="form-group">
                        <div class="col-xs-6">
                            <label for="SupplierName"><?= label('SupplierName') ?></label>
                            <input type="text" name="name" maxlength="50" Required class="form-control" id="SupplierName" placeholder="<?= label('SupplierName') ?>">
                        </div>
                        <div class="col-xs-6">
                            <label for="SupplierPhone"><?= label('SupplierPhone') ?></label>
                            <input type="text" name="phone" Required maxlength="30" class="form-control" id="SupplierPhone" placeholder="<?= label('SupplierPhone') ?>">
                        </div>
                    </div>
                    <div class="form-group">

                        <div class="col-xs-6">
                            <label for="SupplierEmail"><?= label('SupplierEmail') ?></label>
                            <input type="email" maxlength="50" name="email" class="form-control" id="SupplierEmail" placeholder="<?= label('SupplierEmail') ?>">
                        </div>
                        <div class="form-group">
                            <div class="col-xs-6">
                                <label for="City">City</label>
                                <input name="city" class="form-control" id="city" required="" placeholder="City" type="text">
                            </div>

                            <div class="col-xs-6">
                                <label for="Country">Country</label>
                                <input name="country" class="form-control" required="" id="country" placeholder="Country" type="text">
                            </div>

                        </div>
                        <div class="col-xs-6">
                            <label for="SupplierEmail">GST <?= label('Number') ?></label>
                            <input type="text" maxlength="50" name="gst" class="form-control" id="gst" placeholder="GST <?= label('Number') ?>">
                        </div>

                    </div>





                    <input name="city" value="Chennai" class="form-control" id="city" Required placeholder="City" type="hidden">





                    <input name="country" class="form-control" value="India" Required id="country" placeholder="Country" type="hidden">





                    <div class="col-xs-6">
                        <label for="Note"><?= label('Address') ?></label>
                        <textarea id="adress" class="form-control" name="adress"></textarea>
                    </div>


                    <div class="col-xs-6">
                        <label for="Note"><?= label('note') ?></label>
                        <textarea id="summernotes" class="form-control" name="note"></textarea>
                    </div>


                </div>

                <style type="text/css">
                    .modal-footer {
                        border-top: 0px solid #e5e5e5;
                    }
                </style>


                <div class="modal-footer">

                    <button data-dismiss="modal" onclick="return kakkak();" type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?= label('Submit') ?></button>

                    <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?= label('Close') ?></button>

                </div>


            </div>
        </div>
    </div>
    <!-- /.Modal -->


    <!-- Modal combo -->
    <div class="modal fade" id="combo" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
        <div class="modal-dialog" role="document" id="comboModal">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title" id="combo"><?= label('combinations') ?></h4>
                </div>
                <div class="modal-body" id="modal-body" style="padding:1px;">
                    <div id="combocontent">
                        <!-- combo goes here -->
                    </div>
                </div>
                <div class="modal-footer">
                    <!-- <button type="button" class="btn btn-default hiddenpr" onclick="location.reload();"><?= label('Close') ?></button>
          <button type="button" class="btn btn-add hiddenpr" onclick="addcombo()"><?= label('submit') ?></button> -->
                </div>
            </div>
        </div>
    </div>
    <!-- /.Modal -->

    <!-- Modal stock -->
    <div class="modal fade" id="stock" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
        <div class="modal-dialog" role="document" id="stockModal">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title" id="stock"><?= label('Stock') ?></h4>
                </div>
                <div class="modal-body" id="modal-body" style="padding:1px;">
                    <div id="stockcontent">
                        <!-- stock goes here -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default hiddenpr" onclick="location.reload();"><?= label('Close') ?></button>
                    <button type="button" class="btn btn-add hiddenpr" onclick="updatestock()"><?= label('submit') ?></button>
                </div>
            </div>
        </div>
    </div>
    <!-- /.Modal -->


    <!-- Modal view -->
    <div class="modal fade" id="Viewproduct" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
        <div class="modal-dialog modal-lg" role="document" id="viewModal">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title" id="view"><?= label('Viewproduct') ?></h4>
                </div>
                <div class="modal-body" id="modal-body" style="padding:1px;">
                    <div id="viewSectionProduct">
                        <!-- view goes here -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label('Close') ?></button>
                </div>
            </div>
        </div>
    </div>
    <!-- /.Modal -->


    <!-- Modal barcode -->
    <div class="modal fade" id="barcode" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
        <div class="modal-dialog" role="document" id="stockModal">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title" id="barcode"><?= label('Stock') ?></h4>
                </div>
                <div class="modal-body" id="modal-body" style="padding:1px;">
                    <div class="form-group col-md-6">
                        <label for="Price"><?= label('RowsNumber') ?></label>
                        <select Required class="form-control" id="Brrows">
                            <option value="12">1</option>
                            <option value="6">2</option>
                            <option value="4">3</option>
                        </select>
                    </div>
                    <div class="form-group col-md-6">
                        <label for="Price"><?= label('Number') ?></label>
                        <input type="number" Required name="num" class="form-control" id="Brnum" placeholder="<?= label('Number') ?>" value="10">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label('Close') ?></button>
                    <button type="button" class="btn btn-add hiddenpr" onclick="barcode()"><?= label('submit') ?></button>
                </div>
            </div>
        </div>
    </div>
    <!-- /.Modal -->


    <!-- Modal barcode -->
    <div class="modal fade" id="barcodeP" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
        <div class="modal-dialog" role="document" id="stockModal">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title" id="barcodeP"><?= label('Stock') ?></h4>
                </div>
                <div class="modal-body" id="modal-body" style="padding:1px;">
                    <div id="printSection" style="text-align: center;">
                        <!-- content -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label('Close') ?></button>
                    <button type="button" class="btn btn-add hiddenpr" onclick="Printbarcode()"><?= label('print') ?></button>
                </div>
            </div>
        </div>
    </div>
    <!-- /.Modal -->



    <!-- Modal -->
    <div class="modal fade" id="Addcategory" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title" id="myModalLabel"><?= label('AddCategory') ?></h4>
                </div>
                <?php echo form_open_multipart('categories/add'); ?>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="CategoryName"><?= label('CategoryName') ?></label>
                        <input type="text" maxlength="50" name="name" class="form-control" id="CategoryName" placeholder="<?= label('CategoryName') ?>" required>
                    </div>
                </div>
                <div class="modal-footer">

                    <button data-dismiss="modal" onclick="return kakkakat();" type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?= label('Submit') ?></button>


                    <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?= label('Close') ?></button>

                </div>
                <?php echo form_close(); ?>
            </div>
        </div>
    </div>




    <!-- Modal -->
    <div class="modal fade" id="Addbrand" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title" id="myModalLabel"><?= label('Add Brand') ?></h4>
                </div>
                <?php echo form_open_multipart('categories/add'); ?>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="CategoryName"><?= label('Brand') ?></label>
                        <input type="text" maxlength="50" name="Brandname" class="form-control" id="Brandname" placeholder="<?= label('Brand') ?>" required>
                    </div>
                </div>
                <div class="modal-footer">

                    <button data-dismiss="modal" onclick="return kakkakbar();" type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?= label('Submit') ?></button>


                    <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?= label('Close') ?></button>

                </div>
                <?php echo form_close(); ?>
            </div>
        </div>
    </div>





    <!-- Modal -->
    <div class="modal fade" id="Addtax" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title" id="myModalLabel"><?= label('Add') ?></h4>
                </div>
                <?php echo form_open_multipart('tax/add'); ?>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="CategoryName"><?= label('tax') ?> <?= label('Name') ?></label>
                        <input type="text" maxlength="50" name="taxName" class="form-control" id="taxName" required>
                    </div>

                    <div class="form-group">
                        <label for="CategoryName"><?= label('tax') ?>(%)</label>
                        <input type="text" maxlength="5" name="persent" class="form-control" id="persent" required>
                    </div>

                    <div class="form-group">
                        <label for="CategoryName"><?= label('tax') ?> <?= label('type') ?></label>
                        <select class="form-control" name="custtype" id="custtype">
                            <option value="1">Local State</option>
                            <option value="2">Other State</option>
                        </select>
                    </div>


                </div>
                <div class="modal-footer">

                    <button data-dismiss="modal" onclick="return kakkaktax();" type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?= label('Submit') ?></button>


                    <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?= label('Close') ?></button>

                </div>
                <?php echo form_close(); ?>
            </div>
        </div>
    </div>
    <!-- /.Modal -->




    <script type="text/javascript">
        function kakkaktax() {

            var taxName = $('#taxName').val();
            var persent = $('#persent').val();
            var custtype = $('#custtype').val();




            if (CategoryName == '') {
                return false;
            }


            $.ajax({
                url: "<?php echo site_url('tax/addajax'); ?>/",
                type: "POST",
                data: {
                    taxName: taxName,
                    persent: persent,
                    custtype: custtype
                },
                success: function(data) {
                    $('#taxName').val('');
                    $('#persent').val('');
                    $('#custtype').val('');

                    $('#ttaxx').html(data);


                    $('#printSection').html(data);
                    $('#Addpayament').modal('show');

                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert("error");
                }
            });

        }





        function kakkak() {

            var SupplierName = $('#SupplierName').val();
            var SupplierPhone = $('#SupplierPhone').val();
            var SupplierEmail = $('#SupplierEmail').val();
            var gst = $('#gst').val();
            var adress = $('#adress').val();
            var country = $('#country').val();
            var city = $('#city').val();
            var summernotes = $('#summernotes').val();


            if (SupplierName == '') {
                return false;
            }


            $.ajax({
                url: "<?php echo site_url('suppliers/addajax'); ?>/",
                type: "POST",
                data: {
                    city: city,
                    country: country,
                    name: SupplierName,
                    phone: SupplierPhone,
                    email: SupplierEmail,
                    gst: gst,
                    adress: adress,
                    note: summernotes
                },
                success: function(data) {



                    $('#SupplierName').val('');
                    $('#city').val('');
                    $('#country').val('');
                    $('#SupplierPhone').val('');
                    $('#SupplierEmail').val('');
                    $('#gst').val('');
                    $('#adress').val('');
                    $('#summernotes').val('');
                    $('#Supplier').html(data);
                    $('#supp').html(data);


                    $('#printSection').html(data);
                    $('#Addpayament').modal('show');

                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert("error");
                }
            });

        }



        function kakkakat() {

            var goryName = $('#CategoryName').val();
            if (goryName == '') {
                return false;
            }



            $.ajax({
                url: "<?php echo site_url('categories/addajax'); ?>/",
                type: "POST",
                data: {
                    name: goryName
                },
                success: function(data) {

                    $('#CategoryName').val('');

                    $('#Category').html(data);


                    $('#printSection').html(data);
                    $('#Addpayament').modal('show');

                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert("error");
                }
            });

        }

        function kakkakbar() {

            var goryName = $('#Brandname').val();

            if (goryName == '') {
                return false;
            }


            $.ajax({
                url: "<?php echo site_url('brand/addajax'); ?>/",
                type: "POST",
                data: {
                    name: goryName
                },
                success: function(data) {

                    $('#Brandname').val('');

                    $('#brandd').html(data);
                    $('#branddd').html(data);


                    $('#printSection').html(data);
                    $('#Addpayament').modal('show');

                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert("error");
                }
            });

        }
    </script>


    <style type="text/css">
        .dt-buttons {
            text-align: right;
        }
    </style>

    <script src="<?php echo base_url(); ?>assets/js/datatables.min.js" type="text/javascript"></script>

    <script>
        document.onkeydown = KeyCheck;

        function KeyCheck(e) {
            var KeyID = (window.event) ? event.keyCode : e.keyCode;
            if (KeyID == 113 || KeyID == 115) {
                $.ajax({
                    url: "<?php echo site_url('purchase/updatepurchaetype'); ?>/",
                    type: "POST",
                    data: {
                        KeyID: KeyID
                    },
                    success: function(data) {
                        window.location.href = "<?php echo site_url(); ?>purchase/add";
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        alert("error");
                    }
                });
            }
        }

        $(function() {
            var TableDatatablesButtons = function() {
                var table = $('#Table3');
                var oTable = table.dataTable({
                    buttons: [



                        {
                            extend: 'excel',
                            className: 'btn btn-default'
                        }


                    ],

                    "order": [
                        [0, 'desc']
                    ],

                    "lengthMenu": [
                        [5, 10, 15, 20, -1],
                        [5, 10, 15, 20, "All"] // change per page values here
                    ],
                    // set the initial value
                    "pageLength": 10,

                    "dom": "<'row' <'col-md-12'B>><'row'<'col-md-6 col-sm-12'l><'col-md-6 col-sm-12'f>r><'table-scrollable't><'row'<'col-md-5 col-sm-12'i><'col-md-7 col-sm-12'p>>", // horizobtal scrollable datatable

                    // Uncomment below line("dom" parameter) to fix the dropdown overflow issue in the datatable cells. The default datatable layout
                    // setup uses scrollable div(table-scrollable) with overflow:auto to enable vertical scroll(see: assets/global/plugins/datatables/plugins/bootstrap/dataTables.bootstrap.js). 
                    // So when dropdowns used the scrollable div should be removed. 
                    //"dom": "<'row' <'col-md-12'T>><'row'<'col-md-6 col-sm-12'l><'col-md-6 col-sm-12'f>r>t<'row'<'col-md-5 col-sm-12'i><'col-md-7 col-sm-12'p>>",
                });
            }();
            jQuery(document).ready(function() {
                TableDatatablesButtons.init();
            });
        });
    </script>


    <script>
        $('.inputTab').on('keydown', function(event) {
            if (event.which == 13) {
                event.preventDefault();
                var $this = $(event.target);
                var index = parseFloat($this.attr('data-index'));
                $('[data-index="' + (index + 1).toString() + '"]').focus();
            }
        });
        $('.topTab').on('keydown', function(event) {
            if (event.which == 13) {
                event.preventDefault();
                var $this = $(event.target);
                var index = parseFloat($this.attr('data-index'));
                $('[data-index="' + (index + 1).toString() + '"]').focus();
            }
        });
    </script>