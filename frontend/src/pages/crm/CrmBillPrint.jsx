import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import { usePrintContext } from "../../context/PrintContext";

const BILL_COLUMNS = [
  { key: "location", label: "Location" },
  { key: "counter", label: "Counter" },
  { key: "customerName", label: "Customer Name" },
  { key: "mobileNo", label: "Mobile No" },
  { key: "gstNo", label: "GST" },
  { key: "billNo", label: "Bill No" },
  { key: "billDate", label: "Bill Date" },
  { key: "billValue", label: "Bill Value" },
  { key: "printedStatus", label: "Printed" },
];
const PRINTED_STATUS_STORAGE_KEY = "crm.bill_print.printed_orders";

const toText = (value, fallback = "--") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
};

const toMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return toText(value);
  return date.toLocaleDateString("en-GB");
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const mapBillRow = (row, isPrinted = false) => ({
  id: row.id,
  location: toText(row.location?.name),
  counter: toText(row.counter?.name),
  customerName: toText(row.customer_name || row.customer?.name),
  mobileNo: toText(row.customer_mobile || row.customer?.mobile_no),
  gstNo: toText(row.customer?.gst_no),
  billNo: toText(row.order_no),
  billDate: toText(row.order_date),
  billValue: toMoney(row.total_amount),
  printedStatus: isPrinted ? "Printed" : "Not Printed",
});

const buildReceiptHtml = (order = {}) => {
  const companyName = toText(order.company?.name, "Company");
  const items = Array.isArray(order.items) ? order.items : [];
  const totalAmount = Number(order.total_amount || 0);
  const totalQty = Number(order.total_qty || 0);

  const rowsHtml = items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(toText(item.product_name || item.product?.name, "-"))}</td>
        <td class="num">${escapeHtml(Number(item.qty || 0).toFixed(3))}</td>
        <td class="num">${escapeHtml(Number(item.price || 0).toFixed(2))}</td>
        <td class="num">0%</td>
        <td class="num">${escapeHtml(Number(item.amount || 0).toFixed(2))}</td>
      </tr>
    `
    )
    .join("");

  return `
    <html>
      <head>
        <title>Receipt #${escapeHtml(toText(order.order_no))}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 12px; color: #111; }
          .receipt { width: 300px; margin: 0 auto; font-size: 12px; }
          .center { text-align: center; }
          .title { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
          .meta { margin-top: 8px; margin-bottom: 8px; }
          .line { border-top: 1px dashed #222; margin: 7px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { padding: 3px 2px; border-bottom: 1px solid #e2e8f0; text-align: left; }
          th { font-size: 10px; color: #374151; }
          .num { text-align: right; white-space: nowrap; }
          .totals { margin-top: 8px; font-size: 12px; }
          .totals-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .grand { font-weight: 700; font-size: 14px; }
          .footer-note { text-align: center; margin-top: 10px; font-size: 11px; line-height: 1.35; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="center title">${escapeHtml(companyName)}</div>
          <div class="meta">
            <div>Sale No: <b>${escapeHtml(toText(order.order_no))}</b></div>
            <div>Date: <b>${escapeHtml(formatDate(order.order_date))}</b></div>
            <div>Cashier: <b>${escapeHtml(toText(order.receivedBy?.name))}</b></div>
            <div>Customer: <b>${escapeHtml(toText(order.customer_name || order.customer?.name))}</b></div>
          </div>
          <div class="line"></div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th class="num">QTY</th>
                <th class="num">Rate</th>
                <th class="num">Tax</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="5" class="center">No items</td></tr>'}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row"><span>Total Qty</span><b>${escapeHtml(totalQty.toFixed(3))}</b></div>
            <div class="totals-row grand"><span>Grand Total</span><span>Rs.${escapeHtml(totalAmount.toFixed(2))}</span></div>
          </div>
          <div class="footer-note">
            Thank you for shopping with us.<br />
            Goods once sold cannot be exchanged without bill.
          </div>
        </div>
      </body>
    </html>
  `;
};

const buildInvoiceHtml = (order = {}) => {
  const companyName = toText(order.company?.name, "Company");
  const items = Array.isArray(order.items) ? order.items : [];
  const totalAmount = Number(order.total_amount || 0);
  const customerName = toText(order.customer_name || order.customer?.name);
  const customerMobile = toText(order.customer_mobile || order.customer?.mobile_no);
  const customerGst = toText(order.customer?.gst_no);
  const customerAddress = toText(order.customer_address || order.customer?.address);
  const companyGst = toText(order.company?.gst_no || order.company?.gstin, "");
  const companyPan = toText(order.company?.tan_pan || order.company?.pan, "");

  const rowsHtml = items
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(toText(item.hsn_code || "-", "-"))}</td>
        <td>${escapeHtml(toText(item.barcode || "-", "-"))}</td>
        <td>${escapeHtml(toText(item.product_name || item.product?.name, "-"))}</td>
        <td class="num">0</td>
        <td class="num">${escapeHtml(Number(item.price || 0).toFixed(2))}</td>
        <td class="num">${escapeHtml(Number(item.qty || 0).toFixed(3))}</td>
        <td class="num">0.00</td>
        <td class="num">${escapeHtml(Number(item.amount || 0).toFixed(2))}</td>
      </tr>
    `
    )
    .join("");

  const fillerRows = Math.max(0, 20 - items.length);
  const fillerHtml = Array.from({ length: fillerRows })
    .map(
      () => `
      <tr>
        <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>
    `
    )
    .join("");

  return `
    <html>
      <head>
        <title>Invoice #${escapeHtml(toText(order.order_no))}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 18px; color: #111827; }
          .sheet { width: 100%; max-width: 980px; margin: 0 auto; }
          .top-title { text-align: center; font-size: 24px; font-weight: 700; margin-bottom: 6px; }
          .row { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 8px; }
          .cell { flex: 1; font-size: 13px; }
          .label { color: #374151; margin-right: 6px; font-weight: 700; }
          .invoice-title { text-align: center; font-weight: 700; font-size: 20px; margin: 12px 0; }
          .border-line { border-top: 1px solid #111827; margin: 8px 0 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #111827; padding: 5px 6px; text-align: left; }
          th { background: #f3f4f6; font-size: 11px; }
          .num { text-align: right; white-space: nowrap; }
          .totals { margin-top: 10px; margin-left: auto; width: 320px; font-size: 13px; }
          .totals-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .grand { font-size: 16px; font-weight: 700; border-top: 1px solid #111827; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="top-title">${escapeHtml(companyName)}</div>
          <div class="row">
            <div class="cell">
              ${companyGst ? `<div><span class="label">GSTIN</span> ${escapeHtml(companyGst)}</div>` : ""}
              ${companyPan ? `<div><span class="label">PAN</span> ${escapeHtml(companyPan)}</div>` : ""}
            </div>
            <div class="cell" style="text-align:right;">
              <div><span class="label">Bill No</span> ${escapeHtml(toText(order.order_no))}</div>
              <div><span class="label">Bill Date</span> ${escapeHtml(formatDate(order.order_date))}</div>
            </div>
          </div>
          <div class="border-line"></div>

          <div class="invoice-title">SALES INVOICE</div>
          <div class="row">
            <div class="cell">
              <div><span class="label">Customer Name</span> ${escapeHtml(customerName)}</div>
              <div><span class="label">Mobile No</span> ${escapeHtml(customerMobile)}</div>
              <div><span class="label">GST No</span> ${escapeHtml(customerGst)}</div>
              <div><span class="label">Address</span> ${escapeHtml(customerAddress)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:55px;">S.No</th>
                <th style="width:90px;">HSN</th>
                <th style="width:120px;">BARCODE</th>
                <th>ITEMS</th>
                <th style="width:70px;" class="num">TAX</th>
                <th style="width:80px;" class="num">RATE</th>
                <th style="width:80px;" class="num">QTY</th>
                <th style="width:80px;" class="num">DISC</th>
                <th style="width:110px;" class="num">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || ""}
              ${fillerHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row"><span>Total Qty</span><b>${escapeHtml(Number(order.total_qty || 0).toFixed(3))}</b></div>
            <div class="totals-row"><span>Paid</span><b>${escapeHtml(Number(order.paid_amount || 0).toFixed(2))}</b></div>
            <div class="totals-row"><span>Balance</span><b>${escapeHtml(Number(order.balance_amount || 0).toFixed(2))}</b></div>
            <div class="totals-row grand"><span>Invoice Value</span><span>Rs.${escapeHtml(totalAmount.toFixed(2))}</span></div>
          </div>
        </div>
      </body>
    </html>
  `;
};

const CrmBillPrint = () => {
  const navigate = useNavigate();
  const { printHtml } = usePrintContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [serverSearch, setServerSearch] = useState({
    query: "",
    field: "all",
    fetchAll: false,
  });
  const [printedMap, setPrintedMap] = useState(() => {
    try {
      const raw = localStorage.getItem(PRINTED_STATUS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const printedMapRef = useRef(printedMap);
  const [openPrintMenu, setOpenPrintMenu] = useState(null);
  const [printingId, setPrintingId] = useState(null);

  useEffect(() => {
    printedMapRef.current = printedMap;
  }, [printedMap]);

  useEffect(() => {
    const closeMenu = () => setOpenPrintMenu(null);
    const handleDocClick = (event) => {
      if (!event.target?.closest?.("[data-bill-print-menu]")) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handleDocClick);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  const markOrderAsPrinted = useCallback((orderId) => {
    const key = String(orderId || "");
    if (!key) return;

    setPrintedMap((prev) => {
      if (prev[key]) return prev;
      const next = { ...prev, [key]: true };
      try {
        localStorage.setItem(PRINTED_STATUS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });

    setRows((prev) =>
      prev.map((row) => (String(row.id) === key ? { ...row, printedStatus: "Printed" } : row))
    );
  }, []);

  const fetchBills = useCallback(
    async (
      pageToLoad = page,
      limitToLoad = limit,
      fetchAll = false,
      query = serverSearch.query,
      field = serverSearch.field
    ) => {
      try {
        setLoading(true);
        const trimmedQuery = String(query || "").trim();
        const shouldFetchAll = fetchAll || trimmedQuery !== "";
        const params = shouldFetchAll
          ? {
              all: "true",
              search: trimmedQuery || undefined,
              field: field && field !== "all" ? field : undefined,
            }
          : { page: pageToLoad, limit: limitToLoad };

        const res = await api.get("/customer-orders", { params });
        const tableRows = (res.data?.data || []).map((row) =>
          mapBillRow(row, !!printedMapRef.current[String(row.id)])
        );
        setRows(tableRows);

        if (shouldFetchAll || !res.data?.pagination) {
          setPagination({ total: tableRows.length, totalPages: 1 });
        } else {
          const p = res.data.pagination;
          setPagination({
            total: Number(p.total) || 0,
            totalPages: Math.max(Number(p.totalPages) || 1, 1),
          });
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load customer bills");
      } finally {
        setLoading(false);
      }
    },
    [page, limit, serverSearch]
  );

  useEffect(() => {
    const hasSearch = String(serverSearch.query || "").trim() !== "";
    fetchBills(page, limit, hasSearch || serverSearch.fetchAll, serverSearch.query, serverSearch.field);
  }, [fetchBills, page, limit, serverSearch]);

  const handlePrint = async (row, type) => {
    try {
      setPrintingId(row.id);
      setOpenPrintMenu(null);
      const res = await api.get(`/customer-orders/${row.id}`);
      const order = res.data?.data;
      if (!order) {
        toast.error("Order data not found");
        return;
      }

      if (type === "invoice") {
        const html = buildInvoiceHtml(order);
        const jobId = printHtml(html, {
          label: `Invoice-${toText(order.order_no, row.billNo)}`,
          docType: "crm_invoice",
          companyId: Number(order.company_id || order.company?.id || 0) || undefined,
          copies: 1,
        });
        if (jobId) markOrderAsPrinted(row.id);
        return;
      }

      const html = buildReceiptHtml(order);
      const jobId = printHtml(html, {
        label: `Receipt-${toText(order.order_no, row.billNo)}`,
        docType: "crm_receipt",
        companyId: Number(order.company_id || order.company?.id || 0) || undefined,
        copies: 1,
        receiptData: {
          storeName: toText(order.company?.name, "Store"),
          storeAddress: toText(order.company?.address, ""),
          storePhone: toText(order.company?.mobile_no || order.company?.phone, ""),
          billNo: toText(order.order_no),
          dateTime: order.order_date || new Date().toISOString(),
          cashierName: toText(order.receivedBy?.name, ""),
          items: (order.items || []).map((item) => ({
            name: toText(item.product_name || item.product?.name, ""),
            qty: Number(item.qty || 0),
            rate: Number(item.price || 0),
            amount: Number(item.amount || 0),
            code: toText(item.barcode || item.code, ""),
          })),
          subTotal: Number(order.total_amount || 0),
          taxAmount: 0,
          total: Number(order.total_amount || 0),
          paidAmount: Number(order.paid_amount || 0),
          changeAmount: 0,
          paymentMethod: "",
          footerNote: "Thank you!",
        },
      });
      if (jobId) markOrderAsPrinted(row.id);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to print bill");
    } finally {
      setPrintingId(null);
    }
  };

  const visibleColumns = useMemo(() => BILL_COLUMNS, []);

  return (
    <div className="min-h-[70vh] bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <div className="flex justify-between items-center px-4 py-1 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/crm")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              CRM
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Bill Print</span>
          </h1>
        </div>
      </div>

      <div className="p-3 pb-16">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-5 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold mb-3">Bill Print Search</h2>
          <FilterableDataTable
            rows={rows}
            columns={visibleColumns}
            loading={loading}
            emptyText="No customer bills found. Click Search to load data."
            searchPlaceholder="Search customer bills..."
            enableColumnResize
            tablePreferenceKey="crm.bill_print.list"
            onRefresh={() =>
              fetchBills(
                1,
                limit,
                String(serverSearch.query || "").trim() !== "" || serverSearch.fetchAll,
                serverSearch.query,
                serverSearch.field
              )
            }
            refreshDisabled={loading}
            page={page}
            limit={limit}
            totalPages={pagination.totalPages}
            totalRows={pagination.total}
            onPageChange={setPage}
            onLimitChange={(v) => {
              setLimit(v);
              setPage(1);
            }}
            paginationMode="server"
            enableServerSearch
            onServerSearch={({ query, field, fetchAll }) => {
              const next = {
                query: String(query || "").trim(),
                field: field || "all",
                fetchAll: !!fetchAll,
              };
              setServerSearch((prev) => {
                if (
                  prev.query === next.query
                  && prev.field === next.field
                  && prev.fetchAll === next.fetchAll
                ) {
                  return prev;
                }
                return next;
              });
              if (page !== 1) setPage(1);
            }}
            onExportRows={async ({ query, field }) => {
              const params = { all: "true" };
              const trimmed = String(query || "").trim();
              if (trimmed) params.search = trimmed;
              if (field && field !== "all") params.field = field;
              const res = await api.get("/customer-orders", { params });
              return (res.data?.data || []).map((row) =>
                mapBillRow(row, !!printedMapRef.current[String(row.id)])
              );
            }}
            renderActions={(row) => (
              <div className="relative" data-bill-print-menu>
                <button
                  type="button"
                  className="glass-btn glass-btn-primary inline-flex items-center gap-1 disabled:opacity-50"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const menuWidth = 128;
                    const left = Math.min(
                      Math.max(rect.right - menuWidth, 8),
                      window.innerWidth - menuWidth - 8
                    );
                    const top = rect.bottom + 4;

                    setOpenPrintMenu((prev) =>
                      prev?.row?.id === row.id ? null : { row, top, left }
                    );
                  }}
                  disabled={printingId === row.id}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}
            actionsLabel="Action"
            exportFileName="crm_bill_print"
          />
          {openPrintMenu && (
            <div
              data-bill-print-menu
              className="fixed z-[1300] min-w-[120px] rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg"
              style={{ top: `${openPrintMenu.top}px`, left: `${openPrintMenu.left}px` }}
            >
              <button
                type="button"
                className="block w-full px-3 py-1 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handlePrint(openPrintMenu.row, "invoice")}
              >
                Invoice
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handlePrint(openPrintMenu.row, "receipt")}
              >
                Receipt
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default CrmBillPrint;
