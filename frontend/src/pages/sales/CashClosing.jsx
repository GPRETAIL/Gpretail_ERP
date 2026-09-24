import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Printer, Save, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Box, Stack, Typography, TextField, MenuItem, Button, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";
import { muiFieldSx } from "../../theme/formControlSizes";

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
    <TextField
      select
      name={name}
      value={value}
      onChange={onChange}
      size="small"
      fullWidth
      sx={muiFieldSx}
    >
      <MenuItem value="">{allOption ? "All" : `Select ${label}`}</MenuItem>
      {optionsList.map((row) => (
        <MenuItem key={row.value} value={row.value}>
          {row.label}
        </MenuItem>
      ))}
    </TextField>
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
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatCurrency(value || 0)}</Box>,
      },
      {
        key: "closing_amount",
        label: "Closing",
        valueGetter: (row) => Number(row.closing_amount || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatCurrency(value || 0)}</Box>,
      },
      {
        key: "difference",
        label: "Difference",
        valueGetter: (row) => Number(row.difference || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatCurrency(value || 0)}</Box>,
      },
      {
        key: "counter_expenses",
        label: "Expenses",
        valueGetter: (row) => Number(row.counter_expenses || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatCurrency(value || 0)}</Box>,
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
    <Stack spacing={2}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, gap: 2 }}>
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2 }}>
          <Typography component="h2" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.secondary", mb: 1.5 }}>Cash Closing Details</Typography>
          <Stack spacing={1.5} sx={{ maxWidth: 576 }}>
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography component="label" sx={{ width: "40%", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Date / Time</Typography>
              <TextField
                type="text"
                value={now.toLocaleString()}
                disabled
                slotProps={{ input: { readOnly: true } }}
                size="small"
                sx={[muiFieldSx, { flex: 1, ml: 1, "& .MuiInputBase-root": { bgcolor: "action.hover" } }]}
              />
            </Stack>

            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography component="label" sx={{ width: "40%", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Counter</Typography>
              <Box sx={{ flex: 1, ml: 1 }}>
                {renderSelect(
                  "Counter",
                  "counterId",
                  formData.counterId,
                  options.counters,
                  (e) => setFormData((prev) => ({ ...prev, counterId: e.target.value }))
                )}
              </Box>
            </Stack>

            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography component="label" sx={{ width: "40%", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Received By</Typography>
              <Box sx={{ flex: 1, ml: 1 }}>
                {renderSelect(
                  "Received By",
                  "receivedByEmployeeId",
                  formData.receivedByEmployeeId,
                  options.receivedByEmployees,
                  (e) => setFormData((prev) => ({ ...prev, receivedByEmployeeId: e.target.value }))
                )}
              </Box>
            </Stack>

            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography component="label" sx={{ width: "40%", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Cashier</Typography>
              <Box sx={{ flex: 1, ml: 1 }}>
                {renderSelect(
                  "Cashier",
                  "cashierEmployeeId",
                  formData.cashierEmployeeId,
                  options.cashiers,
                  (e) => setFormData((prev) => ({ ...prev, cashierEmployeeId: e.target.value }))
                )}
              </Box>
            </Stack>

            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography component="label" sx={{ width: "40%", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Opening</Typography>
              <TextField
                type="text"
                value={loadingOpening ? "Loading..." : formatCurrency(openingAmount)}
                disabled
                slotProps={{ input: { readOnly: true } }}
                size="small"
                sx={[muiFieldSx, { flex: 1, ml: 1, "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontWeight: 600 } }]}
              />
            </Stack>

            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography component="label" sx={{ width: "40%", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Closing Bill No</Typography>
              <TextField
                type="text"
                value={closingBillNo}
                disabled
                slotProps={{ input: { readOnly: true } }}
                size="small"
                sx={[muiFieldSx, { flex: 1, ml: 1, "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontWeight: 600 } }]}
              />
            </Stack>

            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography component="label" sx={{ width: "40%", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Counter Expenses</Typography>
              <TextField
                type="number"
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                value={formData.counterExpenses}
                onChange={(e) => setFormData((prev) => ({ ...prev, counterExpenses: e.target.value }))}
                size="small"
                sx={[muiFieldSx, { flex: 1, ml: 1 }]}
              />
            </Stack>

            <Stack direction="row" sx={{ alignItems: "flex-start" }}>
              <Typography component="label" sx={{ width: "40%", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mt: 0.5 }}>Notes</Typography>
              <TextField
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={3}
                size="small"
                sx={[muiFieldSx, { flex: 1, ml: 1, "& textarea": { resize: "vertical" } }]}
              />
            </Stack>

            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography component="label" sx={{ width: "40%", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Closing</Typography>
              <TextField
                type="text"
                value={formatCurrency(closingAmount)}
                disabled
                slotProps={{ input: { readOnly: true } }}
                size="small"
                sx={[muiFieldSx, { flex: 1, ml: 1, "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontWeight: 600 } }]}
              />
            </Stack>

            <Box>
              <Stack direction="row" sx={{ alignItems: "center" }}>
                <Typography component="label" sx={{ width: "40%", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Difference</Typography>
                <TextField
                  type="text"
                  value={formatCurrency(difference)}
                  disabled
                  slotProps={{ input: { readOnly: true } }}
                  size="small"
                  sx={[muiFieldSx, { flex: 1, ml: 1, "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontWeight: 600 } }]}
                />
              </Stack>
              <Typography sx={{ ml: "40%", pl: 1, mt: 0.5, fontSize: 10.5, color: "text.secondary" }}>
                {`${formatCurrency(closingAmount)} - ${formatCurrency(openingAmount)} = ${formatCurrency(
                  difference
                )}`}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover" }}>
            <Typography component="h2" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>Denominations</Typography>
          </Box>
          <Box sx={{ p: 2, overflowX: "auto" }}>
            <Table sx={{ width: "100%", fontSize: 12.25 }}>
              <TableHead sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), color: "text.secondary" }}>
                <TableRow>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, textAlign: "left" }}>Denomination</TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, textAlign: "center" }}>Count</TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, textAlign: "right" }}>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {DENOMINATIONS.map((denomination) => {
                  const key = makeCountKey(denomination);
                  const count = Math.max(0, toInt(formData[key], 0));
                  const value = count * denomination;
                  return (
                    <TableRow key={denomination} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, fontWeight: 600 }}>₹{denomination.toLocaleString("en-IN")}</TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, textAlign: "center" }}>
                        <TextField
                          type="number"
                          slotProps={{ htmlInput: { min: 0 } }}
                          value={formData[key]}
                          onChange={(e) => handleCountChange(key, e.target.value)}
                          size="small"
                          sx={[muiFieldSx, { width: 96, "& .MuiInputBase-input": { textAlign: "right" } }]}
                        />
                      </TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, textAlign: "right", fontWeight: 500 }}>{formatCurrency(value)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell colSpan={2} sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, fontWeight: 600 }}>
                    Total Closing
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 1.5, py: 1, textAlign: "right", fontWeight: 700 }}>{formatCurrency(closingAmount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Box>
      </Box>
    </Stack>
  );

  const renderSearchPage = () => (
    <Stack spacing={2} sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2 }}>
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
    </Stack>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            onClick={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
            sx={{ color: "text.secondary", minWidth: 0, p: 0.5 }}
            aria-label={showSearchPage ? "Back to cash closing entry" : "Back to sales"}
          >
            <ArrowLeft size={16} />
          </Button>
          <Breadcrumbs
            sx={{ fontSize: 12.25, fontWeight: 600 }}
            items={[
              { label: "Sales", onClick: () => navigate("/sales") },
              { label: "Cash Closing" },
            ]}
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            onClick={handlePrint}
            disabled={saving || showSearchPage || loadingMeta}
            className="glass-btn glass-btn-primary"
            sx={{ display: "inline-flex", alignItems: "center" }}
          >
            <Printer size={16} style={{marginRight: 4}} />
            Print
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || showSearchPage || loadingMeta}
            className="glass-btn glass-btn-success"
            sx={{ display: "inline-flex", alignItems: "center" }}
          >
            <Save size={16} style={{marginRight: 4}} />
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary"
            sx={{ display: "inline-flex", alignItems: "center" }}
          >
            <Search size={16} style={{marginRight: 4}} />
            {showSearchPage ? "Back" : "Search"}
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={2} sx={{ p: 2, pb: 7 }}>
        {showSearchPage ? renderSearchPage() : renderEntryPage()}
        {loadingMeta && <Typography sx={{ fontSize: 10.5, color: "text.secondary", px: 0.5 }}>Loading options...</Typography>}
      </Stack>
    </Box>
  );
};

export default CashClosing;
