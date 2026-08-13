<style type="text/css">
    /* No page-specific loading spinner here - relies entirely on the app's
       existing global one (#loadingimg, styled in Style-Light.css /
       Style-Dark1.css, faded out by app.js on window load). */

    .return_tr {
        background-color: red;
    }

    /* Same page-wrapper/content-area structure as the Products page
       (product/view.php) - this is what correctly contains the page inside
       the sidebar layout instead of drifting left. */
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

    .content-area.report-page > h3 {
        font-size: 18px;
        margin: 6px 0;
    }

    .content-area {
        flex: 1 1 auto;
        overflow: auto;
        padding: 0 10px;
    }
</style>

<link rel="stylesheet" href="https://cdn.datatables.net/2.2.2/css/dataTables.bootstrap5.css">
<link rel="stylesheet" type="text/css" href="<?php echo base_url(); ?>assets/new/example-styles.css">

<style type="text/css">
    input[type=checkbox] {
        display: block !important;
    }

    .multi-select-container {
        display: block !important;
    }

    /* Same reset the Products page (product/view.php) uses - this app's
       global CSS applies its own margin/padding to .container/.row that
       otherwise shifts content left inside the sidebar layout. */
    .container,
    .row {
        margin-left: 0 !important;
        margin-right: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
    }

    /* ---- Overall page ---- */
    .report-page {
        padding: 10px 14px;
    }

    .report-page h3 {
        margin: 0 0 10px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 19px;
    }

    /* ---- Filters left / grid right ----
       CSS Grid with a fixed-pixel sidebar column instead of percentage-
       based flex-basis: more predictable width resolution when nested
       inside the app's own position:absolute/calc()-sized .main wrapper,
       and immune to the sidebar's hover-to-expand margin animation
       shifting a percentage-based column's computed width mid-transition. */
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

    /* ---- Grand totals summary box ---- */
    .report-totals {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #eee;
    }

    .report-totals-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 5px 2px;
        font-size: 13px;
        color: #4b5563;
    }

    .report-totals-row b {
        font-variant-numeric: tabular-nums;
        color: #2b2f36;
    }

    .report-totals-grand {
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px solid #eee;
        font-size: 14px;
    }

    .report-totals-grand span,
    .report-totals-grand b {
        color: #1565c0;
        font-weight: 700;
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

    .report-grid table.dataTable {
        border-collapse: collapse;
    }

    /* Rows are plain white by default (no striping) - only the hover
       highlight below distinguishes a row. */
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

    /* Funnel filter icon next to each filterable header's title, same
       click-to-open-a-popup pattern as the Products page's grid. */
    .report-grid table.dataTable thead th .col-filter-icon {
        display: inline-block;
        margin-left: 6px;
        font-size: 11px;
        color: #9aa1ac;
        cursor: pointer;
        vertical-align: middle;
    }

    .report-grid table.dataTable thead th .col-filter-icon:hover {
        color: #2196F3;
    }

    .report-grid table.dataTable thead th .col-filter-icon.active {
        color: #2196F3;
    }

    /* The filter popup itself is appended directly to <body> (not nested
       inside the header cell) and positioned via JS-computed top/left -
       DataTables' scrollY mode wraps the header in a fixed-height,
       overflow:hidden container, so anything meant to float below a header
       cell has to live outside that container or it gets clipped/misplaced. */
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

    /* Direct background-color instead of the Bootstrap --bs-table-accent-bg
       custom property, which isn't reliably picked up once DataTables'
       own row/striping classes are in play - this guarantees the hover
       highlight actually shows regardless of that. */
    .report-grid table.dataTable tbody tr:hover>td {
        background-color: #e8f4fd !important;
    }

    /* Cancel/Return/Exchange invoice rows - distinct backgrounds. Declared
       after the hover rule above so it wins on the tied !important
       specificity, keeping the row's color visible even while hovered. */
    .report-grid table.dataTable tbody tr.row-type-cancel>td {
        background-color: #f8d7da !important;
    }

    .report-grid table.dataTable tbody tr.row-type-return>td {
        background-color: #ffe5b4 !important;
    }

    .report-grid table.dataTable tbody tr.row-type-exchange>td {
        background-color: #d7ebfa !important;
    }

    .txn-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .02em;
    }

    .txn-badge.txn-sales {
        background: #e3f6e5;
        color: #1e7e34;
    }

    .txn-badge.txn-cancel {
        background: #f5c2c7;
        color: #842029;
    }

    .txn-badge.txn-return {
        background: #ffdca0;
        color: #7a4a00;
    }

    .txn-badge.txn-exchange {
        background: #bfe3fa;
        color: #0c5279;
    }

    .report-grid .dt-num {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    .report-grid .dt-layout-row {
        margin-bottom: 8px;
    }

    /* Force-hide DataTables' own built-in length menu / info text /
       pagination controls - the layout:{topStart:null, bottomStart:null,
       bottomEnd:null} config asks DataTables not to render these, but this
       CSS guarantees they stay hidden even if that doesn't fully suppress
       them. Only the custom .grid-pagination-bar below should be visible. */
    .report-grid .dt-length,
    .report-grid .dt-info,
    .report-grid .dt-paging {
        display: none !important;
    }

    /* DataTables' own built-in "Processing..." overlay is suppressed too -
       this page relies solely on the app's global page-load spinner
       (#loadingimg), not a per-interaction indicator. */
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

    .grid-pagination-bar #gridPageInput:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, .3);
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

        .report-filters {
            margin-bottom: 10px;
        }
    }
</style>
<div class="page-wrapper">
    <div class="content-area report-page">
        <h3 style="background-color: <?= $setting->sales_type == 2 ? 'lightgreen' : ($setting->sales_type == 1 ? '#7ec9ff' : '#f5f5f5') ?>"><?= label("Sales"); ?> <?= label("Reports"); ?></h3>

    <div class="report-layout" style="display:grid; grid-template-columns:280px 1fr; align-items:start; gap:14px; width:100%; box-sizing:border-box;">
        <div class="report-filters" style="width:280px; box-sizing:border-box; overflow:visible;">
            <div class="report-filters-title">Filters</div>

            <div class="form-group">
                <div><?= label("Store"); ?></div>
                <select class="js-select-options form-control" id="store" name="store">
                    <option value="">All</option>
                    <?php foreach ($stores as $store): ?>
                        <option value="<?= $store->id; ?>"><?= $store->name; ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="form-group">
                <div><?= label("Customer"); ?></div>
                <select class="js-select-options form-control" id="supp" name="supp">
                    <option value="">All</option>
                    <option value="0"><?= label("WalkinCustomer"); ?></option>
                    <?php foreach ($customers as $customer): ?>
                        <option value="<?= $customer->id; ?>"><?= $customer->name; ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="form-group">
                <div><?= label("Fromdate"); ?></div>
                <input type="text" maxlength="30" Required="required" value="<?php echo date("d-m-Y", strtotime('-30 days')); ?>" name="pddate" class="form-control" id="pddate" placeholder="from Date">
            </div>

            <div class="form-group">
                <div><?= label("Tilldate"); ?></div>
                <input class="form-control" type="text" name="innvdda" id="innvdda" value="<?php echo date("d-m-Y"); ?>" placeholder="Till Date">
            </div>

            <div class="form-group">
                <div><?= label('paymentMethod'); ?></div>
                <select class="form-control" id="people" name="people">
                    <option value="">All</option>
                    <?php
                    $modes = db_connect()->table('payment_mode')->orderBy('id', 'ASC')->get()->getResult();
                    foreach ($modes as $mode): ?>
                        <option value="<?= esc($mode->id) ?>"><?= esc($mode->name) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="form-group">
                <div>Transaction Type</div>
                <select class="js-select-options form-control" id="txnType" name="txnType">
                    <option value="">All</option>
                    <option value="sales">Sales</option>
                    <option value="exchange">Exchange</option>
                    <option value="return">Return</option>
                    <option value="cancel">Cancel</option>
                </select>
            </div>

            <div class="form-group">
                <div><?= label("Date"); ?> <?= label("Type"); ?></div>
                <select class="js-select-options form-control" id="typeda" name="typeda">
                    <option value="1"><?= label("Daily"); ?></option>
                    <option value="2"><?= label("Monthly"); ?></option>
                </select>
            </div>

            <div class="form-group">
                <div><?= label("Type"); ?></div>
                <select class="js-select-options form-control" id="typess" name="typess">
                    <option value="1"><?= label("Detailed"); ?></option>
                    <option value="2"><?= label("Summary"); ?></option>
                </select>
            </div>

            <div class="report-actions">
                <a href="javascript:void(0);" class="btn btn-add hiddenpr" onclick="getSalesReport()"><?= label('Get'); ?></a>
                <a href="javascript:void(0)" class="btn btn-add hiddenpr" onclick="PrintTicket()">Print</a>
                <a href="javascript:void(0)" class="btn btn-add hiddenpr" onclick="exportSales('csv')">CSV</a>
                <a href="javascript:void(0)" class="btn btn-add hiddenpr" onclick="exportSales('xlsx')">Excel</a>

                <?php if ($setting->show_pdf_or_not == 1): ?>
                    <a href="#" class="btn btn-add hiddenpr" onclick="pdfreceipt()">PDF</a>
                <?php endif; ?>
            </div>

            <!-- Grand totals across the ENTIRE filtered date range (not just
                 the current grid page) - populated from the "totals" key
                 the grid's own AJAX response already returns, refreshed on
                 every draw (filter change, search, page turn). -->
            <div class="report-totals">
                <div class="report-totals-row">
                    <span>Sub Total</span>
                    <b id="totSubTotal">0.0</b>
                </div>
                <div class="report-totals-row">
                    <span>Sales</span>
                    <b id="totSales">0.0</b>
                </div>
                <div class="report-totals-row">
                    <span>Exchange</span>
                    <b id="totExchange">0.0</b>
                </div>
                <div class="report-totals-row">
                    <span>Return</span>
                    <b id="totReturn">0.0</b>
                </div>
                <div class="report-totals-row">
                    <span>Cancel</span>
                    <b id="totCancel">0.0</b>
                </div>
                <div class="report-totals-row report-totals-grand">
                    <span>Total</span>
                    <b id="totGrandTotal">0.0</b>
                </div>
            </div>
        </div>

        <div class="report-grid" style="width:100%; min-width:0; box-sizing:border-box;">
            <div class="modal-body" style="padding:0;">
                <div id="printSection">
                    <div id="custrrr">
                        <!-- Store name/address/report period: kept out of the on-screen
                             grid, rendered only in the Excel export via exportSalesReport(). -->
                        <table id="header_table" class="table" style="display:none;">
                            <thead>
                                <tr class="hideme" style="text-align:center;">
                                    <th style="text-align:center;"><?= esc($currentStore->name ?? '') ?></th>
                                </tr>
                                <?php
                                $addressParts = array_filter([
                                    trim(strip_tags($currentStore->adresse ?? '')),
                                    trim($currentStore->city ?? ''),
                                    trim($currentStore->phone ?? ''),
                                ]);
                                ?>
                                <?php if (!empty($addressParts)): ?>
                                    <tr class="hideme" style="text-align:center; ">
                                        <th style="text-align:center;"><?= esc(implode(', ', $addressParts)) ?></th>
                                    </tr>
                                <?php endif; ?>
                                <tr class="hideme" style="text-align:center; ">
                                    <th style="text-align:center;">Sales Reports from <span id="from_date"></span> Till <span id="to_date"></span></th>
                                </tr>
                            </thead>
                        </table>

                        <!-- Single shared grid: column headers are generated by
                             DataTables itself from the `columns` config on each
                             mode switch (see getSalesReport() below), rather than
                             from static markup here. That's what fixes the
                             header/column-width glitches that happen when a
                             table is initialised while its container is still
                             display:none. -->
                        <table id="salesGrid" class="table table-bordered w-100"></table>

                        <div class="grid-pagination-bar">
                            <div class="gpb-left">
                                <label for="gridPageSize">Page Size:</label>
                                <select id="gridPageSize">
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                    <option value="100" selected>100</option>
                                    <option value="200">200</option>
                                    <option value="500">500</option>
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
    </div>
    </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.datatables.net/2.2.2/js/dataTables.js"></script>
<script src="https://cdn.datatables.net/2.2.2/js/dataTables.bootstrap5.js"></script>

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
    });

    function currentFilters() {
        return {
            Range: $('#pddate').val(),
            Range1: $('#innvdda').val(),
            store: $('#store').val(),
            suppr: $('#supp').val(),
            selectedValues: $('#people').val(),
            txnType: $('#txnType').val(),
        };
    }

    var numFmt = $.fn.dataTable.render.number(',', '.', 2);

    function updateReportTotals(totals) {
        totals = totals || {
            subtotal: 0,
            sales: 0,
            exchange: 0,
            cancel: 0,
            return: 0,
            total: 0
        };
        $('#totSubTotal').text(numFmt.display(totals.subtotal));
        $('#totSales').text(numFmt.display(totals.sales));
        $('#totExchange').text(numFmt.display(totals.exchange));
        $('#totCancel').text(numFmt.display(totals.cancel));
        $('#totReturn').text(numFmt.display(totals.return));
        $('#totGrandTotal').text(numFmt.display(totals.total));
    }

    // Tax/Returns are intentionally not filterable (searchable: false) -
    // they're fetched in a separate lightweight lookup after pagination for
    // performance (see buildSalesDetailedQuery() on the server), so there's
    // no efficient SQL WHERE for them without undoing that fix.
    var DETAILED_COLUMNS = [
        { title: 'Bill No' },
        { title: 'Date' },
        { title: 'Store' },
        { title: 'Customer' },
        { title: 'Payment Mode' },
        { title: 'Subtotal', className: 'dt-num', render: numFmt },
        { title: 'Discount', className: 'dt-num', render: numFmt },
        { title: 'Tax', className: 'dt-num', render: numFmt, searchable: false },
        { title: 'Returns', className: 'dt-num', render: numFmt, searchable: false },
        { title: 'Net Total', className: 'dt-num', render: numFmt },
        { title: 'Paid', className: 'dt-num', render: numFmt },
        { title: 'Balance', className: 'dt-num', render: numFmt },
        {
            title: 'Status',
            orderable: false,
            searchable: false,
            render: function(data, type) {
                if (type !== 'display') {
                    return data;
                }
                var label = data ? data.charAt(0).toUpperCase() + data.slice(1) : 'Sales';
                return '<span class="txn-badge txn-' + data + '">' + label + '</span>';
            }
        },
    ];

    var SUMMARY_COLUMNS = [
        { title: 'Period' },
        { title: 'Invoices', className: 'dt-num' },
        { title: 'Subtotal', className: 'dt-num', render: numFmt },
        { title: 'Discount', className: 'dt-num', render: numFmt },
        { title: 'Tax', className: 'dt-num', render: numFmt, searchable: false },
        { title: 'Returns', className: 'dt-num', render: numFmt, searchable: false },
        { title: 'Net Total', className: 'dt-num', render: numFmt },
        { title: 'Paid', className: 'dt-num', render: numFmt },
        { title: 'Balance', className: 'dt-num', render: numFmt },
    ];

    // Small debounce so a column filter input doesn't fire a server
    // request on every keystroke.
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

    // Adds a funnel filter icon to each filterable column's header. Clicking
    // it opens a small floating popup (Search box + Filter button), the
    // same funnel-icon-opens-a-filter-popup pattern as the Products page's
    // grid, wired to that column's server-side search (DataTables'
    // standard columns[i][search][value] protocol).
    //
    // One popup element is created and reused for every column (appended
    // directly to <body>, positioned via .offset() at open time) rather
    // than one per header cell - DataTables' scrollY mode renders the
    // header inside a fixed-height, overflow:hidden wrapper, so a popup
    // living *inside* a header cell gets clipped/misplaced the moment it
    // extends past that wrapper's edge.
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
            e.stopPropagation(); // don't close the popup or trigger column sort
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

    // "Date Type" (Daily/Monthly) only affects Summary mode's grouping -
    // Detailed always lists every individual sale in the picked date
    // range, so grey the control out in Detailed mode instead of
    // leaving it visible but silently doing nothing.
    function syncDateTypeAvailability() {
        var isSummary = $('#typess').val() == 2;
        $('#typeda').prop('disabled', !isSummary);
    }
    $('#typess').on('change', syncDateTypeAvailability);

    // Custom "Page Size / X to Y of Z / First-Prev-[page]-Next-Last" bar,
    // matching the pagination style already used elsewhere in this app,
    // instead of DataTables' default numbered page-link list.
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

    function getSalesReport() {
        $('#from_date').html($('#pddate').val());
        $('#to_date').html($('#innvdda').val());
        syncDateTypeAvailability();

        var typess = $('#typess').val(); // 1 = Detailed, 2 = Summary
        var typeda = $('#typeda').val(); // 1 = Daily, 2 = Monthly
        var group = (typeda == 2) ? 'monthly' : 'daily';
        var isSummary = typess == 2;

        if ($.fn.DataTable.isDataTable('#salesGrid')) {
            $('#salesGrid').DataTable().destroy();
            $('#salesGrid').empty();
        }

        var table = $('#salesGrid').DataTable({
            processing: true,
            serverSide: true,
            destroy: true,
            columns: isSummary ? SUMMARY_COLUMNS : DETAILED_COLUMNS,
            order: [
                [isSummary ? 0 : 1, 'desc']
            ],
            // Grid-style paging: bigger default page size + a fixed-height
            // scroll area with a sticky header (same visual pattern as the
            // Products page), instead of small 10-row pages.
            pageLength: parseInt($('#gridPageSize').val(), 10) || 100,
            scrollY: '68vh',
            scrollCollapse: true,
            deferRender: true,
            // Only the search box in DataTables' own layout - length menu,
            // info text and pagination are all handled by the custom
            // .grid-pagination-bar below instead.
            // "frt" = filter (search box) + processing indicator + table
            // only. Deliberately using the older `dom` option here instead
            // of `layout` - it's the more reliably-behaved way to fully
            // suppress DataTables' own length menu / info text / pagination
            // markup (which the custom .grid-pagination-bar replaces).
            dom: 'frt',
            ajax: {
                url: isSummary ?
                    "<?= base_url('reports/getSalesReportSummary') ?>" :
                    "<?= base_url('reports/getSalesReportDetailed') ?>",
                type: "POST",
                data: function(d) {
                    Object.assign(d, currentFilters());
                    if (isSummary) {
                        d.group = group;
                    }
                },
                // Grand totals (Sub Total/Cancel/Return/Total) come back
                // alongside the page's rows on every request - dataSrc is
                // the one hook that sees the full response, so update the
                // summary box here and hand the rows off as normal.
                dataSrc: function(json) {
                    updateReportTotals(json.totals);
                    return json.data;
                }
            },
            // Highlight Cancel/Return/Exchange rows (Detailed mode only -
            // the last column is the Status value, e.g. "cancel"). Summary
            // rows aggregate a whole day/month at once, so there's no
            // single type to highlight there.
            createdRow: function(row, data) {
                if (!isSummary) {
                    var rowType = data[data.length - 1];
                    if (rowType && rowType !== 'sales') {
                        $(row).addClass('row-type-' + rowType);
                    }
                }
            }
        });

        wireGridPagination(table);
        wireColumnFilters(table);
    }

    function exportSales(format) {
        var typess = $('#typess').val();
        var typeda = $('#typeda').val();
        var params = new URLSearchParams(currentFilters());
        params.set('format', format);
        params.set('mode', typess == 2 ? 'summary' : 'detailed');
        params.set('group', typeda == 2 ? 'monthly' : 'daily');
        window.location.href = "<?= base_url('reports/exportSalesReport') ?>?" + params.toString();
    }
</script>

<script type="text/javascript">
    $(document).ready(function() {
        $('#pddate').datepicker({
            todayHighlight: true,
            autoclose: true
        });
        $('#innvdda').datepicker({
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

    // This app's shared layout (layouts/application.php) loads its own,
    // much older local copy of DataTables *after* this page's content -
    // meaning by the time window.load fires, that older build has silently
    // overwritten $.fn.DataTable/$.fn.dataTable, and every DataTable on
    // this page would actually be running the old engine (different
    // internal markup/classes, no `layout` option support) despite the
    // CDN 2.2.2 script tags above. Re-loading 2.2.2 one more time here,
    // after everything else has finished loading, makes it the last
    // (and therefore active) version, and only then is the grid built.
    $(window).on('load', function() {
        loadScriptOnce('https://cdn.datatables.net/2.2.2/js/dataTables.js')
            .then(function() {
                return loadScriptOnce('https://cdn.datatables.net/2.2.2/js/dataTables.bootstrap5.js');
            })
            .then(function() {
                syncDateTypeAvailability();
                getSalesReport();
            })
            .catch(function() {
                // Fall back to whatever DataTables build is active rather
                // than leaving the grid uninitialised.
                syncDateTypeAvailability();
                getSalesReport();
            });
    });
</script>
