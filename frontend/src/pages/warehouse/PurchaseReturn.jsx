import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Save, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import PageSkeleton from "../../components/PageSkeleton";
import Breadcrumbs from "../../components/Breadcrumbs";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import { usePrintContext } from "../../context/PrintContext";
import { muiFieldSx } from "../../theme/formControlSizes";
import { Box, Stack, Typography, TextField as MuiTextField, MenuItem, Button, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

const SelectField = ({ label, name, value, onChange, options, inline = false, sx }) => (
  <Box sx={{ display: inline ? "flex" : "block", alignItems: inline ? "center" : undefined, gap: inline ? 1 : undefined, ...sx }}>
    <Typography component="label" sx={inline ? { width: 112, flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: "text.secondary" } : { display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
      {label}
    </Typography>
    <MuiTextField select name={name} value={value} onChange={onChange} size="small" fullWidth sx={[muiFieldSx, { flex: inline ? 1 : undefined }]}>
      <MenuItem value="">Select</MenuItem>
      {options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </MuiTextField>
  </Box>
);

const TextField = ({ label, name, value, onChange, type = "text", placeholder = "", onKeyDown, inline = false, sx }) => (
  <Box sx={{ display: inline ? "flex" : "block", alignItems: inline ? "center" : undefined, gap: inline ? 1 : undefined, ...sx }}>
    <Typography component="label" sx={inline ? { width: 112, flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: "text.secondary" } : { display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
      {label}
    </Typography>
    <MuiTextField
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      size="small"
      fullWidth
      sx={[muiFieldSx, { flex: inline ? 1 : undefined }]}
    />
  </Box>
);

const InlineTextField = ({ label, name, value, onChange, type = "text", placeholder = "", maxWidth }) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
    <Typography component="label" sx={{ width: 96, flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>{label}</Typography>
    <MuiTextField
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      size="small"
      fullWidth
      sx={[muiFieldSx, { maxWidth }]}
    />
  </Stack>
);

const STOCK_TABLE_WIDTHS = [132, 84, 132, 88, 62, 72, 74, 66, 82, 78, 88, 46];

const gridInputSx = { "& .MuiInputBase-input": { fontSize: 11, py: 0.5, px: 0.75 } };
const GridCellInput = ({ align = "center", sx, ...props }) => (
  <MuiTextField
    size="small"
    fullWidth
    sx={{ ...gridInputSx, "& .MuiInputBase-input": { ...gridInputSx["& .MuiInputBase-input"], textAlign: align }, ...sx }}
    {...props}
  />
);

const STOCK_TABLE_FILTER_FIELDS = {
  barcode: "",
  invoiceNo: "",
  productName: "",
  designNo: "",
  qty: "",
  rate: "",
  discountPerc: "",
  taxPerc: "",
  discount: "",
  tax: "",
  amount: "",
};

const PURCHASE_RETURN_TYPE_OPTIONS = [
  { value: "Return-Debit Note", label: "Return-Debit Note" },
  { value: "DOA Debit Note", label: "DOA Debit Note" },
  { value: "DOA Credit Note", label: "DOA Credit Note" },
  { value: "Price Drop credit note", label: "Price Drop credit note" },
  { value: "Discount Note", label: "Discount Note" },
  { value: "Supplier credit note", label: "Supplier credit note" },
  { value: "Supplier Advance", label: "Supplier Advance" },
  { value: "Excess Credit Note", label: "Excess Credit Note" },
  { value: "Price Credit Note", label: "Price Credit Note" },
  { value: "Supplier refund", label: "Supplier refund" },
];

const DISCOUNT_MODE_OPTIONS = [
  { value: "final_value", label: "Final value" },
  { value: "gross_value", label: "Gross value" },
  { value: "percent_final_value", label: "% Final value" },
  { value: "percent_gross_value_wd", label: "% gross value WD" },
  { value: "percent_gross_value_wod", label: "% Gross Value WOD" },
  { value: "piece_value", label: "Piece value" },
];

const RETURN_MODE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "supplier", label: "Supplier" },
];

const toNumber = (value, fallback = 0) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

const toInt = (value, fallback = 0) => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

const round2 = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
const normalizeText = (value) => String(value ?? "").trim().toLowerCase();
const calculateDiscountAmount = (qty, rate, discountPerc) =>
  round2(Math.max(0, toNumber(qty, 0)) * Math.max(0, toNumber(rate, 0)) * (Math.max(0, toNumber(discountPerc, 0)) / 100));
const calculateTaxBase = (qty, rate, discountPerc) =>
  round2(Math.max(0, toNumber(qty, 0)) * Math.max(0, toNumber(rate, 0)) - calculateDiscountAmount(qty, rate, discountPerc));
const calculateTaxAmount = (qty, rate, discountPerc, taxPerc) =>
  round2(calculateTaxBase(qty, rate, discountPerc) * (Math.max(0, toNumber(taxPerc, 0)) / 100));

const PurchaseReturn = () => {
  const navigate = useNavigate();
  const { printHtml } = usePrintContext();
  const authUser = useSelector((state) => state.auth.user);

  const today = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ open: false, type: "info", message: "" });

  const [header, setHeader] = useState({
    date: today,
    type: "Return-Debit Note",
    mode: "auto",
    stockLocation: "",
    companyId: "",
    barcodeSearch: "",
    invoiceSearch: "",
    entrySearch: "",
    supplierId: "",
    supplierCompanyId: "",
    shipToCompanyId: "",
    agentId: "",
    discountMode: "final_value",
    discountValue: "",
    lrNo: "",
    lrDate: "",
    packingPrice: "",
    transportId: "",
    taxId: "",
    remarks: "",
  });

  const [taxes, setTaxes] = useState([]);
  const [transports, setTransports] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [gridRows, setGridRows] = useState([]);
  const [stockTableFilters, setStockTableFilters] = useState(STOCK_TABLE_FILTER_FIELDS);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchingStock, setSearchingStock] = useState(false);

  const taxOptions = useMemo(
    () => taxes.map((t) => ({ value: String(t.id), label: `${t.name} ${t.tax_percentage}%` })),
    [taxes]
  );
  const companyOptions = useMemo(
    () => (companies || []).map((row) => ({ value: String(row.id), label: row.name || `Company ${row.id}` })),
    [companies]
  );
  const stockLocationOptions = useMemo(() => {
    const options = (companies || [])
      .filter((company) => String(company?.name || "").trim() !== "")
      .map((company) => ({
        value: String(company.name).trim(),
        label: String(company.name).trim(),
      }));

    if (header.stockLocation && !options.some((option) => option.value === header.stockLocation)) {
      return [{ value: header.stockLocation, label: header.stockLocation }, ...options];
    }

    return options;
  }, [companies, header.stockLocation]);
  const supplierOptions = useMemo(
    () => (suppliers || []).map((row) => ({ value: String(row.id), label: row.name || `Supplier ${row.id}` })),
    [suppliers]
  );
  const agentOptions = useMemo(
    () => (agents || []).map((row) => ({ value: String(row.id), label: row.name || `Agent ${row.id}` })),
    [agents]
  );
  const supplierSummaries = useMemo(() => {
    const map = new Map();
    gridRows.forEach((row) => {
      const key = `${row.supplierName || "-"}__${row.interstate ? "Yes" : "No"}`;
      const current = map.get(key) || {
        supplier: row.supplierName || "-",
        interstate: row.interstate ? "Yes" : "No",
        qty: 0,
      };
      current.qty += Math.max(0, toInt(row.availableQty ?? row.stock, 0));
      map.set(key, current);
    });
    return [...map.values()];
  }, [gridRows]);
  const isReturnDebitNote = header.type === "Return-Debit Note";
  const isSupplierMode = isReturnDebitNote && header.mode === "supplier";

  const selectedTaxPerc = useMemo(() => {
    if (!header.taxId) return 0;
    const t = taxes.find((row) => String(row.id) === String(header.taxId));
    return t ? toNumber(t.tax_percentage) : 0;
  }, [header.taxId, taxes]);

  const returnRows = useMemo(() => {
    return gridRows
      .map((row) => {
        const availableQty = Math.max(0, toInt(row.availableQty ?? row.stock, 0));
        const returnQty = Math.max(0, Math.min(toInt(row.stock, 0), availableQty));
        const rate = Math.max(0, toNumber(row.rate, 0));
        const discountPerc = Math.max(0, toNumber(row.discountPerc, 0));
        const taxBase = calculateTaxBase(returnQty, rate, discountPerc);
        const taxAmt = round2(Math.max(0, toNumber(row.taxAmount, 0)));
        const taxPerc = taxBase > 0 ? round2((taxAmt / taxBase) * 100) : 0;
        const amount = round2(taxBase + taxAmt);
        return { ...row, returnQty, rate, discountPerc, taxPerc, taxAmount: taxAmt, amount };
      })
      .filter((row) => row.returnQty > 0);
  }, [gridRows]);

  const tableTotals = useMemo(() => {
    const amount = round2(
      gridRows.reduce((sum, row) => sum + toInt(row.stock, 0) * toNumber(row.rate, 0), 0)
    );
    const discount = round2(
      gridRows.reduce((sum, row) => {
        return sum + calculateDiscountAmount(row.stock, row.rate, row.discountPerc);
      }, 0)
    );
    const gross = round2(amount - discount);
    const tax = round2(
      gridRows.reduce((sum, row) => sum + Math.max(0, toNumber(row.taxAmount, 0)), 0)
    );
    const totalQty = gridRows.reduce((sum, row) => sum + toInt(row.stock, 0), 0);
    const totalPiece = gridRows.reduce((sum, row) => sum + toInt(row.stock, 0), 0);
    const freightTax = round2(toNumber(header.packingPrice, 0) * (selectedTaxPerc / 100));
    const total = round2(gross + tax + toNumber(header.packingPrice, 0) + freightTax);

    return {
      amount,
      discount,
      tax,
      freightTax,
      total,
      gross,
      totalQty,
      totalPiece,
    };
  }, [gridRows, header.packingPrice, selectedTaxPerc]);

  const loadReferenceData = useCallback(async () => {
    const [taxRes, transportRes, companyRes, supplierRes, agentRes] = await Promise.all([
      api.get("/taxes", { params: { limit: 100 } }),
      api.get("/transports", { params: { limit: 100 } }),
      api.get("/companies").catch(() => ({ data: { data: [] } })),
      api.get("/suppliers", { params: { limit: 300 } }).catch(() => ({ data: { data: [] } })),
      api.get("/agents", { params: { limit: 300 } }).catch(() => ({ data: { data: [] } })),
    ]);
    setTaxes(taxRes.data?.data || taxRes.data || []);
    setTransports(transportRes.data?.data || []);
    setCompanies(companyRes.data?.data || companyRes.data || []);
    setSuppliers(supplierRes.data?.data || supplierRes.data || []);
    setAgents(agentRes.data?.data || agentRes.data || []);
  }, []);

  // Preloads above are capped batches -- these hit each resource's own ?search= endpoint so
  // AsyncSearchSelect can find anything beyond that initial batch.
  const handleAsyncSupplierSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/suppliers", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setSuppliers((prev) => {
          const existingIds = new Set((prev || []).map((s) => String(s.id)));
          const newItems = results.filter((s) => !existingIds.has(String(s.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results.map((row) => ({ value: String(row.id), label: row.name || `Supplier ${row.id}` }));
    } catch {
      return [];
    }
  }, []);

  const handleAsyncAgentSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/agents", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setAgents((prev) => {
          const existingIds = new Set((prev || []).map((a) => String(a.id)));
          const newItems = results.filter((a) => !existingIds.has(String(a.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results.map((row) => ({ value: String(row.id), label: row.name || `Agent ${row.id}` }));
    } catch {
      return [];
    }
  }, []);

  const handleAsyncTaxSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/taxes", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setTaxes((prev) => {
          const existingIds = new Set((prev || []).map((t) => String(t.id)));
          const newItems = results.filter((t) => !existingIds.has(String(t.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results.map((t) => ({ value: String(t.id), label: `${t.name} ${t.tax_percentage}%` }));
    } catch {
      return [];
    }
  }, []);

  const handleAsyncTransportSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/transports", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setTransports((prev) => {
          const existingIds = new Set((prev || []).map((t) => String(t.id)));
          const newItems = results.filter((t) => !existingIds.has(String(t.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results.map((t) => ({ value: String(t.id), label: t.name }));
    } catch {
      return [];
    }
  }, []);

  const loadStockRows = useCallback(async (filters = {}) => {
    const params = {};
    const barcode = String(filters.barcode ?? "").trim();
    const invoiceNo = String(filters.invoiceNo ?? "").trim();
    const entryNo = String(filters.entryNo ?? "").trim();
    const suppressToast = !!filters.suppressToast;

    if (barcode) params.barcode = barcode;
    if (invoiceNo) params.invoiceNo = invoiceNo;
    if (entryNo) params.entryNo = entryNo;

    const res = await api.get("/purchase-returns/stock-search", { params });
    const responseMessage = String(res.data?.message || "").trim();
    const rows = (res.data?.data || []).map((row) => ({
      ...row,
      availableQty: Math.max(0, toInt(row.stock, 0)),
      stock: Math.max(0, toInt(row.stock, 0)),
      taxPerc: selectedTaxPerc,
      taxAmount: calculateTaxAmount(row.stock, row.rate, row.discountPerc, selectedTaxPerc),
      selected: false,
    }));

    if (responseMessage && (barcode || invoiceNo || entryNo) && !suppressToast) {
      setToast({
        open: true,
        type: rows.length === 0 ? "warning" : "info",
        message: responseMessage,
      });
    }

    return rows;
  }, [selectedTaxPerc]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await loadReferenceData();
      } catch (err) {
        console.error("Failed to load purchase return data:", err);
        setToast({
          open: true,
          type: "error",
          message: "Failed to load purchase return data",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loadReferenceData, loadStockRows]);

  useEffect(() => {
    const userRole = String(authUser?.role || "").toLowerCase();
    if (userRole !== "admin") return;

    setHeader((prev) => {
      const stockLocation = String(
        companies.find((company) => String(company.id) === String(authUser?.company_id))?.name ||
        authUser?.company_name ||
        ""
      ).trim();

      if (!stockLocation || prev.stockLocation === stockLocation) {
        return prev;
      }

      return { ...prev, stockLocation };
    });
  }, [authUser, companies]);

  useEffect(() => {
    setGridRows((prev) =>
      prev.map((row) => ({
        ...row,
        taxPerc: selectedTaxPerc,
        taxAmount: calculateTaxAmount(row.stock, row.rate, row.discountPerc, selectedTaxPerc),
      }))
    );
  }, [selectedTaxPerc]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeader((prev) => {
      if (name === "type") {
        return {
          ...prev,
          type: value,
          barcodeSearch: "",
          invoiceSearch: "",
          entrySearch: "",
          mode: value === "Return-Debit Note" ? prev.mode || "auto" : "auto",
        };
      }
      if (name === "mode" && value !== "supplier") {
        return {
          ...prev,
          mode: value,
          supplierId: "",
          supplierCompanyId: "",
          shipToCompanyId: "",
          agentId: "",
        };
      }
      return { ...prev, [name]: value };
    });

    if (name === "type") {
      setGridRows([]);
      setHasSearched(false);
    }
  };

  const handleDiscountApply = () => {
    const mode = String(header.discountMode || "").trim();
    const rawValue = toNumber(header.discountValue, 0);
    if (!mode || rawValue <= 0 || gridRows.length === 0) return;

    setGridRows((prev) => {
      if (mode === "piece_value") {
        let remainingPieces = Math.max(0, toInt(rawValue, 0));
        return prev.map((row) => {
          const nextQty = Math.max(0, Math.min(remainingPieces, toInt(row.availableQty ?? row.stock, 0)));
          remainingPieces -= nextQty;
          return {
            ...row,
            stock: nextQty,
            taxAmount: calculateTaxAmount(nextQty, row.rate, row.discountPerc, row.taxPerc),
          };
        });
      }

      const currentGrossWd = prev.reduce(
        (sum, row) => sum + calculateTaxBase(row.stock, row.rate, row.discountPerc),
        0
      );
      const currentGrossWod = prev.reduce(
        (sum, row) => sum + round2(toInt(row.stock, 0) * toNumber(row.rate, 0)),
        0
      );
      const currentFinal = prev.reduce((sum, row) => sum + getRowAmounts(row).amount, 0);

      let factor = 1;
      switch (mode) {
        case "final_value":
          factor = currentFinal > 0 ? rawValue / currentFinal : 1;
          break;
        case "gross_value":
          factor = currentGrossWd > 0 ? rawValue / currentGrossWd : 1;
          break;
        case "percent_final_value":
          factor = currentGrossWd > 0 ? ((currentFinal * rawValue) / 100) / currentGrossWd : 1;
          break;
        case "percent_gross_value_wd":
          factor = rawValue / 100;
          break;
        case "percent_gross_value_wod":
          factor = currentGrossWd > 0 ? ((currentGrossWod * rawValue) / 100) / currentGrossWd : 1;
          break;
        default:
          factor = 1;
      }

      return prev.map((row) => {
        const nextRate = round2(Math.max(0, toNumber(row.rate, 0) * factor));
        return {
          ...row,
          rate: nextRate,
          taxAmount: calculateTaxAmount(row.stock, nextRate, row.discountPerc, row.taxPerc),
        };
      });
    });
  };

  const applySearchFilters = (rowsSource) =>
    (rowsSource || []).map((row) => ({
      ...row,
      selected: false,
      taxPerc: selectedTaxPerc,
      taxAmount: calculateTaxAmount(row.stock, row.rate, row.discountPerc, selectedTaxPerc),
    }));

  const mergeGridRows = useCallback(
    (currentRows, incomingRows) => {
      const mergedMap = new Map((currentRows || []).map((row) => [row.id, row]));

      (incomingRows || []).forEach((row) => {
        const existing = mergedMap.get(row.id);
        mergedMap.set(row.id, {
          ...existing,
          ...row,
          stock: existing ? existing.stock : row.stock,
          availableQty: row.availableQty ?? existing?.availableQty ?? row.stock,
          rate: existing ? existing.rate : row.rate,
          discountPerc: existing ? existing.discountPerc : row.discountPerc,
          taxAmount: existing ? existing.taxAmount : row.taxAmount,
          taxPerc: existing ? existing.taxPerc : row.taxPerc ?? selectedTaxPerc,
        });
      });

      return [...mergedMap.values()];
    },
    [selectedTaxPerc]
  );

  const getRowAmounts = (row) => {
    const availableQty = Math.max(0, toInt(row.availableQty ?? row.stock, 0));
    const qty = Math.max(0, Math.min(toInt(row.stock, 0), availableQty));
    const rate = Math.max(0, toNumber(row.rate, 0));
    const discountPerc = Math.max(0, toNumber(row.discountPerc, 0));
    const taxable = round2(qty * rate);
    const discount = calculateDiscountAmount(qty, rate, discountPerc);
    const tax = round2(Math.max(0, toNumber(row.taxAmount, 0)));
    const taxPerc = calculateTaxBase(qty, rate, discountPerc) > 0
      ? round2((tax / calculateTaxBase(qty, rate, discountPerc)) * 100)
      : 0;
    const amount = round2(taxable - discount + tax);
    return { qty, discount, tax, taxPerc, amount };
  };

  const filteredGridRows = useMemo(() => {
    return gridRows.filter((row) => {
      const calculated = getRowAmounts(row);
      const checks = [
        [stockTableFilters.barcode, row.barcode],
        [stockTableFilters.invoiceNo, row.invoiceNo],
        [stockTableFilters.productName, row.productName],
        [stockTableFilters.designNo, row.designNo],
        [stockTableFilters.qty, calculated.qty],
        [stockTableFilters.rate, toNumber(row.rate).toFixed(2)],
        [stockTableFilters.discountPerc, toNumber(row.discountPerc).toFixed(2)],
        [stockTableFilters.taxPerc, toNumber(row.taxPerc).toFixed(2)],
        [stockTableFilters.discount, calculated.discount.toFixed(2)],
        [stockTableFilters.tax, calculated.tax.toFixed(2)],
        [stockTableFilters.amount, calculated.amount.toFixed(2)],
      ];

      return checks.every(([needle, haystack]) => {
        if (!needle) return true;
        return normalizeText(haystack).includes(normalizeText(needle));
      });
    });
  }, [gridRows, stockTableFilters]);

  const handleSearchStock = async () => {
    const barcode = String(header.barcodeSearch || "").trim();
    const invoiceNo = String(header.invoiceSearch || "").trim();
    const entryNo = String(header.entrySearch || "").trim();
    const needsBarcode = isReturnDebitNote;

    if (needsBarcode && !barcode) {
      setToast({
        open: true,
        type: "warning",
        message: "Enter Barcode to search",
      });
      return;
    }

    if (!needsBarcode && !invoiceNo && !entryNo) {
      setToast({
        open: true,
        type: "warning",
        message: "Enter Invoice No or Entry No to search",
      });
      return;
    }

    setHasSearched(true);
    setSearchingStock(true);
    try {
      const latestRows = await loadStockRows({
        barcode: needsBarcode ? barcode : "",
        invoiceNo: needsBarcode ? "" : invoiceNo,
        entryNo: needsBarcode ? "" : entryNo,
      });
      const normalizedRows = applySearchFilters(latestRows);
      setGridRows((prev) => mergeGridRows(prev, normalizedRows));
    } catch (err) {
      console.error("Failed to search stock:", err);
      setToast({
        open: true,
        type: "error",
        message: "Failed to search stock",
      });
    } finally {
      setSearchingStock(false);
    }
  };

  const handleRemoveRow = (id) => {
    setGridRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleRowValueChange = (id, field, rawValue) => {
    setGridRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const next = { ...row };
        const availableQty = Math.max(0, toInt(row.availableQty ?? row.stock, 0));

        if (field === "stock") {
          next.stock = Math.max(0, Math.min(availableQty, toInt(rawValue, 0)));
          next.taxAmount = calculateTaxAmount(next.stock, next.rate, next.discountPerc, next.taxPerc);
          return next;
        }
        if (field === "rate") {
          next.rate = Math.max(0, toNumber(rawValue, 0));
          next.taxAmount = calculateTaxAmount(next.stock, next.rate, next.discountPerc, next.taxPerc);
          return next;
        }
        if (field === "discountPerc") {
          next.discountPerc = Math.max(0, toNumber(rawValue, 0));
          next.taxAmount = calculateTaxAmount(next.stock, next.rate, next.discountPerc, next.taxPerc);
          return next;
        }
        if (field === "taxPerc") {
          next.taxPerc = Math.max(0, toNumber(rawValue, 0));
          next.taxAmount = calculateTaxAmount(next.stock, next.rate, next.discountPerc, next.taxPerc);
          return next;
        }
        if (field === "taxAmount") {
          next.taxAmount = round2(Math.max(0, toNumber(rawValue, 0)));
          const taxBase = calculateTaxBase(next.stock, next.rate, next.discountPerc);
          next.taxPerc = taxBase > 0 ? round2((next.taxAmount / taxBase) * 100) : 0;
          return next;
        }

        return row;
      })
    );
  };

  const handleStockTableFilterChange = (e) => {
    const { name, value } = e.target;
    setStockTableFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applySavedReturnToRows = useCallback((rowsSource, returnedRows) => {
    const returnedMap = new Map((returnedRows || []).map((row) => [row.id, row]));

    return (rowsSource || []).flatMap((row) => {
      const returnedRow = returnedMap.get(row.id);
      if (!returnedRow) return [row];

      const nextAvailableQty = Math.max(0, toInt(row.availableQty ?? row.stock, 0) - returnedRow.returnQty);
      if (nextAvailableQty <= 0) return [];

      const nextQty = Math.min(nextAvailableQty, toInt(row.stock, 0));
      return [{
        ...row,
        availableQty: nextAvailableQty,
        stock: nextQty,
        taxAmount: calculateTaxAmount(nextQty, row.rate, row.discountPerc, row.taxPerc),
      }];
    });
  }, []);

  const buildPayload = () => {
    const packingPrice = toNumber(header.packingPrice, 0);
    const totalReturnPieces = returnRows.reduce((sum, row) => sum + row.returnQty, 0);

    if (packingPrice < 0) {
      return { error: "Packing Price cannot be negative" };
    }
    if (totalReturnPieces <= 0) {
      return { error: "Return quantity must be greater than zero" };
    }

    const invalid = returnRows.find(
      (row) => row.returnQty <= 0 || row.returnQty > Math.max(0, toInt(row.availableQty ?? row.stock, 0))
    );
    if (invalid) {
      return { error: `Invalid return quantity for barcode ${invalid.barcode}` };
    }

    const supplierIds = [...new Set(returnRows.map((row) => row.supplierId).filter(Boolean))];
    const companyIds = [...new Set(returnRows.map((row) => row.companyId).filter(Boolean))];
    const interstateVals = [...new Set(returnRows.map((row) => !!row.interstate))];

    return {
      payload: {
        type: header.type || "Return-Debit Note",
        returnDate: header.date,
        returnBundles: 0,
        returnPieces: totalReturnPieces,
        returnBoxes: 0,
        packingPrice,
        companyId: header.companyId || header.supplierCompanyId || (companyIds.length === 1 ? companyIds[0] : null),
        supplierId: header.supplierId || (supplierIds.length === 1 ? supplierIds[0] : null),
        transportId: header.transportId || null,
        taxId: header.taxId || null,
        interstate: interstateVals.length === 1 ? interstateVals[0] : false,
        remarks: header.remarks || null,
        items: returnRows.map((row) => ({
          barcodeId: row.barcodeId,
          inventoryItemId: row.inventoryItemId,
          barcode: row.barcode,
          productName: row.productName,
          designNo: row.designNo,
          returnQty: row.returnQty,
          rate: row.rate,
          discountPerc: row.discountPerc,
          taxId: header.taxId || null,
          taxPerc: row.taxPerc || 0,
        })),
      },
    };
  };

  const printReturn = (savedRow) => {
    const itemRows = (savedRow.items || [])
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.barcode || "-"}</td>
            <td>${item.product_name || "-"}</td>
            <td>${item.design_no || "-"}</td>
            <td>${item.return_bundles || 0}</td>
            <td>${item.return_pieces || 0}</td>
            <td>${item.return_qty || 0}</td>
            <td style="text-align:right;">${toNumber(item.amount).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>Purchase Return ${savedRow.return_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h2 { margin: 0 0 8px 0; }
            .meta { margin-bottom: 16px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background: #f3f4f6; text-align: left; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <h2>Purchase Return</h2>
          <div class="meta">
            <div><strong>Return No:</strong> ${savedRow.return_no}</div>
            <div><strong>Date:</strong> ${savedRow.return_date}</div>
            <div><strong>Company:</strong> ${savedRow.company?.name || "-"}</div>
            <div><strong>Supplier:</strong> ${savedRow.supplier?.name || "-"}</div>
            <div><strong>Transport:</strong> ${savedRow.transport?.name || "-"}</div>
            <div><strong>Return Bundles:</strong> ${savedRow.return_bundles || 0}</div>
            <div><strong>Return Pieces:</strong> ${savedRow.return_pieces || 0}</div>
            <div><strong>Return Boxes:</strong> ${savedRow.return_boxes || 0}</div>
            <div><strong>Packing Price:</strong> ${toNumber(savedRow.packing_price).toFixed(2)}</div>
            <div><strong>Total Qty:</strong> ${savedRow.total_qty || 0}</div>
            <div><strong>Total Amount:</strong> ${toNumber(savedRow.total_amount).toFixed(2)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Barcode</th>
                <th>Product</th>
                <th>Design</th>
                <th>Bundles</th>
                <th>Pieces</th>
                <th>Qty</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </body>
      </html>
    `;

    printHtml(html, {
      label: `PurchaseReturn-${savedRow.return_no || "print"}`,
      docType: "purchase_return",
      companyId: Number(savedRow.company_id || savedRow.company?.id || 0) || undefined,
      copies: 1,
    });
  };

  const saveReturn = async (withPrint = false) => {
    const { payload, error } = buildPayload();
    if (error) {
      setToast({ open: true, type: "warning", message: error });
      return;
    }

    setSaving(true);
    try {
      const returnedRows = [...returnRows];
      const res = await api.post("/purchase-returns", payload);
      const saved = res.data?.data;
      setToast({ open: true, type: "success", message: "Purchase Return Sucess" });
      setGridRows((prev) => applySavedReturnToRows(prev, returnedRows));
      const latestRows = await loadStockRows({
        barcode: isReturnDebitNote ? header.barcodeSearch : "",
        invoiceNo: isReturnDebitNote ? "" : header.invoiceSearch,
        entryNo: isReturnDebitNote ? "" : header.entrySearch,
        suppressToast: true,
      });
      setHasSearched(true);
      const normalizedRows = applySearchFilters(latestRows);
      setGridRows((prev) => mergeGridRows(prev, normalizedRows));
      if (withPrint && saved) {
        printReturn(saved);
      }
    } catch (err) {
      console.error("Failed to save purchase return:", err);
      setToast({
        open: true,
        type: "error",
        message: err.response?.data?.message || "Failed to save purchase return",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSkeleton variant="form" rows={10} />;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" sx={{ alignItems: "center" }}>
          <Button
            onClick={() => navigate(-1)}
            aria-label="Back"
            sx={{ minWidth: "auto", mr: 1.5, p: 0.5, color: "text.secondary" }}
          >
            <ArrowLeft size={16} />
          </Button>
          <Breadcrumbs
            sx={{ fontSize: 12.25, fontWeight: 600 }}
            items={[
              { label: "Warehouse", onClick: () => navigate("/warehouse") },
              { label: "Purchase Return" },
            ]}
          />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ fontSize: 12.25 }}>
          <Button onClick={() => saveReturn(false)} disabled={saving} className="glass-btn glass-btn-success" startIcon={<Save size={16} />} sx={{ opacity: saving ? 0.6 : 1 }}>
            Return & Save
          </Button>
          <Button onClick={() => saveReturn(true)} disabled={saving} className="glass-btn glass-btn-primary" sx={{ opacity: saving ? 0.6 : 1 }}>
            Save & Print
          </Button>
          <Button className="glass-btn glass-btn-primary" onClick={() => navigate("/warehouse/purchase-return/search")} startIcon={<Search size={16} />}>
            Search
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flex: 1, p: 2, overflowY: "auto" }}>
        <Stack spacing={2} sx={{ width: "25%" }}>
          <Stack spacing={1.5} sx={{ bgcolor: "background.paper", p: 2, borderRadius: "7px", boxShadow: 3, border: "1px solid", borderColor: "divider" }}>
            <TextField
              label="Date"
              name="date"
              type="date"
              value={header.date}
              onChange={handleHeaderChange}
              inline
            />

            <SelectField
              label="Type"
              name="type"
              value={header.type}
              onChange={handleHeaderChange}
              options={PURCHASE_RETURN_TYPE_OPTIONS}
              inline
            />

            {isReturnDebitNote ? (
              <>
                <SelectField
                  label="Mode"
                  name="mode"
                  value={header.mode}
                  onChange={handleHeaderChange}
                  options={RETURN_MODE_OPTIONS}
                  inline
                />

                <SelectField
                  label="Stock Location"
                  name="stockLocation"
                  value={header.stockLocation}
                  onChange={handleHeaderChange}
                  options={stockLocationOptions}
                  inline
                />

                <SelectField
                  label="Company"
                  name="companyId"
                  value={header.companyId}
                  onChange={handleHeaderChange}
                  options={companyOptions}
                  inline
                />

                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <TextField
                    label="BAR CODE"
                    name="barcodeSearch"
                    value={header.barcodeSearch}
                    onChange={handleHeaderChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchStock();
                      }
                    }}
                    placeholder="Scan or write barcode"
                    inline
                    sx={{ flex: 1 }}
                  />
                  <Button
                    type="button"
                    onClick={handleSearchStock}
                    disabled={searchingStock}
                    className="glass-btn glass-btn-primary"
                    sx={{ opacity: searchingStock ? 0.6 : 1, fontSize: 12.25 }}
                  >
                    {searchingStock ? "Searching..." : "Search"}
                  </Button>
                </Stack>

                {isSupplierMode ? (
                  <>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Typography component="label" sx={{ width: 112, flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Supplier</Typography>
                      <Box sx={{ flex: 1 }}>
                        <AsyncSearchSelect
                          name="supplierId"
                          value={header.supplierId}
                          onChange={handleHeaderChange}
                          options={supplierOptions}
                          onAsyncSearch={handleAsyncSupplierSearch}
                          placeholder="Select"
                          searchPlaceholder="Search suppliers..."
                        />
                      </Box>
                    </Stack>

                    <SelectField
                      label="Supplier Company"
                      name="supplierCompanyId"
                      value={header.supplierCompanyId}
                      onChange={handleHeaderChange}
                      options={companyOptions}
                      inline
                    />

                    <SelectField
                      label="Ship to Company"
                      name="shipToCompanyId"
                      value={header.shipToCompanyId}
                      onChange={handleHeaderChange}
                      options={companyOptions}
                      inline
                    />

                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Typography component="label" sx={{ width: 112, flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Agent</Typography>
                      <Box sx={{ flex: 1 }}>
                        <AsyncSearchSelect
                          name="agentId"
                          value={header.agentId}
                          onChange={handleHeaderChange}
                          options={agentOptions}
                          onAsyncSearch={handleAsyncAgentSearch}
                          placeholder="Select"
                          searchPlaceholder="Search agents..."
                        />
                      </Box>
                    </Stack>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <TextField
                    label="Invoice No"
                    name="invoiceSearch"
                    value={header.invoiceSearch}
                    onChange={handleHeaderChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchStock();
                      }
                    }}
                    placeholder="Search invoice no"
                    inline
                    sx={{ flex: 1 }}
                  />
                  <Button
                    type="button"
                    onClick={handleSearchStock}
                    disabled={searchingStock}
                    className="glass-btn glass-btn-primary"
                    sx={{ opacity: searchingStock ? 0.6 : 1, fontSize: 12.25 }}
                  >
                    {searchingStock ? "Searching..." : "Search"}
                  </Button>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <TextField
                    label="Entry No"
                    name="entrySearch"
                    value={header.entrySearch}
                    onChange={handleHeaderChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchStock();
                      }
                    }}
                    placeholder="Search entry no"
                    inline
                    sx={{ flex: 1 }}
                  />
                  <Button
                    type="button"
                    onClick={handleSearchStock}
                    disabled={searchingStock}
                    className="glass-btn glass-btn-primary"
                    sx={{ opacity: searchingStock ? 0.6 : 1, fontSize: 12.25 }}
                  >
                    {searchingStock ? "Searching..." : "Search"}
                  </Button>
                </Stack>

                <SelectField
                  label="Discount"
                  name="discountMode"
                  value={header.discountMode}
                  onChange={handleHeaderChange}
                  options={DISCOUNT_MODE_OPTIONS}
                  inline
                />

                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <TextField
                    label="Value"
                    name="discountValue"
                    value={header.discountValue}
                    onChange={handleHeaderChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleDiscountApply();
                      }
                    }}
                    placeholder="Enter value"
                    inline
                    sx={{ flex: 1 }}
                  />
                  <Button
                    type="button"
                    onClick={handleDiscountApply}
                    className="glass-btn glass-btn-success"
                    sx={{ fontSize: 12.25 }}
                  >
                    Apply
                  </Button>
                </Stack>
              </>
            )}
          </Stack>

          {isReturnDebitNote ? (
            <Box sx={{ bgcolor: "background.paper", height: 300, p: 2, borderRadius: "7px", boxShadow: 3, border: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1.4fr 90px 80px", gap: 1.5, fontSize: 10.5, fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: 1, borderColor: "divider", pb: 1, flexShrink: 0 }}>
                <Box>Supplier</Box>
                <Box>Interstate</Box>
                <Box sx={{ textAlign: "right" }}>Qty</Box>
              </Box>
              <Box sx={{ mt: 1, flex: 1, overflowY: "auto", pr: 0.5 }}>
                {supplierSummaries.length === 0 ? (
                  <Box sx={{ py: 3, fontSize: 12.25, textAlign: "center", color: "text.secondary" }}>
                    Search a barcode to view supplier details.
                  </Box>
                ) : (
                  supplierSummaries.map((row, index) => (
                    <Box
                      key={`${row.supplier}-${row.interstate}-${index}`}
                      sx={{ display: "grid", gridTemplateColumns: "1.4fr 90px 80px", gap: 1.5, alignItems: "center", py: 1, fontSize: 12.25, borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 } }}
                    >
                      <Box sx={{ fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.supplier}</Box>
                      <Box sx={{ color: "text.secondary" }}>{row.interstate}</Box>
                      <Box sx={{ textAlign: "right", fontWeight: 500, color: "text.primary" }}>{row.qty}</Box>
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          ) : null}
        </Stack>

        <Box sx={{ width: "75%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ flex: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, overflow: "auto" }}>
            <Box sx={{ minWidth: 1046 }}>
              <Table sx={{ tableLayout: "fixed" }}>
                <colgroup>
                  {STOCK_TABLE_WIDTHS.map((width, index) => (
                    <col key={`stock-head-col-${index}`} style={{ width }} />
                  ))}
                </colgroup>
                <TableHead sx={(theme) => ({ bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), fontSize: 10.5, fontWeight: 600, color: "text.secondary", textTransform: "uppercase" })}>
                  <TableRow>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "left" }}>Barcode</TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "left" }}>Inv No</TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "left" }}>Product</TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "left" }}>Design</TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "center" }}>Qty</TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "right" }}>Rate</TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "center" }}>Discount %</TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "center" }}>Tax %</TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "right" }}>Discount</TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "right" }}>Tax</TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "right" }}>Amount</TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "center" }}>Action</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: "background.paper" }}>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", p: 0.5 }}>
                      <GridCellInput align="left" name="barcode" value={stockTableFilters.barcode} onChange={handleStockTableFilterChange} placeholder="Barcode" />
                    </TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", p: 0.5 }}>
                      <GridCellInput align="left" name="invoiceNo" value={stockTableFilters.invoiceNo} onChange={handleStockTableFilterChange} placeholder="Inv No" />
                    </TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", p: 0.5 }}>
                      <GridCellInput align="left" name="productName" value={stockTableFilters.productName} onChange={handleStockTableFilterChange} placeholder="Product" />
                    </TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", p: 0.5 }}>
                      <GridCellInput align="left" name="designNo" value={stockTableFilters.designNo} onChange={handleStockTableFilterChange} placeholder="Design" />
                    </TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", p: 0.5 }}>
                      <GridCellInput name="qty" value={stockTableFilters.qty} onChange={handleStockTableFilterChange} placeholder="Qty" />
                    </TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", p: 0.5 }}>
                      <GridCellInput align="right" name="rate" value={stockTableFilters.rate} onChange={handleStockTableFilterChange} placeholder="Rate" />
                    </TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", p: 0.5 }}>
                      <GridCellInput name="discountPerc" value={stockTableFilters.discountPerc} onChange={handleStockTableFilterChange} placeholder="Dis %" />
                    </TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", p: 0.5 }}>
                      <GridCellInput name="taxPerc" value={stockTableFilters.taxPerc} onChange={handleStockTableFilterChange} placeholder="Tax %" />
                    </TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", p: 0.5 }}>
                      <GridCellInput align="right" name="discount" value={stockTableFilters.discount} onChange={handleStockTableFilterChange} placeholder="Discount" />
                    </TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", p: 0.5 }}>
                      <GridCellInput align="right" name="tax" value={stockTableFilters.tax} onChange={handleStockTableFilterChange} placeholder="Tax" />
                    </TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider", p: 0.5 }}>
                      <GridCellInput align="right" name="amount" value={stockTableFilters.amount} onChange={handleStockTableFilterChange} placeholder="Amount" />
                    </TableCell>
                    <TableCell sx={{ border: "1px solid", borderColor: "divider" }} />
                  </TableRow>
                </TableHead>
              </Table>

              <Box sx={{ height: 600, overflowY: "auto" }}>
                {filteredGridRows.length === 0 ? (
                  <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", p: 4, color: "text.secondary" }}>
                    {gridRows.length === 0
                      ? hasSearched
                      ? "No stock rows found for this search."
                      : isReturnDebitNote
                      ? "Search by barcode to load return rows."
                      : "Search by Invoice No or Entry No to load return rows."
                      : "No rows match the current table filters."}
                  </Box>
                ) : (
                  <Table sx={{ tableLayout: "fixed" }}>
                    <colgroup>
                      {STOCK_TABLE_WIDTHS.map((width, index) => (
                        <col key={`stock-body-col-${index}`} style={{ width }} />
                      ))}
                    </colgroup>
                    <TableBody>
                      {filteredGridRows.map((row) => {
                        const calculated = getRowAmounts(row);

                        return (
                          <TableRow
                            key={row.id}
                            sx={{ fontSize: 12.25, borderBottom: 1, borderColor: "divider", "&:hover": { bgcolor: "action.hover" } }}
                          >
                            <TableCell sx={{ px: 1, py: 0.75, fontSize: 11, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid", borderColor: "divider", color: "text.primary" }}>
                              {row.barcode}
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 0.75, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid", borderColor: "divider", color: "text.primary" }}>
                              {row.invoiceNo}
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid", borderColor: "divider", color: "text.primary" }}>
                              {row.productName}
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "1px solid", borderColor: "divider", color: "text.primary" }}>
                              {row.designNo}
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 0.75, borderRight: "1px solid", borderColor: "divider" }}>
                              <GridCellInput
                                type="number"
                                slotProps={{ htmlInput: { min: 0, max: Math.max(0, toInt(row.availableQty ?? row.stock, 0)) } }}
                                value={toInt(row.stock, 0)}
                                onChange={(event) => handleRowValueChange(row.id, "stock", event.target.value)}
                              />
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 0.75, borderRight: "1px solid", borderColor: "divider" }}>
                              <GridCellInput
                                align="right"
                                type="number"
                                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                value={toNumber(row.rate, 0)}
                                onChange={(event) => handleRowValueChange(row.id, "rate", event.target.value)}
                              />
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 0.75, borderRight: "1px solid", borderColor: "divider" }}>
                              <GridCellInput
                                type="number"
                                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                value={toNumber(row.discountPerc, 0)}
                                onChange={(event) => handleRowValueChange(row.id, "discountPerc", event.target.value)}
                              />
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 0.75, borderRight: "1px solid", borderColor: "divider" }}>
                              <GridCellInput
                                type="number"
                                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                value={toNumber(row.taxPerc, 0)}
                                onChange={(event) => handleRowValueChange(row.id, "taxPerc", event.target.value)}
                              />
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 0.75, textAlign: "right", borderRight: "1px solid", borderColor: "divider", color: "text.primary" }}>
                              {calculated.discount.toFixed(2)}
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 0.75, borderRight: "1px solid", borderColor: "divider" }}>
                              <GridCellInput
                                align="right"
                                type="number"
                                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                value={toNumber(row.taxAmount, 0)}
                                onChange={(event) => handleRowValueChange(row.id, "taxAmount", event.target.value)}
                              />
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 0.75, textAlign: "right", fontWeight: 500, borderRight: "1px solid", borderColor: "divider", color: "text.primary" }}>
                              {calculated.amount.toFixed(2)}
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 0.75 }}>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Box
                                  component="button"
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleRemoveRow(row.id);
                                  }}
                                  aria-label={`Remove ${row.barcode}`}
                                  sx={{ color: "error.main", border: 0, bgcolor: "transparent", cursor: "pointer", display: "flex", "&:hover": { color: "error.dark" } }}
                                >
                                  <Trash2 size={14} />
                                </Box>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Box>
            </Box>
          </Box>

          <Box sx={{ mt: 1, bgcolor: "background.paper", p: 1.5, borderRadius: "7px", boxShadow: 3, border: "1px solid", borderColor: "divider", display: "grid", gridTemplateColumns: "0.95fr 0.8fr 0.95fr", gap: 1.5 }}>
            <Stack spacing={1}>
              <InlineTextField
                label="Packing Price"
                name="packingPrice"
                type="number"
                value={header.packingPrice}
                onChange={handleHeaderChange}
                maxWidth={120}
              />
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography component="label" sx={{ width: 96, flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Tax</Typography>
                <Box sx={{ maxWidth: 180, width: "100%" }}>
                  <AsyncSearchSelect
                    name="taxId"
                    value={header.taxId}
                    onChange={handleHeaderChange}
                    options={taxOptions}
                    onAsyncSearch={handleAsyncTaxSearch}
                    placeholder="Select"
                    searchPlaceholder="Search taxes..."
                  />
                </Box>
              </Stack>
              <InlineTextField
                label="Remarks"
                name="remarks"
                value={header.remarks}
                onChange={handleHeaderChange}
                maxWidth={220}
              />
            </Stack>

            <Stack spacing={0.5}>
              <Stack direction="row" sx={{ justifyContent: "space-between", fontSize: 13 }}>
                <Box component="span" sx={{ color: "text.secondary" }}>Amount</Box>
                <Box component="span" sx={{ fontWeight: 500, color: "text.primary" }}>{tableTotals.amount.toFixed(2)}</Box>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between", fontSize: 13 }}>
                <Box component="span" sx={{ color: "text.secondary" }}>Discount</Box>
                <Box component="span" sx={{ fontWeight: 500, color: "text.primary" }}>{tableTotals.discount.toFixed(2)}</Box>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between", fontSize: 13 }}>
                <Box component="span" sx={{ color: "text.secondary" }}>Tax</Box>
                <Box component="span" sx={{ fontWeight: 500, color: "text.primary" }}>{tableTotals.tax.toFixed(2)}</Box>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between", fontSize: 13 }}>
                <Box component="span" sx={{ color: "text.secondary" }}>Freight Tax</Box>
                <Box component="span" sx={{ fontWeight: 500, color: "text.primary" }}>{tableTotals.freightTax.toFixed(2)}</Box>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between", fontSize: 13 }}>
                <Box component="span" sx={{ color: "text.secondary" }}>Total</Box>
                <Box component="span" sx={{ fontWeight: 600, color: "error.main" }}>{tableTotals.total.toFixed(2)}</Box>
              </Stack>
              <Box sx={{ fontSize: 11, color: "text.secondary", pt: 0.75, borderTop: 1, borderColor: "divider" }}>
                Note: Freight Tax is calculated from Packing Price and selected Tax %.
              </Box>
            </Stack>

            <Stack spacing={1}>
              <Stack direction="row" sx={{ justifyContent: "space-between", fontSize: 13 }}>
                <Box component="span" sx={{ color: "text.secondary" }}>Total Qty</Box>
                <Box component="span" sx={{ fontWeight: 500, color: "text.primary" }}>{tableTotals.totalQty}</Box>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between", fontSize: 13 }}>
                <Box component="span" sx={{ color: "text.secondary" }}>Total Piece</Box>
                <Box component="span" sx={{ fontWeight: 500, color: "text.primary" }}>{tableTotals.totalPiece}</Box>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between", fontSize: 13 }}>
                <Box component="span" sx={{ color: "text.secondary" }}>Gross</Box>
                <Box component="span" sx={{ fontWeight: 500, color: "text.primary" }}>{tableTotals.gross.toFixed(2)}</Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography component="label" sx={{ width: 96, flexShrink: 0, fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Transport</Typography>
                <Box sx={{ maxWidth: 180, width: "100%" }}>
                  <AsyncSearchSelect
                    name="transportId"
                    value={header.transportId}
                    onChange={handleHeaderChange}
                    options={transports.map((t) => ({ value: String(t.id), label: t.name }))}
                    onAsyncSearch={handleAsyncTransportSearch}
                    placeholder="Select"
                    searchPlaceholder="Search transports..."
                  />
                </Box>
              </Stack>
              <InlineTextField
                label="LR No"
                name="lrNo"
                value={header.lrNo}
                onChange={handleHeaderChange}
                maxWidth={140}
              />
              <InlineTextField
                label="Date"
                name="lrDate"
                type="date"
                value={header.lrDate}
                onChange={handleHeaderChange}
                maxWidth={160}
              />
            </Stack>
          </Box>
        </Box>
      </Stack>

      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
};

export default PurchaseReturn;
