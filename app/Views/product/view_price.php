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

    /* ---- Filters left / grid right ---- */
    .price-layout {
        display: grid;
        grid-template-columns: 280px 1fr;
        align-items: start;
        gap: 14px;
        width: 100%;
        box-sizing: border-box;
    }

    .price-filters {
        width: 280px;
        box-sizing: border-box;
        background: #fff;
        border: 1px solid #babfc7;
        border-radius: 8px;
        padding: 12px;
    }

    .price-filters-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .04em;
        color: #6b7280;
        margin-bottom: 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid #eee;
    }

    .price-filters .form-group {
        margin-bottom: 10px;
    }

    .price-filters .form-group>label,
    .price-filters .form-group>div:first-child {
        font-weight: 600;
        font-size: 11.5px;
        color: #444;
        margin-bottom: 2px;
    }

    .price-filters .form-control,
    .price-filters select,
    .price-filters input[type=text] {
        width: 100%;
        box-sizing: border-box;
        height: 32px;
        padding: 4px 8px;
        font-size: 13px;
        border: 1px solid #babfc7;
        border-radius: 4px;
    }

    .price-actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #eee;
    }

    .price-actions .btn {
        width: 100%;
    }

    .price-actions .btn-save {
        background: #2196F3;
        border-color: #2196F3;
        color: #fff;
        font-weight: 600;
    }

    /* ---- Grid panel ---- */
    .price-grid-panel {
        width: 100%;
        box-sizing: border-box;
        background: #fff;
        border: 1px solid #babfc7;
        border-radius: 8px;
        padding: 10px 12px;
    }

    .price-grid-panel .grid-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 10px;
    }

    .price-grid-panel .grid-search {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .price-grid-panel .grid-search input {
        height: 34px;
        padding: 4px 10px;
        border: 1px solid #babfc7;
        border-radius: 4px;
        font-size: 13px;
        min-width: 220px;
    }

    .price-grid-panel table.dataTable {
        border-collapse: collapse;
    }

    .price-grid-panel table.dataTable thead th {
        background: #f8f8f8;
        color: #4b5563;
        font-weight: 600;
        white-space: nowrap;
        border-bottom: 2px solid #babfc7 !important;
        vertical-align: top;
    }

    .price-grid-panel table.dataTable thead th .col-filter-icon {
        display: inline-block;
        margin-left: 6px;
        font-size: 11px;
        color: #9aa1ac;
        cursor: pointer;
        vertical-align: middle;
    }

    .price-grid-panel table.dataTable thead th .col-filter-icon:hover,
    .price-grid-panel table.dataTable thead th .col-filter-icon.active {
        color: #2196F3;
    }

    .price-grid-panel table.dataTable tbody tr>td {
        background-color: #fff;
        white-space: nowrap;
        color: #2b2f36;
    }

    .price-grid-panel table.dataTable tbody tr:hover>td {
        background-color: #e8f4fd !important;
    }

    .price-grid-panel .dt-num {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    .price-grid-panel .update-price-input {
        width: 100px;
        box-sizing: border-box;
        text-align: right;
        padding: 4px 6px;
        border: 1px solid #babfc7;
        border-radius: 4px;
    }

    .price-grid-panel .update-price-input.changed {
        border-color: #2196F3;
        background: #e8f4fd;
        font-weight: 600;
    }

    .price-grid-panel .dt-length,
    .price-grid-panel .dt-info,
    .price-grid-panel .dt-paging {
        display: none !important;
    }

    .price-grid-panel .dt-processing,
    .price-grid-panel .dataTables_processing,
    .price-grid-panel [id$="_processing"] {
        display: none !important;
    }

    /* The app's global theme (Style-Light.css) hides ALL native
       checkboxes (display:none) and expects a ".label-text" sibling to
       draw a custom icon in its place. This grid's row-select checkboxes
       don't use that pattern, so they'd otherwise be invisible - force
       them back to plain native checkboxes, scoped to this page only. */
    .price-grid-panel input[type=checkbox] {
        display: inline-block !important;
        width: 16px;
        height: 16px;
        margin: 0;
        vertical-align: middle;
        cursor: pointer;
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

<div class="page-wrapper">
    <div class="content-area">
        <div class="container">
            <h3><?= label('price_price') ?></h3>
            <hr>

            <div class="price-layout">
                <div class="price-filters">
                    <div class="price-filters-title">Filters</div>

                    <div class="form-group">
                        <div>Supplier</div>
                        <select id="priceSupplier">
                            <option value="">All</option>
                            <?php foreach ($suppliers as $supplier): ?>
                                <option value="<?= esc($supplier->id) ?>"><?= esc($supplier->name) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="form-group">
                        <div><?= label('price_method') ?></div>
                        <select id="prince_mas">
                            <option value="0">Store</option>
                            <?php
                            $prices = db_connect()->table('price_master')->orderBy('name', 'ASC')->get()->getResultArray();
                            foreach ($prices as $price): ?>
                                <option value="<?= esc($price['id']) ?>"><?= esc($price['name']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="form-group">
                        <div>Price % Adjustment (current page)</div>
                        <input type="text" id="pricePercent" maxlength="6" value="0" placeholder="e.g. 5 or -10">
                    </div>

                    <div class="price-actions">
                        <button type="button" class="btn btn-default" onclick="applyPercentToPage()">Apply % to Selected</button>
                        <button type="button" class="btn btn-save" onclick="savePricesOnPage()">Save Selected Prices</button>
                    </div>
                    <p style="font-size:11.5px;color:#6b7280;margin-top:8px;">
                        Tick the checkbox for the product(s) to update, or just
                        edit a row's "Update Price" box (it auto-selects that
                        row), then Save. "Apply %" affects checked rows, or
                        every row on this page if none are checked. Selection
                        and Save are scoped to the current page only
                        (server-side pagination) - page through and repeat
                        for other pages.
                    </p>
                </div>

                <div class="price-grid-panel">
                    <div class="grid-toolbar">
                        <div></div>
                        <div class="grid-search">
                            <label for="priceSearchBox">Search:</label>
                            <input type="text" id="priceSearchBox" placeholder="Search products...">
                        </div>
                    </div>

                    <table id="priceGrid" class="table table-bordered w-100"></table>

                    <div class="grid-pagination-bar">
                        <div class="gpb-left">
                            <label for="gridPageSize">Page Size:</label>
                            <select id="gridPageSize">
                                <option value="10">10</option>
                                <option value="25" selected>25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
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

<!-- Barcode print modal (same pattern as Products page) -->
<div class="modal fade" id="barcode" tabindex="-1" role="dialog" aria-labelledby="barcodeModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h4 class="modal-title">Print Barcode</h4>
                <button type="button" class="close" data-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Rows</label>
                    <input type="text" id="Brrows" class="form-control" value="1">
                </div>
                <div class="form-group">
                    <label>Labels per row</label>
                    <input type="text" id="Brnum" class="form-control" value="1">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" onclick="barcodeWithUpdatedPrice()">Print</button>
            </div>
        </div>
    </div>
</div>

<link rel="stylesheet" href="https://cdn.datatables.net/2.2.2/css/dataTables.bootstrap5.css">
<script src="https://cdn.datatables.net/2.2.2/js/dataTables.js"></script>
<script src="https://cdn.datatables.net/2.2.2/js/dataTables.bootstrap5.js"></script>

<script>
    var base_url = '<?= base_url() ?>';
    var numFmt = $.fn.dataTable.render.number(',', '.', 2);
    var productBcode = 0;
    var productBcodePrice = 0;

    var PRICE_COLUMNS = [
        {
            title: '<input type="checkbox" id="selectAllRows" title="Select all rows on this page">',
            data: null,
            orderable: false,
            searchable: false,
            className: 'dt-num',
            render: function(data, type, row) {
                if (type !== 'display') {
                    return '';
                }
                return '<input type="checkbox" class="row-select-checkbox" data-id="' + row[0] + '">';
            }
        },
        { title: 'ID', data: 0 },
        { title: 'Code', data: 1 },
        { title: 'Name', data: 2 },
        { title: 'Price', data: 3, className: 'dt-num', render: numFmt },
        {
            title: 'Update Price',
            data: 4,
            className: 'dt-num',
            orderable: false,
            searchable: false,
            render: function(data, type, row) {
                if (type !== 'display') {
                    return data;
                }
                return '<input type="text" class="update-price-input" data-id="' + row[0] + '" data-original="' + row[3] + '" value="' + data + '">';
            }
        },
        {
            title: 'Last Updated Price',
            data: 5,
            searchable: true,
            className: 'dt-num',
            render: function(data, type, row) {
                if (type !== 'display') {
                    return data;
                }
                // No price-history table exists, so the "value" it was
                // last updated to is simply the current stored price -
                // shown alongside the timestamp from products.attime.
                var priceVal = numFmt.display(row[3]);
                var when = data ? data : '-';
                return priceVal + '<br><span style="color:#6b7280;font-size:11px;">' + when + '</span>';
            }
        },
        {
            title: 'Actions',
            data: null,
            orderable: false,
            searchable: false,
            render: function(data, type, row) {
                var id = row[0];
                return '<a href="javascript:void(0)" data-toggle="modal" data-target="#barcode" ' +
                    'onclick="openBarcodeFor(' + id + ')" title="Print barcode with updated price">' +
                    '<i class="fa fa-barcode"></i></a>';
            }
        },
    ];

    function openBarcodeFor(id) {
        productBcode = id;
        var $input = $('.update-price-input[data-id="' + id + '"]');
        productBcodePrice = $input.length ? parseFloat($input.val()) : 0;
    }

    function barcodeWithUpdatedPrice() {
        var row = $('#Brrows').val();
        var num = $('#Brnum').val();
        var params = new URLSearchParams({
            price: productBcodePrice
        });
        var urld = base_url + '/printbarcodes/productlabel/' + productBcode + '/' + row + '/' + num + '?' + params.toString();
        window.open(urld);
    }

    function debouncePrice(fn, wait) {
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

    function getColFilterPopupPrice() {
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
        $(document).off('click.colFilterClosePrice').on('click.colFilterClosePrice', function() {
            $popup.hide();
        });

        return $popup;
    }

    function wirePriceColumnFilters(table) {
        var $popup = getColFilterPopupPrice();
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

    function wirePriceGridPagination(table) {
        function refresh() {
            // Selection is page-scoped (checkboxes for rows not currently
            // rendered can't persist), so every redraw starts unchecked.
            $('#selectAllRows').prop('checked', false);

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

    function computeGridScrollY() {
        var $panel = $('.price-grid-panel');
        var top = $panel.length ? $panel.offset().top : 200;
        var reserved = 220;
        var available = $(window).height() - top - reserved;
        return Math.max(300, available) + 'px';
    }

    var priceTable;

    function initPriceGrid() {
        if ($.fn.DataTable.isDataTable('#priceGrid')) {
            $('#priceGrid').DataTable().destroy();
            $('#priceGrid').empty();
        }

        priceTable = $('#priceGrid').DataTable({
            processing: true,
            serverSide: true,
            destroy: true,
            columns: PRICE_COLUMNS,
            order: [
                [3, 'asc']
            ],
            pageLength: parseInt($('#gridPageSize').val(), 10) || 25,
            scrollY: computeGridScrollY(),
            deferRender: true,
            dom: 'rt',
            ajax: {
                url: base_url + '/ProductsPrice/datatableList',
                type: 'POST',
                data: function(d) {
                    d.supplier = $('#priceSupplier').val();
                }
            }
        });

        wirePriceGridPagination(priceTable);
        wirePriceColumnFilters(priceTable);

        $('#priceSearchBox').val(priceTable.search());
        $('#priceSearchBox').off('keyup change').on('keyup change', debouncePrice(function() {
            priceTable.search(this.value).draw();
        }, 400));

        $('#priceSupplier').off('change').on('change', function() {
            priceTable.draw();
        });

        // Mark "Update Price" boxes that differ from the row's original
        // price, so it's visually obvious which rows have pending edits -
        // and auto-check that row's checkbox, so editing a single price is
        // by itself enough to include it in Save (no separate select step
        // required for the common "change just one product" case).
        $('#priceGrid').off('input.priceChange').on('input.priceChange', '.update-price-input', function() {
            var original = parseFloat($(this).data('original'));
            var current = parseFloat($(this).val());
            var changed = !isNaN(current) && current !== original;
            $(this).toggleClass('changed', changed);
            if (changed) {
                $(this).closest('tr').find('.row-select-checkbox').prop('checked', true);
            }
        });

        // Row checkboxes + header "select all" (scoped to the current page,
        // consistent with every other bulk action on this grid).
        $('#priceGrid').off('change.rowSelect').on('change.rowSelect', '.row-select-checkbox', function() {
            var allChecked = $('.row-select-checkbox').length > 0 &&
                $('.row-select-checkbox:checked').length === $('.row-select-checkbox').length;
            $('#selectAllRows').prop('checked', allChecked);
        });
        $(document).off('change.selectAllRows').on('change.selectAllRows', '#selectAllRows', function() {
            $('.row-select-checkbox').prop('checked', $(this).is(':checked'));
        });
    }

    function getSelectedRowIds() {
        var ids = [];
        $('.row-select-checkbox:checked').each(function() {
            ids.push(parseInt($(this).data('id'), 10));
        });
        return ids;
    }

    function applyPercentToPage() {
        var pct = parseFloat($('#pricePercent').val());
        if (isNaN(pct)) {
            return;
        }
        var selectedIds = getSelectedRowIds();
        var scopeToSelection = selectedIds.length > 0;

        $('.update-price-input').each(function() {
            var id = parseInt($(this).data('id'), 10);
            if (scopeToSelection && selectedIds.indexOf(id) === -1) {
                return;
            }
            var original = parseFloat($(this).data('original'));
            if (isNaN(original)) {
                return;
            }
            var updated = original + (original * pct * 0.01);
            $(this).val(updated.toFixed(2)).trigger('input');
            if (!scopeToSelection) {
                $(this).closest('tr').find('.row-select-checkbox').prop('checked', true);
            }
        });
    }

    function savePricesOnPage() {
        var selectedIds = getSelectedRowIds();
        if (!selectedIds.length) {
            alert('Select at least one product (checkbox) or edit its price, then Save.');
            return;
        }
        var updates = [];
        $('.update-price-input').each(function() {
            var id = parseInt($(this).data('id'), 10);
            var price = parseFloat($(this).val());
            if (selectedIds.indexOf(id) === -1) {
                return;
            }
            if (id > 0 && !isNaN(price) && price >= 0) {
                updates.push({
                    id: id,
                    price: price
                });
            }
        });
        if (!updates.length) {
            return;
        }
        $.ajax({
            url: base_url + '/ProductsPrice/savePrices',
            type: 'POST',
            data: {
                updates: updates
            },
            success: function(res) {
                if (res && res.status) {
                    alert('Saved ' + res.saved + ' product(s).');
                    priceTable.ajax.reload(null, false);
                } else {
                    alert('Save failed.');
                }
            },
            error: function() {
                alert('Save failed.');
            }
        });
    }

    function loadScriptOncePrice(src) {
        return new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    // Same fix as the Sales Report / Products grids: this app's shared
    // layout loads its own older local DataTables build after this page's
    // content, silently overwriting the CDN 2.2.2 API. Re-loading 2.2.2
    // one more time after window.load makes it the active version before
    // the grid is built.
    $(window).on('load', function() {
        loadScriptOncePrice('https://cdn.datatables.net/2.2.2/js/dataTables.js')
            .then(function() {
                return loadScriptOncePrice('https://cdn.datatables.net/2.2.2/js/dataTables.bootstrap5.js');
            })
            .then(initPriceGrid)
            .catch(initPriceGrid);
    });
</script>
