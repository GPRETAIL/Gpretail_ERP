import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Printer, Save, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
};

const toNum = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const makeCountKey = (denomination) => `count_${denomination}`;

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatEmployee = (row) => {
  const name = String(row?.name || "").trim() || "Unnamed";
  const code = String(row?.employee_code || "").trim();
  return code ? `${name} (${code})` : name;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildBlankCounts = () =>
  DENOMINATIONS.reduce((acc, denomination) => {
    acc[makeCountKey(denomination)] = "0";
    return acc;
  }, {});

const CashClosing = () => {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const [now, setNow] = useState(new Date());
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingOpening, setLoadingOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const [options, setOptions] = useState({
    counters: [],
    receivedByEmployees: [],
    cashiers: [],
  });
  const [closingBillNo, setClosingBillNo] = useState(1);
  const [openingAmount, setOpeningAmount] = useState(0);

  const [formData, setFormData] = useState({
    counterId: "",
    receivedByEmployeeId: "",
    cashierEmployeeId: "",
    counterExpenses: "0",
    notes: "",
    ...buildBlankCounts(),
  });

  const [searchFilters, setSearchFilters] = useState({
    search: "",
    billNo: "",
    date: "",
    counterId: "",
    receivedByEmployeeId: "",
    cashierEmployeeId: "",
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLimit, setSearchLimit] = useState(10);
  const searchFiltersRef = useRef(searchFilters);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadMeta = async () => {
    setLoadingMeta(true);
    try {
      const res = await api.get("/cash-closings/meta");
      const payload = res.data?.data || {};
      const mapSelect = (rows, formatter = (x) => x.name) =>
        (rows || []).map((row) => ({
          value: String(row.id),
          label: formatter(row),
        }));

      setOptions({
        counters: mapSelect(payload.counters),
        receivedByEmployees: mapSelect(payload.receivedByEmployees, formatEmployee),
        cashiers: mapSelect(payload.cashiers, formatEmployee),
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load cash closing options");
      setOptions({ counters: [], receivedByEmployees: [], cashiers: [] });
    } finally {
      setLoadingMeta(false);
    }
  };

  const loadNextBillNo = async () => {
    try {
      const res = await api.get("/cash-closings/next-bill-no");
      setClosingBillNo(toInt(res.data?.data?.billNo, 1));
    } catch {
      setClosingBillNo(1);
    }
  };

  const loadOpeningAmount = async (counterId) => {
    if (!counterId) {
      setOpeningAmount(0);
      return;
    }
    setLoadingOpening(true);
    try {
      const res = await api.get("/cash-closings/opening-amount", {
        params: { counterId },
      });
      setOpeningAmount(toNum(res.data?.data?.openingAmount, 0));
    } catch {
      setOpeningAmount(0);
    } finally {
      setLoadingOpening(false);
    }
  };

  useEffect(() => {
    loadMeta();
    loadNextBillNo();
  }, []);

  useEffect(() => {
    loadOpeningAmount(formData.counterId);
  }, [formData.counterId]);

  useEffect(() => {
    searchFiltersRef.current = searchFilters;
  }, [searchFilters]);

  const closingAmount = useMemo(
    () =>
      DENOMINATIONS.reduce((sum, denomination) => {
        const key = makeCountKey(denomination);
        const count = Math.max(0, toInt(formData[key], 0));
        return sum + count * denomination;
      }, 0),
    [formData]
  );

  const difference = useMemo(() => closingAmount - openingAmount, [closingAmount, openingAmount]);
  const selectedCounter = useMemo(
    () => options.counters.find((row) => row.value === formData.counterId) || null,
    [options.counters, formData.counterId]
  );
  const selectedReceivedBy = useMemo(
    () => options.receivedByEmployees.find((row) => row.value === formData.receivedByEmployeeId) || null,
    [options.receivedByEmployees, formData.receivedByEmployeeId]
  );
  const selectedCashier = useMemo(
    () => options.cashiers.find((row) => row.value === formData.cashierEmployeeId) || null,
    [options.cashiers, formData.cashierEmployeeId]
  );

  const runSearch = useCallback(async (override = null) => {
    const filters = override || searchFiltersRef.current;
    setSearching(true);
    try {
      const params = {};
      if (String(filters.search || "").trim()) params.search = String(filters.search).trim();
      if (String(filters.billNo || "").trim()) params.billNo = String(filters.billNo).trim();
      if (String(filters.date || "").trim()) params.date = filters.date;
      if (String(filters.counterId || "").trim()) params.counterId = filters.counterId;
      if (String(filters.receivedByEmployeeId || "").trim()) {
        params.receivedByEmployeeId = filters.receivedByEmployeeId;
      }
      if (String(filters.cashierEmployeeId || "").trim()) {
        params.cashierEmployeeId = filters.cashierEmployeeId;
      }

      const res = await api.get("/cash-closings", { params });
      setSearchResults(res.data?.data || []);
      setSearchPage(1);
    } catch {
      toast.error("Failed to search cash closings");
    } finally {
      setSearching(false);
    }
  }, []);

  const openSearchPage = async () => {
    setShowSearchPage(true);
    setSearchPage(1);
    const empty = {
      search: "",
      billNo: "",
      date: "",
      counterId: "",
      receivedByEmployeeId: "",
      cashierEmployeeId: "",
    };
    setSearchFilters(empty);
    await runSearch(empty);
  };

  const handleServerSearch = useCallback(({ query }) => {
    setSearchPage(1);
    setSearchFilters((prev) => {
      const nextFilters = { ...prev, search: query };
      runSearch(nextFilters);
      return nextFilters;
    });
  }, [runSearch]);

  const handleCountChange = (key, raw) => {
    if (raw === "") {
      setFormData((prev) => ({ ...prev, [key]: "" }));
      return;
    }
    const parsed = toInt(raw, 0);
    if (parsed < 0) return;
    setFormData((prev) => ({ ...prev, [key]: String(parsed) }));
  };

  const handleSave = async () => {
    if (!formData.counterId) {
      toast.error("Counter is required");
      return;
    }
    if (!formData.receivedByEmployeeId) {
      toast.error("Received By is required");
      return;
    }
    if (!formData.cashierEmployeeId) {
      toast.error("Cashier is required");
      return;
    }

    const payload = {
      counterId: formData.counterId,
      receivedByEmployeeId: formData.receivedByEmployeeId,
      cashierEmployeeId: formData.cashierEmployeeId,
      counterExpenses: toNum(formData.counterExpenses, 0),
      notes: String(formData.notes || "").trim(),
      ...DENOMINATIONS.reduce((acc, denomination) => {
        const key = makeCountKey(denomination);
        acc[key] = Math.max(0, toInt(formData[key], 0));
        return acc;
      }, {}),
    };

    setSaving(true);
    try {
      const res = await api.post("/cash-closings", payload);
      const savedBillNo = res.data?.data?.bill_no;
      toast.success(`Cash closing saved successfully (Bill #${savedBillNo})`);

      setFormData((prev) => ({
        ...prev,
        counterExpenses: "0",
        notes: "",
        ...buildBlankCounts(),
      }));

      await Promise.all([loadNextBillNo(), loadOpeningAmount(formData.counterId)]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save cash closing");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (showSearchPage) return;
    if (!formData.counterId) {
      toast.error("Counter is required before printing");
      return;
    }

    const denominationRows = DENOMINATIONS.map((denomination) => {
      const count = Math.max(0, toInt(formData[makeCountKey(denomination)], 0));
      return {
        denomination,
        count,
        amount: count * denomination,
      };
    }).filter((row) => row.count > 0);

    const receiptRows = denominationRows.length > 0
      ? denominationRows
      : DENOMINATIONS.map((denomination) => ({
          denomination,
          count: 0,
          amount: 0,
        }));

    const userRole = String(authUser?.role || "").toLowerCase();
    let storeName = String(authUser?.name || "").trim();

    if (userRole === "user" && authUser?.company_id) {
      try {
        const companyRes = await api.get(`/companies/${authUser.company_id}`);
        const adminName = String(companyRes.data?.data?.admin_user?.name || "").trim();
        if (adminName) storeName = adminName;
      } catch {
        // Keep fallback below if admin lookup fails.
      }
    }

    if (!storeName) {
      storeName = String(authUser?.name || authUser?.email || "Cash Closing").trim() || "Cash Closing";
    }

    const printedAt = now.toLocaleString();
    const counterName = selectedCounter?.label || "-";
    const receivedByName = selectedReceivedBy?.label || "-";
    const cashierName = selectedCashier?.label || "-";
    const notesText = String(formData.notes || "").trim();

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Cash Closing ${closingBillNo}</title>
          <style>
            body {
              font-family: "Courier New", monospace;
              width: 72mm;
              margin: 0;
              padding: 8px;
              color: #111;
              font-size: 12px;
              line-height: 1.35;
            }
            .title {
              text-align: left;
              font-weight: 700;
              font-size: 15px;
            }
            .subtitle {
              font-size: 12px;
              font-weight: 700;
              margin-bottom: 6px;
            }
            .line {
              border-top: 1px dashed #555;
              margin: 6px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 8px;
            }
            .row span:last-child {
              text-align: right;
              white-space: nowrap;
            }
            .section-title {
              font-weight: 700;
              margin-bottom: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 1px 0;
              font-size: 12px;
            }
            th {
              text-align: left;
              font-weight: 700;
            }
            td:last-child, th:last-child {
              text-align: right;
            }
            .notes {
              white-space: pre-wrap;
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          <div class="title">${escapeHtml(storeName)}</div>
          <div class="subtitle">Cash Over Statement</div>
          <div class="line"></div>

          <div class="row"><span>Date</span><span>${escapeHtml(printedAt)}</span></div>
          <div class="row"><span>Counter</span><span>${escapeHtml(counterName)}</span></div>
          <div class="row"><span>Received By</span><span>${escapeHtml(receivedByName)}</span></div>
          <div class="row"><span>Cashier</span><span>${escapeHtml(cashierName)}</span></div>
          <div class="row"><span>Bill No</span><span>${escapeHtml(closingBillNo)}</span></div>

          <div class="line"></div>
          <div class="section-title">Amount</div>
          <div class="row"><span>Opening Cash</span><span>${escapeHtml(formatCurrency(openingAmount))}</span></div>
          <div class="row"><span>Closing Cash</span><span>${escapeHtml(formatCurrency(closingAmount))}</span></div>
          <div class="row"><span>Counter Expenses</span><span>${escapeHtml(formatCurrency(toNum(formData.counterExpenses, 0)))}</span></div>
          <div class="row"><span>Difference</span><span>${escapeHtml(formatCurrency(difference))}</span></div>

          <div class="line"></div>
          <div class="section-title">Cash Denomination</div>
          <table>
            <thead>
              <tr>
                <th>Rs</th>
                <th>Nos</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${receiptRows.map((row) => `
                <tr>
                  <td>${escapeHtml(row.denomination.toLocaleString("en-IN"))}</td>
                  <td>${escapeHtml(row.count)}</td>
                  <td>${escapeHtml(formatCurrency(row.amount))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="line"></div>
          <div class="row"><span>Total Denomination</span><span>${escapeHtml(formatCurrency(closingAmount))}</span></div>
          <div class="row"><span>Opening Cash</span><span>${escapeHtml(formatCurrency(openingAmount))}</span></div>
          <div class="row"><span>Cash [Tender]</span><span>${escapeHtml(formatCurrency(closingAmount))}</span></div>
          <div class="row"><span>Counter Expenses</span><span>${escapeHtml(formatCurrency(toNum(formData.counterExpenses, 0)))}</span></div>
          <div class="row"><span>Discrepancy</span><span>${escapeHtml(formatCurrency(difference))}</span></div>

          ${notesText ? `
            <div class="line"></div>
            <div class="section-title">Notes</div>
            <div class="notes">${escapeHtml(notesText)}</div>
          ` : ""}
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");

    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
    };

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        toast.error("Failed to open print dialog.");
        return;
      }

      frameWindow.focus();
      frameWindow.print();
      cleanup();
    };

    document.body.appendChild(iframe);
    const frameDocument = iframe.contentDocument || iframe.contentWindow?.document;
    if (!frameDocument) {
      cleanup();
      toast.error("Failed to prepare print document.");
      return;
    }
    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();
  };

  const renderSelect = (label, name, value, optionsList, onChange, allOption = false) => (
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
    >
      <option value="">{allOption ? "All" : `Select ${label}`}</option>
      {optionsList.map((row) => (
        <option key={row.value} value={row.value}>
          {row.label}
        </option>
      ))}
    </select>
  );

  const cashClosingSearchColumns = useMemo(
    () => [
      {
        key: "bill_no",
        label: "Bill No",
        valueGetter: (row) => row.bill_no || "-",
      },
      {
        key: "closing_at",
        label: "Date / Time",
        valueGetter: (row) => row.closing_at || "",
        render: (value) => (value ? new Date(value).toLocaleString() : "-"),
        searchValue: (row) => (row.closing_at ? new Date(row.closing_at).toLocaleString() : ""),
      },
      {
        key: "counter",
        label: "Counter",
        valueGetter: (row) => row.counter?.name || "-",
      },
      {
        key: "received_by",
        label: "Received By",
        valueGetter: (row) => formatEmployee(row.receivedBy),
      },
      {
        key: "cashier",
        label: "Cashier",
        valueGetter: (row) => formatEmployee(row.cashier),
      },
      {
        key: "opening_amount",
        label: "Opening",
        valueGetter: (row) => Number(row.opening_amount || 0),
        render: (value) => <div className="text-right">{formatCurrency(value || 0)}</div>,
      },
      {
        key: "closing_amount",
        label: "Closing",
        valueGetter: (row) => Number(row.closing_amount || 0),
        render: (value) => <div className="text-right">{formatCurrency(value || 0)}</div>,
      },
      {
        key: "difference",
        label: "Difference",
        valueGetter: (row) => Number(row.difference || 0),
        render: (value) => <div className="text-right">{formatCurrency(value || 0)}</div>,
      },
      {
        key: "counter_expenses",
        label: "Expenses",
        valueGetter: (row) => Number(row.counter_expenses || 0),
        render: (value) => <div className="text-right">{formatCurrency(value || 0)}</div>,
      },
      {
        key: "notes",
        label: "Notes",
        valueGetter: (row) => row.notes || "-",
      },
    ],
    []
  );

  const searchPagination = useMemo(() => {
    const total = searchResults.length;
    const totalPages = Math.max(Math.ceil(total / Math.max(searchLimit, 1)), 1);
    return { total, totalPages };
  }, [searchResults.length, searchLimit]);

  const renderEntryPage = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Cash Closing Details</h2>
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center">
              <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">Date / Time</label>
              <input
                type="text"
                value={now.toLocaleString()}
                disabled
                readOnly
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-2"
              />
            </div>

            <div className="flex items-center">
              <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">Counter</label>
              <div className="flex-1 ml-2">
                {renderSelect(
                  "Counter",
                  "counterId",
                  formData.counterId,
                  options.counters,
                  (e) => setFormData((prev) => ({ ...prev, counterId: e.target.value }))
                )}
              </div>
            </div>

            <div className="flex items-center">
              <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">Received By</label>
              <div className="flex-1 ml-2">
                {renderSelect(
                  "Received By",
                  "receivedByEmployeeId",
                  formData.receivedByEmployeeId,
                  options.receivedByEmployees,
                  (e) => setFormData((prev) => ({ ...prev, receivedByEmployeeId: e.target.value }))
                )}
              </div>
            </div>

            <div className="flex items-center">
              <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">Cashier</label>
              <div className="flex-1 ml-2">
                {renderSelect(
                  "Cashier",
                  "cashierEmployeeId",
                  formData.cashierEmployeeId,
                  options.cashiers,
                  (e) => setFormData((prev) => ({ ...prev, cashierEmployeeId: e.target.value }))
                )}
              </div>
            </div>

            <div className="flex items-center">
              <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">Opening</label>
              <input
                type="text"
                value={loadingOpening ? "Loading..." : formatCurrency(openingAmount)}
                disabled
                readOnly
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-2 font-semibold"
              />
            </div>

            <div className="flex items-center">
              <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">Closing Bill No</label>
              <input
                type="text"
                value={closingBillNo}
                disabled
                readOnly
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-2 font-semibold"
              />
            </div>

            <div className="flex items-center">
              <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">Counter Expenses</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.counterExpenses}
                onChange={(e) => setFormData((prev) => ({ ...prev, counterExpenses: e.target.value }))}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ml-2"
              />
            </div>

            <div className="flex items-start">
              <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ml-2 resize-y"
              />
            </div>

            <div className="flex items-center">
              <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">Closing</label>
              <input
                type="text"
                value={formatCurrency(closingAmount)}
                disabled
                readOnly
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-2 font-semibold"
              />
            </div>

            <div>
              <div className="flex items-center">
                <label className="w-[40%] text-sm font-medium text-gray-700 dark:text-gray-300">Difference</label>
                <input
                  type="text"
                  value={formatCurrency(difference)}
                  disabled
                  readOnly
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-2 font-semibold"
                />
              </div>
              <p className="ml-[40%] pl-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                {`${formatCurrency(closingAmount)} - ${formatCurrency(openingAmount)} = ${formatCurrency(
                  difference
                )}`}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Denominations</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="border dark:border-gray-700 px-3 py-2 text-left">Denomination</th>
                  <th className="border dark:border-gray-700 px-3 py-2 text-center">Count</th>
                  <th className="border dark:border-gray-700 px-3 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {DENOMINATIONS.map((denomination) => {
                  const key = makeCountKey(denomination);
                  const count = Math.max(0, toInt(formData[key], 0));
                  const value = count * denomination;
                  return (
                    <tr key={denomination} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="border dark:border-gray-700 px-3 py-2 font-semibold">₹{denomination.toLocaleString("en-IN")}</td>
                      <td className="border dark:border-gray-700 px-3 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={formData[key]}
                          onChange={(e) => handleCountChange(key, e.target.value)}
                          className="w-24 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-2 py-1 text-right focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="border dark:border-gray-700 px-3 py-2 text-right font-medium">{formatCurrency(value)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <td className="border dark:border-gray-700 px-3 py-2 font-semibold" colSpan="2">
                    Total Closing
                  </td>
                  <td className="border dark:border-gray-700 px-3 py-2 text-right font-bold">{formatCurrency(closingAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchPage = () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 space-y-4">
      <FilterableDataTable
        rows={searchResults}
        columns={cashClosingSearchColumns}
        loading={searching}
        loadingText="Searching..."
        emptyText="No cash closing records found"
        searchPlaceholder="Search in cash closing fields..."
        showExport={false}
        enableColumnResize
        tablePreferenceKey="sales.cash_closing.search"
        onRefresh={runSearch}
        refreshDisabled={searching}
        enableServerSearch
        onServerSearch={handleServerSearch}
        page={searchPage}
        limit={searchLimit}
        totalPages={searchPagination.totalPages}
        totalRows={searchPagination.total}
        onPageChange={setSearchPage}
        onLimitChange={(value) => {
          setSearchLimit(value);
          setSearchPage(1);
        }}
        paginationMode="client"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            aria-label={showSearchPage ? "Back to cash closing entry" : "Back to sales"}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/sales")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Sales
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>Cash Closing</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            disabled={saving || showSearchPage || loadingMeta}
            className="glass-btn glass-btn-primary inline-flex items-center disabled:opacity-50"
          >
            <Printer className="w-4 h-4 mr-1" />
            Print
          </button>
          <button
            onClick={handleSave}
            disabled={saving || showSearchPage || loadingMeta}
            className="glass-btn glass-btn-success inline-flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary inline-flex items-center"
          >
            <Search className="w-4 h-4 mr-1" />
            {showSearchPage ? "Back" : "Search"}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-28">
        {showSearchPage ? renderSearchPage() : renderEntryPage()}
        {loadingMeta && <p className="text-xs text-gray-500 dark:text-gray-400 px-1">Loading options...</p>}
      </div>
    </div>
  );
};

export default CashClosing;
