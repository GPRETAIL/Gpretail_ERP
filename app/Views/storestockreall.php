<style type="text/css">
    /* No page-specific loading spinner here - relies entirely on the app's
       existing global one (#loadingimg, styled in Style-Light.css /
       Style-Dark1.css, faded out by app.js on window load). */

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

    .content-area.report-page > h3 {
        font-size: 18px;
        margin: 6px 0;
    }
</style>

<link rel="stylesheet" href="https://cdn.datatables.net/2.2.2/css/dataTables.bootstrap5.css">

<style type="text/css">
    /* Same reset the Products/Sales Report pages use - this app's global
       CSS applies its own margin/padding to .container/.row that otherwise
       shifts content left inside the sidebar layout. */
    .container,
    .row {
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
    }

    .report-page {
        padding: 10px 14px;
    }

    /* ---- Filters left / grid right ---- */
    .report-layout {
        display: grid !important;
        grid-template-columns: 280px 1fr !important;
        align-items: start !important;
        gap: 14px !important;
        width: 100% !important;
        box-sizing: border-box !important;
    }

    .report-filters {
        width: 280px !important;
        box-sizing: border-box !important;
        background: #fff;
        border: 1px solid #babfc7;
        border-radius: 8px;
        padding: 12px;
        overflow: visible;
    }

    .report-filters-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .04em;
        color: #6b7280;
        margin-bottom: 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid #eee;
    }

    .report-filters .form-group {
        margin-bottom: 8px;
    }

    .report-filters .form-group>label,
    .report-filters .form-group>div:first-child {
        font-weight: 600;
        font-size: 11.5px;
        color: #444;
        margin-bottom: 2px;
    }

    .report-filters .form-control,
    .report-filters select {
        width: 100%;
        box-sizing: border-box;
        height: 32px;
        padding: 4px 8px;
        font-size: 13px;
    }

    .report-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #eee;
    }

    .report-actions .btn {
        padding: 6px 9px;
        margin: 0;
        font-size: 12.5px;
        flex: 1 1 auto;
        text-align: center;
    }

    /* ---- Grid panel ---- */
    .report-grid {
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        background: #fff;
        border: 1px solid #babfc7;
        border-radius: 8px;
        padding: 10px 12px;
    }

    .report-grid .grid-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 10px;
    }

    .report-grid .grid-search input {
        height: 34px;
        padding: 4px 10px;
        border: 1px solid #babfc7;
        border-radius: 4px;
        font-size: 13px;
        min-width: 220px;
    }

    .report-grid table.dataTable {
        border-collapse: collapse;
    }

    .report-grid table.dataTable tbody tr>td {
        background-color: #fff;
    }

    .report-grid table.dataTable thead th {
        background: #f8f8f8;
        color: #4b5563;
        font-weight: 600;
        white-space: nowrap;
        border-bottom: 2px solid #babfc7 !important;
        vertical-align: top;
    }

    .report-grid table.dataTable thead th .col-filter-icon {
        display: inline-block;
        margin-left: 6px;
        font-size: 11px;
        color: #9aa1ac;
        cursor: pointer;
        vertical-align: middle;
    }

    .report-grid table.dataTable thead th .col-filter-icon:hover,
    .report-grid table.dataTable thead th .col-filter-icon.active {
        color: #2196F3;
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

    #colFilterPopup .col-filter-popup-input:focus {
        outline: none;
        border-color: #2196F3;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, .2);
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

    .report-grid table.dataTable tbody td {
        white-space: nowrap;
        color: #2b2f36;
    }

    .report-grid table.dataTable tbody tr:hover>td {
        background-color: #e8f4fd !important;
    }

    .report-grid .dt-num {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    .report-grid .dt-length,
    .report-grid .dt-info,
    .report-grid .dt-paging {
        display: none !important;
    }

    .report-grid .dt-processing,
    .report-grid .dataTables_processing,
    .report-grid [id$="_processing"] {
        display: none !important;
    }

    /* ---- Custom pagination bar (Page Size / X of Y / jump-to-page) ---- */
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

    @media (max-width: 900px) {
        .report-layout {
            display: block !important;
        }

        .report-filters,
        .report-grid {
            width: 100% !important;
            max-width: 100% !important;
        }
    }
</style>

<div class="page-wrapper">
    <div class="content-area report-page">
        <h3><?= label('Closing'); ?> <?= label('Stock'); ?> <?= label('Reports'); ?></h3>

        <div class="report-layout">
            <div class="report-filters">
                <div class="report-filters-title">Filters</div>

                <div class="form-group">
                    <div><?= label('Store'); ?></div>
                    <select class="js-select-options form-control" id="StoresSelect">
                        <option value="">All</option>
                        <?php foreach ($Stores as $store): ?>
                            <option value="<?= $store->id; ?>"><?= esc($store->name); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <div><?= label('Fromdate'); ?></div>
                    <input class="form-control" id="pddate" type="text" value="<?php echo date("d-m-Y"); ?>" name="pddate">
                </div>

                <div class="form-group">
                    <div><?= label('Tilldate'); ?></div>
                    <input class="form-control" id="pddatel" value="<?php echo date("d-m-Y"); ?>" type="text" name="pddatel">
                </div>

                <div class="report-actions">
                    <a href="javascript:void(0);" class="btn btn-add hiddenpr" onclick="getStockReport()"><?= label('GetReport'); ?></a>
                    <a href="javascript:void(0)" class="btn btn-add hiddenpr" onclick="PrintTicket()">Print</a>
                    <a href="javascript:void(0)" class="btn btn-add hiddenpr" onclick="exportStock('csv')">CSV</a>
                    <a href="javascript:void(0)" class="btn btn-add hiddenpr" onclick="exportStock('xlsx')">Excel</a>
                    <?php if ($setting->show_pdf_or_not == 1): ?>
                        <a href="javascript:void(0)" class="btn btn-add hiddenpr" onclick="pdfreceipt()">PDF</a>
                    <?php endif; ?>
                </div>
            </div>

            <div class="report-grid">
                <div class="grid-toolbar">
                    <div></div>
                    <div class="grid-search">
                        <label for="stockSearchBox">Search:</label>
                        <input type="text" id="stockSearchBox" placeholder="Search products...">
                    </div>
                </div>

                <div id="printSection">
                    <div id="custrrr">
                        <table id="stockGrid" class="table table-bordered w-100"></table>
                    </div>
                </div>

                <div class="grid-pagination-bar">
                    <div class="gpb-left">
                        <label for="gridPageSize">Page Size:</label>
                        <select id="gridPageSize">
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100" selected>100</option>
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
        </div>
    </div>
</div>

<script src="https://cdn.datatables.net/2.2.2/js/dataTables.js"></script>
<script src="https://cdn.datatables.net/2.2.2/js/dataTables.bootstrap5.js"></script>

<script>
    function pdfreceipt() {
        var content = $('#printSection').html();
        $.redirect('<?php echo site_url('pos/pdfreceipt') ?>/', {
            content: content
        });
    }

    function PrintTicket() {
        $('.modal-body').removeAttr('id');
        window.print();
        $('.modal-body').attr('id', 'modal-body');
    }

    function currentStockFilters() {
        return {
            start: $('#pddate').val(),
            endd: $('#pddatel').val(),
            storesSelect: $('#StoresSelect').val()
        };
    }

    var numFmt = $.fn.dataTable.render.number(',', '.', 2);

    // Only ID/Code/Name are backed directly by a `products` column - the
    // ledger columns (Initial through Value) are computed after pagination
    // (see attachStockLedger() on the server), so they're not filterable
    // via SQL and are marked non-searchable/orderable here to match.
    var STOCK_COLUMNS = [
        { title: 'ID' },
        { title: 'Code' },
        { title: 'Product Name' },
        { title: 'Initial', className: 'dt-num', render: numFmt, orderable: false, searchable: false },
        { title: 'Opening', className: 'dt-num', render: numFmt, orderable: false, searchable: false },
        { title: 'Purchase', className: 'dt-num', render: numFmt, orderable: false, searchable: false },
        { title: 'Sales', className: 'dt-num', render: numFmt, orderable: false, searchable: false },
        { title: 'Cancel', className: 'dt-num', render: numFmt, orderable: false, searchable: false },
        { title: 'Return', className: 'dt-num', render: numFmt, orderable: false, searchable: false },
        { title: 'Closing', className: 'dt-num', render: numFmt, orderable: false, searchable: false },
        { title: 'Price', className: 'dt-num', render: numFmt, orderable: false, searchable: false },
        { title: 'Value', className: 'dt-num', render: numFmt, orderable: false, searchable: false },
    ];

    function debounce(fn, wait) {
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

    function getColFilterPopup() {
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
        $(document).off('click.colFilterClose').on('click.colFilterClose', function() {
            $popup.hide();
        });

        return $popup;
    }

    function wireColumnFilters(table) {
        var $popup = getColFilterPopup();
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

    function wireGridPagination(table) {
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

    var stockTable;

    function getStockReport() {
        if ($.fn.DataTable.isDataTable('#stockGrid')) {
            $('#stockGrid').DataTable().destroy();
            $('#stockGrid').empty();
        }

        stockTable = $('#stockGrid').DataTable({
            processing: true,
            serverSide: true,
            destroy: true,
            columns: STOCK_COLUMNS,
            order: [
                [2, 'asc']
            ],
            pageLength: parseInt($('#gridPageSize').val(), 10) || 100,
            scrollY: '62vh',
            scrollCollapse: true,
            deferRender: true,
            dom: 'rt',
            ajax: {
                url: "<?= base_url('reports/getClosingStockReport') ?>",
                type: "POST",
                data: function(d) {
                    Object.assign(d, currentStockFilters());
                }
            }
        });

        wireGridPagination(stockTable);
        wireColumnFilters(stockTable);

        $('#stockSearchBox').off('keyup change').on('keyup change', debounce(function() {
            stockTable.search(this.value).draw();
        }, 400));
    }

    function exportStock(format) {
        var params = new URLSearchParams(currentStockFilters());
        params.set('format', format);
        params.set('search', $('#stockSearchBox').val() || '');
        window.location.href = "<?= base_url('reports/exportClosingStockReport') ?>?" + params.toString();
    }

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

    function loadScriptOnce(src) {
        return new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    // Same fix as the other server-side-grid pages: this app's shared
    // layout loads its own older local DataTables build after this page's
    // content, silently overwriting the CDN 2.2.2 API. Re-loading 2.2.2
    // one more time after window.load makes it the active version before
    // the grid is built.
    $(window).on('load', function() {
        loadScriptOnce('https://cdn.datatables.net/2.2.2/js/dataTables.js')
            .then(function() {
                return loadScriptOnce('https://cdn.datatables.net/2.2.2/js/dataTables.bootstrap5.js');
            })
            .then(getStockReport)
            .catch(getStockReport);
    });
</script>
