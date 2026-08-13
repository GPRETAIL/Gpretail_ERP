<style type="text/css">
    #cover {
        position: fixed;
        height: 50%;
        width: 50%;
        top: 50%;
        left: 50%;
        background: transparent;
        z-index: 9999;
        font-size: 60px;
        text-align: center;
        padding-top: 200px;
        color: #fff;
        transform: translate(-50%, -50%);
    }

    .return_tr {
        background-color: red;
    }
</style>



<!-- <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.3.0/css/bootstrap.min.css"> -->
<link rel="stylesheet" href="https://cdn.datatables.net/2.2.2/css/dataTables.bootstrap5.css">
<link rel="stylesheet" href="https://cdn.datatables.net/buttons/3.2.2/css/buttons.bootstrap5.css">


<!-- <div id="cover"><img id="loading-image" src="<?php //echo base_url(); 
                                                    ?>assets/loader.gif" alt="Loading..." /></div> -->

<link rel="stylesheet" type="text/css" href="<?php echo base_url(); ?>assets/new/example-styles.css">

<style type="text/css">
    input[type=checkbox] {
        display: block !important;
    }

    .multi-select-container {
        display: block !important;
    }
</style>
<div id="cover"><img id="loading-image" src="<?php echo base_url('public/'); ?>assets/loader.gif" alt="Loading..." /></div>
<div class="container">
    <div class="row" style="margin-top:3px;">
        <h3 style="padding: 3px; background-color: <?= $setting->sales_type == 2 ? 'lightgreen' : ($setting->sales_type == 1 ? '#7ec9ff' : '') ?>"><?= label("Sales"); ?> <?= label("Reports"); ?> </h3>
        <hr>
        <form  id="filterForm">
        <div class="row rangeStat" style="margin-top:1px;">

            <div class="col-sm-1 ">
                <div class="form-group"><?= label("Store"); ?>



                    <select class="js-select-options form-control" id="store" name="store">
                        <option value="">All</option>
                        <!---->
                        <?php foreach ($stores as $store): ?>
                            <option value="<?= $store->id; ?>"><?= $store->name; ?></option>
                        <?php endforeach; ?>
                    </select>






                </div>
            </div>

            <div class="col-sm-1 ">
                <div class="form-group"><?= label("Customer"); ?>



                    <select class="js-select-options form-control" id="supp" name="supp">
                        <option value="">All</option>
                        <option value="0"><?= label("WalkinCustomer"); ?></option>
                        <?php foreach ($customers as $customer): ?>
                            <option value="<?= $customer->id; ?>"><?= $customer->name; ?></option>
                        <?php endforeach; ?>
                    </select>






                </div>
            </div>


            <div class="col-sm-1 " style="padding-left: 1px;width: 120px;">
                <div class="form-group"> <?= label("Fromdate"); ?>
                    <input type="text" maxlength="30" Required="required" value="<?php echo isset($searchTerm['pddate'])?$searchTerm['pddate']:date("d-m-Y"); ?>" name="pddate" class="form-control" id="pddate" placeholder="from Date">



                </div>
            </div>


            <div class="col-sm-1 " style="padding-left: 1px;width: 120px;">
                <div class="form-group"> <?= label("Tilldate"); ?>
                    <input class="form-control" type="text" name="innvdda" id="innvdda" value="<?php echo isset($searchTerm['innvdda'])?$searchTerm['innvdda']:date("d-m-Y"); ?>" placeholder="Till Date">


                </div>
            </div>
            <div class="col-md-1">
                <div class="form-group">
                    <div><?= label('paymentMethod'); ?></div>
                    <select class="form-control" id="people" name="people">
                        <option value="">All</option>
                        <?php
                        $modes = mysql_query("SELECT * FROM payment_mode ORDER BY id ASC")->getResult();
                        foreach ($modes as $mode): ?>
                            <option value="<?= esc($mode->id) ?>"><?= esc($mode->name) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <div class="col-sm-1 " style="padding-left: 1px;width: 120px;">
                <div class="form-group"><?= label("Date"); ?> <?= label("Type"); ?>
                    <select class="js-select-options form-control" id="typeda" name="typeda">
                        <!-- <option value="">All</option> -->
                        <option value="1"><?= label("Daily"); ?></option>
                        <option value="2"><?= label("Monthly"); ?></option>
                    </select>
                </div>
            </div>

            <div class="col-sm-1 " style="padding-left: 1px;width: 120px;">
                <div class="form-group"><?= label("Type"); ?>
                    <select class="js-select-options form-control" id="typess" name="typess">
                        <!-- <option value="">All</option> -->
                        <option value="1"><?= label("Detailed"); ?></option>
                        <option value="2"><?= label("Summary"); ?></option>

                    </select>
                </div>
            </div>






            <div class="col-md-3">

                <!-- <a href="javascript:void(0);" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="getProducttaxReport()"><?= label('Get'); ?></a> -->

                <button type="submit" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" ><?= label('Get'); ?></button>

                <a href="javascript:void(0)" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="PrintTicket()">Print</a>
                <a href="javascript:void(0)" id="btnExport" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr">XLS</a>
                <a href="javascript:void(0)" id="btnExport" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-warning hiddenpr" onclick="stop_process()">Stop</a>
                <a href="javascript:void(0)" id="btnExport" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-danger hiddenpr" onclick="clear_table()">Clear Data</a>
</form>
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
                    <!-- <table id="header_table" class="table">
                        <thead>
                            <tr class="hideme" style="text-align:center;">
                                <th style="text-align:center;">luffy fashions</th>
                            </tr>
                            <tr class="hideme" style="text-align:center; ">
                                <th style="text-align:center;">ATS Tower,Maruthi Studio Circle,Polytechnic Road</th>
                            </tr>
                            <tr class="hideme" style="text-align:center; ">
                                <th style="text-align:center;">Daily Sales Reports from <span id="from_date"></span> Till <span id="to_date"></span></th>
                            </tr>
                        </thead>
                    </table> -->
                    <!-- Results load here -->
<div id="productList"></div>
                    <!-- <table id="serverside" class="table table-striped table-bordered" cellspacing="0" width="100%">
                        <thead>
                            <tr style="color:#fff;border: 1px solid #1c76bc;">
                                <th style="border: 1px solid #1c76bc;">Bill No</th>
                                <th style="border: 1px solid #1c76bc;">Store</th>
                                <th style="border: 1px solid #1c76bc;">customers</th>
                                <th style="border: 1px solid #1c76bc;width:100px;">Date</th>
                                <th style="border: 1px solid #1c76bc;">No Of Items </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Total Amount </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Tax </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Summary </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Discount </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Shipping </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Total Amount </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Status </th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Cancel</th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Exchange</th>
                                <th style="text-align:center;border: 1px solid #1c76bc; ">Return</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                               // echo "<pre>"; print_r($searchTerm);

                            //if (!empty($result['users'])): ?>
                                <?php //foreach ($result['users'] as $user): ?>
                                    <tr>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                    </tr>
                                <?php //endforeach; ?>
                            <?php // else: ?>
                                <tr>
                                    <td colspan="2" class="text-center">No users found.</td>
                                </tr>
                            <?php //endif; ?>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:center;border: 1px solid #1c76bc; ">
                                    <b id="">Sub Total</b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="sub_total_amount"></b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="tax_total">0.0</b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="discount_total">0.0</b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="shiping_total">0.0</b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="total_amount_">0.0</b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="cancel_total">0.0</b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="exchange_total">0.0</b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="return_total">0.0</b>
                                </td>
                            </tr>
                            <tr>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:center;border: 1px solid #1c76bc; ">
                                    <b>Total</b>
                                </td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; "></td>
                                <td style="text-align:right;border: 1px solid #1c76bc; ">
                                    <b id="grand_total"></b>
                                </td>
                            </tr>
                        </tfoot>
                    </table> -->

                </div>
                 <!-- Pagination Links -->
                <div id="paginate">
                    <?= isset($result['pager'])?$result['pager']->appends(['q' => $search])->links():''; ?>
                </div>
            </div>
        </div>


        <link href="https://cdn.jsdelivr.net/npm/ag-grid-community/styles/ag-grid.css" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/ag-grid-community/styles/ag-theme-alpine.css" rel="stylesheet"> <!-- ✅ Ag-Grid JS -->
        <script src="https://cdn.jsdelivr.net/npm/ag-grid-community/dist/ag-grid-community.min.js"></script> <!-- ✅ jsPDF + autoTable for PDF Export -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js"></script>
        <style>
            #buttons {
                margin: 10px;
            }

            #buttons button {
                margin-right: 10px;
            }
        </style>
        </head>

        <body> <!-- 🔘 Export Buttons -->
            <!-- <div id="buttons"> <button onclick="exportToCsv()" type="button">Export to Excel</button> <button onclick="exportToPDF()">Export to PDF</button> </div> 📊 Grid Container -->
            <!-- <div id="myGrid" class="ag-theme-alpine" style="height: 600px; width: 100%;"></div> -->
            <!-- <script src="https://cdn.jsdelivr.net/npm/ag-grid-community/dist/ag-grid-enterprise.min.js"></script> -->


            <!-- <script>
                const gridOptions = {
                    defaultColDef: {
                        sortable: true,
                        filter: true,
                        resizable: true,
                    }
                };

                const gridDiv = document.querySelector('#myGrid');
                new agGrid.Grid(gridDiv, gridOptions);







                function exportToCsv() {
                    if (gridApi) {
                        gridApi.exportDataAsCsv();
                    } else {
                        alert("Grid not ready yet.");
                    }
                }

                function exportToExcel() {
                    if (gridApi) {
                        gridApi.exportDataAsExcel();
                    } else {
                        alert("Grid not ready yet.");
                    }
                }
                async function exportToPDF() {
                    const {
                        jsPDF
                    } = window.jspdf;
                    const doc = new jsPDF();
                    const rowData = [];
                    if (!gridApi) {
                        alert("Grid not ready yet.");
                        return;
                    }
                    gridApi.forEachNodeAfterFilterAndSort(function(node) {
                        rowData.push(node.data);
                    });
                    const headers = columnDefs.map(col => col.headerName);
                    const data = rowData.map(row => columnDefs.map(col => row[col.field]));
                    doc.text("Job Data", 14, 15);
                    doc.autoTable({
                        head: [headers],
                        body: data,
                        startY: 20
                    });
                    doc.save("job_data.pdf");
                }
            </script> -->
        </body>

        </html>



    </div>

    <!-- <script src="https://code.jquery.com/jquery-3.7.1.js"></script> -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/2.2.2/js/dataTables.js"></script>
    <script src="https://cdn.datatables.net/2.2.2/js/dataTables.bootstrap5.js"></script>
    <script src="https://cdn.datatables.net/buttons/3.2.2/js/dataTables.buttons.js"></script>
    <script src="https://cdn.datatables.net/buttons/3.2.2/js/buttons.bootstrap5.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js"></script>
    <script src="https://cdn.datatables.net/buttons/3.2.2/js/buttons.html5.min.js"></script>
    <script src="https://cdn.datatables.net/buttons/3.2.2/js/buttons.print.min.js"></script>

    <script>
$(document).ready(function () {

    // Load first page initially

           var typeda = $('#typeda').val();
            var typess = $('#typess').val();
            console.log('typeda: ' + typeda + ' typess: ' + typess);


            if (typeda == 1 && typess == 1) {

               loadProducts(1); 

            }
    

    // Handle filter form
    $("#filterForm").on("submit", function (e) {
        e.preventDefault();
         var typeda = $('#typeda').val();
            var typess = $('#typess').val();
        var Range = $('#pddate').val();
            var Range1 = $('#innvdda').val();
            $('#from_date').html(Range);
            $('#to_date').html(Range1);


                 var Range = $('#pddate').val();
            var Range1 = $('#innvdda').val();
            var suppr = $('#supp').val();
            var store = $('#store').val();

            var typeda = $('#typeda').val();
            var typess = $('#typess').val();
             var selectedValues = $('#people').val();

            if (typeda == 1 && typess == 1) {


                 loadProducts(1);
            } else if (typeda == 2 && typess == 1) {
                $.ajax({
                    url: "<?php echo site_url('reports/getsalesdailReport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        selectedValues: selectedValues
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            // dom: 'Bfrtip',
                            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
                            tableTools: {
                                'bProcessing': true
                            },
                            ordering: false,
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $("#cover").hide();
                    }
                });
            } else if (typeda == 1 && typess == 2) {


                $.ajax({
                    url: "<?php echo site_url('reports/gettotalsalsReport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        selectedValues: selectedValues
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            // dom: 'Bfrtip',
                            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
                            tableTools: {
                                'bProcessing': true
                            },
                            ordering: false,
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $("#cover").hide();
                    }
                });
            } else if (typeda == 2 && typess == 2) {


                $.ajax({
                    url: "<?php echo site_url('reports/gettalsalseport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        selectedValues: selectedValues
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            // dom: 'Bfrtip',
                            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
                            tableTools: {
                                'bProcessing': true
                            },
                            ordering: false,
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $("#cover").hide();
                    }
                });
            }

        


    });

    // Handle pagination clicks (delegated)
    $(document).on("click", ".pagination a", function (e) {
        
        e.preventDefault();
        //let page = $(this).data("ci-pagination-page"); // CI4 adds this attribute
        let page = $(this).attr("href").split("page=")[1];
       // alert(page)



        loadProducts(page);
    });

    // AJAX loader function
    function loadProducts(page) {
        $("#cover").show();
        $('.hideme').show();
        $.ajax({
            url: "<?= base_url('report/totalsalesreportchek') ?>",
            type: "POST",
            data: $("#filterForm").serialize() + "&page=" + page,
            success: function (response) {
              //  alert(response);
                 $("#cover").hide();
                $("#productList").html(response);
            }
        });
    }
});
</script>


    <script>
        // $('#header_table').DataTable({
        //     "dom": 'Bfrtip',
        //     "layout": {
        //         topStart: {
        //             buttons: ['copy', 'csv', 'excel', 'pdf', 'print']
        //         }
        //     },
        // });
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




        function getProducttaxReport() {
            // $("#cover").show();
            var selectedValues = $('#people').val();


            var Range = $('#pddate').val();
            var Range1 = $('#innvdda').val();
            $('#from_date').html(Range);
            $('#to_date').html(Range1);
            var suppr = $('#supp').val();
            var store = $('#store').val();

            var typeda = $('#typeda').val();
            var typess = $('#typess').val();
            console.log('typeda: ' + typeda + ' typess: ' + typess);


            if (typeda == 1 && typess == 1) {
                // ajax set data to database

                // $.ajax({
                //     url: '<?php //echo site_url('reports/get_sales_report') 
                                ?>',
                //     method: 'POST',
                //     "data": {
                //         Range: Range,
                //         Range1: Range1,
                //         suppr: suppr,
                //         selectedValues: selectedValues
                //     },
                //     success: function(data) {
                //         $('#serverside').DataTable({
                //             data: data, // or data.data if wrapped
                //             columns: [{
                //                     data: 'id'
                //                 },
                //                 {
                //                     data: 'name'
                //                 },
                //                 {
                //                     data: 'email'
                //                 }
                //             ]
                //         });
                //     }
                // });

                loadSales();



            } else if (typeda == 2 && typess == 1) {
                $.ajax({
                    url: "<?php echo site_url('reports/getsalesdailReport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        selectedValues: selectedValues
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            // dom: 'Bfrtip',
                            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
                            tableTools: {
                                'bProcessing': true
                            },
                            ordering: false,
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $("#cover").hide();
                    }
                });
            } else if (typeda == 1 && typess == 2) {


                $.ajax({
                    url: "<?php echo site_url('reports/gettotalsalsReport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        selectedValues: selectedValues
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            // dom: 'Bfrtip',
                            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
                            tableTools: {
                                'bProcessing': true
                            },
                            ordering: false,
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $("#cover").hide();
                    }
                });
            } else if (typeda == 2 && typess == 2) {


                $.ajax({
                    url: "<?php echo site_url('reports/gettalsalseport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        selectedValues: selectedValues
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            // dom: 'Bfrtip',
                            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
                            tableTools: {
                                'bProcessing': true
                            },
                            ordering: false,
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $("#cover").hide();
                    }
                });
            }

        }


        function loadMore() {
            var selectedValues = $('#people').val();
            var Range = $('#pddate').val();
            var Range1 = $('#innvdda').val();
            $('#from_date').html(Range);
            $('#to_date').html(Range1);
            var suppr = $('#supp').val();
            var store = $('#store').val();

            var typeda = $('#typeda').val();
            var typess = $('#typess').val();

            $.ajax({
                type: "POST",
                url: "<?php echo site_url('reports/filter_total_rows') ?>",
                data: {
                    Range: Range,
                    Range1: Range1,
                    suppr: suppr,
                    selectedValues: selectedValues
                },
                dataType: "json",
                success: function(res) {
                    // $('#serverside tbody').append(res);
                    per_page = 200;
                    var loop = Number(res.number) / per_page;
                    offset = 0;
                    limit = per_page;
                    var html = '';
                    var load_again = 0;
                    for (let index = 0; index <= loop; index++) {
                        if (load_again == index) {
                            $.ajax({
                                type: "POST",
                                url: "<?php echo site_url('reports/get_sales_report') ?>",
                                data: {
                                    Range: Range,
                                    Range1: Range1,
                                    suppr: suppr,
                                    selectedValues: selectedValues,
                                    offset: offset,
                                    limit: limit,
                                },
                                dataType: "html",
                                success: function(response) {
                                    load_again += 1;
                                    console.log(response);
                                    $('#serverside tbody').append(response);
                                    alert('Go to next');
                                }
                            });
                            limit += per_page;
                            offset += per_page;
                        }

                    }
                    // $.each(res, function(i, v) {});
                    // $('#serverside').DataTable({
                    //     data: res,
                    //     columns: [{
                    //         data: 'clientname'
                    //     }]
                    // });
                }
            });


        }

        function getProducttaxReport_new(offset = 0, limit = 0) {
            // $("#cover").show();
            var selectedValues = $('#people').val();


            var Range = $('#pddate').val();
            var Range1 = $('#innvdda').val();
            $('#from_date').html(Range);
            $('#to_date').html(Range1);
            var suppr = $('#supp').val();
            var store = $('#store').val();

            var typeda = $('#typeda').val();
            var typess = $('#typess').val();

            if (typeda == 1 && typess == 1) {
                // ajax set data to database
                var table = $('#serverside').DataTable({
                    // "processing": true, //Feature control the processing indicator.
                    "serverSide": true, //Feature control DataTables' server-side processing mode.
                    "order": [], //Initial no order.
                    "ordering": false,
                    // "paging": false,
                    // "buttons": ['copy', 'csv', 'excel', 'pdf', 'print'],
                    "dom": 'Bfrtip',
                    "layout": {
                        topStart: {
                            buttons: ['copy', 'csv', 'excel', 'pdf', 'print']
                        }
                    },
                    // Load data for the table's content from an Ajax source
                    "bDestroy": true,
                    "aLengthMenu": [
                        [25, 50, 100, 200, -1],
                        [25, 50, 100, 200, "All"]
                    ],
                    "iDisplayLength": -1,
                    "ajax": {
                        //"url": "<?php echo site_url('reports/getsalesdailReport') ?>",
                        // "url": "<?php echo site_url('reports/getsalesdailReportnew1') ?>",
                        "url": "<?php echo site_url('reports/get_sales_report') ?>",
                        "type": "POST",
                        "data": {
                            Range: Range,
                            Range1: Range1,
                            suppr: suppr,
                            selectedValues: selectedValues,
                            offset: offset,
                            limit: limit,
                        },
                    },
                    "footerCallback": function(row, data, start, end, display) {
                        let api = this.api();

                        // Helper function to parse numbers
                        let intVal = function(i) {
                            return typeof i === 'string' ?
                                parseFloat(i.replace(/[\$,]/g, '')) :
                                typeof i === 'number' ? i : 0;
                        };

                        // Sum over all pages
                        let total = api
                            .column('#sub_total_amount') // Index of "Price" column
                            .data()
                            .reduce((a, b) => intVal(a) + intVal(b), 0);

                        // Update footer
                        $(api.column(5).footer()).html(total.toFixed(2));

                        // Sum Tax over all pages
                        let tax_total = api
                            .column(6) // Index of "Price" column
                            .data()
                            .reduce((a, b) => intVal(a) + intVal(b), 0);

                        // Update footer
                        $(api.column(6).footer()).html(tax_total.toFixed(2));

                        // Sum over all pages
                        let discount_total = api
                            .column(8) // Index of "Price" column
                            .data()
                            .reduce((a, b) => intVal(a) + intVal(b), 0);

                        // Update footer
                        $(api.column(8).footer()).html(discount_total.toFixed(2));

                        // Sum over shiping_total all pages
                        let shiping_total = api
                            .column(9) // Index of "Price" column
                            .data()
                            .reduce((a, b) => intVal(a) + intVal(b), 0);

                        // Update footer
                        $(api.column(9).footer()).html(shiping_total.toFixed(2));

                        // Sum over shiping_total all pages
                        let amount_total = api
                            .column(10) // Index of "Price" column
                            .data()
                            .reduce((a, b) => intVal(a) + intVal(b), 0);

                        // Update footer
                        $(api.column(10).footer()).html(amount_total.toFixed(2));

                        // Sum over shiping_total all pages
                        let cancel_total = api
                            .column(12) // Index of "Price" column
                            .data()
                            .reduce((a, b) => intVal(a) + intVal(b), 0);
                        // Update footer
                        $(api.column(12).footer()).html(cancel_total.toFixed(2));

                        // Sum over shiping_total all pages
                        let exchange_total = api
                            .column(13) // Index of "Price" column
                            .data()
                            .reduce((a, b) => intVal(a) + intVal(b), 0);
                        // Update footer
                        $(api.column(13).footer()).html(exchange_total.toFixed(2));

                        // Sum over shiping_total all pages
                        let return_total = api
                            .column(14) // Index of "Price" column
                            .data()
                            .reduce((a, b) => intVal(a) + intVal(b), 0);
                        // Update footer
                        $(api.column(14).footer()).html(return_total.toFixed(2));
                        console.log(total);

                        let grand_total = total - (discount_total + cancel_total + exchange_total + return_total);
                        $('#grand_total').text(grand_total.toFixed(2));
                    },

                    //Set column definition initialisation properties.
                    // "columnDefs": [{
                    //     "targets": [-1], //last column
                    //     "orderable": false, //set not orderable
                    // }, ],
                    // "bInfo": false,
                    // "fnRowCallback": function(nRow, aData, iDisplayIndex) {
                    //     nRow.setAttribute('data-order',aData[4]);
                    // },

                });
                // $.ajax({
                //     url: "<?php echo site_url('reports/getsalesdailReportnew1') ?>/",
                //     type: "POST",
                //     data: {
                //         Range: Range,
                //         Range1: Range1,
                //         suppr: suppr,
                //         store: store,
                //         selectedValues: selectedValues
                //     },
                //     success: function(data) {
                //         $("#cover").hide();
                //         //$('#custrrr').html(data);
                //         $('.hideme').hide();
                //         $('#stats').modal('show');
                //         /*var table = $('#chltkarr').DataTable({
                //             dom: 'T<"clear">lfrtip',
                //             tableTools: {
                //                 'bProcessing': true
                //             }
                //         });*/

                //         var table = $('#serverside').DataTable({

                //             "processing": true, //Feature control the processing indicator.
                //             //"serverSide": true, //Feature control DataTables' server-side processing mode.
                //             "order": [], //Initial no order.
                //             "ordering": false,
                //             // "paging": false,
                //             "buttons": ['copy', 'csv', 'excel', 'pdf', 'print'],
                //             // Load data for the table's content from an Ajax source
                //             "ajax": {
                //                 //"url": "<?php echo site_url('reports/getsalesdailReport') ?>",
                //                 "url": "<?php echo site_url('reports/getsalesdailReportnew1') ?>",
                //                 "type": "POST",
                //                 data: {
                //                     Range: Range,
                //                     Range1: Range1,
                //                     suppr: suppr,
                //                     selectedValues: selectedValues
                //                 },
                //             },
                //             //Set column definition initialisation properties.
                //             // "columnDefs": [{
                //             //     "targets": [-1], //last column
                //             //     "orderable": false, //set not orderable
                //             // }, ],
                //             // "bInfo": false,
                //             // "fnRowCallback": function(nRow, aData, iDisplayIndex) {
                //             //     nRow.setAttribute('data-order',aData[4]);
                //             // },

                //         });
                //     },
                //     error: function(jqXHR, textStatus, errorThrown) {
                //         $("#cover").hide();
                //     }
                // });


            } else if (typeda == 2 && typess == 1) {
                $.ajax({
                    url: "<?php echo site_url('reports/getsalesdailReport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        selectedValues: selectedValues
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            // dom: 'Bfrtip',
                            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
                            tableTools: {
                                'bProcessing': true
                            },
                            ordering: false,
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $("#cover").hide();
                    }
                });
            } else if (typeda == 1 && typess == 2) {


                $.ajax({
                    url: "<?php echo site_url('reports/gettotalsalsReport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        selectedValues: selectedValues
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            // dom: 'Bfrtip',
                            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
                            tableTools: {
                                'bProcessing': true
                            },
                            ordering: false,
                        });
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        $("#cover").hide();
                    }
                });
            } else if (typeda == 2 && typess == 2) {


                $.ajax({
                    url: "<?php echo site_url('reports/gettalsalseport') ?>",
                    type: "POST",
                    data: {
                        Range: Range,
                        Range1: Range1,
                        suppr: suppr,
                        selectedValues: selectedValues
                    },
                    success: function(data) {
                        $("#cover").hide();
                        $('#custrrr').html(data);
                        $('.hideme').hide();
                        $('#stats').modal('show');
                        var table = $('#Table').DataTable({
                            // dom: 'Bfrtip',
                            buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
                            tableTools: {
                                'bProcessing': true
                            },
                            ordering: false,
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
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

    <!-- <script>
        $(document).ready(function() {
            $("#btnExport").click(function() {
                $("#printSection").btechco_excelexport({
                    containerid: "printSection"
                });
            });
        });
    </script> -->

    <script type="text/javascript">
        $(window).on('load', function() {

            $("#cover").hide();
        });
    </script>


    <script>
        document.getElementById("btnExport").addEventListener("click", function() {
            // Get the table
            // let table = document.getElementById("chltkarr");
            let table = document.getElementById("serverside");
            let workbook = XLSX.utils.table_to_book(table, {
                sheet: "Sheet1"
            });

            // Trigger download
            XLSX.writeFile(workbook, "Sales-Report.xlsx");

        });
    </script>



    <script>
        let offset = 0;
        const limit = 20;

        var load = true;

        let sub_total_amount = 0;
        let tax_total = 0;
        let discount_total = 0;
        let shiping_total = 0;
        let total_amount_ = 0;
        let cancel_total = 0;
        let exchange_total = 0;
        let return_total = 0;
        let grand_total_amount = 0;

        function stop_process() {
            load = false;
            $("#cover").hide();
        }


        //const gridDiv = document.querySelector('#myGrid'); 
        function clear_table() {
            offset = 0;
            sub_total_amount = 0;
            tax_total = 0;
            discount_total = 0;
            shiping_total = 0;
            total_amount_ = 0;
            cancel_total = 0;
            exchange_total = 0;
            return_total = 0;
            grand_total_amount = 0;
            $('#serverside tbody').empty();
            $("#serverside #sub_total_amount").html(sub_total_amount.toFixed(2));
            $("#serverside #tax_total").html(tax_total.toFixed(2));
            $("#serverside #discount_total").html(discount_total.toFixed(2));
            $("#serverside #shiping_total").html(shiping_total.toFixed(2));
            $("#serverside #total_amount_").html(total_amount_.toFixed(2));
            $("#serverside #cancel_total").html(cancel_total.toFixed(2));
            $("#serverside #exchange_total").html(exchange_total.toFixed(2));
            $("#serverside #return_total").html(return_total.toFixed(2));
            $("#serverside #grand_total").html(grand_total_amount.toFixed(2));
        }

        function loadSales() {
            $("#cover").show();
            waitingDialog.show('Loading Something...', {
                headerText: 'jQueryScript',
                dialogSize: 'sm',
                progressType: 'danger'
            });

            var selectedValues = $('#people').val();
            var Range = $('#pddate').val();
            var Range1 = $('#innvdda').val();
            $('#from_date').html(Range);
            $('#to_date').html(Range1);
            var suppr = $('#supp').val();
            var store = $('#store').val();

            var typeda = $('#typeda').val();
            var typess = $('#typess').val();
            var params = new URLSearchParams({
                Range: Range,
                Range1: Range1,
                suppr: suppr,
                store: store,
                selectedValues: selectedValues,
                typeda: typeda,
                typess: typess
            });
            $.ajax({
                type: "POST",
                url: "<?php echo site_url('reports/get_sales_report') ?>",
                // url: "<?php echo site_url('reports/getsalesdailReport') ?>",
                data: {
                    Range: Range,
                    Range1: Range1,
                    suppr: suppr,
                    selectedValues: selectedValues,
                    offset: offset,
                    limit: limit,
                },
                dataType: "json",
                success: function(response) {
                    sub_total_amount += response.sub_total_amount;
                    tax_total += response.tax_total;
                    discount_total += response.discount_total;
                    shiping_total += response.shiping_total;
                    total_amount_ += response.total_amount_;
                    cancel_total += response.cancel_total;
                    exchange_total += response.exchange_total;
                    return_total += response.return_total;

                    grand_total_amount += response.grand_total_amount;


                    $('#serverside tbody').append(response.tr);
                    $("#serverside #sub_total_amount").html(sub_total_amount.toFixed(2));
                    $("#serverside #tax_total").html(tax_total.toFixed(2));
                    $("#serverside #discount_total").html(discount_total.toFixed(2));
                    $("#serverside #shiping_total").html(shiping_total.toFixed(2));
                    $("#serverside #total_amount_").html(total_amount_.toFixed(2));
                    $("#serverside #cancel_total").html(cancel_total.toFixed(2));
                    $("#serverside #exchange_total").html(exchange_total.toFixed(2));
                    $("#serverside #return_total").html(return_total.toFixed(2));
                    $("#serverside #return_total").html(return_total.toFixed(2));
                    $("#serverside #grand_total").text(grand_total_amount.toFixed(2));
                    console.log(grand_total_amount);

                    if (load == true) {
                        if (response.rows != 0) {
                            loadSales();
                            // calculate_table();
                            // return false;
                        }
                        if (response.rows == 0) {
                            $("#cover").hide();
                        }
                    } else {
                        if (response.rows == 0) {
                            $("#cover").hide();
                        }

                    }

                }
            });
            offset += limit;
        }

        // Initial load
        // loadSales();


        function calculate_table() {
            $('#serverside').DataTable({
                "footerCallback": function(row, data, start, end, display) {
                    let api = this.api();

                    // Helper function to parse numbers
                    let intVal = function(i) {
                        return typeof i === 'string' ?
                            parseFloat(i.replace(/[\$,]/g, '')) :
                            typeof i === 'number' ? i : 0;
                    };

                    // Sum over all pages
                    let total = api
                        .column(5) // Index of "Price" column
                        .data()
                        .reduce((a, b) => intVal(a) + intVal(b), 0);

                    // Update footer
                    $(api.column(5).footer()).html(total.toFixed(2));

                    // Sum Tax over all pages
                    let tax_total = api
                        .column(6) // Index of "Price" column
                        .data()
                        .reduce((a, b) => intVal(a) + intVal(b), 0);

                    // Update footer
                    $(api.column(6).footer()).html(tax_total.toFixed(2));

                    // Sum over all pages
                    let discount_total = api
                        .column(8) // Index of "Price" column
                        .data()
                        .reduce((a, b) => intVal(a) + intVal(b), 0);

                    // Update footer
                    $(api.column(8).footer()).html(discount_total.toFixed(2));

                    // Sum over shiping_total all pages
                    let shiping_total = api
                        .column(9) // Index of "Price" column
                        .data()
                        .reduce((a, b) => intVal(a) + intVal(b), 0);

                    // Update footer
                    $(api.column(9).footer()).html(shiping_total.toFixed(2));

                    // Sum over shiping_total all pages
                    let amount_total = api
                        .column(10) // Index of "Price" column
                        .data()
                        .reduce((a, b) => intVal(a) + intVal(b), 0);

                    // Update footer
                    $(api.column(10).footer()).html(amount_total.toFixed(2));

                    // Sum over shiping_total all pages
                    let cancel_total = api
                        .column(12) // Index of "Price" column
                        .data()
                        .reduce((a, b) => intVal(a) + intVal(b), 0);
                    // Update footer
                    $(api.column(12).footer()).html(cancel_total.toFixed(2));

                    // Sum over shiping_total all pages
                    let exchange_total = api
                        .column(13) // Index of "Price" column
                        .data()
                        .reduce((a, b) => intVal(a) + intVal(b), 0);
                    // Update footer
                    $(api.column(13).footer()).html(exchange_total.toFixed(2));

                    // Sum over shiping_total all pages
                    let return_total = api
                        .column(14) // Index of "Price" column
                        .data()
                        .reduce((a, b) => intVal(a) + intVal(b), 0);
                    // Update footer
                    $(api.column(14).footer()).html(return_total.toFixed(2));

                    let grand_total = total - (discount_total + cancel_total + exchange_total + return_total);
                    console.log(grand_total);

                    $('#grand_total').html(grand_total.toFixed(2));
                },
            });
        }
    </script>