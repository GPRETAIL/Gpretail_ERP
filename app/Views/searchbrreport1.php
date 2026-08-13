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
        <h3><?= label('Profit'); ?> <?= label('Report'); ?> </h3>
        <hr>

        <div class="row rangeStat" style="margin-top:2px;">

            <div class="col-md-2">
                <div class="form-group">
                    <label><?= label('Scan Barecode'); ?></label>
                    <div class="input-group margin-bottom-sm">

                        <input class="form-control" id="barcodee" type="text" value="" name="barcodee" />
                    </div>
                </div>
            </div>

            <div class="col-md-5">

                <a href="javascript:void(0);" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="getProducttaxReport()"><?= label('Get'); ?></a>




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


        // function getProducttaxReport() {
        //     $("#cover").show();


        //     var barcodee = $('#barcodee').val();

        //     $.ajax({
        //         url: "<?php echo site_url('reports/searchbasecodee') ?>",
        //         type: "POST",
        //         data: {
        //             barcodee: barcodee
        //         },
        //         success: function(data) {
        //             $("#cover").hide();
        //             $('#custrrr').html(data);
        //             $('.hideme').hide();
        //             $('.hideme').hide();
        //             $('.hideme').hide();
        //             $('#stats').modal('show');
        //             var table = $('#Table').DataTable({
        //                 dom: 'T<"clear">lfrtip',
        //                 tableTools: {
        //                     'bProcessing': true
        //                 }
        //             });
        //         },
        //         error: function(jqXHR, textStatus, errorThrown) {
        //             $("#cover").hide();
        //         }
        //     });
        // }


        function getProducttaxReport() {

            $("#cover").show();
            var barcodee = $('#barcodee').val();

            $.ajax({
                url: "<?php echo site_url('reports/searchbasecodee') ?>",
                type: "POST",
                data: {
                    barcodee: barcodee
                },
                success: function(data) {
                    $("#cover").hide();
                    $('#custrrr').html(data);
                    $('.hideme').hide();
                    $('#stats').modal('show');

                    // Reinitialize or destroy & create DataTable
                    if ($.fn.DataTable.isDataTable('#Table')) {
                        $('#Table').DataTable().clear().destroy();
                    }

                    $('#Table').DataTable({
                        dom: 'Bfrtip',
                        buttons: ['copy', 'excel', 'pdf', 'print']
                    });
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    $("#cover").hide();
                    alert("Error: " + textStatus);
                }
            });
        }

        function PrintTicket() {

            $('.hideme').show();
            $('body').css({
                height: 'auto'
            });
            $('.modal-body').removeAttr('id');
            window.print();
            $('.hideme').hide();

            $('.modal-body').attr('id', 'modal-body');
        }
    </script>



    <script src="<?php echo base_url(); ?>public/assets/new/jquery.btechco.excelexport.js"></script>
    <script src="<?php echo base_url(); ?>public/assets/new/jquery.base64.js"></script>

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