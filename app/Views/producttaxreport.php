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
        <h3><?= label('Product'); ?> <?= label('tax'); ?> <?= label('Report'); ?> </h3>
        <hr>

        <div class="row rangeStat" style="margin-top:2px;">

            <div class="col-md-3">
                <div class="form-group">
                    <label for="customerSelect"><?= label('SelectProduct'); ?></label>
                    <select class="js-select-options form-control" id="productSelect">
                        <option value="0">All</option>
                        <?php foreach ($Products as $product): ?>
                            <option value="<?= $product->id; ?>"><?= $product->name; ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
            <div class="col-md-2">
                <div class="form-group">
                    <label><?= label('Fromdate'); ?></label>
                    <div class="input-group margin-bottom-sm">

                        <input class="form-control" id="pddate" type="text" value="<?php echo date("d-m-Y"); ?>" name="pddate" />
                    </div>
                </div>
            </div>

            <div class="col-md-2">
                <div class="form-group">
                    <label><?= label('Tilldate'); ?></label>
                    <div class="input-group margin-bottom-sm">

                        <input class="form-control" id="pddatel" value="<?php echo date("d-m-Y"); ?>" type="text" name="pddatel" />
                    </div>
                </div>
            </div>

            <div class="col-md-4">

                <a href="javascript:void(0);" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="getProducttaxReport()"><?= label('GetReport'); ?></a>

                <a href="#" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="PrintTicket()">Print</a>
                <a href="#" id="btnExport" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr">XLS</a>


                <?php
                if ($setting->show_pdf_or_not == 1) {
                ?>
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


        function getProducttaxReport() {
            $("#cover").show();
            var product_id = $('#productSelect').find('option:selected').val();





            var start = $('#pddate').val();
            var end = $('#pddatel').val();

            // ajax set data to database
            $.ajax({
                url: "<?php echo site_url('reports/getProducttaxReport') ?>",
                type: "POST",
                data: {
                    product_id: product_id,
                    start: start,
                    end: end
                },
                success: function(data) {
                    $("#cover").hide();
                    $('#custrrr').html(data);
                    $('.hideme').hide();
                    $('.hideme').hide();
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