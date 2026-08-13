<style type="text/css">
    #cover {
        position: fixed;
        height: 100%;
        width: 100%;
        top: 0;
        left: 0;
        background: transparent;
        z-index: 9999;
        font-size: 60px;
        text-align: center;
        padding-top: 200px;
        color: #fff;
    }
</style>
<div id="cover"><img id="loading-image" src="<?php echo base_url(); ?>public/assets/loader.gif" alt="Loading..." /></div>


<div class="container">
    <div class="row" style="margin-top:3px;">
        <h3><?= label("Purchase"); ?> <?= label("Reports"); ?> </h3>
        <hr>
        <div class="row rangeStat" style="margin-top:1px;">

            <div class="col-sm-1 " style="padding-left: 1px;width: 120px;">
                <div class="form-group"> <?= label("Fromdate"); ?>
                    <input type="text" maxlength="30" Required="required" value="<?php echo date("d-m-Y"); ?>" name="pddate" class="form-control" id="pddate" placeholder="from Date">
                </div>
            </div>
            <div class="col-sm-1 " style="padding-left: 1px;width: 120px;">
                <div class="form-group"> <?= label("Tilldate"); ?>
                    <input class="form-control" type="text" name="innvdda" id="innvdda" value="<?php echo date("d-m-Y"); ?>" placeholder="Till Date">
                </div>
            </div>
            <div class="col-sm-1 " style="padding-left: 1px;width: 120px;">
                <div class="form-group"><?= label("Date"); ?> <?= label("Type"); ?>
                    <select class="js-select-options form-control" id="typeda" name="typeda">
                        <option value="1"><?= label("Daily"); ?></option>
                        <option value="2"><?= label("Monthly"); ?></option>
                    </select>
                </div>
            </div>


            <div class="col-sm-1 " style="padding-left: 1px;width: 120px;">
                <div class="form-group"><?= label("Type"); ?>
                    <select class="js-select-options form-control" id="typess" name="typess">
                        <option value="1"><?= label("Detailed"); ?></option>
                        <option value="2"><?= label("Summary"); ?></option>

                    </select>
                </div>
            </div>
            <!-- <div class="col-sm-1 " style="padding-left: 1px;width: 120px; display:none;">
                <div class="form-group"><?= label("Bill"); ?>
                    <select class="js-select-options form-control" id="bill_type" name="bill_type">
                        <option value=""><?= label("All"); ?></option>
                        <option value="1"><?= label("ORG"); ?></option>
                        <option value="2"><?= label("DUP"); ?></option>

                    </select>
                </div>
            </div> -->




            <div class="col-md-4">


                <a href="javascript:void(0);" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="getProducttaxReport()"><?= label('GetReport'); ?></a>

                <a href="#" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="PrintTicket()">Print</a>
                <a href="#" id="btnExport" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr">XLS</a>


                <?php if ($setting->show_pdf_or_not == 1) { ?>
                    <a href="#" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="pdfreceipt()">PDF</a> <?php } ?>

            </div>


        </div>






        <div class="modal-body">
            <div id="printSection">
                <div id="custrrr">
                </div>
            </div>
        </div>
    </div>



    <table id="purchaseDaily" class="table table-striped table-bordered w-100" style="display: none;">
        <thead>
            <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Bill #</th>
                <th>Bill Amount</th>
                <th>Tax</th>
                <th>Discount</th>
                <th>Amount</th>
                <th>Return</th>
                <th>Net</th>
                <th>Paid</th>
                <th>Balance</th>
            </tr>
        </thead>
        <tfoot>
            <tr>
                <th colspan="3" style="text-align:right">Totals:</th>
                <th id="ft-bill"></th>
                <th id="ft-tax"></th>
                <th id="ft-disc"></th>
                <th id="ft-amt"></th>
                <th id="ft-ret"></th>
                <th id="ft-net"></th>
                <th id="ft-paid"></th>
                <th id="ft-bal"></th>
            </tr>
        </tfoot>
        <tbody></tbody>
    </table>

    <script>
        function getReportTable() {
            $('#printSection').html('');
            $('#purchaseDaily').show();
            $('#purchaseDaily').DataTable({
                processing: true,
                serverSide: true,
                // order: [
                //     [0, 'desc']
                // ],
                ajax: {
                    url: "<?= base_url('reports/getpurchasedailyReport_new') ?>",
                    type: "POST",
                    data: function(d) {
                        d.Range = $('#pddate').val();
                        d.Range1 = $('#innvdda').val();
                    }
                },
                bDestroy: true,
                dom: 'Bfrtip', // <— Add this

            });
        }
    </script>


    <script>
        // document.addEventListener("keydown", function(event) {
        //     if (event.keyCode === 119 || event.key === "F8") { // Check for F8 key
        //         alert("F8 key was pressed!");
        //         event.preventDefault(); // Optional: Prevent default action
        //         // $('#productList').load("http://gpsoftware.in/pos/load_posalesdd/0");
        //         // location.reload();
        //     }
        // });

        document.onkeydown = KeyCheck;

        function KeyCheck(e) {
            var KeyID = (window.event) ? event.keyCode : e.keyCode;
            if (KeyID == 113 || KeyID == 115 || KeyID == 119) {
                var KeyID = (window.event) ? event.keyCode : e.keyCode;
                $.ajax({
                    url: "<?= base_url() ?>purchase/updatepurchaetype",
                    type: "POST",
                    data: {
                        KeyID: KeyID
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
    </script>

    <script>
        function pdfreceipt() {
            $('.hideme').show();
            var content = $('#printSection').html();
            $.redirect('<?php echo site_url('pos/pdfreceipt') ?>/', {
                content: content
            });
            $('.hideme').hide();
        }

        function PrintTicket() {

            $('.hideme').show();
            $('.modal-body').removeAttr('id');
            window.print();
            $('.hideme').hide();

            $('.modal-body').attr('id', 'modal-body');
        }

        /******* Range date picker *******/
        $(function() {
            $('input[name="daterange"]').daterangepicker();
            $('input[name="daterangeP"]').daterangepicker();
            $('input[name="daterangeR"]').daterangepicker();
            var d = new Date().getFullYear();
            $('#ProductRange').val('01/01/' + d + ' - 12/31/' + d);
            $('#CustomerRange').val('01/01/' + d + ' - 12/31/' + d);
            $('#RegisterRange').val('01/01/' + d + ' - 12/31/' + d);

        });
        /************************ Chart Data *************************/
        var randomScalingFactor = function() {
            return Math.round(Math.random() * 100)
        };
        var lineChartData = {
            labels: ["<?= label('January'); ?>", "<?= label('February'); ?>", "<?= label('March'); ?>", "<?= label('April'); ?>", "<?= label('May'); ?>", "<?= label('June'); ?>", "<?= label('July'); ?>", "<?= label('August'); ?>", "<?= label('September'); ?>", "<?= label('October'); ?>", "<?= label('November'); ?>", "<?= label('December'); ?>"],
            datasets: [{
                    label: "<?= label('Expences'); ?>",
                    backgroundColor: "rgba(255,99,132,0.2)",
                    borderColor: "rgba(255,99,132,1)",
                    pointBackgroundColor: "rgba(255,99,132,1)",
                    pointBorderColor: "#fff",
                    pointHoverBackgroundColor: "#fff",
                    pointHoverBorderColor: "rgba(255,99,132,1)",
                    data: [<?= isset($monthlyExp[0]) ? $monthlyExp[0]->january : ''; ?>, <?= isset($monthlyExp[0]) ? $monthlyExp[0]->feburary : ''; ?>, <?= isset($monthlyExp[0]) ? $monthlyExp[0]->march : ''; ?>, <?= isset($monthlyExp[0]) ? $monthlyExp[0]->april : ''; ?>, <?= isset($monthlyExp[0]) ? $monthlyExp[0]->may : ''; ?>, <?= isset($monthlyExp[0]) ? $monthlyExp[0]->june : ''; ?>, <?= isset($monthlyExp[0]) ? $monthlyExp[0]->july : ''; ?>, <?= isset($monthlyExp[0]) ? $monthlyExp[0]->august : ''; ?>, <?= isset($monthlyExp[0]) ? $monthlyExp[0]->september : ''; ?>, <?= isset($monthlyExp[0]) ? $monthlyExp[0]->october : ''; ?>, <?= isset($monthlyExp[0]) ? $monthlyExp[0]->november : ''; ?>, <?= isset($monthlyExp[0]) ? $monthlyExp[0]->december : ''; ?>]
                },
                {
                    label: "<?= label('Revenue'); ?>",
                    backgroundColor: "#34495e",
                    borderColor: "#2c3e50",
                    pointBackgroundColor: "#34495e",
                    pointBorderColor: "#fff",
                    pointHoverBackgroundColor: "#fff",
                    pointHoverBorderColor: "#2c3e50",
                    data: [<?= isset($monthly[0]) ? $monthly[0]->january : ''; ?>, <?= isset($monthly[0]) ? $monthly[0]->feburary : ''; ?>, <?= isset($monthly[0]) ? $monthly[0]->march : ''; ?>, <?= isset($monthly[0]) ? $monthly[0]->april : ''; ?>, <?= isset($monthly[0]) ? $monthly[0]->may : ''; ?>, <?= isset($monthly[0]) ? $monthly[0]->june : ''; ?>, <?= isset($monthly[0]) ? $monthly[0]->july : ''; ?>, <?= isset($monthly[0]) ? $monthly[0]->august : ''; ?>, <?= isset($monthly[0]) ? $monthly[0]->september : ''; ?>, <?= isset($monthly[0]) ? $monthly[0]->october : ''; ?>, <?= isset($monthly[0]) ? $monthly[0]->november : ''; ?>, <?= isset($monthly[0]) ? $monthly[0]->december : ''; ?>]
                }
            ]
        }
        // window.onload = function() {

        // Chart.defaults.global.gridLines.display = false;

        // var ctx = document.getElementById("canvas").getContext("2d");
        // window.myLine = new Chart(ctx, {
        //    type: 'line',
        //    data: lineChartData,
        //    options: {
        //       scales: {
        //          xAxes: [{
        //             gridLines: {
        //                display: false
        //             }
        //          }],
        //          yAxes: [{
        //             gridLines: {
        //                display: false
        //             }
        //          }]
        //       },
        //       scaleFontSize: 9,
        //       tooltipFillColor: "rgba(0, 0, 0, 0.71)",
        //       tooltipFontSize: 10,
        //       responsive: true
        //    }
        // });


        /********************************** Get repports functions ************************************/






        function getProducttaxReport() {


            var Range = $('#pddate').val();
            var Range1 = $('#innvdda').val();
            var suppr = $('#supp').val();

            var typeda = $('#typeda').val();
            var typess = $('#typess').val();
            var bill_type = $('#bill_type').val();



            if (typeda == 1 && typess == 1) {

                getReportTable();
                return;
                // ajax set data to database
                $.ajax({
                    url: "<?php echo site_url('reports/getpurchasedailyReport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        bill_type: bill_type,
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            dom: 'T<"clear">lfrtip',
                            tableTools: {
                                'bProcessing': true
                            }
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $("#cover").hide();
                    }
                });
            } else if (typeda == 2 && typess == 1) {
                $("#cover").show();
                $('#purchaseDaily').hide();
                $.ajax({
                    url: "<?php echo site_url('reports/getpurchasedailyReport') ?>",
                    type: "POST",
                    data: {
                        btypess: typess,
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        bill_type: bill_type,
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            dom: 'T<"clear">lfrtip',
                            tableTools: {
                                'bProcessing': true
                            }
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $("#cover").hide();
                    }
                });
            } else if (typeda == 1 && typess == 2) {
                $('#purchaseDaily').hide();
                $("#cover").show();
                $.ajax({
                    url: "<?php echo site_url('reports/getPurchaseSummaryReport') ?>",
                    type: "POST",
                    data: {
                        btypess: typess,
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        bill_type: bill_type,
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            dom: 'T<"clear">lfrtip',
                            tableTools: {
                                'bProcessing': true
                            }
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $("#cover").hide();
                    }
                });
            } else if (typeda == 2 && typess == 2) {
                $("#cover").show();
                $('#purchaseDaily').hide();
                $.ajax({
                    url: "<?php echo site_url('reports/getpurchasemonthlyReport') ?>",
                    type: "POST",
                    data: {
                        btypess: typess,
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        bill_type: bill_type,
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            dom: 'T<"clear">lfrtip',
                            tableTools: {
                                'bProcessing': true
                            }
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $("#cover").hide();
                    }
                });
            }

        }
    </script>

    <script type="text/javascript">
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
        });
    </script>
    <script src="<?php echo base_url(); ?>assets/new/jquery.btechco.excelexport.js"></script>
    <script src="<?php echo base_url(); ?>assets/new/jquery.base64.js"></script>
    <script>
        $(document).ready(function() {
            $("#btnExport").click(function() {
                $("#printSection").btechco_excelexport({
                    containerid: "printSection"
                });
            });
        });
    </script>

    <script type="text/javascript">
        $(window).on('load', function() {

            $("#cover").hide();
        });
    </script>