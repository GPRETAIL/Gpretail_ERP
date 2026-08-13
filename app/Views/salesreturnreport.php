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
<div id="cover"><img id="loading-image" src="<?php echo base_url(); ?>assets/loader.gif" alt="Loading..." /></div>


<div class="container">
    <div class="row" style="margin-top:3px;">
        <h3><?= label("Sales"); ?> <?= label("Return"); ?> <?= label("Reports"); ?> </h3>
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






            <div class="col-md-4">




                <a href="javascript:void(0);" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="getProducttaxReport()"><?= label('GetReport'); ?></a>

                <a href="#" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="PrintTicket()">Print</a>
                <a href="#" id="btnExport" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr">XLS</a>


                <?php
                if ($setting->show_pdf_or_not == 1) {
                ?>
                    <a href="#" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="pdfreceipt()">PDF</a> <?php
                                                                                                                                                    }
                                                                                                                                                        ?>




            </div>
        </div>






        <div class="modal-body">
            <div id="printSection">
                <div id="custrrr">

                </div>
            </div>
        </div>






    </div>


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
        window.onload = function() {

            // Chart.defaults.global.gridLines.display = false;

            var ctx = document.getElementById("canvas").getContext("2d");
            window.myLine = new Chart(ctx, {
                type: 'line',
                data: lineChartData,
                options: {
                    scales: {
                        xAxes: [{
                            gridLines: {
                                display: false
                            }
                        }],
                        yAxes: [{
                            gridLines: {
                                display: false
                            }
                        }]
                    },
                    scaleFontSize: 9,
                    tooltipFillColor: "rgba(0, 0, 0, 0.71)",
                    tooltipFontSize: 10,
                    responsive: true
                }
            });

            /********************* pie **********************/
            <?php if (isset($Top5product) && count($Top5product) >= 5) { ?>


                var pieData = {
                    labels: [
                        "<?= $Top5product[0]->name; ?>",
                        "<?= $Top5product[1]->name; ?>",
                        "<?= $Top5product[2]->name; ?>",
                        "<?= $Top5product[3]->name; ?>",
                        "<?= $Top5product[4]->name; ?>"
                    ],
                    datasets: [{
                        data: [<?= $Top5product[0]->totalquantity; ?>, <?= $Top5product[1]->totalquantity; ?>, <?= $Top5product[2]->totalquantity; ?>, <?= $Top5product[3]->totalquantity; ?>, <?= $Top5product[4]->totalquantity; ?>],
                        backgroundColor: [
                            "#34495E",
                            "#7f8c8d",
                            "#ECF0F1",
                            "#3498DB",
                            "#1ABC9C"
                        ],
                        hoverBackgroundColor: [
                            "#3e5367",
                            "#95a5a6",
                            "#f5fbfc",
                            "#459eda",
                            "#2dc6a8"
                        ]
                    }]
                };

                Chart.defaults.global.legend.display = false;

                var ctx2 = document.getElementById("chart-area2").getContext("2d");
                window.myPie = new Chart(ctx2, {
                    type: 'pie',
                    data: pieData
                });
            <?php } ?>
        }


        /********************************** Get repports functions ************************************/






        function getProducttaxReport() {

            $("#cover").show();

            var Range = $('#pddate').val();
            var Range1 = $('#innvdda').val();
            var suppr = $('#supp').val();

            var typeda = $('#typeda').val();
            var typess = $('#typess').val();


            if (typeda == 1 && typess == 1) {

                // ajax set data to database
                $.ajax({
                    url: "<?php echo site_url('reports/salesReturnDailyReport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr
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
                $.ajax({
                    url: "<?php echo site_url('reports/salesReturnDailyReport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr
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


                $.ajax({
                    url: "<?php echo site_url('reports/getsalsumbjReport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr
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


                $.ajax({
                    url: "<?php echo site_url('reports/salesretunReport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr
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