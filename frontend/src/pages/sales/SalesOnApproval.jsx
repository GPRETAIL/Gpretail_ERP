import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, PlusCircle, Save, Search, Trash2, UserRound, X } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import { createGroupFetchers } from "../../utils/serverGrouping";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, Checkbox, Radio, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

// Matches config('pagination.resources.sales_approvals.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchApprovalGroupSummaries, onFetchGroupRows: fetchApprovalGroupRows } =
  createGroupFetchers("/sales-on-approval", { customer_name: "customer_id" });

// Shared shape for both the initial bulk customer preload and async search results below.
// row.mobile_no/gst_no/card_no/email_id don't exist on the /customers API response (the real
// columns/response keys are phone/gstin/loyalty_card_number/email) -- those fields silently read
// as blank/undefined regardless of cache size or search.
const mapCustomerRow = (row, areaMap) => ({
  value: String(row.id),
  id: String(row.id),
  name: row.name || "Unnamed",
  mobileNo: row.phone || "",
  label: `${row.name || "Unnamed"}${row.phone ? ` (${row.phone})` : ""}`,
  dateOfBirth: row.date_of_birth || "",
  billingName: row.billing_name || "",
  cardNo: row.loyalty_card_number || "",
  gstNo: row.gstin || "",
  address: row.address || "",
  cityId: row.city_id ? String(row.city_id) : "",
  cityName: row.city?.name || "",
  stateId: row.state_id ? String(row.state_id) : "",
  stateName: row.state?.name || "",
  customerCategoryId: row.customer_category_id ? String(row.customer_category_id) : "",
  customerCategoryName: row.customerCategory?.name || "",
  emailId: row.email || "",
  areaId: row.area_id ? String(row.area_id) : "",
  areaName: (areaMap && areaMap.get(String(row.area_id || ""))) || "",
  sectionReligion: row.section_religion || "",
});

const normalize = (value) => String(value || "").trim().toLowerCase();
const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatApprovalNo = (value) => `SA/${Math.max(0, parseInt(value, 10) || 0)}`;

const blankCustomer = {
  name: "",
  mobileNo: "",
  active: true,
};

const blankQuickCustomer = {
  mobileNo: "",
  name: "",
  dateOfBirth: "",
  billingName: "",
  cardNo: "",
  gstNo: "",
  address: "",
  cityId: "",
  stateId: "",
  customerCategoryId: "",
  sectionReligion: "",
  emailId: "",
  areaId: "",
};

const quickCustomerFieldOrder = [
  "mobileNo",
  "name",
  "dateOfBirth",
  "billingName",
  "cardNo",
  "gstNo",
  "address",
  "cityId",
  "stateId",
  "customerCategoryId",
  "sectionReligion",
  "emailId",
  "areaId",
];

const DialogTextField = ({
  label,
  name,
  value,
  onChange,
  onKeyDown,
  placeholder = "",
  type = "text",
  inputRef = null,
}) => (
  <Box>
    <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>{label}</Typography>
    <TextField
      inputRef={inputRef}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      size="small"
      fullWidth
      sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
    />
  </Box>
);

const dialogNativeSelectSx = {
  width: "100%",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: "3.5px",
  bgcolor: "background.paper",
  px: 1.5,
  py: 1,
  fontSize: 12.25,
  color: "text.primary",
};

const SOA_GRID_COLS = "44px 88px minmax(0,0.72fr) 52px 68px 58px 70px 68px 78px 78px 64px";
const SOA_CELL_SX = { borderRight: 1, borderColor: "divider", px: 1, py: 0.75 };
const SOA_HEADER_FONT_SX = { fontSize: { xs: 9, md: 10, lg: 10.5 } };
const SOA_SEARCH_INPUT_SX = {
  width: "100%",
  border: "1px solid",
  borderColor: "grey.300",
  borderRadius: "1.75px",
  bgcolor: "background.paper",
  color: "text.primary",
  px: 0.5,
  py: 0.25,
  fontSize: { xs: 9, md: 10 },
};
const SOA_ROW_INPUT_SX = { ...SOA_SEARCH_INPUT_SX, fontSize: { xs: 9, md: 10, lg: 10.5 } };

const DialogSelectField = ({
  label,
  name,
  value,
  onChange,
  onKeyDown,
  options = [],
  inputRef = null,
  placeholder = "Select",
}) => (
  <Box>
    <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>{label}</Typography>
    <Box
      component="select"
      ref={inputRef}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      sx={dialogNativeSelectSx}
    >
      <option value="">{placeholder}</option>
      {options.map((row) => (
        <option key={row.value} value={row.value}>
          {row.label}
        </option>
      ))}
    </Box>
  </Box>
);

const SalesOnApproval = () => {
  const navigate = useNavigate();
  const barcodeInputRef = useRef(null);
  const customerNumberInputRef = useRef(null);
  const quickCustomerFieldRefs = useRef({});

  const [now, setNow] = useState(new Date());
  // Values are never read (only reset on save/clear); keep the setters, drop the dead bindings.
  const [, setApprovalNo] = useState(1);
  const [, setCustomerMode] = useState("walking");
  const [existingCustomerId, setExistingCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState({ ...blankCustomer });
  const [customers, setCustomers] = useState([]);
  const [customerConfigOptions, setCustomerConfigOptions] = useState({
    cities: [],
    states: [],
    customerCategories: [],
    areas: [],
  });
  const [quickCustomerDialogOpen, setQuickCustomerDialogOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ ...blankQuickCustomer });
  const [quickCustomerSearchResults, setQuickCustomerSearchResults] = useState([]);
  const [quickCustomerSelectedId, setQuickCustomerSelectedId] = useState("");
  const [quickCustomerSaving, setQuickCustomerSaving] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountPercentInput, setDiscountPercentInput] = useState("");
  const [discountSelectedLineIds, setDiscountSelectedLineIds] = useState([]);
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [igstEnabled, setIgstEnabled] = useState(false);
  const [placeOfSupplyStateId, setPlaceOfSupplyStateId] = useState("");
  const [editingLineId, setEditingLineId] = useState(null);
  const [salesManDialog, setSalesManDialog] = useState({ open: false, lineId: null, value: "" });

  const [stockRows, setStockRows] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [addBarcode, setAddBarcode] = useState("");
  const [addProductKey, setAddProductKey] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [cart, setCart] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    search: "",
    approvalNo: "",
    customerName: "",
    product: "",
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLimit, setSearchLimit] = useState(20);
  const [latestApprovalDoc, setLatestApprovalDoc] = useState(null);

  const loadNextApprovalNo = useCallback(async () => {
    try {
      const res = await api.get("/sales-on-approval/next-approval-no");
      setApprovalNo(toNum(res.data?.data?.approvalNo, 1));
    } catch {
      setApprovalNo(1);
    }
  }, []);

  const loadMasterData = useCallback(async () => {
    try {
      const cfg = (type) =>
        api
          .get(`/configurations/${type}`)
          .then((res) =>
            (res.data?.data || []).map((row) => ({
              value: String(row.id),
              label: row.name,
            }))
          )
          .catch(() => []);

      const [customersRes, barcodesRes, productsRes, cities, states, customerCategories, areas] = await Promise.all([
        api.get("/customers", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
        api.get("/barcodes").catch(() => ({ data: { data: [] } })),
        api.get("/products", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
        cfg("city"),
        cfg("state"),
        cfg("customer_category"),
        cfg("sale_area"),
      ]);

      const customerRows = customersRes.data?.data || [];
      const areaMap = new Map(areas.map((row) => [String(row.value), row.label]));
      setCustomers(customerRows.map((row) => mapCustomerRow(row, areaMap)));
      setCustomerConfigOptions({ cities, states, customerCategories, areas });

      const products = productsRes.data?.data || [];
      const productTaxMap = new Map();
      const productSellingModeMap = new Map();
      products.forEach((p) => {
        const key = normalize(p.name);
        if (!key) return;
        productTaxMap.set(key, toNum(p?.salesTax?.tax_percentage, 0));
        productSellingModeMap.set(key, String(p?.selling_mode || "Piece").trim() || "Piece");
      });

      const stock = (barcodesRes.data?.data || [])
        .map((row) => {
          const productName = row.product_name || "Unknown Product";
          const tax = productTaxMap.get(normalize(productName)) || 0;
          return {
            id: String(row.id),
            barcode: row.barcode || "",
            productName,
            qty: Math.max(0, toNum(row.qty, 0)),
            cost: toNum(row.cost, 0),
            price: toNum(row.final_price || row.selling_price || row.mrp, 0),
            tax,
            sellingMode: productSellingModeMap.get(normalize(productName)) || "Piece",
          };
        })
        .filter((row) => row.qty > 0);

      setStockRows(stock);

      const groupedProducts = new Map();
      stock.forEach((row) => {
        const key = normalize(row.productName);
        if (!key) return;
        const current = groupedProducts.get(key) || {
          value: key,
          label: row.productName,
          stockQty: 0,
        };
        current.stockQty += row.qty;
        groupedProducts.set(key, current);
      });

      const productList = Array.from(groupedProducts.values())
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((row) => ({
          value: row.value,
          label: `${row.label} (Stock: ${row.stockQty})`,
        }));
      setProductOptions(productList);
    } catch {
      toast.error("Failed to load sales on approval data");
    }
  }, []);

  const refreshLatestApprovalDoc = useCallback(async () => {
    try {
      const res = await api.get("/sales-on-approval", { params: { page: 1, limit: 1 } });
      const rows = res.data?.data || [];
      setLatestApprovalDoc(rows[0] || null);
    } catch {
      setLatestApprovalDoc(null);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.all([loadMasterData(), loadNextApprovalNo(), refreshLatestApprovalDoc()]);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadMasterData, loadNextApprovalNo, refreshLatestApprovalDoc]);

  const selectedCustomer = useMemo(
    () => customers.find((row) => row.value === existingCustomerId) || null,
    [customers, existingCustomerId]
  );
  const selectedQuickCustomerSearchRow = useMemo(
    () => quickCustomerSearchResults.find((row) => row.value === quickCustomerSelectedId) || null,
    [quickCustomerSearchResults, quickCustomerSelectedId]
  );

  const applyCustomerPanelRow = useCallback((row) => {
    if (!row) return;
    setExistingCustomerId(String(row.value || row.id || ""));
    setNewCustomer((prev) => ({
      ...prev,
      name: row.name || "",
      mobileNo: row.mobileNo || "",
    }));
  }, []);

  // customers is only ever seeded with a small preloaded batch (see loadMasterData) -- this hits
  // /customers' own ?search= endpoint for anything beyond that, and merges any new matches into
  // the cache so a customer found once stays instantly findable for the rest of the session.
  const handleAsyncCustomerSearch = useCallback(async (query) => {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];
    try {
      const res = await api.get("/customers", { params: { search: trimmed, limit: 20 } });
      const rows = res.data?.data || [];
      const areaMap = new Map(customerConfigOptions.areas.map((row) => [String(row.value), row.label]));
      const mapped = rows.map((row) => mapCustomerRow(row, areaMap));
      if (mapped.length) {
        setCustomers((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newOnes = mapped.filter((c) => !existingIds.has(c.id));
          return newOnes.length ? [...prev, ...newOnes] : prev;
        });
      }
      return mapped;
    } catch {
      return [];
    }
  }, [customerConfigOptions.areas]);

  useEffect(() => {
    if (!quickCustomerDialogOpen) return;
    const timer = setTimeout(() => {
      quickCustomerFieldRefs.current.mobileNo?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [quickCustomerDialogOpen]);

  const handleCustomerNumberLookup = useCallback(async (rawValue) => {
    const query = String(rawValue || "").trim();
    const digitsQuery = query.replace(/\D/g, "");

    if (!query) {
      setExistingCustomerId("");
      setNewCustomer((prev) => ({ ...prev, mobileNo: "", name: "" }));
      return null;
    }

    const findByNumber = (list) => list.find((row) => {
      const mobileDigits = String(row.mobileNo || "").replace(/\D/g, "");
      return digitsQuery ? mobileDigits === digitsQuery : String(row.mobileNo || "").trim() === query;
    });

    let matched = findByNumber(customers);
    if (!matched) {
      const serverResults = await handleAsyncCustomerSearch(query);
      matched = findByNumber(serverResults);
    }

    if (matched) {
      applyCustomerPanelRow(matched);
      return matched;
    }

    setExistingCustomerId("");
    setNewCustomer((prev) => ({
      ...prev,
      mobileNo: query,
      name: prev.name || "",
    }));
    return null;
  }, [applyCustomerPanelRow, customers, handleAsyncCustomerSearch]);

  const handleCustomerNumberChange = (value) => {
    setNewCustomer((prev) => ({ ...prev, mobileNo: value }));
    const currentMatchedDigits = String(selectedCustomer?.mobileNo || "").replace(/\D/g, "");
    const nextDigits = String(value || "").replace(/\D/g, "");

    if (existingCustomerId && nextDigits !== currentMatchedDigits) {
      setExistingCustomerId("");
    }
  };

  const handleCustomerNamePanelChange = (value) => {
    setNewCustomer((prev) => ({ ...prev, name: value }));
    const currentMatchedName = String(selectedCustomer?.name || "").trim();
    const nextName = String(value || "").trim();

    if (existingCustomerId && nextName !== currentMatchedName) {
      setExistingCustomerId("");
    }
  };

  const usedQtyByBarcode = useMemo(() => {
    const map = new Map();
    cart.forEach((line) => {
      map.set(line.stockId, (map.get(line.stockId) || 0) + toNum(line.qty, 0));
    });
    return map;
  }, [cart]);

  const selectedStockHint = useMemo(() => {
    const byBarcode = normalize(addBarcode);
    if (byBarcode) {
      const row = stockRows.find((s) => normalize(s.barcode) === byBarcode);
      if (!row) return "Barcode not found in current stock";
      const remaining = row.qty - (usedQtyByBarcode.get(row.id) || 0);
      return `Available stock for ${row.barcode}: ${Math.max(remaining, 0)} pcs`;
    }

    const byProduct = normalize(addProductKey);
    if (byProduct) {
      const total = stockRows
        .filter((s) => normalize(s.productName) === byProduct)
        .reduce((sum, s) => sum + Math.max(0, s.qty - (usedQtyByBarcode.get(s.id) || 0)), 0);
      return `Available stock for selected product: ${total} pcs`;
    }

    return "Add by barcode or by selecting a product in stock";
  }, [addBarcode, addProductKey, stockRows, usedQtyByBarcode]);

  const cartWithTotals = useMemo(
    () =>
      cart.map((line) => {
        const qty = Math.max(0, toNum(line.qty, 0));
        const price = Math.max(0, toNum(line.price, 0));
        const tax = Math.max(0, toNum(line.tax, 0));
        const discount = Math.max(0, toNum(line.discount, 0));
        const subtotal = qty * price;
        const taxAmount = (subtotal * tax) / 100;
        const total = subtotal + taxAmount - discount;
        const gross = Math.max(0, toNum(line.cost, 0)) * qty;
        return { ...line, subtotal, taxAmount, total, gross, discount };
      }),
    [cart]
  );

  const summary = useMemo(() => {
    const amount = cartWithTotals.reduce((sum, line) => sum + line.total, 0);
    const totalQty = cartWithTotals.reduce((sum, line) => sum + toNum(line.qty, 0), 0);
    const grossValue = cartWithTotals.reduce((sum, line) => sum + line.gross, 0);
    const totalDiscount = cartWithTotals.reduce((sum, line) => sum + line.discount, 0);
    return { amount, totalQty, grossValue, totalDiscount };
  }, [cartWithTotals]);

  const discountPercentValue = useMemo(
    () => Math.min(100, Math.max(0, toNum(discountPercentInput, 0))),
    [discountPercentInput]
  );
  const discountDialogSelectedSet = useMemo(
    () => new Set(discountSelectedLineIds),
    [discountSelectedLineIds]
  );
  const discountDialogRows = useMemo(
    () =>
      cartWithTotals.map((line) => {
        const lineAmount = Math.max(0, toNum(line.total, 0));
        const previewPercent = discountDialogSelectedSet.has(line.lineId) ? discountPercentValue : 0;
        const previewDiscountValue = discountDialogSelectedSet.has(line.lineId)
          ? (lineAmount * discountPercentValue) / 100
          : 0;
        return {
          ...line,
          lineAmount,
          previewPercent,
          previewDiscountValue,
        };
      }),
    [cartWithTotals, discountDialogSelectedSet, discountPercentValue]
  );
  const discountDialogSummary = useMemo(() => {
    const selectedAmount = discountDialogRows.reduce(
      (sum, line) => sum + (discountDialogSelectedSet.has(line.lineId) ? line.lineAmount : 0),
      0
    );
    const previewDiscountValue = discountDialogRows.reduce(
      (sum, line) => sum + line.previewDiscountValue,
      0
    );
    return {
      selectedAmount,
      previewDiscountValue,
      previewNetAmount: Math.max(0, selectedAmount - previewDiscountValue),
    };
  }, [discountDialogRows, discountDialogSelectedSet]);

  const handleAddLine = () => {
    const quantity = Math.floor(toNum(addQty, 0));
    if (!quantity || quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    const barcodeQuery = normalize(addBarcode);
    const productQuery = normalize(addProductKey);
    if (!barcodeQuery && !productQuery) {
      toast.error("Enter a barcode or select a product");
      return;
    }

    let source = null;
    if (barcodeQuery) {
      source = stockRows.find((row) => normalize(row.barcode) === barcodeQuery) || null;
      if (!source) {
        toast.error("Barcode not found in stock");
        return;
      }
      const used = usedQtyByBarcode.get(source.id) || 0;
      const remaining = source.qty - used;
      if (quantity > remaining) {
        toast.error(`Quantity exceeds stock. Available: ${Math.max(remaining, 0)} pcs`);
        return;
      }
    } else {
      const candidates = stockRows
        .filter((row) => normalize(row.productName) === productQuery)
        .map((row) => ({
          row,
          remaining: row.qty - (usedQtyByBarcode.get(row.id) || 0),
        }))
        .filter((row) => row.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining);

      source = candidates.find((c) => c.remaining >= quantity)?.row || null;
      if (!source) {
        toast.error("Selected quantity is higher than available stock for this product");
        return;
      }
    }

    setCart((prev) => {
      const index = prev.findIndex((line) => line.stockId === source.id);
      if (index === -1) {
        return [
          ...prev,
          {
            lineId: `${source.id}-${Date.now()}`,
            stockId: source.id,
            barcode: source.barcode,
            productName: source.productName,
            qty: quantity,
            price: source.price,
            tax: source.tax,
            cost: source.cost,
            discount: 0,
            salesManId: "",
            salesManName: "",
            sellingMode: source.sellingMode || "Piece",
          },
        ];
      }

      const next = [...prev];
      next[index] = {
        ...next[index],
        qty: toNum(next[index].qty, 0) + quantity,
      };
      return next;
    });

    setAddBarcode("");
    setAddProductKey("");
    setAddQty("1");
    setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  const handleLineValueChange = (lineId, field, raw) => {
    const numeric = Math.max(0, toNum(raw, 0));
    setCart((prev) =>
      prev.map((line) => (line.lineId === lineId ? { ...line, [field]: numeric } : line))
    );
  };

  const handleLineQtyChange = (lineId, raw) => {
    const nextQty = Math.max(1, Math.floor(toNum(raw, 0)));
    setCart((prev) => {
      const currentLine = prev.find((line) => line.lineId === lineId);
      if (!currentLine) return prev;

      const stockRow = stockRows.find((row) => row.id === currentLine.stockId);
      if (!stockRow) return prev;

      const usedByOthers = prev.reduce((sum, line) => {
        if (line.lineId === lineId || line.stockId !== currentLine.stockId) return sum;
        return sum + toNum(line.qty, 0);
      }, 0);
      const maxAllowed = Math.max(1, toNum(stockRow.qty, 0) - usedByOthers);
      const sanitizedQty = Math.min(nextQty, maxAllowed);

      return prev.map((line) =>
        line.lineId === lineId
          ? { ...line, qty: sanitizedQty }
          : line
      );
    });
  };

  const handleRemoveLine = (lineId) => {
    if (editingLineId === lineId) {
      setEditingLineId(null);
    }
    setCart((prev) => prev.filter((line) => line.lineId !== lineId));
  };

  const toggleLineEdit = (lineId) => {
    setEditingLineId((prev) => (prev === lineId ? null : lineId));
  };

  const openSalesManDialog = (line) => {
    setSalesManDialog({
      open: true,
      lineId: line.lineId,
      value: String(line.salesManId || "").trim(),
    });
  };

  const closeSalesManDialog = () => {
    setSalesManDialog({ open: false, lineId: null, value: "" });
  };

  const saveSalesManDialog = async () => {
    if (!salesManDialog.lineId) return;
    const employeeCode = String(salesManDialog.value || "").trim();

    if (!employeeCode) {
      setCart((prev) =>
        prev.map((line) =>
          line.lineId === salesManDialog.lineId
            ? { ...line, salesManId: "", salesManName: "" }
            : line
        )
      );
      closeSalesManDialog();
      return;
    }

    try {
      const res = await api.get("/pos-sales/salesman-lookup", {
        params: { employeeCode },
      });
      const employee = res.data?.data;
      setCart((prev) =>
        prev.map((line) =>
          line.lineId === salesManDialog.lineId
            ? {
                ...line,
                salesManId: employee?.employeeCode || employeeCode,
                salesManName: employee?.name || "",
              }
            : line
        )
      );
      closeSalesManDialog();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Sales man code not found");
    }
  };

  const openQuickCustomerDialog = () => {
    setQuickCustomer({ ...blankQuickCustomer });
    setQuickCustomerSearchResults([]);
    setQuickCustomerSelectedId("");
    setQuickCustomerDialogOpen(true);
  };

  const closeQuickCustomerDialog = () => {
    if (quickCustomerSaving) return;
    setQuickCustomerDialogOpen(false);
  };

  const handleQuickCustomerChange = (event) => {
    const { name, value } = event.target;
    setQuickCustomer((prev) => ({ ...prev, [name]: value }));
    if (name === "mobileNo") {
      setQuickCustomerSelectedId("");
      if (String(value || "").trim() === "") {
        setQuickCustomerSearchResults([]);
      }
    }
  };

  const runQuickCustomerSearch = useCallback(async (mobileValue = quickCustomer.mobileNo) => {
    const rawQuery = String(mobileValue || "").trim();
    if (!rawQuery) {
      setQuickCustomerSearchResults([]);
      setQuickCustomerSelectedId("");
      return [];
    }

    // Built from this render's `customers` snapshot plus the server's response rather than
    // re-reading `customers` state after the await, since the merge from handleAsyncCustomerSearch
    // wouldn't be visible in this closure yet.
    const serverResults = await handleAsyncCustomerSearch(rawQuery);
    const existingIds = new Set(customers.map((row) => row.id));
    const pool = [...customers, ...serverResults.filter((row) => !existingIds.has(row.id))];

    const digitsQuery = rawQuery.replace(/\D/g, "");
    const matched = pool
      .filter((row) => {
        const mobile = String(row.mobileNo || "").trim();
        const digitsMobile = mobile.replace(/\D/g, "");
        if (digitsQuery) return digitsMobile.includes(digitsQuery);
        return mobile.toLowerCase().includes(rawQuery.toLowerCase());
      })
      .sort((left, right) => {
        const leftDigits = String(left.mobileNo || "").replace(/\D/g, "");
        const rightDigits = String(right.mobileNo || "").replace(/\D/g, "");
        const leftExact = digitsQuery && leftDigits === digitsQuery ? 1 : 0;
        const rightExact = digitsQuery && rightDigits === digitsQuery ? 1 : 0;
        if (leftExact !== rightExact) return rightExact - leftExact;
        return left.name.localeCompare(right.name);
      })
      .slice(0, 20);

    setQuickCustomerSearchResults(matched);
    const exactMatch = matched.find(
      (row) => String(row.mobileNo || "").replace(/\D/g, "") === digitsQuery
    );
    setQuickCustomerSelectedId(exactMatch?.value || matched[0]?.value || "");
    return matched;
  }, [customers, quickCustomer.mobileNo, handleAsyncCustomerSearch]);

  const focusNextQuickCustomerField = (fieldName) => {
    const index = quickCustomerFieldOrder.indexOf(fieldName);
    const nextField = quickCustomerFieldOrder[index + 1];
    if (!nextField) return;
    quickCustomerFieldRefs.current[nextField]?.focus();
  };

  const handleQuickCustomerFieldKeyDown = (fieldName, event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (fieldName === "mobileNo") {
      runQuickCustomerSearch(event.currentTarget.value);
    }
    focusNextQuickCustomerField(fieldName);
  };

  const applyQuickCustomerSelection = (customerRow) => {
    if (!customerRow) {
      toast.error("Please select a customer first");
      return;
    }
    applyCustomerPanelRow(customerRow);
    setQuickCustomerDialogOpen(false);
    setQuickCustomer({ ...blankQuickCustomer });
    setQuickCustomerSearchResults([]);
    setQuickCustomerSelectedId("");
    setAddBarcode("");
    setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  const saveQuickCustomer = async () => {
    const mobileNo = String(quickCustomer.mobileNo || "").trim();
    const name = String(quickCustomer.name || "").trim();

    if (!mobileNo) {
      toast.error("Mobile number is required");
      return;
    }
    if (!name) {
      toast.error("Customer name is required");
      return;
    }

    const digitsQuery = mobileNo.replace(/\D/g, "");
    let exactExisting = customers.find(
      (row) => String(row.mobileNo || "").replace(/\D/g, "") === digitsQuery
    );
    if (!exactExisting) {
      // Local cache is only a small seed -- check the server before concluding this is a new
      // customer, so this doesn't create a duplicate record for one that already exists.
      const serverResults = await handleAsyncCustomerSearch(mobileNo);
      exactExisting = serverResults.find(
        (row) => String(row.mobileNo || "").replace(/\D/g, "") === digitsQuery
      );
    }
    if (exactExisting) {
      await runQuickCustomerSearch(mobileNo);
      setQuickCustomerSelectedId(exactExisting.value);
      toast.info("Customer already exists. Select it from search results.");
      return;
    }

    setQuickCustomerSaving(true);
    try {
      const payload = {
        mobileNo,
        name,
        dateOfBirth: quickCustomer.dateOfBirth || null,
        billingName: quickCustomer.billingName || null,
        cardNo: quickCustomer.cardNo || null,
        gstNo: quickCustomer.gstNo || null,
        address: quickCustomer.address || null,
        cityId: quickCustomer.cityId || null,
        stateId: quickCustomer.stateId || null,
        customerCategoryId: quickCustomer.customerCategoryId || null,
        sectionReligion: quickCustomer.sectionReligion || null,
        emailId: quickCustomer.emailId || null,
        areaId: quickCustomer.areaId || null,
        active: true,
      };
      const res = await api.post("/customers", payload);
      const createdCustomer = res.data?.data;
      await loadMasterData();
      applyCustomerPanelRow({
        value: String(createdCustomer?.id || ""),
        name: createdCustomer?.name || name,
        mobileNo: createdCustomer?.mobile_no || mobileNo,
      });
      setQuickCustomerDialogOpen(false);
      setQuickCustomer({ ...blankQuickCustomer });
      setQuickCustomerSearchResults([]);
      setQuickCustomerSelectedId("");
      setAddBarcode("");
      toast.success("Customer created and selected");
      setTimeout(() => barcodeInputRef.current?.focus(), 0);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save customer");
    } finally {
      setQuickCustomerSaving(false);
    }
  };

  const openDiscountDialog = () => {
    if (cartWithTotals.length === 0) {
      toast.error("Add at least one product before applying discount");
      return;
    }
    setDiscountSelectedLineIds(cartWithTotals.map((line) => line.lineId));
    setDiscountPercentInput("");
    setDiscountDialogOpen(true);
  };

  const closeDiscountDialog = () => {
    setDiscountDialogOpen(false);
  };

  const handleDiscountRowToggle = (lineId) => {
    setDiscountSelectedLineIds((prev) =>
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
    );
  };

  const handleDiscountToggleAll = () => {
    setDiscountSelectedLineIds((prev) =>
      prev.length === cartWithTotals.length ? [] : cartWithTotals.map((line) => line.lineId)
    );
  };

  const applyDiscountDialog = () => {
    if (discountSelectedLineIds.length === 0) {
      toast.error("Select at least one row");
      return;
    }

    setCart((prev) =>
      prev.map((line) => {
        if (!discountDialogSelectedSet.has(line.lineId)) return line;
        const subtotal = toNum(line.price, 0) * toNum(line.qty, 0);
        const taxAmount = (subtotal * Math.max(0, toNum(line.tax, 0))) / 100;
        const lineAmount = Math.max(0, subtotal + taxAmount);
        return {
          ...line,
          discount: (lineAmount * discountPercentValue) / 100,
        };
      })
    );
    setDiscountDialogOpen(false);
    setAddBarcode("");
    setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  const handleResetEntry = () => {
    setCustomerMode("walking");
    setExistingCustomerId("");
    setNewCustomer({ ...blankCustomer });
    setAddBarcode("");
    setAddProductKey("");
    setAddQty("1");
    setCart([]);
    setEditingLineId(null);
    setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  const handleSaveSale = useCallback(async () => {
    if (cartWithTotals.length === 0) {
      toast.error("Add at least one product before save");
      return;
    }

    const customerName = String(newCustomer.name || "").trim();
    const customerMobile = String(newCustomer.mobileNo || "").trim();
    const effectiveCustomerMode = existingCustomerId
      ? "existing"
      : customerName || customerMobile
        ? "new"
        : "walking";

    if (effectiveCustomerMode === "new" && !customerName) {
      toast.error("New customer name is required");
      return;
    }

    const payload = {
      customerMode: effectiveCustomerMode,
      customerId: effectiveCustomerMode === "existing" ? existingCustomerId : null,
      customer:
        effectiveCustomerMode === "new"
          ? {
              name: customerName,
              mobileNo: customerMobile,
              active: true,
            }
          : null,
      saleAt: now.toISOString(),
      items: cartWithTotals.map((line) => ({
        barcodeId: line.stockId,
        barcode: line.barcode,
        productName: line.productName,
        qty: line.qty,
        price: line.price,
        tax: line.tax,
        cost: line.cost,
        discount: line.discount,
      })),
    };

    setSaving(true);
    try {
      const res = await api.post("/sales-on-approval", payload);
      const savedApprovalNo = res.data?.data?.approval_no;
      toast.success(`Sales on approval saved successfully (Approval #${savedApprovalNo})`);
      window.dispatchEvent(new Event("sales-on-approval-updated"));
      handleResetEntry();
      await Promise.all([loadMasterData(), loadNextApprovalNo(), refreshLatestApprovalDoc()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save sales on approval");
    } finally {
      setSaving(false);
    }
  }, [cartWithTotals, existingCustomerId, loadMasterData, loadNextApprovalNo, now, newCustomer.mobileNo, newCustomer.name, refreshLatestApprovalDoc]);

  useEffect(() => {
    const handleGlobalEscape = (event) => {
      if (event.key !== "Escape") return;

      if (quickCustomerDialogOpen) {
        event.preventDefault();
        if (!quickCustomerSaving) {
          setQuickCustomerDialogOpen(false);
        }
        return;
      }

      if (discountDialogOpen) {
        event.preventDefault();
        setDiscountDialogOpen(false);
        return;
      }

      if (salesManDialog.open) {
        event.preventDefault();
        closeSalesManDialog();
      }
    };

    window.addEventListener("keydown", handleGlobalEscape);
    return () => window.removeEventListener("keydown", handleGlobalEscape);
  }, [closeSalesManDialog, discountDialogOpen, quickCustomerDialogOpen, quickCustomerSaving, salesManDialog.open]);

  const runApprovalSearch = useCallback(async (overrideFilters = null, pageOverride = 1, limitOverride = searchLimit) => {
    const filters = overrideFilters || searchFilters;
    setSearching(true);
    try {
      const params = { page: pageOverride, limit: limitOverride };
      if (String(filters.search || "").trim()) params.search = filters.search;
      if (String(filters.approvalNo || "").trim()) params.approvalNo = filters.approvalNo;
      if (String(filters.customerName || "").trim()) params.customerName = filters.customerName;
      if (String(filters.product || "").trim()) params.product = filters.product;

      const res = await api.get("/sales-on-approval", { params });
      setSearchResults(res.data?.data || []);
      const p = res.data?.pagination || {};
      const total = Number(p.total ?? res.data?.total ?? 0) || 0;
      const totalPages = Math.max(Number(p.totalPages ?? Math.ceil(total / Math.max(limitOverride, 1))) || 1, 1);
      setSearchPagination({ total, totalPages });
      setSearchPage(pageOverride);
    } catch {
      toast.error("Failed to search sales on approval");
    } finally {
      setSearching(false);
    }
  }, [searchFilters, searchLimit]);

  const loadAllApprovalSearchRows = useCallback(async (overrideFilters = null) => {
    const filters = overrideFilters || searchFilters;
    const params = { all: "true" };
    if (String(filters.search || "").trim()) params.search = filters.search;
    if (String(filters.approvalNo || "").trim()) params.approvalNo = filters.approvalNo;
    if (String(filters.customerName || "").trim()) params.customerName = filters.customerName;
    if (String(filters.product || "").trim()) params.product = filters.product;

    const res = await api.get("/sales-on-approval", { params });
    return res.data?.data || [];
  }, [searchFilters]);

  const openSearchPage = async () => {
    setShowSearchPage(true);
    setSearchPage(1);
    const empty = { search: "", approvalNo: "", customerName: "", product: "" };
    setSearchFilters(empty);
    await runApprovalSearch(empty, 1, searchLimit);
  };

  const handleServerSearch = useCallback(({ query }) => {
    setSearchFilters((prev) => {
      const nextSearch = String(query || "");
      if (String(prev.search || "") === nextSearch) {
        runApprovalSearch(prev, 1, searchLimit);
        return prev;
      }
      const nextFilters = { ...prev, search: query };
      runApprovalSearch(nextFilters, 1, searchLimit);
      return nextFilters;
    });
    setSearchPage(1);
  }, [searchLimit, runApprovalSearch]);

  const openLatestApprovalInSearch = useCallback(async () => {
    if (!latestApprovalDoc?.approval_no) return;
    setShowSearchPage(true);
    setSearchPage(1);
    const nextFilters = {
      search: "",
      approvalNo: String(latestApprovalDoc.approval_no),
      customerName: "",
      product: "",
    };
    setSearchFilters(nextFilters);
    await runApprovalSearch(nextFilters, 1, searchLimit);
  }, [latestApprovalDoc, runApprovalSearch, searchLimit]);

  const approvalSearchColumns = useMemo(
    () => [
      {
        key: "approval_no",
        label: "Approval No",
        valueGetter: (row) => row.approval_no || row.id || "-",
      },
      {
        key: "sale_at",
        label: "Date",
        valueGetter: (row) => row.sale_at || "",
        render: (value) => (value ? new Date(value).toLocaleString() : "-"),
        searchValue: (row) => (row.sale_at ? new Date(row.sale_at).toLocaleString() : ""),
      },
      {
        key: "customer_name",
        label: "Customer",
        valueGetter: (row) => row.customer_name || row.customer?.name || "-",
      },
      {
        key: "status",
        label: "Status",
        valueGetter: (row) => row.status || "-",
      },
      {
        key: "products",
        label: "Products",
        valueGetter: (row) =>
          (row.items || []).map((item) => item.product_name || item.barcode || "-").join(", "),
        render: (_, row) => {
          const items = row.items || [];
          const productText = items
            .slice(0, 2)
            .map((item) => item.product_name || item.barcode || "-")
            .join(", ");
          const extra = items.length > 2 ? ` +${items.length - 2} more` : "";
          return `${productText || "-"}${extra}`;
        },
      },
      {
        key: "total_qty",
        label: "Total Qty",
        valueGetter: (row) => toNum(row.total_qty || 0),
        render: (value) => <Box sx={{ textAlign: "center" }}>{toNum(value || 0)}</Box>,
      },
      {
        key: "amount",
        label: "Amount",
        valueGetter: (row) => toNum(row.amount || 0),
        render: (value) => <Box sx={{ textAlign: "right" }}>{formatMoney(value || 0)}</Box>,
      },
    ],
    []
  );

  const [searchPagination, setSearchPagination] = useState({ total: 0, totalPages: 1 });

  const renderEntryPage = () => (
    <Box
      sx={{
        display: { xs: "flex", xl: "grid" },
        minHeight: { xs: "calc(100vh - 170px)", xl: 0 },
        flexDirection: "column",
        gap: 1,
        height: { xl: "100%" },
        flex: { xl: 1 },
        gridTemplateColumns: { xl: "minmax(0,1fr) 300px" },
        alignItems: { xl: "stretch" },
      }}
    >
      <Box sx={{ minWidth: 0, display: { xl: "flex" }, minHeight: { xl: 0 } }}>
        <Box
          sx={{
            width: "100%",
            overflow: "hidden",
            borderRadius: "7px",
            border: 1,
            borderColor: "grey.300",
            bgcolor: "background.paper",
            boxShadow: 1,
            display: { xl: "flex" },
            height: { xl: "100%" },
            minHeight: { xl: 0 },
            flexDirection: { xl: "column" },
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 1.5, py: 1.5 }}>
            <Typography sx={{ mb: 1, fontSize: 10.5, fontWeight: 600, color: "text.primary" }}>Add Product</Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", alignItems: "flex-end", gap: 1 }}>
              <Box sx={{ width: "100%", minWidth: { md: 220 }, flex: 1 }}>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, color: "error.main" }}>Barcode</Typography>
                <TextField
                  inputRef={barcodeInputRef}
                  type="text"
                  value={addBarcode}
                  onChange={(e) => setAddBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const shortcut = String(addBarcode || "").trim().toUpperCase();
                      if (shortcut === "C") {
                        setAddBarcode("");
                        openQuickCustomerDialog();
                        return;
                      }
                      if (shortcut === "D") {
                        setAddBarcode("");
                        openDiscountDialog();
                        return;
                      }
                      if (shortcut === "0") {
                        setAddBarcode("");
                        handleSaveSale();
                        return;
                      }
                      handleAddLine();
                    }
                  }}
                  placeholder="Scan / enter barcode"
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.75 } }}
                />
              </Box>
              <Box sx={{ width: "100%", minWidth: { md: 280 }, flex: 1.3 }}>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, color: "error.main" }}>Product (In Stock)</Typography>
                <TextField
                  select
                  value={addProductKey}
                  onChange={(e) => setAddProductKey(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.75 } }}
                >
                  <MenuItem value="">Select product</MenuItem>
                  {productOptions.map((row) => (
                    <MenuItem key={row.value} value={row.value}>
                      {row.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ width: 112 }}>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, color: "error.main" }}>Qty</Typography>
                <TextField
                  type="number"
                  slotProps={{ htmlInput: { min: 1 } }}
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddLine();
                    }
                  }}
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.75 } }}
                />
              </Box>
              <Box sx={{ width: 40 }}>
                <Button
                  onClick={handleAddLine}
                  className="glass-btn glass-btn-primary"
                  aria-label="Add product"
                  sx={{ height: "34px", width: "100%", minWidth: 0, p: 0 }}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </Box>
            </Stack>
            <Typography sx={{ mt: 1, fontSize: 10.5, color: "text.secondary" }}>{selectedStockHint}</Typography>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflowX: "auto" }}>
            <Box sx={{ display: "flex", height: { xs: 420, xl: "100%" }, minHeight: { xs: 420, xl: 0 }, flexDirection: "column" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: SOA_GRID_COLS, borderBottom: 1, borderColor: "divider", bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.12), fontWeight: 600, color: "text.secondary", ...SOA_HEADER_FONT_SX }}>
                <Box sx={{ ...SOA_CELL_SX, textAlign: "center" }}>S.No</Box>
                <Box sx={SOA_CELL_SX}>Barcode</Box>
                <Box sx={SOA_CELL_SX}>Product</Box>
                <Box sx={{ ...SOA_CELL_SX, textAlign: "center" }}>Qty</Box>
                <Box sx={{ ...SOA_CELL_SX, textAlign: "right" }}>Price</Box>
                <Box sx={{ ...SOA_CELL_SX, textAlign: "right" }}>Tax%</Box>
                <Box sx={{ ...SOA_CELL_SX, textAlign: "right" }}>Discount</Box>
                <Box sx={{ ...SOA_CELL_SX, textAlign: "right" }}>Cost</Box>
                <Box sx={{ ...SOA_CELL_SX, textAlign: "right" }}>Total</Box>
                <Box sx={SOA_CELL_SX}>Salesman</Box>
                <Box sx={{ px: 1, py: 0.75, textAlign: "center" }}>Action</Box>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: SOA_GRID_COLS, borderBottom: 1, borderColor: "divider", bgcolor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.12 : 0.06), fontSize: { xs: 9, md: 10 } }}>
                <Box sx={SOA_CELL_SX} />
                <Box sx={SOA_CELL_SX}>
                  <Box component="input" type="text" placeholder="Search barcode" disabled sx={SOA_SEARCH_INPUT_SX} />
                </Box>
                <Box sx={SOA_CELL_SX}>
                  <Box component="input" type="text" placeholder="Search product" disabled sx={SOA_SEARCH_INPUT_SX} />
                </Box>
                <Box sx={SOA_CELL_SX}>
                  <Box component="input" type="text" placeholder="Qty" disabled sx={{ ...SOA_SEARCH_INPUT_SX, textAlign: "center" }} />
                </Box>
                <Box sx={SOA_CELL_SX}>
                  <Box component="input" type="text" placeholder="Price" disabled sx={{ ...SOA_SEARCH_INPUT_SX, textAlign: "right" }} />
                </Box>
                <Box sx={SOA_CELL_SX}>
                  <Box component="input" type="text" placeholder="Tax" disabled sx={{ ...SOA_SEARCH_INPUT_SX, textAlign: "right" }} />
                </Box>
                <Box sx={SOA_CELL_SX}>
                  <Box component="input" type="text" placeholder="Disco" disabled sx={{ ...SOA_SEARCH_INPUT_SX, textAlign: "right" }} />
                </Box>
                <Box sx={SOA_CELL_SX} />
                <Box sx={SOA_CELL_SX}>
                  <Box component="input" type="text" placeholder="Total" disabled sx={{ ...SOA_SEARCH_INPUT_SX, textAlign: "right" }} />
                </Box>
                <Box sx={SOA_CELL_SX}>
                  <Box component="input" type="text" placeholder="Salesman" disabled sx={SOA_SEARCH_INPUT_SX} />
                </Box>
                <Box sx={{ px: 1, py: 0.75 }} />
              </Box>

              <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }} style={{ scrollbarGutter: "stable" }}>
                {cartWithTotals.length === 0 ? (
                  <Box sx={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", py: 8, textAlign: "center", fontSize: 10.5, color: "text.disabled" }}>
                    No products added yet.
                  </Box>
                ) : (
                  cartWithTotals.map((line, index) => (
                    <Box
                      key={line.lineId}
                      sx={{ display: "grid", gridTemplateColumns: SOA_GRID_COLS, borderBottom: 1, borderColor: "divider", fontSize: { xs: 9, md: 10, lg: 10.5 }, "&:hover": { bgcolor: "action.hover" } }}
                    >
                      {(() => {
                        const isLineEditable = editingLineId === line.lineId;
                        return (
                          <>
                      <Box sx={{ ...SOA_CELL_SX, textAlign: "center" }}>{index + 1}</Box>
                      <Box sx={{ ...SOA_CELL_SX, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>{line.barcode || "-"}</Box>
                      <Box sx={{ ...SOA_CELL_SX, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line.productName}</Box>
                      <Box sx={{ ...SOA_CELL_SX, textAlign: "center" }}>
                        {isLineEditable ? (
                          <Box
                            component="input"
                            type="number"
                            min="1"
                            step="1"
                            value={line.qty}
                            onChange={(e) => handleLineQtyChange(line.lineId, e.target.value)}
                            sx={{ ...SOA_ROW_INPUT_SX, textAlign: "center" }}
                          />
                        ) : line.qty}
                      </Box>
                      <Box sx={{ borderRight: 1, borderColor: "divider", px: 0.75, py: 0.75, textAlign: "right" }}>
                        {isLineEditable ? (
                          <Box
                            component="input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.price}
                            onChange={(e) => handleLineValueChange(line.lineId, "price", e.target.value)}
                            sx={{ ...SOA_ROW_INPUT_SX, textAlign: "right" }}
                          />
                        ) : (
                          formatMoney(line.price)
                        )}
                      </Box>
                      <Box sx={{ ...SOA_CELL_SX, textAlign: "right" }}>{toNum(line.tax, 0).toFixed(2)}</Box>
                      <Box sx={{ borderRight: 1, borderColor: "divider", px: 0.75, py: 0.75, textAlign: "right" }}>
                        {isLineEditable ? (
                          <Box
                            component="input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.discount}
                            onChange={(e) => handleLineValueChange(line.lineId, "discount", e.target.value)}
                            sx={{ ...SOA_ROW_INPUT_SX, textAlign: "right" }}
                          />
                        ) : (
                          formatMoney(line.discount)
                        )}
                      </Box>
                      <Box sx={{ ...SOA_CELL_SX, textAlign: "right" }}>{formatMoney(line.cost)}</Box>
                      <Box sx={{ ...SOA_CELL_SX, textAlign: "right", fontWeight: 500 }}>{formatMoney(line.total)}</Box>
                      <Box sx={{ ...SOA_CELL_SX, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line.salesManName || "-"}</Box>
                      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "center", gap: 0.25, px: 0.5, py: 0.75 }}>
                        <Box
                          component="button"
                          type="button"
                          onClick={() => toggleLineEdit(line.lineId)}
                          sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: isLineEditable ? "warning.main" : "text.secondary", "&:hover": { opacity: 0.8 } }}
                          aria-label={isLineEditable ? "Lock row editing" : "Edit row"}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Box>
                        <Box
                          component="button"
                          type="button"
                          onClick={() => openSalesManDialog(line)}
                          sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: line.salesManId ? "success.main" : "primary.main", "&:hover": { opacity: 0.8 } }}
                          aria-label="Assign sales man"
                        >
                          <UserRound className="h-3.5 w-3.5" />
                        </Box>
                        <Box
                          component="button"
                          type="button"
                          onClick={() => handleRemoveLine(line.lineId)}
                          sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "error.main", "&:hover": { opacity: 0.8 } }}
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Box>
                      </Stack>
                          </>
                        );
                      })()}
                    </Box>
                  ))
                )}
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: SOA_GRID_COLS, borderTop: 1, borderColor: "divider", bgcolor: "action.hover", fontWeight: 700, color: "text.secondary", ...SOA_HEADER_FONT_SX }}>
                <Box sx={{ ...SOA_CELL_SX, textAlign: "center" }}>-</Box>
                <Box sx={SOA_CELL_SX} />
                <Box sx={SOA_CELL_SX} />
                <Box sx={{ ...SOA_CELL_SX, textAlign: "center", color: "error.main" }}>{summary.totalQty}</Box>
                <Box sx={SOA_CELL_SX} />
                <Box sx={SOA_CELL_SX} />
                <Box sx={{ ...SOA_CELL_SX, textAlign: "right", color: "error.main" }}>{formatMoney(summary.totalDiscount)}</Box>
                <Box sx={SOA_CELL_SX} />
                <Box sx={{ ...SOA_CELL_SX, textAlign: "right", color: "error.main" }}>{formatMoney(summary.amount)}</Box>
                <Box sx={SOA_CELL_SX} />
                <Box sx={{ px: 1, py: 0.75 }} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ width: "100%", display: { xl: "flex" }, minHeight: { xl: 0 } }}>
        <Box sx={{ width: "100%", borderRadius: "7px", border: 1, borderColor: "grey.300", bgcolor: "background.paper", p: 1.5, boxShadow: 1, display: { xl: "flex" }, height: { xl: "100%" }, flexDirection: { xl: "column" } }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider", pb: 1 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1.5, fontSize: 10.5 }}>
              <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}>
                <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Date</Box>
                <Box component="span" sx={{ color: "text.primary" }}>{now.toLocaleDateString()}</Box>
              </Stack>
              <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}>
                <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Time</Box>
                <Box component="span" sx={{ color: "text.primary" }}>{now.toLocaleTimeString()}</Box>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, borderBottom: 1, borderColor: "divider", py: 1 }}>
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { md: "minmax(0,1fr) 96px" } }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box>
                  <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Customer Number</Typography>
                  <TextField
                    inputRef={customerNumberInputRef}
                    type="text"
                    value={newCustomer.mobileNo}
                    onChange={(e) => handleCustomerNumberChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCustomerNumberLookup(e.currentTarget.value);
                      }
                    }}
                    placeholder="Write customer number and press Enter"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.75 } }}
                  />
                </Box>
                <Box>
                  <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Customer Name</Typography>
                  <TextField
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => handleCustomerNamePanelChange(e.target.value)}
                    placeholder="Customer name"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.75 } }}
                  />
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pt: { xs: 0, md: 3 } }}>
                <Stack component="label" direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                  <Box component="span">Credit</Box>
                  <Checkbox
                    checked={creditEnabled}
                    onChange={(event) => setCreditEnabled(event.target.checked)}
                    size="small"
                    sx={{ p: 0 }}
                  />
                </Stack>
                <Stack component="label" direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                  <Box component="span">IGST</Box>
                  <Checkbox
                    checked={igstEnabled}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setIgstEnabled(checked);
                      if (!checked) setPlaceOfSupplyStateId("");
                    }}
                    size="small"
                    sx={{ p: 0 }}
                  />
                </Stack>
              </Box>
            </Box>

            {igstEnabled ? (
              <Box>
                <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                  Place Of Supply
                </Typography>
                <TextField
                  select
                  value={placeOfSupplyStateId}
                  onChange={(event) => setPlaceOfSupplyStateId(event.target.value)}
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.75 } }}
                >
                  <MenuItem value="">Select state</MenuItem>
                  {customerConfigOptions.states.map((row) => (
                    <MenuItem key={row.value} value={row.value}>
                      {row.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            ) : null}
          </Box>

          <Box sx={{ borderTop: 1, borderColor: "divider", py: 1.5 }}>
            <Box sx={{ overflow: "hidden", borderRadius: "3.5px", border: 1, borderColor: "divider" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr 72px", borderBottom: 1, borderColor: "divider", bgcolor: "action.hover", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                <Box sx={{ px: 1, py: 1 }}>Last Doc</Box>
                <Box sx={{ borderLeft: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>Amount</Box>
                <Box sx={{ borderLeft: 1, borderColor: "divider", px: 1, py: 1, textAlign: "center" }}>Action</Box>
              </Box>
              <Box sx={{ height: 112, overflowY: "auto" }}>
                {latestApprovalDoc ? (
                  <Box sx={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr 72px", alignItems: "center", fontSize: 10.5, color: "text.secondary" }}>
                    <Box sx={{ px: 1, py: 1, fontWeight: 600 }}>{formatApprovalNo(latestApprovalDoc.approval_no || latestApprovalDoc.id)}</Box>
                    <Box sx={{ borderLeft: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right", fontWeight: 600 }}>
                      {formatMoney(latestApprovalDoc.amount || 0)}
                    </Box>
                    <Box sx={{ borderLeft: 1, borderColor: "divider", px: 1, py: 1, textAlign: "center" }}>
                      <Box
                        component="button"
                        type="button"
                        onClick={openLatestApprovalInSearch}
                        sx={{ color: "primary.main", "&:hover": { color: "primary.dark" } }}
                        title="Open latest approval in search"
                      >
                        <Search className="h-4 w-4" />
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", px: 1, textAlign: "center", fontSize: 10.5, color: "text.disabled" }}>
                    No saved approval yet
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, borderTop: 1, borderColor: "divider", pt: 1.5, fontSize: 10.5 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Amount</Box>
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{formatMoney(summary.amount)}</Box>
            </Stack>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Total Qty/Pcs</Box>
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{summary.totalQty}/{cartWithTotals.length}</Box>
            </Stack>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Gross Value</Box>
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{formatMoney(summary.grossValue)}</Box>
            </Stack>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>Total Discount</Box>
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{formatMoney(summary.totalDiscount)}</Box>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const renderSearchPage = () => (
    <Box sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2 }}>
      <FilterableDataTable
        rows={searchResults}
        columns={approvalSearchColumns}
        loading={searching}
        loadingText="Searching..."
        emptyText="No sales on approval found"
        searchPlaceholder="Search in sales-on-approval fields..."
        showExport={false}
        tablePreferenceKey="sales.sales_on_approval.search"
        onRefresh={() => runApprovalSearch(null, searchPage, searchLimit)}
        refreshDisabled={searching}
        onExportRows={() => loadAllApprovalSearchRows()}
        enableServerSearch
        onServerSearch={handleServerSearch}
        page={searchPage}
        limit={searchLimit}
        totalPages={searchPagination.totalPages}
        totalRows={searchPagination.total}
        onPageChange={(p) => {
          setSearchPage(p);
          runApprovalSearch(null, p, searchLimit);
        }}
        onLimitChange={(value) => {
          setSearchLimit(value);
          setSearchPage(1);
          runApprovalSearch(null, 1, value);
        }}
        onFetchGroupSummaries={fetchApprovalGroupSummaries}
        onFetchGroupRows={fetchApprovalGroupRows}
        paginationMode="server"
        enableVirtualization
      />
    </Box>
  );

  return (
    <Box className="pos-sale-page" sx={{ minHeight: "100%", bgcolor: "background.default", color: "text.primary", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box
              component="button"
              type="button"
              onClick={() => navigate("/sales")}
              sx={{ color: "primary.main", "&:hover": { color: "primary.dark", textDecoration: "underline" } }}
            >
              Sales
            </Box>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">Sales On Approval</Box>
          </Typography>
        </Stack>

        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <Button
            onClick={handleSaveSale}
            disabled={saving || showSearchPage}
            className="glass-btn glass-btn-success"
            startIcon={<Save size={16} />}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary"
            startIcon={<Search size={16} />}
          >
            {showSearchPage ? "Back" : "Search"}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, p: 2, display: "flex", flexDirection: "column", gap: 2, pb: { xs: 14, xl: 2 } }}>
        {showSearchPage ? renderSearchPage() : renderEntryPage()}

        {loading && <Typography sx={{ fontSize: 10.5, color: "text.secondary", px: 0.5 }}>Loading master data...</Typography>}
      </Box>

      {salesManDialog.open && (
        <Box
          sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.3)", p: 2 }}
          onClick={closeSalesManDialog}
        >
          <Box
            sx={{ width: "100%", maxWidth: 384, borderRadius: "7px", border: 1, borderColor: "divider", bgcolor: "background.paper", boxShadow: 12 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
              <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Sales Man</Typography>
              <IconButton
                type="button"
                onClick={closeSalesManDialog}
                size="small"
                aria-label="Close sales man dialog"
                sx={{ color: "text.disabled", "&:hover": { color: "text.secondary" } }}
              >
                <X className="h-4 w-4" />
              </IconButton>
            </Stack>

            <Box sx={{ px: 2, py: 2 }}>
              <TextField
                type="text"
                value={salesManDialog.value}
                onChange={(event) =>
                  setSalesManDialog((prev) => ({ ...prev, value: event.target.value }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    saveSalesManDialog();
                  }
                }}
                placeholder="Write or scan Sales Man ID"
                size="small"
                fullWidth
                autoFocus
              />
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end", borderTop: 1, borderColor: "divider", px: 2, py: 1.5 }}>
              <Button
                type="button"
                onClick={closeSalesManDialog}
                className="glass-btn glass-btn-secondary"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveSalesManDialog}
                className="glass-btn glass-btn-primary"
              >
                Save
              </Button>
            </Stack>
          </Box>
        </Box>
      )}

      {quickCustomerDialogOpen && (
        <Box
          sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.3)", p: 2 }}
          onClick={closeQuickCustomerDialog}
        >
          <Box
            sx={{ display: "flex", maxHeight: "92vh", width: "100%", maxWidth: 1280, flexDirection: "column", borderRadius: "7px", border: 1, borderColor: "divider", bgcolor: "background.paper", boxShadow: 12 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2.5, py: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Quick Customer</Typography>
                <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
                  Press Enter to move to next field. On mobile number Enter, existing customers appear below.
                </Typography>
              </Box>
              <IconButton
                type="button"
                onClick={closeQuickCustomerDialog}
                size="small"
                aria-label="Close quick customer dialog"
                sx={{ color: "text.disabled", "&:hover": { color: "text.secondary" } }}
              >
                <X className="h-4 w-4" />
              </IconButton>
            </Stack>

            <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" }, columnGap: 3, rowGap: 2 }}>
                <DialogTextField
                  label="Mobile No"
                  name="mobileNo"
                  value={quickCustomer.mobileNo}
                  onChange={handleQuickCustomerChange}
                  onKeyDown={(event) => handleQuickCustomerFieldKeyDown("mobileNo", event)}
                  inputRef={(node) => {
                    quickCustomerFieldRefs.current.mobileNo = node;
                  }}
                />
                <DialogTextField
                  label="Address"
                  name="address"
                  value={quickCustomer.address}
                  onChange={handleQuickCustomerChange}
                  onKeyDown={(event) => handleQuickCustomerFieldKeyDown("address", event)}
                  inputRef={(node) => {
                    quickCustomerFieldRefs.current.address = node;
                  }}
                />

                <DialogTextField
                  label="Name"
                  name="name"
                  value={quickCustomer.name}
                  onChange={handleQuickCustomerChange}
                  onKeyDown={(event) => handleQuickCustomerFieldKeyDown("name", event)}
                  inputRef={(node) => {
                    quickCustomerFieldRefs.current.name = node;
                  }}
                />
                <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
                  <DialogSelectField
                    label="City"
                    name="cityId"
                    value={quickCustomer.cityId}
                    options={customerConfigOptions.cities}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("cityId", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.cityId = node;
                    }}
                  />
                  <DialogSelectField
                    label="State"
                    name="stateId"
                    value={quickCustomer.stateId}
                    options={customerConfigOptions.states}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("stateId", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.stateId = node;
                    }}
                  />
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
                  <DialogTextField
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    value={quickCustomer.dateOfBirth}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("dateOfBirth", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.dateOfBirth = node;
                    }}
                  />
                  <DialogTextField
                    label="Billing Name"
                    name="billingName"
                    value={quickCustomer.billingName}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("billingName", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.billingName = node;
                    }}
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
                  <DialogSelectField
                    label="Customer Category"
                    name="customerCategoryId"
                    value={quickCustomer.customerCategoryId}
                    options={customerConfigOptions.customerCategories}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("customerCategoryId", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.customerCategoryId = node;
                    }}
                  />
                  <DialogTextField
                    label="Section/Religion"
                    name="sectionReligion"
                    value={quickCustomer.sectionReligion}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("sectionReligion", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.sectionReligion = node;
                    }}
                  />
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
                  <DialogTextField
                    label="Card No"
                    name="cardNo"
                    value={quickCustomer.cardNo}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("cardNo", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.cardNo = node;
                    }}
                  />
                  <DialogTextField
                    label="GST No"
                    name="gstNo"
                    value={quickCustomer.gstNo}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("gstNo", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.gstNo = node;
                    }}
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { md: "1fr 1fr" }, gap: 2 }}>
                  <DialogTextField
                    label="Email Id"
                    name="emailId"
                    value={quickCustomer.emailId}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("emailId", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.emailId = node;
                    }}
                  />
                  <DialogSelectField
                    label="Area"
                    name="areaId"
                    value={quickCustomer.areaId}
                    options={customerConfigOptions.areas}
                    onChange={handleQuickCustomerChange}
                    onKeyDown={(event) => handleQuickCustomerFieldKeyDown("areaId", event)}
                    inputRef={(node) => {
                      quickCustomerFieldRefs.current.areaId = node;
                    }}
                  />
                </Box>

                <Box sx={{ gridColumn: { xl: "span 2" } }}>
                  <Typography sx={{ mb: 1, fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Search Results</Typography>
                  <Box sx={{ overflow: "hidden", borderRadius: "3.5px", border: 1, borderColor: "divider" }}>
                    <Box sx={{ maxHeight: 320, overflow: "auto" }}>
                      <Table sx={{ width: "100%", minWidth: 720 }} size="small">
                        <TableHead sx={{ position: "sticky", top: 0, bgcolor: "action.hover" }}>
                          <TableRow>
                            <TableCell sx={{ width: 40 }} />
                            <TableCell>Name</TableCell>
                            <TableCell>GSTNO</TableCell>
                            <TableCell>Area</TableCell>
                            <TableCell>Mobile</TableCell>
                            <TableCell>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {quickCustomerSearchResults.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} sx={{ py: 5, textAlign: "center", color: "text.disabled" }}>
                                No matched customers
                              </TableCell>
                            </TableRow>
                          ) : (
                            quickCustomerSearchResults.map((row) => {
                              const isSelected = row.value === quickCustomerSelectedId;
                              return (
                                <TableRow
                                  key={row.value}
                                  sx={{ bgcolor: isSelected ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.08) : "background.paper", "&:hover": { bgcolor: isSelected ? undefined : "action.hover" } }}
                                >
                                  <TableCell>
                                    <Radio
                                      checked={isSelected}
                                      onChange={() => setQuickCustomerSelectedId(row.value)}
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell>{row.name || "-"}</TableCell>
                                  <TableCell>{row.gstNo || "-"}</TableCell>
                                  <TableCell>{row.areaName || "-"}</TableCell>
                                  <TableCell>{row.mobileNo || "-"}</TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      onClick={() => applyQuickCustomerSelection(row)}
                                      className="glass-btn glass-btn-primary"
                                      size="small"
                                    >
                                      Select
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderTop: 1, borderColor: "divider", px: 2.5, py: 2 }}>
              <Button
                type="button"
                onClick={saveQuickCustomer}
                disabled={quickCustomerSaving}
                className="glass-btn glass-btn-success"
              >
                {quickCustomerSaving ? "Saving..." : "Save"}
              </Button>
              <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                <Button
                  type="button"
                  onClick={() => applyQuickCustomerSelection(selectedQuickCustomerSearchRow)}
                  disabled={!selectedQuickCustomerSearchRow}
                  className="glass-btn glass-btn-primary"
                >
                  Select
                </Button>
                <Button
                  type="button"
                  onClick={closeQuickCustomerDialog}
                  disabled={quickCustomerSaving}
                  className="glass-btn glass-btn-secondary"
                >
                  Close
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Box>
      )}

      {discountDialogOpen && (
        <Box
          sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.3)", p: 2 }}
          onClick={closeDiscountDialog}
        >
          <Box
            sx={{ display: "flex", maxHeight: "92vh", width: "100%", maxWidth: 1280, flexDirection: "column", borderRadius: "7px", border: 1, borderColor: "divider", bgcolor: "background.paper", boxShadow: 12 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2.5, py: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Sale Discount</Typography>
                <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
                  Select sale rows and apply a discount percentage to the current approval bill.
                </Typography>
              </Box>
              <IconButton
                type="button"
                onClick={closeDiscountDialog}
                size="small"
                aria-label="Close discount dialog"
                sx={{ color: "text.disabled", "&:hover": { color: "text.secondary" } }}
              >
                <X className="h-4 w-4" />
              </IconButton>
            </Stack>

            <Box sx={{ flex: 1, overflow: "auto", px: 2.5, py: 2 }}>
              <Box sx={{ overflow: "hidden", borderRadius: "3.5px", border: 1, borderColor: "divider" }}>
                <Box sx={{ maxHeight: "56vh", overflow: "auto" }}>
                  <Table sx={{ width: "100%", minWidth: 980 }} size="small">
                    <TableHead sx={{ position: "sticky", top: 0, bgcolor: "action.hover" }}>
                      <TableRow>
                        <TableCell sx={{ width: 48 }}>
                          <Checkbox
                            checked={cartWithTotals.length > 0 && discountSelectedLineIds.length === cartWithTotals.length}
                            onChange={handleDiscountToggleAll}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>Barcode</TableCell>
                        <TableCell>Detail</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell>Discount</TableCell>
                        <TableCell align="right">Addin %</TableCell>
                        <TableCell align="right">D.Value</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {discountDialogRows.map((line, index) => (
                        <TableRow key={line.lineId} hover>
                          <TableCell>
                            <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                              <Checkbox
                                checked={discountDialogSelectedSet.has(line.lineId)}
                                onChange={() => handleDiscountRowToggle(line.lineId)}
                                size="small"
                              />
                              <Box component="span" sx={{ color: "text.secondary" }}>{index + 1}</Box>
                            </Stack>
                          </TableCell>
                          <TableCell>{line.barcode || "-"}</TableCell>
                          <TableCell>{line.productName}</TableCell>
                          <TableCell align="right">{formatMoney(line.price)}</TableCell>
                          <TableCell align="right">{line.qty}</TableCell>
                          <TableCell>{formatMoney(line.discount)}</TableCell>
                          <TableCell align="right">{line.previewPercent.toFixed(2)}</TableCell>
                          <TableCell align="right">{formatMoney(line.previewDiscountValue)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>{formatMoney(line.lineAmount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </Box>

            <Box sx={{ borderTop: 1, borderColor: "divider", px: 2.5, py: 2 }}>
              <Stack direction="row" sx={{ mb: 1.5, flexWrap: "wrap", alignItems: "flex-end", gap: 1.5 }}>
                <Box sx={{ minWidth: 220 }}>
                  <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Discount %</Typography>
                  <TextField
                    type="number"
                    slotProps={{ htmlInput: { min: 0, max: 100, step: 0.01 } }}
                    value={discountPercentInput}
                    onChange={(event) => setDiscountPercentInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        applyDiscountDialog();
                      }
                    }}
                    size="small"
                    fullWidth
                    autoFocus
                  />
                </Box>
                <Box sx={{ display: "grid", minWidth: 260, flex: 1, gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, fontSize: 12.25 }}>
                  <Box sx={{ borderRadius: "3.5px", border: 1, borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}>
                    <Box sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Selected Amount</Box>
                    <Box sx={{ mt: 0.5, fontWeight: 600, color: "text.primary" }}>{formatMoney(discountDialogSummary.selectedAmount)}</Box>
                  </Box>
                  <Box sx={{ borderRadius: "3.5px", border: 1, borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}>
                    <Box sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Discount Value</Box>
                    <Box sx={{ mt: 0.5, fontWeight: 600, color: "text.primary" }}>{formatMoney(discountDialogSummary.previewDiscountValue)}</Box>
                  </Box>
                  <Box sx={{ borderRadius: "3.5px", border: 1, borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}>
                    <Box sx={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Net Amount</Box>
                    <Box sx={{ mt: 0.5, fontWeight: 600, color: "text.primary" }}>{formatMoney(discountDialogSummary.previewNetAmount)}</Box>
                  </Box>
                </Box>
              </Stack>

              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                <Button
                  type="button"
                  onClick={closeDiscountDialog}
                  className="glass-btn glass-btn-secondary"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={applyDiscountDialog}
                  className="glass-btn glass-btn-primary"
                >
                  Apply
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SalesOnApproval;
