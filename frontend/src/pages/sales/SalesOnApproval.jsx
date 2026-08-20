import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Pencil, PlusCircle, Save, Search, Trash2, UserRound, X } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";

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
  <div>
    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <input
      ref={inputRef}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
    />
  </div>
);

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
  <div>
    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <select
      ref={inputRef}
      name={name}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
    >
      <option value="">{placeholder}</option>
      {options.map((row) => (
        <option key={row.value} value={row.value}>
          {row.label}
        </option>
      ))}
    </select>
  </div>
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
      setCustomers(
        customerRows.map((row) => ({
          value: String(row.id),
          id: String(row.id),
          name: row.name || "Unnamed",
          mobileNo: row.mobile_no || "",
          label: `${row.name || "Unnamed"}${row.mobile_no ? ` (${row.mobile_no})` : ""}`,
          dateOfBirth: row.date_of_birth || "",
          billingName: row.billing_name || "",
          cardNo: row.card_no || "",
          gstNo: row.gst_no || "",
          address: row.address || "",
          cityId: row.city_id ? String(row.city_id) : "",
          cityName: row.city?.name || "",
          stateId: row.state_id ? String(row.state_id) : "",
          stateName: row.state?.name || "",
          customerCategoryId: row.customer_category_id ? String(row.customer_category_id) : "",
          customerCategoryName: row.customerCategory?.name || "",
          emailId: row.email_id || "",
          areaId: row.area_id ? String(row.area_id) : "",
          areaName: areaMap.get(String(row.area_id || "")) || "",
          sectionReligion: row.section_religion || "",
        }))
      );
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

  useEffect(() => {
    if (!quickCustomerDialogOpen) return;
    const timer = setTimeout(() => {
      quickCustomerFieldRefs.current.mobileNo?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [quickCustomerDialogOpen]);

  const handleCustomerNumberLookup = useCallback((rawValue) => {
    const query = String(rawValue || "").trim();
    const digitsQuery = query.replace(/\D/g, "");

    if (!query) {
      setExistingCustomerId("");
      setNewCustomer((prev) => ({ ...prev, mobileNo: "", name: "" }));
      return null;
    }

    const matched = customers.find((row) => {
      const mobileDigits = String(row.mobileNo || "").replace(/\D/g, "");
      return digitsQuery ? mobileDigits === digitsQuery : String(row.mobileNo || "").trim() === query;
    });

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
  }, [applyCustomerPanelRow, customers]);

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

  const runQuickCustomerSearch = useCallback((mobileValue = quickCustomer.mobileNo) => {
    const rawQuery = String(mobileValue || "").trim();
    if (!rawQuery) {
      setQuickCustomerSearchResults([]);
      setQuickCustomerSelectedId("");
      return [];
    }

    const digitsQuery = rawQuery.replace(/\D/g, "");
    const matched = customers
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
  }, [customers, quickCustomer.mobileNo]);

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

    const exactExisting = customers.find(
      (row) => String(row.mobileNo || "").replace(/\D/g, "") === mobileNo.replace(/\D/g, "")
    );
    if (exactExisting) {
      setQuickCustomerSearchResults(runQuickCustomerSearch(mobileNo));
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
        render: (value) => <div className="text-center">{toNum(value || 0)}</div>,
      },
      {
        key: "amount",
        label: "Amount",
        valueGetter: (row) => toNum(row.amount || 0),
        render: (value) => <div className="text-right">{formatMoney(value || 0)}</div>,
      },
    ],
    []
  );

  const [searchPagination, setSearchPagination] = useState({ total: 0, totalPages: 1 });

  const renderEntryPage = () => (
    <div className="flex min-h-[calc(100vh-170px)] flex-col gap-2 xl:h-full xl:flex-1 xl:min-h-0 xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-stretch">
      <div className="min-w-0 xl:flex xl:min-h-0">
        <div className="w-full overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm xl:flex xl:h-full xl:min-h-0 xl:flex-col">
          <div className="border-b dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-3">
            <div className="mb-2 text-xs font-semibold text-gray-800 dark:text-gray-100">Add Product</div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-full min-w-0 flex-1 md:min-w-[220px]">
                <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Barcode</label>
                <input
                  ref={barcodeInputRef}
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
                  className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="w-full min-w-0 flex-[1.3] md:min-w-[280px]">
                <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Product (In Stock)</label>
                <select
                  value={addProductKey}
                  onChange={(e) => setAddProductKey(e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select product</option>
                  {productOptions.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs font-bold text-red-700 dark:text-red-400">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddLine();
                    }
                  }}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="w-10">
                <button
                  onClick={handleAddLine}
                  className="glass-btn glass-btn-primary inline-flex h-[34px] w-full items-center justify-center"
                  aria-label="Add product"
                >
                  <PlusCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{selectedStockHint}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-x-auto">
            <div className="flex h-[420px] min-h-[420px] flex-col xl:h-full xl:min-h-0">
              <div className="grid grid-cols-[44px_88px_minmax(0,0.72fr)_52px_68px_58px_70px_68px_78px_78px_64px] border-b dark:border-gray-700 bg-blue-100 dark:bg-blue-900/30 text-[9px] font-semibold text-gray-700 dark:text-gray-300 md:text-[10px] lg:text-xs">
                <div className="border-r dark:border-gray-700 px-2 py-1.5 text-center">S.No</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5">Barcode</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5">Product</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5 text-center">Qty</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5 text-right">Price</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5 text-right">Tax%</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5 text-right">Discount</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5 text-right">Cost</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5 text-right">Total</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5">Salesman</div>
                <div className="px-2 py-1.5 text-center">Action</div>
              </div>

              <div className="grid grid-cols-[44px_88px_minmax(0,0.72fr)_52px_68px_58px_70px_68px_78px_78px_64px] border-b dark:border-gray-700 bg-sky-50 dark:bg-sky-900/20 text-[9px] md:text-[10px] lg:text-xs">
                <div className="border-r dark:border-gray-700 px-2 py-1.5"></div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5">
                  <input
                    type="text"
                    placeholder="Search barcode"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-[9px] md:text-[10px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled
                  />
                </div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5">
                  <input
                    type="text"
                    placeholder="Search product"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-[9px] md:text-[10px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled
                  />
                </div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5">
                  <input
                    type="text"
                    placeholder="Qty"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center text-[9px] md:text-[10px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled
                  />
                </div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5">
                  <input
                    type="text"
                    placeholder="Price"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right text-[9px] md:text-[10px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled
                  />
                </div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5">
                  <input
                    type="text"
                    placeholder="Tax"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right text-[9px] md:text-[10px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled
                  />
                </div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5">
                  <input
                    type="text"
                    placeholder="Disco"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right text-[9px] md:text-[10px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled
                  />
                </div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5"></div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5">
                  <input
                    type="text"
                    placeholder="Total"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right text-[9px] md:text-[10px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled
                  />
                </div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5">
                  <input
                    type="text"
                    placeholder="Salesman"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-[9px] md:text-[10px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled
                  />
                </div>
                <div className="px-2 py-1.5"></div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
                {cartWithTotals.length === 0 ? (
                  <div className="flex h-full items-center justify-center py-16 text-center text-xs text-gray-400 dark:text-gray-500">
                    No products added yet.
                  </div>
                ) : (
                  cartWithTotals.map((line, index) => (
                    <div
                      key={line.lineId}
                      className="grid grid-cols-[44px_88px_minmax(0,0.72fr)_52px_68px_58px_70px_68px_78px_78px_64px] border-b dark:border-gray-700 text-[9px] hover:bg-gray-50 dark:hover:bg-gray-700/50 md:text-[10px] lg:text-xs"
                    >
                      {(() => {
                        const isLineEditable = editingLineId === line.lineId;
                        return (
                          <>
                      <div className="border-r dark:border-gray-700 px-2 py-1.5 text-center">{index + 1}</div>
                      <div className="truncate border-r dark:border-gray-700 px-2 py-1.5 font-mono">{line.barcode || "-"}</div>
                      <div className="truncate border-r dark:border-gray-700 px-2 py-1.5">{line.productName}</div>
                      <div className="border-r dark:border-gray-700 px-2 py-1.5 text-center">
                        {isLineEditable ? (
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={line.qty}
                            onChange={(e) => handleLineQtyChange(line.lineId, e.target.value)}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-center text-[9px] md:text-[10px] lg:text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        ) : line.qty}
                      </div>
                      <div className="border-r dark:border-gray-700 px-1.5 py-1.5 text-right">
                        {isLineEditable ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.price}
                            onChange={(e) => handleLineValueChange(line.lineId, "price", e.target.value)}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right text-[9px] md:text-[10px] lg:text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        ) : (
                          formatMoney(line.price)
                        )}
                      </div>
                      <div className="border-r dark:border-gray-700 px-2 py-1.5 text-right">{toNum(line.tax, 0).toFixed(2)}</div>
                      <div className="border-r dark:border-gray-700 px-1.5 py-1.5 text-right">
                        {isLineEditable ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.discount}
                            onChange={(e) => handleLineValueChange(line.lineId, "discount", e.target.value)}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-right text-[9px] md:text-[10px] lg:text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        ) : (
                          formatMoney(line.discount)
                        )}
                      </div>
                      <div className="border-r dark:border-gray-700 px-2 py-1.5 text-right">{formatMoney(line.cost)}</div>
                      <div className="border-r dark:border-gray-700 px-2 py-1.5 text-right font-medium">{formatMoney(line.total)}</div>
                      <div className="truncate border-r dark:border-gray-700 px-2 py-1.5">{line.salesManName || "-"}</div>
                      <div className="flex items-center justify-center gap-0.5 px-1 py-1.5">
                        <button
                          type="button"
                          onClick={() => toggleLineEdit(line.lineId)}
                          className={`inline-flex items-center justify-center ${
                            isLineEditable ? "text-amber-600 dark:text-amber-400" : "text-gray-600 dark:text-gray-400"
                          } hover:opacity-80`}
                          aria-label={isLineEditable ? "Lock row editing" : "Edit row"}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openSalesManDialog(line)}
                          className={`inline-flex items-center justify-center ${
                            line.salesManId ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"
                          } hover:opacity-80`}
                          aria-label="Assign sales man"
                        >
                          <UserRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveLine(line.lineId)}
                          className="inline-flex items-center justify-center text-red-600 dark:text-red-400 hover:opacity-80"
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  ))
                )}
              </div>

              <div className="grid grid-cols-[44px_88px_minmax(0,0.72fr)_52px_68px_58px_70px_68px_78px_78px_64px] border-t dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-[9px] font-bold text-gray-700 dark:text-gray-300 md:text-[10px] lg:text-xs">
                <div className="border-r dark:border-gray-700 px-2 py-1.5 text-center">-</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5"></div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5"></div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5 text-center text-red-600 dark:text-red-400">{summary.totalQty}</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5"></div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5"></div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5 text-right text-red-600 dark:text-red-400">{formatMoney(summary.totalDiscount)}</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5"></div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5 text-right text-red-600 dark:text-red-400">{formatMoney(summary.amount)}</div>
                <div className="border-r dark:border-gray-700 px-2 py-1.5"></div>
                <div className="px-2 py-1.5"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full xl:flex xl:min-h-0">
        <div className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 shadow-sm xl:flex xl:h-full xl:flex-col">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Date</span>
                <span className="text-gray-900 dark:text-gray-100">{now.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Time</span>
                <span className="text-gray-900 dark:text-gray-100">{now.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-b border-gray-200 dark:border-gray-700 py-2">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_96px]">
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Customer Number</label>
                  <input
                    ref={customerNumberInputRef}
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
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Customer Name</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => handleCustomerNamePanelChange(e.target.value)}
                    placeholder="Customer name"
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-0 md:pt-6">
                <label className="inline-flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  <span>Credit</span>
                  <input
                    type="checkbox"
                    checked={creditEnabled}
                    onChange={(event) => setCreditEnabled(event.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400"
                  />
                </label>
                <label className="inline-flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  <span>IGST</span>
                  <input
                    type="checkbox"
                    checked={igstEnabled}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setIgstEnabled(checked);
                      if (!checked) setPlaceOfSupplyStateId("");
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400"
                  />
                </label>
              </div>
            </div>

            {igstEnabled ? (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Place Of Supply
                </label>
                <select
                  value={placeOfSupplyStateId}
                  onChange={(event) => setPlaceOfSupplyStateId(event.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select state</option>
                  {customerConfigOptions.states.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 py-3">
            <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-[1.1fr_0.9fr_72px] border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-[10px] font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                <div className="px-2 py-2">Last Doc</div>
                <div className="border-l border-gray-200 dark:border-gray-700 px-2 py-2 text-right">Amount</div>
                <div className="border-l border-gray-200 dark:border-gray-700 px-2 py-2 text-center">Action</div>
              </div>
              <div className="h-28 overflow-y-auto">
                {latestApprovalDoc ? (
                  <div className="grid grid-cols-[1.1fr_0.9fr_72px] items-center text-xs text-gray-700 dark:text-gray-300">
                    <div className="px-2 py-2 font-semibold">{formatApprovalNo(latestApprovalDoc.approval_no || latestApprovalDoc.id)}</div>
                    <div className="border-l border-gray-200 dark:border-gray-700 px-2 py-2 text-right font-semibold">
                      {formatMoney(latestApprovalDoc.amount || 0)}
                    </div>
                    <div className="border-l border-gray-200 dark:border-gray-700 px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={openLatestApprovalInSearch}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        title="Open latest approval in search"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-center text-xs text-gray-400 dark:text-gray-500">
                    No saved approval yet
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Amount</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{formatMoney(summary.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Total Qty/Pcs</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{summary.totalQty}/{cartWithTotals.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Gross Value</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{formatMoney(summary.grossValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Total Discount</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{formatMoney(summary.totalDiscount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchPage = () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
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
        paginationMode="server"
      />
    </div>
  );

  return (
    <div className="pos-sale-page min-h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col">
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            aria-label={showSearchPage ? "Back to sales on approval entry" : "Back to sales"}
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
            <span>Sales On Approval</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveSale}
            disabled={saving || showSearchPage}
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

      <div className="flex-1 min-h-0 p-4 space-y-4 pb-28 xl:flex xl:flex-col xl:pb-4">
        {showSearchPage ? renderSearchPage() : renderEntryPage()}

        {loading && <p className="text-xs text-gray-500 dark:text-gray-400 px-1">Loading master data...</p>}
      </div>

      {salesManDialog.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={closeSalesManDialog}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b dark:border-gray-700 px-4 py-3">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sales Man</div>
              <button
                type="button"
                onClick={closeSalesManDialog}
                className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="Close sales man dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-4">
              <input
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
                className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t dark:border-gray-700 px-4 py-3">
              <button
                type="button"
                onClick={closeSalesManDialog}
                className="glass-btn glass-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSalesManDialog}
                className="glass-btn glass-btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {quickCustomerDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={closeQuickCustomerDialog}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-7xl flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b dark:border-gray-700 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Quick Customer</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Press Enter to move to next field. On mobile number Enter, existing customers appear below.
                </div>
              </div>
              <button
                type="button"
                onClick={closeQuickCustomerDialog}
                className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="Close quick customer dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 xl:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                </div>

                <div className="xl:col-span-2">
                  <div className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">Search Results</div>
                  <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                    <div className="max-h-[320px] overflow-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          <tr>
                            <th className="w-10 px-3 py-2 text-left"></th>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">GSTNO</th>
                            <th className="px-3 py-2 text-left">Area</th>
                            <th className="px-3 py-2 text-left">Mobile</th>
                            <th className="px-3 py-2 text-left">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quickCustomerSearchResults.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                                No matched customers
                              </td>
                            </tr>
                          ) : (
                            quickCustomerSearchResults.map((row) => {
                              const isSelected = row.value === quickCustomerSelectedId;
                              return (
                                <tr
                                  key={row.value}
                                  className={`border-t dark:border-gray-700 ${isSelected ? "bg-blue-50 dark:bg-blue-900/30" : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                                >
                                  <td className="px-3 py-2">
                                    <input
                                      type="radio"
                                      checked={isSelected}
                                      onChange={() => setQuickCustomerSelectedId(row.value)}
                                      className="h-4 w-4 accent-blue-600"
                                    />
                                  </td>
                                  <td className="px-3 py-2">{row.name || "-"}</td>
                                  <td className="px-3 py-2">{row.gstNo || "-"}</td>
                                  <td className="px-3 py-2">{row.areaName || "-"}</td>
                                  <td className="px-3 py-2">{row.mobileNo || "-"}</td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => applyQuickCustomerSelection(row)}
                                      className="glass-btn glass-btn-primary"
                                    >
                                      Select
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t dark:border-gray-700 px-5 py-4">
              <button
                type="button"
                onClick={saveQuickCustomer}
                disabled={quickCustomerSaving}
                className="glass-btn glass-btn-success disabled:opacity-50"
              >
                {quickCustomerSaving ? "Saving..." : "Save"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyQuickCustomerSelection(selectedQuickCustomerSearchRow)}
                  disabled={!selectedQuickCustomerSearchRow}
                  className="glass-btn glass-btn-primary disabled:opacity-50"
                >
                  Select
                </button>
                <button
                  type="button"
                  onClick={closeQuickCustomerDialog}
                  disabled={quickCustomerSaving}
                  className="glass-btn glass-btn-secondary disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {discountDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={closeDiscountDialog}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-7xl flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b dark:border-gray-700 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sale Discount</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Select sale rows and apply a discount percentage to the current approval bill.
                </div>
              </div>
              <button
                type="button"
                onClick={closeDiscountDialog}
                className="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="Close discount dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4">
              <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                <div className="max-h-[56vh] overflow-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="w-12 px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={cartWithTotals.length > 0 && discountSelectedLineIds.length === cartWithTotals.length}
                            onChange={handleDiscountToggleAll}
                            className="h-4 w-4 accent-blue-600"
                          />
                        </th>
                        <th className="px-3 py-3 text-left">Barcode</th>
                        <th className="px-3 py-3 text-left">Detail</th>
                        <th className="px-3 py-3 text-right">Price</th>
                        <th className="px-3 py-3 text-right">Qty</th>
                        <th className="px-3 py-3 text-left">Discount</th>
                        <th className="px-3 py-3 text-right">Addin %</th>
                        <th className="px-3 py-3 text-right">D.Value</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discountDialogRows.map((line, index) => (
                        <tr key={line.lineId} className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={discountDialogSelectedSet.has(line.lineId)}
                                onChange={() => handleDiscountRowToggle(line.lineId)}
                                className="h-4 w-4 accent-blue-600"
                              />
                              <span className="text-gray-600 dark:text-gray-400">{index + 1}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">{line.barcode || "-"}</td>
                          <td className="px-3 py-3">{line.productName}</td>
                          <td className="px-3 py-3 text-right">{formatMoney(line.price)}</td>
                          <td className="px-3 py-3 text-right">{line.qty}</td>
                          <td className="px-3 py-3">{formatMoney(line.discount)}</td>
                          <td className="px-3 py-3 text-right">{line.previewPercent.toFixed(2)}</td>
                          <td className="px-3 py-3 text-right">{formatMoney(line.previewDiscountValue)}</td>
                          <td className="px-3 py-3 text-right font-medium">{formatMoney(line.lineAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="border-t dark:border-gray-700 px-5 py-4">
              <div className="mb-3 flex flex-wrap items-end gap-3">
                <div className="min-w-[220px]">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={discountPercentInput}
                    onChange={(event) => setDiscountPercentInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        applyDiscountDialog();
                      }
                    }}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                </div>
                <div className="grid min-w-[260px] flex-1 grid-cols-3 gap-3 text-sm">
                  <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Selected Amount</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{formatMoney(discountDialogSummary.selectedAmount)}</div>
                  </div>
                  <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Discount Value</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{formatMoney(discountDialogSummary.previewDiscountValue)}</div>
                  </div>
                  <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Net Amount</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{formatMoney(discountDialogSummary.previewNetAmount)}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDiscountDialog}
                  className="glass-btn glass-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyDiscountDialog}
                  className="glass-btn glass-btn-primary"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOnApproval;
