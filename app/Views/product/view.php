<style>
    html,
    body {
        height: 100%;
        margin: 0;
        padding: 0;
    }

    .page-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .content-area {
        flex: 1 1 auto;
        overflow: auto;
        padding: 0 10px;
    }

    .footer-widget-inline {
        flex-shrink: 0;
        padding-left: 10px;
        padding-right: 10px;
    }

    .container > h3 {
        font-size: 18px;
        margin: 6px 0;
    }

    .container > hr {
        margin: 6px 0 10px 0;
    }

    .container,
    .row {
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
    }

    .modal-backdrop {
        display: none;
    }
</style>

<style>
    .ag-theme-alpine .ag-cell {
        overflow: visible !important;
    }

    .ag-theme-alpine .ag-row {
        z-index: 1;
        /* Ensure dropdown shows above other rows */
    }

    .ag-theme-alpine {
        overflow: visible !important;
    }

    .dropdown-menu {
        z-index: 9999 !important;
    }
</style>

<div class="page-wrapper">
    <div class="content-area">
        <style>
            .pagination {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .pagination-section {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
            }

            .pagination-sectiona,
            .pagination-section strong {
                margin-left: 5px;
            }

            #Table3s_length {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 13%;
                top: 80px;
            }

            div.dt-buttons {
                position: fixed !important;
                top: 80px;
            }
        </style>



        <!-- Page Content -->
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
                var ids = ["hsn", "ProductName", "summernoted", "Brandname", "CategoryName", "SupplierName", "country", "adress", "summernotes", "taxName", "city", "Unit"];
                control.makeTransliteratable(ids);
                control.showControl('translControl');
            }
            google.setOnLoadCallback(onLoad);
        </script>

        <div class="container">
            <?php
            $rolr = $user->role;
            $kkar = $db->query("select * from permission_new where nname='" . $rolr . "'  ")->getRowArray();
            ?>
            <h3> <?= label("Products"); ?>
                <?php if ($kkar['pra'] == 1) { ?>



                    <div class=" float-right">
                        <a class="btn btn-primary btn-green" style="margin-right: 5px;" data-toggle="modal" data-target="#ImportProductsprice"><?= label("Upload to update"); ?></a>
                    </div>

                    <div class=" float-right">
                        <a class="btn btn-primary btn-green" style="margin-right: 5px;" data-toggle="modal" data-target="#ImportProducts"><?= label("Upload to add"); ?></a>
                    </div>

                    <div class=" float-right">
                        <a class="btn btn-primary btn-green" style="margin-right: 5px;" data-toggle="modal" data-target="#Addproduct"><?= label("Add Products"); ?></a>
                    </div>




                <?php }


                $query = $db->query("SHOW TABLE STATUS WHERE name='products'");
                $row = ($query->getRowArray());
                $autoit = $row["Auto_increment"];


                ?>
            </h3>
            <hr>

            <div class="row" style="margin-top:10px;">
                <div class="container">
                    <?php
                    if (isset($_GET['error'])) { ?>
                        <div class="alert alert-warning alert-dismissible" role="alert">
                            <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                            <strong>Error!. </strong> <?= $_GET['error'] ?>
                        </div>

                    <?php }
                    ?>
                </div>
                <form action="<?= base_url('products') ?>" method="POST">
                    <!-- The old "Product Name or Barcode" box above was tied to
                         the PHP-side search (productInput POST param), which
                         the grid below no longer uses - it has its own working
                         search box (server-side, wired to datatableList()).
                         Removed to avoid two redundant/confusing search inputs. -->

                    <style>
                        /* ---- Grid panel ---- */
                        .product-grid-panel {
                            width: 100%;
                            box-sizing: border-box;
                            background: #fff;
                            border: 1px solid #babfc7;
                            border-radius: 8px;
                            padding: 10px 12px;
                        }

                        .product-grid-panel .grid-toolbar {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            flex-wrap: wrap;
                            gap: 10px;
                            margin-bottom: 10px;
                        }

                        .product-grid-panel .grid-actions {
                            display: flex;
                            gap: 8px;
                        }

                        .product-grid-panel .grid-search {
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        }

                        .product-grid-panel .grid-search input {
                            height: 34px;
                            padding: 4px 10px;
                            border: 1px solid #babfc7;
                            border-radius: 4px;
                            font-size: 13px;
                            min-width: 220px;
                        }

                        .product-grid-panel .grid-search input:focus {
                            outline: none;
                            border-color: #2196F3;
                            box-shadow: 0 0 0 2px rgba(33, 150, 243, .2);
                        }

                        .product-grid-panel table.dataTable {
                            border-collapse: collapse;
                        }

                        .product-grid-panel table.dataTable thead th {
                            background: #f8f8f8;
                            color: #4b5563;
                            font-weight: 600;
                            white-space: nowrap;
                            border-bottom: 2px solid #babfc7 !important;
                            vertical-align: top;
                        }

                        .product-grid-panel table.dataTable thead th .col-filter-icon {
                            display: inline-block;
                            margin-left: 6px;
                            font-size: 11px;
                            color: #9aa1ac;
                            cursor: pointer;
                            vertical-align: middle;
                        }

                        .product-grid-panel table.dataTable thead th .col-filter-icon:hover,
                        .product-grid-panel table.dataTable thead th .col-filter-icon.active {
                            color: #2196F3;
                        }

                        .product-grid-panel table.dataTable tbody tr>td {
                            background-color: #fff;
                            white-space: nowrap;
                            color: #2b2f36;
                        }

                        .product-grid-panel table.dataTable tbody tr:hover>td {
                            background-color: #e8f4fd !important;
                        }

                        .product-grid-panel .dt-num {
                            text-align: right;
                            font-variant-numeric: tabular-nums;
                        }

                        .product-grid-panel .dt-length,
                        .product-grid-panel .dt-info,
                        .product-grid-panel .dt-paging {
                            display: none !important;
                        }

                        .product-grid-panel .dt-processing,
                        .product-grid-panel .dataTables_processing,
                        .product-grid-panel [id$="_processing"] {
                            display: none !important;
                        }

                        #colFilterPopup {
                            position: absolute;
                            z-index: 9999;
                            background: #fff;
                            border: 1px solid #babfc7;
                            border-radius: 6px;
                            box-shadow: 0 4px 14px rgba(0, 0, 0, .12);
                            padding: 10px;
                            width: 190px;
                            font-size: 13px;
                            font-weight: 400;
                        }

                        #colFilterPopup label {
                            display: block;
                            font-size: 11px;
                            color: #6b7280;
                            margin-bottom: 4px;
                            font-weight: 600;
                        }

                        #colFilterPopup .col-filter-popup-input {
                            width: 100%;
                            box-sizing: border-box;
                            font-size: 13px;
                            padding: 5px 7px;
                            border: 1px solid #babfc7;
                            border-radius: 4px;
                            color: #333;
                        }

                        #colFilterPopup .col-filter-popup-actions {
                            display: flex;
                            gap: 6px;
                            margin-top: 8px;
                        }

                        #colFilterPopup .col-filter-popup-actions button {
                            flex: 1 1 auto;
                            font-size: 12px;
                            padding: 5px 0;
                            border: 1px solid #babfc7;
                            border-radius: 4px;
                            background: #fff;
                            cursor: pointer;
                        }

                        #colFilterPopup .col-filter-apply {
                            background: #2196F3 !important;
                            border-color: #2196F3 !important;
                            color: #fff !important;
                            font-weight: 600;
                        }

                        .grid-pagination-bar {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            flex-wrap: wrap;
                            gap: 10px;
                            margin-top: 10px;
                            padding-top: 10px;
                            border-top: 1px solid #eee;
                            font-size: 13px;
                            color: #4b5563;
                        }

                        .grid-pagination-bar .gpb-left {
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        }

                        .grid-pagination-bar select#gridPageSize {
                            height: 30px;
                            padding: 2px 6px;
                            border: 1px solid #2196F3;
                            border-radius: 4px;
                            font-size: 13px;
                            font-weight: 600;
                            color: #1565c0;
                            background: #e8f4fd;
                        }

                        .grid-pagination-bar .gpb-info {
                            font-weight: 600;
                            color: #1565c0;
                            background: #e8f4fd;
                            border: 1px solid #2196F3;
                            border-radius: 4px;
                            padding: 4px 10px;
                        }

                        .grid-pagination-bar .gpb-right {
                            display: flex;
                            align-items: center;
                            gap: 4px;
                        }

                        .grid-pagination-bar .gpb-right button {
                            width: 28px;
                            height: 28px;
                            line-height: 1;
                            border: 1px solid #babfc7;
                            background: #fff;
                            border-radius: 4px;
                            color: #444;
                            cursor: pointer;
                        }

                        .grid-pagination-bar .gpb-right button:hover:not(:disabled) {
                            background: #e8f4fd;
                            border-color: #2196F3;
                        }

                        .grid-pagination-bar .gpb-right button:disabled {
                            opacity: .4;
                            cursor: default;
                        }

                        .grid-pagination-bar #gridPageInput {
                            width: 46px;
                            height: 28px;
                            text-align: center;
                            font-weight: 600;
                            color: #1565c0;
                            border: 1px solid #2196F3;
                            background: #e8f4fd;
                            border-radius: 4px;
                            padding: 0 4px;
                        }

                        .grid-pagination-bar .gpb-right span {
                            font-weight: 600;
                            color: #4b5563;
                        }
                    </style>

                    <!-- Loading indicator: this page relies entirely on the
                         app's existing global spinner (#loadingimg, styled in
                         Style-Light.css/Style-Dark1.css and faded out by
                         app.js on window load) - no page-specific spinner
                         markup here. -->

                    <div class="product-grid-panel">
                        <div class="grid-toolbar">
                            <div class="grid-actions">
                                <button type="button" class="btn btn-default" onclick="return exportProducts('csv');">Export to CSV</button>
                                <button type="button" class="btn btn-default" onclick="return exportProducts('xlsx');">Export to Excel</button>
                            </div>
                            <div class="grid-search">
                                <label for="productsSearchBox">Search:</label>
                                <input type="text" id="productsSearchBox" placeholder="Search products...">
                            </div>
                        </div>
                        <table id="productsGrid" class="table table-bordered w-100"></table>

                        <div class="grid-pagination-bar">
                            <div class="gpb-left">
                                <label for="gridPageSize">Page Size:</label>
                                <select id="gridPageSize">
                                    <option value="10">10</option>
                                    <option value="25" selected>25</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="200">200</option>
                                </select>
                            </div>
                            <div class="gpb-info" id="gridInfo">&nbsp;</div>
                            <div class="gpb-right">
                                <button type="button" id="gridFirst" title="First page">&#124;&#9664;</button>
                                <button type="button" id="gridPrev" title="Previous page">&#9664;</button>
                                <span>Page</span>
                                <input type="number" id="gridPageInput" min="1" value="1">
                                <span>of <span id="gridTotalPages">1</span></span>
                                <button type="button" id="gridNext" title="Next page">&#9654;</button>
                                <button type="button" id="gridLast" title="Last page">&#9654;&#124;</button>
                            </div>
                        </div>
                    </div>

                    <link rel="stylesheet" href="https://cdn.datatables.net/2.2.2/css/dataTables.bootstrap5.css">
                    <script src="https://cdn.datatables.net/2.2.2/js/dataTables.js"></script>
                    <script src="https://cdn.datatables.net/2.2.2/js/dataTables.bootstrap5.js"></script>

                    <script>
                        var base_url = '<?= base_url() ?>';
                        var numFmt = $.fn.dataTable.render.number(',', '.', 2);

                        var PRODUCT_COLUMNS = [
                            { title: 'ID' },
                            { title: 'Code' },
                            { title: 'HSN' },
                            { title: 'Name' },
                            { title: 'Tax' },
                            { title: 'Pur Price', className: 'dt-num', render: numFmt },
                            { title: 'Selling Price', className: 'dt-num', render: numFmt },
                            { title: 'MRP', className: 'dt-num', render: numFmt },
                            { title: 'Discount', className: 'dt-num', render: numFmt },
                            { title: 'Brand' },
                            { title: 'Supplier' },
                            { title: 'Stock', className: 'dt-num', render: numFmt },
                            {
                                title: 'Actions',
                                orderable: false,
                                searchable: false,
                                render: function(data, type, row) {
                                    var id = row[0];
                                    return '<div class="btn-group">' +
                                        '<a style="margin-right: 5px;" href="' + base_url + '/products/edit/' + id + '"><i class="fa fa-pencil"></i></a>' +
                                        '<a style="margin-right: 5px;" href="javascript:void(0)" data-toggle="modal" data-target="#barcode" onclick="productBcode=' + id + '"><i class="fa fa-barcode"></i></a>' +
                                        '<a style="margin-right: 5px;" onclick="return confirm(\'Are you sure?\')" href="' + base_url + '/products/delete/' + id + '"><i class="fa fa-times"></i></a>' +
                                        '<a style="margin-right: 5px;" href="javascript:void(0)" onclick="Viewproduct(' + id + ')"><i class="fa fa-file-text"></i></a>' +
                                        '</div>';
                                }
                            },
                        ];

                        function debounceProd(fn, wait) {
                            var t;
                            return function() {
                                var ctx = this,
                                    args = arguments;
                                clearTimeout(t);
                                t = setTimeout(function() {
                                    fn.apply(ctx, args);
                                }, wait);
                            };
                        }

                        function getColFilterPopupProd() {
                            var $popup = $('#colFilterPopup');
                            if ($popup.length) {
                                return $popup;
                            }
                            $popup = $('<div id="colFilterPopup" class="col-filter-popup"></div>').css('display', 'none');
                            var $input = $('<input type="text" class="col-filter-popup-input" placeholder="Search…" />');
                            var $applyBtn = $('<button type="button" class="col-filter-apply">Filter</button>');
                            var $clearBtn = $('<button type="button" class="col-filter-clear">Clear</button>');
                            $popup.append(
                                $('<label>Search</label>'),
                                $input,
                                $('<div class="col-filter-popup-actions"></div>').append($applyBtn, $clearBtn)
                            );
                            $('body').append($popup);

                            $popup.on('click mousedown', function(e) {
                                e.stopPropagation();
                            });
                            $input.on('keydown', function(e) {
                                if (e.key === 'Enter') {
                                    $applyBtn.trigger('click');
                                }
                            });
                            $(document).off('click.colFilterCloseProd').on('click.colFilterCloseProd', function() {
                                $popup.hide();
                            });

                            return $popup;
                        }

                        function wireProductColumnFilters(table) {
                            var $popup = getColFilterPopupProd();
                            var $input = $popup.find('.col-filter-popup-input');
                            var $applyBtn = $popup.find('.col-filter-apply');
                            var $clearBtn = $popup.find('.col-filter-clear');
                            var activeColumn = null,
                                activeIcon = null;

                            function apply() {
                                if (!activeColumn) {
                                    return;
                                }
                                var val = $input.val();
                                if (activeColumn.search() !== val) {
                                    activeColumn.search(val).draw();
                                }
                                if (activeIcon) {
                                    activeIcon.toggleClass('active', val !== '');
                                }
                                $popup.hide();
                            }
                            $applyBtn.off('click').on('click', apply);
                            $clearBtn.off('click').on('click', function() {
                                $input.val('');
                                apply();
                            });

                            table.columns().every(function(colIdx) {
                                var column = this;
                                var $th = $(column.header());
                                $th.find('.col-filter-icon').remove();

                                if (column.settings()[0].aoColumns[colIdx].bSearchable === false) {
                                    return;
                                }

                                var $icon = $('<span class="col-filter-icon" title="Search this column">&#9660;</span>');
                                $icon.toggleClass('active', column.search() !== '');
                                $th.append($icon);

                                $icon.on('click', function(e) {
                                    e.stopPropagation();
                                    var wasOpenForThisColumn = activeColumn === column && $popup.is(':visible');
                                    $popup.hide();
                                    if (wasOpenForThisColumn) {
                                        return;
                                    }
                                    activeColumn = column;
                                    activeIcon = $icon;
                                    $input.val(column.search());

                                    var pos = $icon.offset();
                                    $popup.css({
                                        top: pos.top + $icon.outerHeight() + 4,
                                        left: pos.left
                                    }).show();
                                    $input.trigger('focus');
                                });
                            });
                        }

                        function wireProductGridPagination(table) {
                            function refresh() {
                                var info = table.page.info();
                                var totalPages = info.pages || 1;
                                var shownFrom = info.recordsDisplay === 0 ? 0 : info.start + 1;
                                $('#gridInfo').text(shownFrom + ' to ' + info.end + ' of ' + info.recordsDisplay.toLocaleString() + ' entries');
                                $('#gridPageInput').val(info.page + 1).attr('max', totalPages);
                                $('#gridTotalPages').text(totalPages);
                                $('#gridFirst, #gridPrev').prop('disabled', info.page <= 0);
                                $('#gridNext, #gridLast').prop('disabled', info.page >= totalPages - 1);
                            }
                            table.off('draw.gridPaging').on('draw.gridPaging', refresh);
                            refresh();

                            $('#gridFirst').off('click').on('click', function() {
                                table.page('first').draw('page');
                            });
                            $('#gridPrev').off('click').on('click', function() {
                                table.page('previous').draw('page');
                            });
                            $('#gridNext').off('click').on('click', function() {
                                table.page('next').draw('page');
                            });
                            $('#gridLast').off('click').on('click', function() {
                                table.page('last').draw('page');
                            });
                            $('#gridPageInput').off('change').on('change', function() {
                                var info = table.page.info();
                                var p = parseInt($(this).val(), 10) - 1;
                                if (isNaN(p) || p < 0) p = 0;
                                if (p > info.pages - 1) p = info.pages - 1;
                                table.page(p).draw('page');
                            });
                            $('#gridPageSize').off('change').on('change', function() {
                                table.page.len(parseInt($(this).val(), 10)).draw();
                            });
                        }

                        var productsTable;

                        // Fills the space down to near the bottom of the
                        // viewport instead of a flat vh value, so the grid
                        // doesn't leave a big blank gap above the page
                        // footer when a small page size (e.g. 10) doesn't
                        // produce enough rows to reach a fixed height, and
                        // grows further on tall/wide screens.
                        function computeGridScrollY() {
                            var $panel = $('.product-grid-panel');
                            var top = $panel.length ? $panel.offset().top : 200;
                            // Covers, below the panel's top: the toolbar row
                            // (export buttons + search, ~45px), the table's
                            // own header row (title + filter icon, ~55px),
                            // the pagination bar (~45px), panel padding, and
                            // a safety margin so the pagination bar is never
                            // pushed below the viewport.
                            var reserved = 220;
                            var available = $(window).height() - top - reserved;
                            return Math.max(300, available) + 'px';
                        }

                        function initProductsGrid() {
                            if ($.fn.DataTable.isDataTable('#productsGrid')) {
                                $('#productsGrid').DataTable().destroy();
                                $('#productsGrid').empty();
                            }

                            productsTable = $('#productsGrid').DataTable({
                                processing: true,
                                serverSide: true,
                                destroy: true,
                                columns: PRODUCT_COLUMNS,
                                order: [
                                    [3, 'asc']
                                ],
                                pageLength: parseInt($('#gridPageSize').val(), 10) || 25,
                                // scrollCollapse is deliberately NOT set (defaults
                                // false) - the grid area should stay filled down
                                // to computeGridScrollY()'s height even when a
                                // page has few rows, rather than shrinking to fit.
                                scrollY: computeGridScrollY(),
                                deferRender: true,
                                // No 'f' (search box) here - DataTables would
                                // render its own on a separate row above the
                                // table. Using a custom #productsSearchBox
                                // instead, placed in the same toolbar row as
                                // the export buttons, wired below.
                                dom: 'rt',
                                ajax: {
                                    url: base_url + '/products/datatableList',
                                    type: 'POST'
                                }
                            });

                            wireProductGridPagination(productsTable);
                            wireProductColumnFilters(productsTable);

                            $('#productsSearchBox').val(productsTable.search());
                            $('#productsSearchBox').off('keyup change').on('keyup change', debounceProd(function() {
                                productsTable.search(this.value).draw();
                            }, 400));
                        }

                        $(window).on('resize', debounceProd(function() {
                            if (productsTable) {
                                $('.dataTables_scrollBody').css('height', computeGridScrollY());
                            }
                        }, 250));

                        function exportProducts(format) {
                            var params = new URLSearchParams({
                                format: format,
                                search: productsTable ? productsTable.search() : ''
                            });
                            window.location.href = base_url + '/products/exportProducts?' + params.toString();
                            return false;
                        }

                        function loadScriptOnceProd(src) {
                            return new Promise(function(resolve, reject) {
                                var s = document.createElement('script');
                                s.src = src;
                                s.onload = resolve;
                                s.onerror = reject;
                                document.head.appendChild(s);
                            });
                        }

                        // Same fix as the Sales Report grid: this app's shared layout
                        // loads its own older local DataTables build *after* this
                        // page's content, silently overwriting the CDN 2.2.2 API.
                        // Re-loading 2.2.2 one more time after window.load makes it
                        // the active version before the grid is built.
                        $(window).on('load', function() {
                            loadScriptOnceProd('https://cdn.datatables.net/2.2.2/js/dataTables.js')
                                .then(function() {
                                    return loadScriptOnceProd('https://cdn.datatables.net/2.2.2/js/dataTables.bootstrap5.js');
                                })
                                .then(initProductsGrid)
                                .catch(initProductsGrid);
                        });
                    </script>
                    <style type="text/css" media="print">
                        body {
                            overflow: auto;
                            height: 100%;


                        }

                        @page {

                            size: auto;
                            /* auto is the initial value */
                            margin: 0;
                            /* this affects the margin in the printer settings */
                        }
                    </style>
                    <!-- Button trigger modal -->




                    <!-- /.container -->
                    <?php  //view('modals/_imageViewer'); 
                    ?>

                    <script src="<?= base_url() ?>assets/js/jquery-ui.min.js"></script>

                    <script type="text/javascript">
                        $(document).ready(function() {
                            //loadTable();
                        });

                        function loadTable() {
                            //var productInput = "<?= isset($_POST['productInput']) ? $_POST['productInput'] : '' ?>";
                    </script>

                    <script>
                        var siteUrl = "<?= site_url() ?>";
                        var noProductLabel = "<?= label('NoProduct') ?>";
                    </script>

                    <script type="text/javascript">
                        var save_method; //for save method string
                        var table;
                        /*    $(document).ready(function() {
                              table = $('#Table3s').DataTable({

                                "processing": true, //Feature control the processing indicator.
                                "serverSide": true, //Feature control DataTables' server-side processing mode.
                                "order": [], //Initial no order.
                                // Load data for the table's content from an Ajax source
                                "ajax": {
                                    "url": "<?php echo site_url('invoices_pro/ajax_list') ?>",
                                    "type": "POST"
                                },

                                //Set column definition initialisation properties.
                                "columnDefs": [
                                {
                                  "targets": [ -1 ], //last column
                                  "orderable": false, //set not orderable
                                },
                                ],
                                 "bInfo": false,
                                 // "fnRowCallback": function(nRow, aData, iDisplayIndex) {
                                 //     nRow.setAttribute('data-order',aData[4]);
                                 // }
                              });
                            });*/
                        var items = [];
                        $(function() {
                            $('#addform').submit(function() {
                                var error = false;
                                $('.productcode').each(function() {
                                    if ($(this).text() === $("#ProductCode").val()) {
                                        $('#codeError').show();
                                        error = true;
                                    }
                                });
                                if (error) return false;
                                // ... continue work
                            });

                            $('#Type').on('change', function() {
                                if (this.value == 1) //if service
                                {
                                    $("#pushaceP").slideUp();
                                    $("#alertqty").slideUp();
                                    $("#supply").slideUp();
                                    $("#UnitP").slideUp();
                                } else if (this.value == 2) {
                                    $("#pushaceP").slideUp();
                                    $("#alertqty").slideUp();
                                    $("#supply").slideUp();
                                    $("#UnitP").slideUp();
                                } else {
                                    $("#pushaceP").slideDown();
                                    $("#alertqty").slideDown();
                                    $("#supply").slideDown();
                                    $("#UnitP").slideDown();
                                }
                            });
                        });


                        $(document).on("click", ".open-modalimage", function() {
                            var myId = $(this).data('id');
                            $(".modal-body #image").attr("src", "<?php echo site_url() ?>/files/products/" + myId);
                        });


                        var quant = [];
                        var quantw = [];
                        var pricestore = [];
                        var productID;
                        $(document).ready(function() {
                            var quant = [];
                            var quantw = [];
                            var pricestore = [];
                            var productID = null;

                            $('#addform').ajaxForm({
                                success: function(data) {
                                    if (data.success) {
                                        swal(data.success);
                                        window.location.href = '<?= site_url() ?>/products';

                                    } else if (data.error) {
                                        swal(data.error);
                                    }
                                    var type = $('#Type').val();

                                    if (data === "service") {
                                        // Optionally handle service
                                    } else if (type == "1") {
                                        $('#stockcontent').html(data);
                                        $('#stock').modal('show');
                                        $('#Addproduct').modal('hide');

                                        $("[id='quantity']").off('change').on('change', function() {
                                            var storeID = $(this).attr("store-id");
                                            quant.push({
                                                'store_id': storeID,
                                                'quantity': $(this).val()
                                            });
                                        });

                                        $("[id='quantityw']").off('change').on('change', function() {
                                            var warehouseID = $(this).attr("warehouse-id");
                                            quantw.push({
                                                'warehouse_id': warehouseID,
                                                'quantity': $(this).val()
                                            });
                                        });

                                        $("[id='pricestr']").off('change').on('change', function() {
                                            var storeID = $(this).attr("store-id");
                                            pricestore.push({
                                                'store_id': storeID,
                                                'price': $(this).val()
                                            });
                                        });

                                        productID = $('#prodctID').val();
                                    } else {
                                        productID = $('#prodctID').val();
                                        $('#combocontent').html(data);
                                        $('#combo').modal('show');
                                        $('#Addproduct').modal('hide');

                                        $("#add_item").autocomplete({
                                            source: siteUrl + 'productcontroller/suggest',
                                            minLength: 1,
                                            autoFocus: false,
                                            delay: 200,
                                            select: function(event, ui) {
                                                event.preventDefault();
                                                if (ui.item.id !== 0) {
                                                    var row = add_product_item(ui.item);
                                                    if (row) {
                                                        $(this).val('');
                                                    }
                                                } else {
                                                    alert(noProductLabel);
                                                }
                                            },
                                            response: function(event, ui) {
                                                if ($(this).val().length >= 16 && ui.content[0].id == 0) {
                                                    alert(noProductLabel);
                                                    $(this).val('').focus();
                                                } else if (ui.content.length === 1 && ui.content[0].id != 0) {
                                                    ui.item = ui.content[0];
                                                    $(this).data('ui-autocomplete')._trigger('select', 'autocompleteselect', ui);
                                                    $(this).autocomplete('close');
                                                    $(this).removeClass('ui-autocomplete-loading');
                                                } else if (ui.content.length === 1 && ui.content[0].id == 0) {
                                                    alert(noProductLabel);
                                                    $(this).val('').focus();
                                                }
                                            }
                                        });
                                    }


                                }
                            });
                        });


                        function add_product_item(item, noitem) {
                            if (item == null && noitem == null) {
                                return false;
                            }
                            if (noitem != 1) {
                                var item_id = 0;
                                $.each(items, function(i) {
                                    if (items[i].item_id == item.id) {
                                        items[i].quantity = (parseFloat(items[i].quantity) + 1);
                                        item_id = item.id;
                                        return false;
                                    }
                                });
                                if (item_id == 0) {
                                    item.qty = 1;
                                    items.push({
                                        'item_id': item.id,
                                        'quantity': item.qty,
                                        'code': item.code,
                                        'name': item.name
                                    });
                                }
                            }


                            $("#Comboprd tbody").empty();
                            items.forEach(function(item) {
                                var Tr = $('<tr id="rowid_' + item.item_id + '" class="item_' + item.item_id + '"></tr>');
                                td = '<td>' + item.name + ' (' + item.code + ')</td>';
                                td += '<td><input class="form-control text-center" name="quantity" type="text" value="' + item.quantity + '" item-id="' + item.item_id + '" id="quantit"></td>';
                                td += '<td class="text-center"><i class="fa fa-times tip delt" id="' + item.item_id + '" title="Remove" style="cursor:pointer;"></i></td>';
                                Tr.html(td);
                                Tr.prependTo("#Comboprd");
                            });
                            console.log(items);
                            $("[id='quantit']").on('change', function() {
                                var itemID = $(this).attr("item-id");
                                var val = $(this).val();
                                items.forEach(function(e) {
                                    if (e.item_id == itemID) {
                                        e.quantity = val;
                                    }
                                });
                                console.log(items);
                            });
                            return true;

                        }

                        function addcombo() {


                            var values = [];

                            $('input[name="quantity[]"]').each(function() {
                                values.push($(this).val());
                            });


                            var valuesg = [];
                            $('input[name="store[]"]').each(function() {
                                valuesg.push($(this).val());
                            });

                            var productID = $('#prodctID').val();


                            $.ajax({
                                url: "<?php echo site_url('productcontroller/addcombo') ?>/",
                                type: "POST",
                                data: {
                                    strrr: valuesg,
                                    qrrt: values,
                                    prodd: productID
                                },
                                success: function(data) {
                                    location.reload();
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });
                        }

                        function updatestock() {
                            $.ajax({
                                url: "<?php echo site_url('products/updatestock') ?>/",
                                data: {
                                    quant: quant,
                                    quantw: quantw,
                                    productID: productID,
                                    pricest: pricestore
                                },
                                type: "POST",
                                success: function(data) {
                                    location.reload();
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });
                        };


                        function modifystock(id) {
                            $.ajax({
                                url: "<?php echo site_url('productcontroller/modifystock') ?>/" + id,
                                type: "POST",
                                success: function(data) {
                                    $('#stockcontent').html(data);
                                    $('#stock').modal('show');

                                    $("[id='quantity']").on('change', function() {
                                        var storeID = $(this).attr("store-id");
                                        quant.push({
                                            'store_id': storeID,
                                            'quantity': $(this).val()
                                        });
                                    });

                                    $("[id='quantityw']").on('change', function() {
                                        var warehouseID = $(this).attr("warehouse-id");
                                        quantw.push({
                                            'warehouse_id': warehouseID,
                                            'quantity': $(this).val()
                                        });
                                    });

                                    $("[id='pricestr']").on('change', function() {
                                        var storeID = $(this).attr("store-id");
                                        pricestore.push({
                                            'store_id': storeID,
                                            'price': $(this).val()
                                        });
                                    });

                                    productID = $('#prodctID').val();
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });
                        }


                        function Viewproduct(id) {
                            $.ajax({
                                url: "<?php echo site_url('ProductController/Viewproduct') ?>/" + id,
                                type: "POST",
                                success: function(data) {
                                    $('#viewSectionProduct').html(data);
                                    $('#Viewproduct').modal('show');
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });
                        }

                        $(document).on('click', '.delt', function() {
                            var id = $(this).attr('id');
                            $.each(items, function(i) {
                                if (items[i].item_id == id) {
                                    items.splice(i, 1);
                                    return false;
                                }
                            });
                            $(this).closest('#rowid_' + id).remove();
                            console.log(items);
                        });

                        function modifycombo(id) {
                            $.ajax({
                                url: "<?php echo site_url('productcontroller/modifycombo') ?>/" + id,
                                type: "POST",
                                success: function(data) {
                                    $('#combocontent').html(data);
                                    $('#Viewproduct').modal('hide');
                                    $('#combo').modal('show');
                                    $.ajax({
                                        url: "<?php echo site_url('productcontroller/getcombos') ?>/" + id,
                                        type: "POST",
                                        success: function(data) {
                                            dataitems = JSON.parse(data);
                                            dataitems.forEach(function(e) {
                                                items.push({
                                                    'item_id': e.item_id,
                                                    'quantity': e.quantity,
                                                    'code': e.code,
                                                    'name': e.name
                                                });
                                            });
                                        },
                                        error: function(jqXHR, textStatus, errorThrown) {
                                            alert("error");
                                        }
                                    });
                                    console.log(items);
                                    $("#add_item").autocomplete({
                                        source: '<?= site_url('productcontroller/suggest'); ?>',
                                        minLength: 1,
                                        autoFocus: false,
                                        delay: 200,
                                        select: function(event, ui) {

                                            event.preventDefault();
                                            if (ui.item.id !== 0) {
                                                var row = add_product_item(ui.item);
                                                if (row) {
                                                    $(this).val('');
                                                }
                                            } else {
                                                alert('<?= label('NoProduct') ?>');
                                                return false;
                                            }
                                        },
                                        response: function(event, ui) {
                                            if ($(this).val().length >= 16 && ui.content[0].id == 0) {
                                                alert('<?= label('NoProduct') ?>');
                                                $('#add_item').focus();
                                                $(this).val('');
                                            } else if (ui.content.length == 1 && ui.content[0].id != 0) {
                                                ui.item = ui.content[0];
                                                $(this).data('ui-autocomplete')._trigger('select', 'autocompleteselect', ui);
                                                $(this).autocomplete('close');
                                                $(this).removeClass('ui-autocomplete-loading');
                                            } else if (ui.content.length == 1 && ui.content[0].id == 0) {
                                                alert('<?= label('NoProduct') ?>');
                                                $('#add_item').focus();
                                                $(this).val('');

                                            }
                                        }
                                    });
                                },
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });
                        }


                        function barcode() {
                            row = $('#Brrows').val();
                            num = $('#Brnum').val();
                            var urld = "<?php echo site_url('printbarcodes/productlabel') ?>/" + productBcode + "/" + row + "/" + num;
                            window.open(urld);
                        }

                        function Printbarcode() {
                            $('.modal-body').removeAttr('id');
                            window.print();
                            $('.modal-body').attr('id', 'modal-body');
                        }

                        function makePrdInvis(id, prd) {
                            $.ajax({
                                url: "<?php echo site_url('productcontroller/makePrdInvis') ?>/" + id + "/" + prd,
                                type: "POST",
                                success: function(data) {},
                                error: function(jqXHR, textStatus, errorThrown) {
                                    alert("error");
                                }
                            });
                        }
                    </script>

                    <!-- Modal -->


                    <div class="modal fade" id="ImportProductsprice" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
                        <div class="modal-dialog" role="document">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                    <h4 class="modal-title" id="myModalLabel"><?= label("Update"); ?></h4>
                                </div>
                                <?php
                                $attributes = array('id' => 'addform');
                                echo form_open_multipart('products/importcsvnew_price', $attributes);
                                ?>
                                <div class="modal-body">
                                    <div class="form-group">
                                        <label for="exampleInputFile"><?= label("Uploadxlsfile"); ?></label>
                                        <input type="file" name="userfile" id="ImageInput">
                                    </div>

                                    <span style="color: red;">*Purchase,selling,MRP price only will change if you upload.<br>Please don't change ID number</span>

                                </div>

                                <div class="modal-footer">
                                    <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
                                    <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
                                </div>
                                <?php echo form_close(); ?>
                            </div>
                        </div>
                    </div>


                    <div class="modal fade" id="Addproduct" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
                        <div class="modal-dialog modal-xl">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                                    <h4 class="modal-title" id="myModalLabel"><?= label("AddProduct"); ?></h4>
                                </div>
                                <?php
                                $attributes = array('id' => 'addform');
                                echo form_open_multipart('ProductController/add', $attributes);
                                ?>
                                <div class="modal-body" style="height: 400px; overflow: scroll;">
                                    <input type="hidden" name="type" value="0" id="type">
                                    <?php




                                    $mmik = $db->query("select * from products order by id desc ")->getRowArray();
                                    ?>
                                    <div class="form-group controls">

                                        <div class="col-xs-4">
                                            <label for="ProductCode"><?= label("ProductCode"); ?></label>

                                            <input type="text" value="<?php echo $autoit; ?>" Required name="code" class="form-control" id="ProductCode" placeholder="<?= label("ProductCode"); ?>">


                                            <p id="codeError" class="red" hidden><?= label("codeerror"); ?></p>
                                        </div>

                                        <div class="col-xs-4">
                                            <label for="ProductName"><?= label("ProductName"); ?></label>
                                            <input autofocus type="text" name="name" maxlength="50" Required class="form-control" id="ProductName" placeholder="<?= label("ProductName"); ?>">
                                        </div>



                                        <div class="col-xs-4">
                                            <label for="ProductCode"><?= label("HSN"); ?></label>
                                            <input type="text" maxlength="30" value="0" Required name="hsn" class="form-control" id="hsn" placeholder="<?= label("HSN"); ?>">
                                            <p id="codeError" class="red" hidden><?= label("codeerror"); ?></p>
                                        </div>





                                    </div>



                                    <div class="form-group">
                                        <div class="col-xs-4">
                                            <label for="Category">Brand</label>
                                            <select class="form-control" name="brandd" id="brandd">
                                                <option value="0">Select</option>

                                                <?php
                                                $imnn = $db->query("select * from brand order by name asc")->getResultArray();
                                                foreach ($imnn as $imnnf) {
                                                ?>
                                                    <option value="<?php echo  $imnnf['id']; ?>"><?php echo $imnnf['name']; ?></option>
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
                                            <label for="Category"><?= label("Category"); ?></label>
                                            <select class="form-control" name="category" id="Category">
                                                <option value="0">Select</option>
                                                <?php foreach ($categories as $category) : ?>
                                                    <option value="<?= $category->id; ?>"><?= $category->name; ?></option>
                                                <?php endforeach; ?>
                                            </select>

                                            <a href="javascript:void(0)" data-toggle="modal" data-target="#Addcategory">
                                                <span class="fa-stack fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Category">

                                                    <i style="color: #89b03e;" class="fa fa-plus fa-stack-1x  "></i>
                                                </span>
                                            </a>
                                        </div>



                                        <div class="col-xs-4" id="supply">
                                            <label for="Supplier"><?= label("Supplier"); ?></label>
                                            <select class="form-control" name="supplier" id="Supplier">
                                                <option value="0">Select</option>
                                                <?php foreach ($suppliers as $supplier) : ?>
                                                    <option value="<?= $supplier->id; ?>"><?= $supplier->name; ?></option>
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
                                        <div class="col-xs-3">
                                            <label for="PurchasePrice"><?= label("PurchasePrice"); ?></label>
                                            <input type="number" step="any" Required value="0" Required name="cost" class="form-control" id="PurchasePrice" placeholder="<?= label("PurchasePrice"); ?>">
                                        </div>

                                        <div class="col-xs-3">
                                            <label for="Price"><?= label("Selling"); ?> <?= label("Price"); ?></label>
                                            <input type="number" step="any" value="0" Required name="price" class="form-control" id="Price" placeholder="<?= label("Price"); ?>">
                                        </div>

                                        <div class="col-xs-3">
                                            <label for="Price"><?= label("MRP"); ?></label>
                                            <input type="number" step="any" value="0" Required name="rrate" class="form-control" id="rrate" placeholder="<?= label("MRP"); ?>">
                                        </div>

                                        <div class="col-xs-3">
                                            <label for="taxType"><?= label("TaxMethod"); ?></label>
                                            <select class="form-control" name="taxmethod" id="taxType">
                                                <option value="0"><?= label("inclusive"); ?></option>
                                                <option value="1"><?= label("exclusive"); ?></option>
                                            </select>
                                        </div>






                                    </div>



                                    <?php
                                    $mkzz = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
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



                                                <div style="height: 60px;overflow-y: scroll;" id="ttaxx">
                                                    <?php
                                                    $taxx = $db->query("select * from tax where status=1 order by name asc")->getResultArray();
                                                    foreach ($taxx as $taxxf) {
                                                    ?>
                                                        <div class="col-xs-4">
                                                            <span style="float: left;width: 10%">
                                                                <input type checked="checkbox" style="display: block;" name="ckk[]" id="ckc" value="<?php echo $taxxf['id']; ?>">
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

                                        <div class="col-xs-3">
                                            <label for="Price"><?= label("Discount"); ?> %</label>
                                            <input maxlength="2" type="number" step="any" Required value="0" name="dispx" class="form-control" id="dispx" placeholder="<?= label("Price"); ?>">
                                        </div>





                                        <div class="col-xs-3">
                                            <label for="Unit"><?= label("Net Weight"); ?></label>
                                            <input Required type="text" name="net_wight" value="0" class="form-control" id="net_wight" />
                                        </div>

                                        <div class="col-xs-3">
                                            <label for="Unit"><?= label("Unit"); ?></label>
                                            <input Required type="text" step="any" name="unit" value="0" class="form-control" id="Unit" placeholder="<?= label("Unit"); ?>">
                                        </div>

                                        <div class="col-xs-3">
                                            <label for="AlertQt"><?= label("AlertQt"); ?></label>
                                            <input type="number" value="0" name="alertqt" class="form-control" id="AlertQt" placeholder="<?= label("AlertQt"); ?>">
                                        </div>


                                    </div>



                                    <div class="form-group">

                                        <div class="col-xs-3">
                                            <label for="Price"><?= label("Packed"); ?></label>
                                            <input type="text" value="0" Required name="packed_1m" class="form-control" id="packed_1m">
                                        </div>


                                        <div class="col-xs-3">
                                            <label for="taxType"><?= label("Best Before"); ?></label>

                                            <input type="text" value="0" name="best_before" class="form-control" id="best_before">

                                        </div>

                                        <div class="col-xs-3">
                                            <label for="taxType"><?= label("Initial Stock "); ?></label>

                                            <input type="text" value="0" name="ini_stock" class="form-control" id="ini_stock">

                                        </div>



                                        <input value="1" type="hidden" name="measur" class="form-control" id="measur">



                                    </div>
                                    <div class="form-group">
                                        <div class="col-xs-6">

                                            <label for="exampleInputFile"><?= label("Imageinput"); ?></label>
                                            <input type="file" name="userfile" id="ImageInput">
                                        </div>


                                        <div class="col-xs-6">

                                            <label for="ProductDescription"><?= label("ProductDescription"); ?></label>
                                            <textarea id="summernoted" class="form-control" name="description"></textarea>

                                        </div>
                                    </div>

                                    <input type="hidden" name="color" id="option7" value="color07" autocomplete="off">


                                    <style type="text/css">
                                        .modal-footer {
                                            border-top: 0px solid #e5e5e5;
                                        }
                                    </style>
                                </div>
                                <div class="modal-footer" style="padding: 7px !important;">

                                    <button type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?= label("Submit"); ?></button>

                                    <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?= label("Close"); ?></button>

                                </div>
                                <?php echo form_close(); ?>

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
                            <h4 class="modal-title" id="myModalLabel"><?= label("AddProduct"); ?></h4>
                        </div>
                        <?php
                        $attributes = array('id' => 'addform');
                        echo form_open_multipart('products/importcsvnew', $attributes);
                        ?>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="exampleInputFile"><?= label("Uploadxlsfile"); ?></label>
                                <input type="file" name="userfile" id="ImageInput">
                                <p class="help-block"><a href="<?= site_url('public/files/product.xls'); ?>"><?= label('DownloadSample'); ?></a></p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
                            <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
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
                            <h4 class="modal-title" id="myModalLabel"><?= label("Add"); ?></h4>
                        </div>

                        <div class="modal-body">
                            <div class="form-group">
                                <div class="col-xs-6">
                                    <label for="SupplierName"><?= label("SupplierName"); ?></label>
                                    <input type="text" name="name" maxlength="50" Required class="form-control" id="SupplierName" placeholder="<?= label("SupplierName"); ?>">
                                </div>
                                <div class="col-xs-6">
                                    <label for="SupplierPhone"><?= label("SupplierPhone"); ?></label>
                                    <input type="text" name="phone" Required maxlength="30" class="form-control" id="SupplierPhone" placeholder="<?= label("SupplierPhone"); ?>">
                                </div>
                            </div>
                            <div class="form-group">

                                <div class="col-xs-6">
                                    <label for="SupplierEmail"><?= label("SupplierEmail"); ?></label>
                                    <input type="email" maxlength="50" name="email" class="form-control" id="SupplierEmail" placeholder="<?= label("SupplierEmail"); ?>">
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
                                    <label for="SupplierEmail">GST <?= label("Number"); ?></label>
                                    <input type="text" maxlength="50" name="gst" class="form-control" id="gst" placeholder="GST <?= label("Number"); ?>">
                                </div>
                            </div>
                            <input name="city" value="Chennai" class="form-control" id="city" Required placeholder="City" type="hidden">
                            <input name="country" class="form-control" value="India" Required id="country" placeholder="Country" type="hidden">
                            <div class="col-xs-6">
                                <label for="Note"><?= label("Address"); ?></label>
                                <textarea id="adress" class="form-control" name="adress"></textarea>
                            </div>


                            <div class="col-xs-6">
                                <label for="Note"><?= label("note"); ?></label>
                                <textarea id="summernotes" class="form-control" name="note"></textarea>
                            </div>


                        </div>

                        <style type="text/css">
                            .modal-footer {
                                border-top: 0px solid #e5e5e5;
                            }
                        </style>


                        <div class="modal-footer">

                            <button data-dismiss="modal" onclick="return kakkak();" type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?= label("Submit"); ?></button>

                            <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?= label("Close"); ?></button>

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
                            <h4 class="modal-title" id="combo"><?= label("combinations"); ?></h4>
                        </div>
                        <div class="modal-body" id="modal-body" style="padding:1px;">
                            <div id="combocontent">
                                <!-- combo goes here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <!-- <button type="button" class="btn btn-default hiddenpr" onclick="location.reload();"><?= label("Close"); ?></button>
          <button type="button" class="btn btn-add hiddenpr" onclick="addcombo()"><?= label("submit"); ?></button> -->
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
                            <h4 class="modal-title" id="stock"><?= label("Stock"); ?></h4>
                        </div>
                        <div class="modal-body" id="modal-body" style="padding:1px;">
                            <div id="stockcontent">
                                <!-- stock goes here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-default hiddenpr" onclick="location.reload();"><?= label("Close"); ?></button>
                            <button type="button" class="btn btn-add hiddenpr" onclick="updatestock()"><?= label("submit"); ?></button>
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
                            <h4 class="modal-title" id="view"><?= label("Viewproduct"); ?></h4>
                        </div>
                        <div class="modal-body" id="modal-body" style="padding:1px;">
                            <div id="viewSectionProduct">
                                <!-- view goes here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label("Close"); ?></button>
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
                            <h4 class="modal-title" id="barcode"><?= label("Stock"); ?></h4>
                        </div>
                        <div class="modal-body" id="modal-body" style="padding:1px;">
                            <div class="form-group col-md-6">
                                <label for="Price"><?= label("RowsNumber"); ?></label>
                                <select Required class="form-control" id="Brrows">
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                </select>
                            </div>
                            <div class="form-group col-md-6">
                                <label for="Price"><?= label("Number"); ?></label>
                                <input type="number" Required name="num" class="form-control" id="Brnum" placeholder="<?= label("Number"); ?>" value="10">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label("Close"); ?></button>
                            <button type="button" class="btn btn-add hiddenpr" onclick="barcode()"><?= label("submit"); ?></button>
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
                            <h4 class="modal-title" id="barcodeP"><?= label("Stock"); ?></h4>
                        </div>
                        <div class="modal-body" id="modal-body" style="padding:1px;">
                            <div id="printSection" style="text-align: center;">
                                <!-- content -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?= label("Close"); ?></button>
                            <button type="button" class="btn btn-add hiddenpr" onclick="Printbarcode()"><?= label("print"); ?></button>
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
                            <h4 class="modal-title" id="myModalLabel"><?= label("AddCategory"); ?></h4>
                        </div>
                        <?php echo form_open_multipart('categories/add'); ?>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="CategoryName"><?= label("CategoryName"); ?></label>
                                <input type="text" maxlength="50" name="name" class="form-control" id="CategoryName" placeholder="<?= label("CategoryName"); ?>" required>
                            </div>
                        </div>
                        <div class="modal-footer">

                            <button data-dismiss="modal" onclick="return kakkakat();" type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?= label("Submit"); ?></button>


                            <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?= label("Close"); ?></button>

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
                            <h4 class="modal-title" id="myModalLabel"><?= label("Add Brand"); ?></h4>
                        </div>
                        <?php echo form_open_multipart('categories/add'); ?>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="CategoryName"><?= label("Brand"); ?></label>
                                <input type="text" maxlength="50" name="Brandname" class="form-control" id="Brandname" placeholder="<?= label("Brand"); ?>" required>
                            </div>
                        </div>
                        <div class="modal-footer">

                            <button data-dismiss="modal" onclick="return kakkakbar();" type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?= label("Submit"); ?></button>


                            <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?= label("Close"); ?></button>

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
                            <h4 class="modal-title" id="myModalLabel"><?= label("Add"); ?></h4>
                        </div>
                        <?php echo form_open_multipart('tax/add'); ?>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="CategoryName"><?= label("tax"); ?> <?= label("Name"); ?></label>
                                <input type="text" maxlength="50" name="taxName" class="form-control" id="taxName" required>
                            </div>

                            <div class="form-group">
                                <label for="CategoryName"><?= label("tax"); ?>(%)</label>
                                <input type="text" maxlength="5" name="persent" class="form-control" id="persent" required>
                            </div>

                            <div class="form-group">
                                <label for="CategoryName"><?= label("tax"); ?> <?= label("type"); ?></label>
                                <select class="form-control" name="custtype" id="custtype">
                                    <option value="1">Local State</option>
                                    <option value="2">Other State</option>
                                </select>
                            </div>


                        </div>
                        <div class="modal-footer">

                            <button data-dismiss="modal" onclick="return kakkaktax();" type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?= label("Submit"); ?></button>


                            <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?= label("Close"); ?></button>

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
                        url: "<?php echo site_url('tax/addajax') ?>/",
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
                        url: "<?php echo site_url('suppliers/addajax') ?>/",
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
                        url: "<?php echo site_url('categories/addajax') ?>/",
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
                        url: "<?php echo site_url('brand/addajax') ?>/",
                        type: "POST",
                        data: {
                            name: goryName
                        },
                        success: function(data) {

                            $('#Brandname').val('');

                            $('#brandd').html(data);


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
        </div>

        <!-- Enhanced Inline Footer Widget -->
        <!--    <div class="footer-widget-inline">
        <div class="pagination-inline">
            <button class="pag-btn" title="First"><i class="fas fa-angle-double-left"></i></button>
            <button class="pag-btn" title="Previous"><i class="fas fa-angle-left"></i></button>
            <input type="number" class="page-input" value="1" min="1" />
            <span class="page-range">to 100 of 175,979</span>
            <button class="pag-btn" title="Next"><i class="fas fa-angle-right"></i></button>
            <button class="pag-btn" title="Last"><i class="fas fa-angle-double-right"></i></button>
        </div>
    </div>
-->
        <style>
            .footer-widget-inline {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 12px 0;
                border-top: 1px solid #ccc;
                background: #f9f9f9;
            }

            .pagination-inline {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
            }

            .page-input {
                width: 60px;
                text-align: center;
                padding: 4px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }

            .pag-btn {
                background-color: #fff;
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 6px 10px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s ease;
            }

            .pag-btn:hover {
                background-color: #e9e9e9;
            }

            .page-range {
                font-weight: 500;
            }
        </style>

        <!-- Font Awesome for Icons -->
        <!-- <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" /> -->

    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('.pag-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const input = document.querySelector('.page-input');
                    let page = parseInt(input.value);
                    const totalPages = Math.ceil(175979 / 100); // Replace with PHP if dynamic

                    if (btn.title === "Next" && page < totalPages) page += 1;
                    else if (btn.title === "Previous" && page > 1) page -= 1;
                    else if (btn.title === "First") page = 1;
                    else if (btn.title === "Last") page = totalPages;

                    window.location.href = `?page=${page}`;
                });
            });
        });
    </script>


    <!-- Export Progress Modal -->
    <div id="exportModal" class="modal">
        <div class="modal-content">
            <h4>Export in Progress</h4>
            <div id="exportMessage">Loading...</div>
            <div id="progressBar">
                <div id="progressFill">0%</div>
            </div>
            <button id="downloadBtn" class="btn btn-primary btn-disabled" disabled>Download</button>
            <button id="cancelBtn" class="btn btn-danger">Cancel</button>
        </div>
    </div>

    <style>
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0, 0, 0, 0.4);
        }

        .modal-content {
            background-color: #fff;
            margin: 15% auto;
            padding: 20px;
            /* width: 300px; */
            border-radius: 6px;
            box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
            text-align: center;
        }

        #progressBar {
            width: 100%;
            background-color: #eee;
            height: 20px;
            border-radius: 5px;
            margin-top: 10px;
            overflow: hidden;
        }

        #progressFill {
            height: 100%;
            width: 0%;
            background-color: #4caf50;
            text-align: center;
            line-height: 20px;
            color: white;
        }

        .btn-disabled {
            background-color: #ccc !important;
            color: #fff;
            cursor: not-allowed;
        }
    </style>

    <script>
        let exportTaskId = null;
        let polling = null;

        function startExport(type) {

            document.getElementById('exportModal').style.display = 'block';
            document.getElementById('exportMessage').innerText = 'Export starting...';
            document.getElementById('progressFill').style.width = '0%';
            document.getElementById('progressFill').innerText = '0%';
            document.getElementById('downloadBtn').disabled = true;
            document.getElementById('downloadBtn').classList.add('btn-disabled');

            fetch('/export/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: 'type=' + type
                })
                .then(res => res.json())
                .then(data => {
                    exportTaskId = data.task_id;
                    pollProgress();
                });
        }

        document.getElementById('cancelBtn').addEventListener('click', function() {
            if (polling) clearInterval(polling);
            fetch('/export/cancel?task_id=' + exportTaskId);
            document.getElementById('exportModal').style.display = 'none';
        });

        document.getElementById('downloadBtn').addEventListener('click', function() {
            window.location.href = '/export/download?task_id=' + exportTaskId;
        });

        function pollProgress() {
            polling = setInterval(() => {
                fetch('/export/status?task_id=' + exportTaskId)
                    .then(res => res.json())
                    .then(data => {
                        document.getElementById('exportMessage').innerText = data.message;
                        document.getElementById('progressFill').style.width = data.percent + '%';
                        document.getElementById('progressFill').innerText = data.percent + '%';

                        if (data.complete) {
                            clearInterval(polling);
                            document.getElementById('downloadBtn').disabled = false;
                            document.getElementById('downloadBtn').classList.remove('btn-disabled');
                            document.getElementById('exportMessage').innerText = 'Export complete';
                        }
                    });
            }, 1000);
        }
    </script>