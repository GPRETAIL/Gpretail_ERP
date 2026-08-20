import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Save, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import PageSkeleton from "../../components/PageSkeleton";
import { usePrintContext } from "../../context/PrintContext";

const SelectField = ({
  label,
  name,
  value,
  onChange,
  options,
  className = "",
  inline = false,
  labelClassName = "",
  fieldClassName = "",
}) => (
  <div className={`${inline ? "flex items-center gap-2" : ""} ${className}`}>
    <label
      className={`${inline ? "w-28 shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300" : "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"} ${labelClassName}`}
    >
      {label}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={`${inline ? "flex-1" : "w-full"} border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 ${fieldClassName}`}
    >
      <option value="">Select</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const TextField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  className = "",
  placeholder = "",
  onKeyDown,
  inline = false,
  labelClassName = "",
  fieldClassName = "",
}) => (
  <div className={`${inline ? "flex items-center gap-2" : ""} ${className}`}>
    <label
      className={`${inline ? "w-28 shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300" : "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"} ${labelClassName}`}
    >
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={`${inline ? "flex-1" : "w-full"} border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 ${fieldClassName}`}
    />
  </div>
);

const InlineTextField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  className = "",
  inputClassName = "",
  labelClassName = "",
}) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <label className={`w-24 shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300 ${labelClassName}`}>{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 ${inputClassName}`}
    />
  </div>
);

const InlineSelectField = ({ label, name, value, onChange, options, className = "", selectClassName = "" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <label className="w-24 shrink-0 text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 ${selectClassName}`}
    >
      <option value="">Select</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const STOCK_TABLE_COLUMNS = [
  "w-[132px]",
  "w-[84px]",
  "w-[132px]",
  "w-[88px]",
  "w-[62px]",
  "w-[72px]",
  "w-[74px]",
  "w-[66px]",
  "w-[82px]",
  "w-[78px]",
  "w-[88px]",
  "w-[46px]",
];

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
      api.get("/taxes"),
      api.get("/transports"),
      api.get("/companies").catch(() => ({ data: { data: [] } })),
      api.get("/suppliers", { params: { all: "true" } }).catch(() => ({ data: { data: [] } })),
      api.get("/agents", { params: { all: "true" } }).catch(() => ({ data: { data: [] } })),
    ]);
    setTaxes(taxRes.data?.data || taxRes.data || []);
    setTransports(transportRes.data?.data || []);
    setCompanies(companyRes.data?.data || companyRes.data || []);
    setSuppliers(supplierRes.data?.data || supplierRes.data || []);
    setAgents(agentRes.data?.data || agentRes.data || []);
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/warehouse")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Warehouse
            </button>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-gray-800 dark:text-gray-100">Purchase Return</span>
          </h1>
        </div>
        <div className="flex space-x-2 text-sm">
          <button
            onClick={() => saveReturn(false)}
            disabled={saving}
            className="glass-btn glass-btn-success flex items-center disabled:opacity-60"
          >
            <Save className="w-4 h-4 mr-1" /> Return & Save
          </button>
          <button
            onClick={() => saveReturn(true)}
            disabled={saving}
            className="glass-btn glass-btn-primary flex items-center disabled:opacity-60"
          >
            Save & Print
          </button>
          <button
            className="glass-btn glass-btn-primary flex items-center"
            onClick={() => navigate("/warehouse/purchase-return/search")}
          >
            <Search className="w-4 h-4 mr-1" /> Search
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto flex gap-2">
        <div className="w-[25%] space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 space-y-3">
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

                <div className="flex items-center gap-2">
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
                    className="flex-1"
                    inline
                  />
                  <button
                    type="button"
                    onClick={handleSearchStock}
                    disabled={searchingStock}
                    className="glass-btn glass-btn-primary disabled:opacity-60"
                  >
                    {searchingStock ? "Searching..." : "Search"}
                  </button>
                </div>

                {isSupplierMode ? (
                  <>
                    <SelectField
                      label="Supplier"
                      name="supplierId"
                      value={header.supplierId}
                      onChange={handleHeaderChange}
                      options={supplierOptions}
                      inline
                    />

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

                    <SelectField
                      label="Agent"
                      name="agentId"
                      value={header.agentId}
                      onChange={handleHeaderChange}
                      options={agentOptions}
                      inline
                    />
                  </>
                ) : null}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
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
                    className="flex-1"
                    inline
                  />
                  <button
                    type="button"
                    onClick={handleSearchStock}
                    disabled={searchingStock}
                    className="glass-btn glass-btn-primary disabled:opacity-60"
                  >
                    {searchingStock ? "Searching..." : "Search"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
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
                    className="flex-1"
                    inline
                  />
                  <button
                    type="button"
                    onClick={handleSearchStock}
                    disabled={searchingStock}
                    className="glass-btn glass-btn-primary disabled:opacity-60"
                  >
                    {searchingStock ? "Searching..." : "Search"}
                  </button>
                </div>

                <SelectField
                  label="Discount"
                  name="discountMode"
                  value={header.discountMode}
                  onChange={handleHeaderChange}
                  options={DISCOUNT_MODE_OPTIONS}
                  inline
                />

                <div className="flex items-center gap-2">
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
                    className="flex-1"
                    inline
                  />
                  <button
                    type="button"
                    onClick={handleDiscountApply}
                    className="glass-btn glass-btn-success"
                  >
                    Apply
                  </button>
                </div>
              </>
            )}
          </div>

          {isReturnDebitNote ? (
            <div className="bg-white dark:bg-gray-800 h-[300px] p-4 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 flex flex-col">
              <div className="grid grid-cols-[1.4fr_90px_80px] gap-3 text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide border-b dark:border-gray-700 pb-2 shrink-0">
                <div>Supplier</div>
                <div>Interstate</div>
                <div className="text-right">Qty</div>
              </div>
              <div className="mt-2 flex-1 overflow-y-auto pr-1">
                {supplierSummaries.length === 0 ? (
                  <div className="py-6 text-sm text-center text-gray-500 dark:text-gray-400">
                    Search a barcode to view supplier details.
                  </div>
                ) : (
                  supplierSummaries.map((row, index) => (
                    <div
                      key={`${row.supplier}-${row.interstate}-${index}`}
                      className="grid grid-cols-[1.4fr_90px_80px] gap-3 items-center py-2 text-sm border-b border-gray-100 dark:border-gray-700/50 last:border-b-0"
                    >
                      <div className="font-medium text-gray-800 dark:text-gray-100 truncate">{row.supplier}</div>
                      <div className="text-gray-700 dark:text-gray-300">{row.interstate}</div>
                      <div className="text-right font-medium text-gray-800 dark:text-gray-100">{row.qty}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="w-[75%] flex flex-col">
          <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm overflow-auto">
            <div className="min-w-[1046px]">
              <table className="w-full border-collapse table-fixed">
                <colgroup>
                  {STOCK_TABLE_COLUMNS.map((widthClass, index) => (
                    <col key={`stock-head-col-${index}`} className={widthClass} />
                  ))}
                </colgroup>
                <thead className="bg-blue-50 dark:bg-blue-900/30 text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  <tr>
                    <th className="p-2 border-b border-r border-gray-300 dark:border-gray-700 text-left">Barcode</th>
                    <th className="p-2 border-b border-r border-gray-300 dark:border-gray-700 text-left">Inv No</th>
                    <th className="p-2 border-b border-r border-gray-300 dark:border-gray-700 text-left">Product</th>
                    <th className="p-2 border-b border-r border-gray-300 dark:border-gray-700 text-left">Design</th>
                    <th className="p-2 border-b border-r border-gray-300 dark:border-gray-700 text-center">Qty</th>
                    <th className="p-2 border-b border-r border-gray-300 dark:border-gray-700 text-right">Rate</th>
                    <th className="p-2 border-b border-r border-gray-300 dark:border-gray-700 text-center">Discount %</th>
                    <th className="p-2 border-b border-r border-gray-300 dark:border-gray-700 text-center">Tax %</th>
                    <th className="p-2 border-b border-r border-gray-300 dark:border-gray-700 text-right">Discount</th>
                    <th className="p-2 border-b border-r border-gray-300 dark:border-gray-700 text-right">Tax</th>
                    <th className="p-2 border-b border-r border-gray-300 dark:border-gray-700 text-right">Amount</th>
                    <th className="p-2 border-b border-gray-300 dark:border-gray-700 text-center">Action</th>
                  </tr>
                  <tr className="bg-white dark:bg-gray-800">
                    <th className="p-1.5 border-b border-r border-gray-200 dark:border-gray-700">
                      <input
                        name="barcode"
                        value={stockTableFilters.barcode}
                        onChange={handleStockTableFilterChange}
                        placeholder="Barcode"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] font-normal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="p-1.5 border-b border-r border-gray-200 dark:border-gray-700">
                      <input
                        name="invoiceNo"
                        value={stockTableFilters.invoiceNo}
                        onChange={handleStockTableFilterChange}
                        placeholder="Inv No"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] font-normal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="p-1.5 border-b border-r border-gray-200 dark:border-gray-700">
                      <input
                        name="productName"
                        value={stockTableFilters.productName}
                        onChange={handleStockTableFilterChange}
                        placeholder="Product"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] font-normal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="p-1.5 border-b border-r border-gray-200 dark:border-gray-700">
                      <input
                        name="designNo"
                        value={stockTableFilters.designNo}
                        onChange={handleStockTableFilterChange}
                        placeholder="Design"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] font-normal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100"
                      />
                    </th>
                    <th className="p-1.5 border-b border-r border-gray-200 dark:border-gray-700">
                      <input
                        name="qty"
                        value={stockTableFilters.qty}
                        onChange={handleStockTableFilterChange}
                        placeholder="Qty"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] font-normal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-center"
                      />
                    </th>
                    <th className="p-1.5 border-b border-r border-gray-200 dark:border-gray-700">
                      <input
                        name="rate"
                        value={stockTableFilters.rate}
                        onChange={handleStockTableFilterChange}
                        placeholder="Rate"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] font-normal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-right"
                      />
                    </th>
                    <th className="p-1.5 border-b border-r border-gray-200 dark:border-gray-700">
                      <input
                        name="discountPerc"
                        value={stockTableFilters.discountPerc}
                        onChange={handleStockTableFilterChange}
                        placeholder="Dis %"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] font-normal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-center"
                      />
                    </th>
                    <th className="p-1.5 border-b border-r border-gray-200 dark:border-gray-700">
                      <input
                        name="taxPerc"
                        value={stockTableFilters.taxPerc}
                        onChange={handleStockTableFilterChange}
                        placeholder="Tax %"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] font-normal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-center"
                      />
                    </th>
                    <th className="p-1.5 border-b border-r border-gray-200 dark:border-gray-700">
                      <input
                        name="discount"
                        value={stockTableFilters.discount}
                        onChange={handleStockTableFilterChange}
                        placeholder="Discount"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] font-normal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-right"
                      />
                    </th>
                    <th className="p-1.5 border-b border-r border-gray-200 dark:border-gray-700">
                      <input
                        name="tax"
                        value={stockTableFilters.tax}
                        onChange={handleStockTableFilterChange}
                        placeholder="Tax"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] font-normal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-right"
                      />
                    </th>
                    <th className="p-1.5 border-b border-r border-gray-200 dark:border-gray-700">
                      <input
                        name="amount"
                        value={stockTableFilters.amount}
                        onChange={handleStockTableFilterChange}
                        placeholder="Amount"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] font-normal bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 text-right"
                      />
                    </th>
                    <th className="p-1.5 border-b border-gray-200 dark:border-gray-700" />
                  </tr>
                </thead>
              </table>

              <div className="h-[600px] overflow-y-auto">
                {filteredGridRows.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-8 text-gray-500 dark:text-gray-400">
                    {gridRows.length === 0
                      ? hasSearched
                      ? "No stock rows found for this search."
                      : isReturnDebitNote
                      ? "Search by barcode to load return rows."
                      : "Search by Invoice No or Entry No to load return rows."
                      : "No rows match the current table filters."}
                  </div>
                ) : (
                  <table className="w-full border-collapse table-fixed">
                    <colgroup>
                      {STOCK_TABLE_COLUMNS.map((widthClass, index) => (
                        <col key={`stock-body-col-${index}`} className={widthClass} />
                      ))}
                    </colgroup>
                    <tbody>
                      {filteredGridRows.map((row) => {
                        const calculated = getRowAmounts(row);

                        return (
                          <tr
                            key={row.id}
                            className="text-[12px] border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <td className="px-2 py-1.5 text-[11px] font-mono truncate border-r border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                              {row.barcode}
                            </td>
                            <td className="px-2 py-1.5 text-[11px] truncate border-r border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                              {row.invoiceNo}
                            </td>
                            <td className="px-2 py-1.5 truncate border-r border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                              {row.productName}
                            </td>
                            <td className="px-2 py-1.5 truncate border-r border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                              {row.designNo}
                            </td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-200 dark:border-gray-700">
                              <input
                                type="number"
                                min="0"
                                max={Math.max(0, toInt(row.availableQty ?? row.stock, 0))}
                                value={toInt(row.stock, 0)}
                                onChange={(event) => handleRowValueChange(row.id, "stock", event.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right border-r border-gray-200 dark:border-gray-700">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={toNumber(row.rate, 0)}
                                onChange={(event) => handleRowValueChange(row.id, "rate", event.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-200 dark:border-gray-700">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={toNumber(row.discountPerc, 0)}
                                onChange={(event) => handleRowValueChange(row.id, "discountPerc", event.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-200 dark:border-gray-700">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={toNumber(row.taxPerc, 0)}
                                onChange={(event) => handleRowValueChange(row.id, "taxPerc", event.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right border-r border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                              {calculated.discount.toFixed(2)}
                            </td>
                            <td className="px-2 py-1.5 text-right border-r border-gray-200 dark:border-gray-700">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={toNumber(row.taxAmount, 0)}
                                onChange={(event) => handleRowValueChange(row.id, "taxAmount", event.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-[11px] text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right border-r border-gray-200 dark:border-gray-700 font-medium text-gray-800 dark:text-gray-100">
                              {calculated.amount.toFixed(2)}
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleRemoveRow(row.id);
                                  }}
                                  className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                                  aria-label={`Remove ${row.barcode}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 bg-white dark:bg-gray-800 p-2.5 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 grid grid-cols-[0.95fr_0.8fr_0.95fr] gap-3">
            <div className="space-y-2">
              <InlineTextField
                label="Packing Price"
                name="packingPrice"
                type="number"
                value={header.packingPrice}
                onChange={handleHeaderChange}
                inputClassName="max-w-[120px]"
              />
              <InlineSelectField
                label="Tax"
                name="taxId"
                value={header.taxId}
                onChange={handleHeaderChange}
                options={taxOptions}
                selectClassName="max-w-[180px]"
              />
              <InlineTextField
                label="Remarks"
                name="remarks"
                value={header.remarks}
                onChange={handleHeaderChange}
                inputClassName="max-w-[220px]"
              />
            </div>

            <div className="space-y-1 pt-0">
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-600 dark:text-gray-300">Amount</span>
                <span className="font-medium text-gray-800 dark:text-gray-100">{tableTotals.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-600 dark:text-gray-300">Discount</span>
                <span className="font-medium text-gray-800 dark:text-gray-100">{tableTotals.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-600 dark:text-gray-300">Tax</span>
                <span className="font-medium text-gray-800 dark:text-gray-100">{tableTotals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-600 dark:text-gray-300">Freight Tax</span>
                <span className="font-medium text-gray-800 dark:text-gray-100">{tableTotals.freightTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-600 dark:text-gray-300">Total</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{tableTotals.total.toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1.5 border-t dark:border-gray-700">
                Note: Freight Tax is calculated from Packing Price and selected Tax %.
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-600 dark:text-gray-300">Total Qty</span>
                <span className="font-medium text-gray-800 dark:text-gray-100">{tableTotals.totalQty}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-600 dark:text-gray-300">Total Piece</span>
                <span className="font-medium text-gray-800 dark:text-gray-100">{tableTotals.totalPiece}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-600 dark:text-gray-300">Gross</span>
                <span className="font-medium text-gray-800 dark:text-gray-100">{tableTotals.gross.toFixed(2)}</span>
              </div>
              <InlineSelectField
                label="Transport"
                name="transportId"
                value={header.transportId}
                onChange={handleHeaderChange}
                options={transports.map((t) => ({ value: String(t.id), label: t.name }))}
                selectClassName="max-w-[180px]"
              />
              <InlineTextField
                label="LR No"
                name="lrNo"
                value={header.lrNo}
                onChange={handleHeaderChange}
                inputClassName="max-w-[140px]"
              />
              <InlineTextField
                label="Date"
                name="lrDate"
                type="date"
                value={header.lrDate}
                onChange={handleHeaderChange}
                inputClassName="max-w-[160px]"
              />
            </div>
          </div>
        </div>
      </div>

      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default PurchaseReturn;
