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

<link rel="stylesheet" type="text/css" href="<?php echo base_url(); ?>assets/new/example-styles.css">

<style type="text/css">
    input[type=checkbox] {
        display: block !important;
    }

    .multi-select-container {
        display: block !important;
    }
</style>

<div class="container">
    <div class="row" style="margin-top:3px;">
        <h3><?= label("Cash In Hand"); ?> <?= label("Reports"); ?> </h3>
        <hr>
        <div class="row rangeStat" style="margin-top:1px;">


            <div class="col-sm-2 " style="padding-left: 1px; ">
                <div class="form-group"> <?= label("Fromdate"); ?>
                    <input type="text" maxlength="30" Required="required" readonly value="<?php echo date("d-m-Y"); ?>" name="pddate" class="form-control" id="pddate" placeholder="from Date">
                </div>
            </div>


            <div class="col-md-2">
                <a href="javascript:void(0);" style="padding: 7px;margin-top: 18px;margin-bottom: 0px;width: 100%;" class="btn btn-add hiddenpr" onclick="getProducttaxReport()"><?= label('Get'); ?></a>
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




        function getProducttaxReport() {
            $("#cover").show();

            var Range = $('#pddate').val();
            // ajax set data to database
            $.ajax({
                url: "<?php echo site_url('reports/cashInHandDailyReport') ?>",
                type: "POST",
                data: {
                    Range: Range
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
    <script type="text/javascript" src="<?php echo base_url(); ?>assets/new/jquery.multi-select.js"></script>
    <script type="text/javascript">
        $(function() {
            $('#people').multiSelect();
            $('#line-wrap-example').multiSelect({
                positionMenuWithin: $('.position-menu-within')
            });
        });
    </script>