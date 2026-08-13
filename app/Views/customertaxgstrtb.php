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
        <h3>GSTR-3B <?= label('Reports'); ?> </h3>
        <hr>
        <div class="row rangeStat">




            <div class="col-md-2">
                <div class="form-group">
                    <label>Year</label>
                    <div class="input-group margin-bottom-sm">


                        <select id="yyear" name="yyear" class="form-control">

                            <?php
                            for ($ik = date("Y"); $ik > 2016; $ik--) {
                            ?>

                                <option value="<?php echo $ik; ?>"><?php echo $ik; ?></option>

                            <?php
                            }
                            ?>

                        </select>

                    </div>
                </div>
            </div>

            <div class="col-md-2">
                <div class="form-group">
                    <label>Month</label>
                    <div class="input-group margin-bottom-sm">


                        <select id="mmonth" name="mmonth" class="form-control">
                            <option value="1">January </option>
                            <option value="2">February </option>
                            <option value="3">March </option>
                            <option value="4">April </option>
                            <option value="5">May </option>
                            <option value="6">June </option>
                            <option value="7">July </option>
                            <option value="8">August </option>
                            <option value="9">September </option>
                            <option value="10">October </option>
                            <option value="11">November </option>
                            <option value="12">December </option>
                        </select>


                    </div>
                </div>
            </div>





            <div class="col-md-4">

                <a href="javascript:void(0);" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="getCustomerReport()"><?= label('GetReport'); ?></a>

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
        $(document).ready(function() {
            $('#pddate').datepicker({
                todayHighlight: true,
                autoclose: true
            });

            $('#pddatel').datepicker({
                todayHighlight: true,
                autoclose: true
            });

        });

        function pdfreceipt() {

            $('.hideme').show();
            $('.hideme').show();
            $('.hideme').show();
            var content = $('#printSection').html();
            $.redirect('<?php echo site_url('pos/pdfreceipt') ?>/', {
                content: content
            });
            $('.hideme').hide();
            $('.hideme').hide();
            $('.hideme').hide();

        }

        /******* Range date picker *******/
        $(function() {
            $('input[name="daterange"]').daterangepicker();
            $('input[name="daterangeP"]').daterangepicker();
            $('input[name="daterangeR"]').daterangepicker();
            var d = new Date().getFullYear();
            $('#ProductRange').val('01-01-' + d + ' - 31-12-' + d);
            $('#CustomerRange').val('01-01-' + d + ' - 31-12-' + d);
            $('#RegisterRange').val('01-01-' + d + ' - 31-12-' + d);

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
            <?php if (!empty($Top5product) && count($Top5product) >= 5) { ?>


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

        function getCustomerReport() {
            $("#cover").show();

            var yyear = $('#yyear').val();
            var mmonth = $('#mmonth').val();
            var client_id = $('#mmonth').find('option:selected').text();

            $.ajax({
                url: "<?php echo site_url('reports/getCustomertaxgstrtb') ?>",
                type: "POST",
                data: {
                    mmonth: mmonth,
                    yyear: yyear,
                    client_id: client_id
                },
                success: function(data) {
                    $("#cover").hide();

                    $('#custrrr').html(data);
                    $('.hideme').hide();
                    $('.hideme').hide();
                    $('.hideme').hide();

                    var table = $('#Table').DataTable({
                        dom: 'T<"clear">lfrtip',
                        tableTools: {
                            'bProcessing': true
                        }
                    });
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    // alert("error");
                }
            });

        }

        function PrintTicket() {

            $('.hideme').show();
            $('.modal-body').removeAttr('id');
            window.print();
            $('.hideme').hide();

            $('.modal-body').attr('id', 'modal-body');
        }
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