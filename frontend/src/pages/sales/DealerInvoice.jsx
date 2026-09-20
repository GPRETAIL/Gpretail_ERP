import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, PlusCircle, Save, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";
import { createGroupFetchers } from "../../utils/serverGrouping";
import SearchableSelect from "../../components/SearchableSelect";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, Checkbox, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

// Matches config('pagination.resources.dealer_invoices.groupable_columns') on the backend.
const { onFetchGroupSummaries: fetchDealerInvoiceGroupSummaries, onFetchGroupRows: fetchDealerInvoiceGroupRows } =
  createGroupFetchers("/dealer-invoices", { customer_name: "customer_id" });

const mapCustomerOption = (row) => ({
  value: String(row.id),
  id: String(row.id),
  label: `${row.name || "Unnamed"}${row.phone ? ` (${row.phone})` : ""}`,
  name: row.name || "Unnamed",
  mobileNo: row.phone || "",
});

const normalize = (value) => String(value || "").trim().toLowerCase();
const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const createDefaultItemFilters = () => ({
  barcode: "",
  productName: "",
  tax: "",
  mrp: "",
  cost: "",
  price: "",
  qty: "",
  discount: "",
  addlDiscount: "",
  discountPerc: "",
  amount: "",
});

const createEmptyTaxLine = () => ({
  id: Date.now() + Math.random(),
  taxTypeId: "",
  taxValue: "",
  taxDiscount: "",
  chargeTypeValue: "",
});

const CHARGE_TYPE_GROUPS = [
  {
    label: "Base Amount",
    options: [{ label: "Base Amount", value: "Amount" }],
  },
  {
    label: "Taxes",
    options: [
      { label: "Tax", value: "Tax" },
      { label: "Cess", value: "Cess" },
      { label: "TCS", value: "TCS" },
    ],
  },
  {
    label: "Discounts",
    options: [
      { label: "Discount", value: "Discount" },
      { label: "Discount on Discount", value: "OnDiscount" },
      { label: "Agent Discount", value: "Agnt Discount" },
      { label: "Agent Commission", value: "Agnt Comm" },
    ],
  },
  {
    label: "Charges",
    options: [
      { label: "Service Charge", value: "Service" },
      { label: "Courier Charge", value: "Courier" },
      { label: "Packing Charge", value: "Packing" },
      { label: "Freight Charge", value: "Fright" },
      { label: "Insurance", value: "Insurance" },
    ],
  },
  {
    label: "Other",
    options: [
      { label: "Rounding Adjustment", value: "Rounding" },
      { label: "Job Work Charge", value: "Job Work" },
    ],
  },
];

const CHARGE_TYPE_OPTIONS = CHARGE_TYPE_GROUPS.flatMap((group) => group.options);
const CHARGE_TYPE_DIALOG_OPTIONS = CHARGE_TYPE_GROUPS.flatMap((group, index) => [
  { label: group.label, disabled: true },
  { divider: true, value: `divider-${index}` },
  ...group.options,
]);
const CHARGE_TYPE_LABELS = new Map(CHARGE_TYPE_OPTIONS.map((option) => [option.value, option.label]));

const buildTaxRow = (line, taxes) => {
  const tax = taxes.find((row) => String(row.id) === String(line.taxTypeId));
  const taxPerc = Math.max(0, toNum(tax?.tax_percentage, 0));
  const taxValue = Math.max(0, toNum(line.taxValue, 0));
  const taxDiscount = Math.max(0, toNum(line.taxDiscount, 0));
  const taxable = Math.max(0, round2(taxValue - taxDiscount));
  const taxAmount = round2(taxable * (taxPerc / 100));

  return {
    ...line,
    taxName: tax?.name || "",
    taxPerc,
    taxValue,
    taxDiscount,
    taxable,
    taxAmount,
    chargeTypeValue: line.chargeTypeValue || "",
    chargeTypeLabel: CHARGE_TYPE_LABELS.get(line.chargeTypeValue) || "",
  };
};

const TaxChargeTypeDialog = ({ open, value, onClose, onConfirm }) => {
  const [selectedValue, setSelectedValue] = useState(value || "");

  useEffect(() => {
    if (!open) return;
    setSelectedValue(value || "");
  }, [open, value]);

  if (!open) return null;

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <Box
        sx={{ width: "100%", maxWidth: 448, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 8 }}
        onClick={(event) => event.stopPropagation()}
      >
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Charge Type</Typography>
        </Box>
        <Box sx={{ px: 2, py: 2 }}>
          <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>Type</Typography>
          <SearchableSelect
            name="chargeType"
            options={CHARGE_TYPE_DIALOG_OPTIONS}
            value={selectedValue}
            onChange={(event) => setSelectedValue(event.target.value)}
            placeholder="Select Type"
          />
        </Box>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", borderTop: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5 }}>
          <Button type="button" onClick={onClose} className="glass-btn glass-btn-secondary">Cancel</Button>
          <Button type="button" onClick={() => onConfirm(selectedValue)} className="glass-btn glass-btn-primary">
            Save
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

const DealerInvoice = () => {
  const navigate = useNavigate();

  const [now, setNow] = useState(new Date());
  const [billNo, setBillNo] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [soNo, setSoNo] = useState("");
  const [remarks, setRemarks] = useState("");

  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [dealerSales, setDealerSales] = useState(true);

  const [addlDiscount, setAddlDiscount] = useState("0");
  const [addlCharge, setAddlCharge] = useState("0");
  const [taxLines, setTaxLines] = useState([]);
  const [taxDraft, setTaxDraft] = useState(createEmptyTaxLine);
  const [taxChargeTypeDialog, setTaxChargeTypeDialog] = useState({ open: false, lineId: null, value: "" });

  const [stockRows, setStockRows] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [addBarcode, setAddBarcode] = useState("");
  const [addProductKey, setAddProductKey] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [cart, setCart] = useState([]);
  const [itemFilterDraft, setItemFilterDraft] = useState(createDefaultItemFilters);
  const [itemFilters, setItemFilters] = useState(createDefaultItemFilters);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSearchPage, setShowSearchPage] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    search: "",
    billNo: "",
    customerName: "",
    product: "",
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLimit, setSearchLimit] = useState(20);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadNextBillNo = useCallback(async () => {
    try {
      const res = await api.get("/dealer-invoices/next-bill-no");
      setBillNo(toNum(res.data?.data?.billNo, 1));
    } catch {
      setBillNo(1);
    }
  }, []);

  const loadMasterData = useCallback(async () => {
    try {
      const [customersRes, barcodesRes, productsRes, taxesRes] = await Promise.all([
        // Was default (~50 rows), no way to search beyond it -- customer now has real async
        // search (handleAsyncCustomerSearch below) covering the real table.
        api.get("/customers", { params: { limit: 300 } }).catch(() => ({ data: { data: [] } })),
        api.get("/barcodes").catch(() => ({ data: { data: [] } })),
        api.get("/products", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
        api.get("/taxes").catch(() => ({ data: { data: [] } })),
      ]);

      const customerRows = customersRes.data?.data || [];
      // row.mobile_no doesn't exist on the /customers response (the real field is `phone`), so
      // the phone suffix here never actually showed.
      setCustomers(customerRows.map(mapCustomerOption));
      setTaxes(taxesRes.data?.data || []);

      const products = productsRes.data?.data || [];
      const productTaxMap = new Map();
      products.forEach((p) => {
        const key = normalize(p.name);
        if (!key) return;
        productTaxMap.set(key, toNum(p?.salesTax?.tax_percentage, 0));
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
            mrp: toNum(row.mrp || row.final_price || row.selling_price || 0),
            cost: toNum(row.cost, 0),
            price: toNum(row.final_price || row.selling_price || row.mrp, 0),
            tax,
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
      toast.error("Failed to load dealer invoice data");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.all([loadMasterData(), loadNextBillNo()]);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadMasterData, loadNextBillNo]);

  const selectedCustomer = useMemo(
    () => customers.find((row) => row.value === customerId) || null,
    [customers, customerId]
  );

  // customers is only ever seeded with a small batch (see loadMasterData above) -- this hits
  // /customers' own ?search= endpoint for anything beyond that.
  const handleAsyncCustomerSearch = useCallback(async (query) => {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];
    try {
      const res = await api.get("/customers", { params: { search: trimmed, limit: 20 } });
      const mapped = (res.data?.data || []).map(mapCustomerOption);
      if (mapped.length) {
        setCustomers((prev) => {
          const existingIds = new Set(prev.map((c) => c.value));
          const newOnes = mapped.filter((c) => !existingIds.has(c.value));
          return newOnes.length ? [...prev, ...newOnes] : prev;
        });
      }
      return mapped;
    } catch {
      return [];
    }
  }, []);

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
        const mrp = Math.max(0, toNum(line.mrp, 0));
        const price = Math.max(0, toNum(line.price, 0));
        const tax = Math.max(0, toNum(line.tax, 0));
        const discount = Math.max(0, toNum(line.discount, 0));
        const addlDiscount = Math.max(0, toNum(line.addlDiscount, 0));
        const discountPerc = Math.max(0, toNum(line.discountPerc, 0));
        const subtotal = qty * price;
        const taxAmount = (subtotal * tax) / 100;
        const percentDiscountAmount = round2((subtotal * discountPerc) / 100);
        const totalLineDiscount = round2(discount + addlDiscount + percentDiscountAmount);
        const total = subtotal + taxAmount - totalLineDiscount;
        const gross = Math.max(0, toNum(line.cost, 0)) * qty;
        return {
          ...line,
          mrp,
          subtotal,
          taxAmount,
          total,
          gross,
          discount,
          addlDiscount,
          discountPerc,
          percentDiscountAmount,
          totalLineDiscount,
          amount: total,
        };
      }),
    [cart]
  );

  const taxDraftRow = useMemo(() => buildTaxRow(taxDraft, taxes), [taxDraft, taxes]);
  const taxRows = useMemo(() => taxLines.map((line) => buildTaxRow(line, taxes)), [taxLines, taxes]);

  const taxSummary = useMemo(
    () =>
      taxRows.reduce(
        (acc, row) => ({
          taxable: acc.taxable + row.taxable,
          discount: acc.discount + row.taxDiscount,
          tax: acc.tax + row.taxAmount,
        }),
        { taxable: 0, discount: 0, tax: 0 }
      ),
    [taxRows]
  );

  const summary = useMemo(() => {
    const lineAmount = round2(cartWithTotals.reduce((sum, line) => sum + line.total, 0));
    const totalQty = cartWithTotals.reduce((sum, line) => sum + toNum(line.qty, 0), 0);
    const grossValue = round2(cartWithTotals.reduce((sum, line) => sum + line.gross, 0));
    const lineDiscount = round2(cartWithTotals.reduce((sum, line) => sum + line.totalLineDiscount, 0));
    const addlDiscountNum = Math.max(0, toNum(addlDiscount, 0));
    const addlChargeNum = Math.max(0, toNum(addlCharge, 0));
    const taxDiscount = round2(taxSummary.discount);
    const extraTax = round2(taxSummary.tax);
    const amount = Math.max(0, round2(lineAmount + extraTax - taxDiscount - addlDiscountNum + addlChargeNum));

    return {
      lineAmount,
      totalQty,
      grossValue,
      lineDiscount,
      taxDiscount,
      totalDiscount: round2(lineDiscount + taxDiscount + addlDiscountNum),
      taxAmount: extraTax,
      addlDiscountNum,
      addlChargeNum,
      amount,
    };
  }, [cartWithTotals, addlDiscount, addlCharge, taxSummary]);

  const filteredCartWithTotals = useMemo(() => {
    const activeFilters = Object.entries(itemFilters).filter(([, value]) => String(value || "").trim() !== "");
    if (activeFilters.length === 0) return cartWithTotals;

    return cartWithTotals.filter((item) =>
      activeFilters.every(([key, value]) =>
        String(item[key] ?? "").toLowerCase().includes(String(value).trim().toLowerCase())
      )
    );
  }, [cartWithTotals, itemFilters]);

  const cartColumnTotals = useMemo(
    () =>
      cartWithTotals.reduce(
        (acc, item) => ({
          barcode: acc.barcode,
          productName: acc.productName,
          mrp: acc.mrp + (Number(item.mrp) || 0),
          tax: acc.tax + (Number(item.tax) || 0),
          cost: acc.cost + (Number(item.cost) || 0),
          price: acc.price + (Number(item.price) || 0),
          qty: acc.qty + (Number(item.qty) || 0),
          discount: acc.discount + (Number(item.discount) || 0),
          addlDiscount: acc.addlDiscount + (Number(item.addlDiscount) || 0),
          discountPerc: acc.discountPerc + (Number(item.discountPerc) || 0),
          amount: acc.amount + (Number(item.amount) || 0),
        }),
        { barcode: 0, productName: 0, mrp: 0, tax: 0, cost: 0, price: 0, qty: 0, discount: 0, addlDiscount: 0, discountPerc: 0, amount: 0 }
      ),
    [cartWithTotals]
  );

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
            mrp: source.mrp,
            price: source.price,
            tax: source.tax,
            cost: source.cost,
            discount: 0,
            addlDiscount: 0,
            discountPerc: 0,
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
  };

  const handleLineValueChange = (lineId, field, raw) => {
    const numeric = Math.max(0, toNum(raw, 0));
    setCart((prev) =>
      prev.map((line) => (line.lineId === lineId ? { ...line, [field]: numeric } : line))
    );
  };

  const handleRemoveLine = (lineId) => {
    setCart((prev) => prev.filter((line) => line.lineId !== lineId));
  };

  const handleTaxDraftChange = (key, value) => {
    setTaxDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddTaxLine = () => {
    if (!taxDraft.taxTypeId) {
      toast.error("Select tax type");
      return;
    }

    if (toNum(taxDraft.taxValue, 0) <= 0) {
      toast.error("Tax value must be greater than 0");
      return;
    }

    setTaxLines((prev) => [...prev, { ...taxDraft, id: Date.now() + Math.random() }]);
    setTaxDraft(createEmptyTaxLine());
  };

  const handleRemoveTaxLine = (lineId) => {
    setTaxLines((prev) => prev.filter((line) => line.id !== lineId));
  };

  const handleOpenTaxChargeTypeDialog = (line) => {
    setTaxChargeTypeDialog({
      open: true,
      lineId: line.id,
      value: line.chargeTypeValue || "",
    });
  };

  const handleSaveTaxChargeType = (chargeTypeValue) => {
    setTaxLines((prev) =>
      prev.map((line) =>
        line.id === taxChargeTypeDialog.lineId
          ? { ...line, chargeTypeValue: chargeTypeValue || "" }
          : line
      )
    );
    setTaxChargeTypeDialog({ open: false, lineId: null, value: "" });
  };

  const handleItemFilterDraftChange = (key, value) => {
    setItemFilterDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleItemFilterKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    setItemFilters({ ...itemFilterDraft });
  };

  const handleResetEntry = () => {
    setCustomerId("");
    setSoNo("");
    setRemarks("");
    setDiscountEnabled(false);
    setDealerSales(true);
    setAddlDiscount("0");
    setAddlCharge("0");
    setTaxLines([]);
    setTaxDraft(createEmptyTaxLine());
    setAddBarcode("");
    setAddProductKey("");
    setAddQty("1");
    setCart([]);
    setItemFilterDraft(createDefaultItemFilters());
    setItemFilters(createDefaultItemFilters());
  };

  const handleSave = async () => {
    if (!customerId) {
      toast.error("Please select customer");
      return;
    }

    if (cartWithTotals.length === 0) {
      toast.error("Add at least one product before save");
      return;
    }

    const payload = {
      customerId,
      soNo: String(soNo || "").trim() || null,
      remarks: String(remarks || "").trim() || null,
      discountEnabled,
      dealerSales,
      addlDiscount: summary.addlDiscountNum,
      addlCharge: summary.addlChargeNum,
      taxLines: taxRows.map((row) => ({
        taxTypeId: row.taxTypeId,
        taxValue: row.taxValue,
        taxDiscount: row.taxDiscount,
        taxAmount: row.taxAmount,
      })),
      saleAt: now.toISOString(),
      items: cartWithTotals.map((line) => ({
        barcodeId: line.stockId,
        barcode: line.barcode,
        productName: line.productName,
        qty: line.qty,
        price: line.price,
        tax: line.tax,
        cost: line.cost,
        discount: line.totalLineDiscount,
      })),
    };

    setSaving(true);
    try {
      const res = await api.post("/dealer-invoices", payload);
      const savedBillNo = res.data?.data?.bill_no;
      toast.success(`Dealer invoice saved successfully (Bill #${savedBillNo})`);
      handleResetEntry();
      await Promise.all([loadMasterData(), loadNextBillNo()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save dealer invoice");
    } finally {
      setSaving(false);
    }
  };

  const runDealerInvoiceSearch = useCallback(async (overrideFilters = null, pageOverride = 1, limitOverride = searchLimit) => {
    const filters = overrideFilters || searchFilters;
    setSearching(true);
    try {
      const params = { page: pageOverride, limit: limitOverride };
      if (String(filters.search || "").trim()) params.search = filters.search;
      if (String(filters.billNo || "").trim()) params.billNo = filters.billNo;
      if (String(filters.customerName || "").trim()) params.customerName = filters.customerName;
      if (String(filters.product || "").trim()) params.product = filters.product;

      const res = await api.get("/dealer-invoices", { params });
      setSearchResults(res.data?.data || []);
      const p = res.data?.pagination || {};
      const total = Number(p.total ?? res.data?.total ?? 0) || 0;
      const totalPages = Math.max(Number(p.totalPages ?? Math.ceil(total / Math.max(limitOverride, 1))) || 1, 1);
      setSearchPagination({ total, totalPages });
      setSearchPage(pageOverride);
    } catch {
      toast.error("Failed to search dealer invoices");
    } finally {
      setSearching(false);
    }
  }, [searchFilters, searchLimit]);

  const loadAllDealerInvoiceSearchRows = useCallback(async (overrideFilters = null) => {
    const filters = overrideFilters || searchFilters;
    const params = { all: "true" };
    if (String(filters.search || "").trim()) params.search = filters.search;
    if (String(filters.billNo || "").trim()) params.billNo = filters.billNo;
    if (String(filters.customerName || "").trim()) params.customerName = filters.customerName;
    if (String(filters.product || "").trim()) params.product = filters.product;

    const res = await api.get("/dealer-invoices", { params });
    return res.data?.data || [];
  }, [searchFilters]);

  const openSearchPage = async () => {
    setShowSearchPage(true);
    setSearchPage(1);
    const empty = { search: "", billNo: "", customerName: "", product: "" };
    setSearchFilters(empty);
    await runDealerInvoiceSearch(empty, 1, searchLimit);
  };

  const handleServerSearch = useCallback(({ query }) => {
    setSearchFilters((prev) => {
      const nextFilters = { ...prev, search: query };
      runDealerInvoiceSearch(nextFilters, 1, searchLimit);
      return nextFilters;
    });
    setSearchPage(1);
  }, [searchLimit, runDealerInvoiceSearch]);

  const dealerInvoiceSearchColumns = useMemo(
    () => [
      {
        key: "bill_no",
        label: "Bill No",
        valueGetter: (row) => row.bill_no || "-",
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
    <Box sx={{ display: "grid", height: "100%", minHeight: 0, gridTemplateColumns: { xs: "1fr", xl: "repeat(12, 1fr)" }, gap: 2 }}>
      <Stack spacing={1.5} sx={{ gridColumn: { xl: "span 3" }, height: "100%", minHeight: 0, overflowY: "auto", overflowX: "hidden", bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 1.5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.5, fontSize: 9 }}>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "3.5px", px: 1, py: 0.5 }}>
            <Typography sx={{ fontSize: 9, lineHeight: 1, color: "text.secondary" }}>Bill No</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 11, fontWeight: 600, lineHeight: 1 }}>{billNo}</Typography>
          </Box>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "3.5px", px: 1, py: 0.5 }}>
            <Typography sx={{ fontSize: 9, lineHeight: 1, color: "text.secondary" }}>Date</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 11, fontWeight: 600, lineHeight: 1 }}>{now.toLocaleDateString()}</Typography>
          </Box>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "3.5px", px: 1, py: 0.5 }}>
            <Typography sx={{ fontSize: 9, lineHeight: 1, color: "text.secondary" }}>Time</Typography>
            <Typography sx={{ mt: 0.5, fontSize: 11, fontWeight: 600, lineHeight: 1 }}>{now.toLocaleTimeString()}</Typography>
          </Box>
        </Box>

        <Box>
          <Typography component="label" sx={{ display: "block", mb: 0.5, fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Customer Name</Typography>
          <AsyncSearchSelect
            name="customerId"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={customers}
            onAsyncSearch={handleAsyncCustomerSearch}
            placeholder="Select customer"
            searchPlaceholder="Search customer..."
          />
          {selectedCustomer && (
            <Typography sx={{ mt: 1, fontSize: 12.25, color: "success.dark", bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.16 : 0.08), border: "1px solid", borderColor: (theme) => alpha(theme.palette.success.main, 0.4), borderRadius: "3.5px", p: 1 }}>
              Selected: {selectedCustomer.label}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={2} sx={{ fontSize: 12.25 }}>
          <Stack component="label" direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Checkbox
              size="small"
              checked={discountEnabled}
              onChange={(e) => setDiscountEnabled(e.target.checked)}
              sx={{ p: 0 }}
            />
            Discount
          </Stack>

          <Stack component="label" direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Checkbox
              size="small"
              checked={dealerSales}
              onChange={(e) => setDealerSales(e.target.checked)}
              sx={{ p: 0 }}
            />
            Dealer Sales
          </Stack>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          <Box>
            <Typography component="label" sx={{ display: "block", mb: 0.5, fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>SO No</Typography>
            <TextField
              type="text"
              value={soNo}
              onChange={(e) => setSoNo(e.target.value)}
              placeholder="Enter SO number"
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
            />
          </Box>

          <Box>
            <Typography component="label" sx={{ display: "block", mb: 0.5, fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>Remarks</Typography>
            <TextField
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks"
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
            />
          </Box>
        </Box>

        <Box sx={{ borderRadius: "5.25px", border: "1px solid", borderColor: "divider", p: 1.5 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr auto", alignItems: "center", gap: 1, px: 0.5, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "error.dark" }}>
            <Box>Type</Box>
            <Box>Cost</Box>
            <Box>Tax</Box>
            <Box>Amount</Box>
            <Box></Box>
          </Box>

          <Box sx={{ mt: 0.5, mb: 1.5, display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr auto", alignItems: "center", gap: 1 }}>
            <TextField
              select
              value={taxDraft.taxTypeId}
              onChange={(e) => handleTaxDraftChange("taxTypeId", e.target.value)}
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
            >
              <MenuItem value="">Select tax</MenuItem>
              {taxes.map((tax) => (
                <MenuItem key={tax.id} value={tax.id}>
                  {tax.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              value={taxDraft.taxValue}
              onChange={(e) => handleTaxDraftChange("taxValue", e.target.value)}
              placeholder="taxable"
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
            />
            <TextField
              type="text"
              value={taxDraft.taxTypeId ? `${taxDraftRow.taxPerc.toFixed(2)}%` : ""}
              slotProps={{ input: { readOnly: true } }}
              placeholder="tax"
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, color: "text.secondary" } }}
            />
            <TextField
              type="text"
              value={taxDraftRow.taxAmount ? taxDraftRow.taxAmount.toFixed(2) : ""}
              slotProps={{ input: { readOnly: true } }}
              placeholder="amount"
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, color: "text.secondary" } }}
            />
            <Button
              type="button"
              onClick={handleAddTaxLine}
              className="glass-btn glass-btn-primary"
              sx={{ display: "inline-flex", height: 32, width: 32, minWidth: 0, alignItems: "center", justifyContent: "center" }}
              title="Add tax line"
            >
              <PlusCircle className="w-4 h-4" />
            </Button>
          </Box>

          <Box sx={{ borderRadius: "3.5px", border: "1px solid", borderColor: "divider" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 52px", gap: 1, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", px: 1.5, py: 1, fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>
              <Box>Type</Box>
              <Box>Cost</Box>
              <Box>Tax</Box>
              <Box>Amount</Box>
              <Box></Box>
            </Box>
            <Box sx={{ height: 96, overflowY: "auto" }}>
              {taxRows.length > 0 ? (
                taxRows.map((line) => (
                  <Box key={line.id} sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 52px", alignItems: "center", gap: 1, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 }, px: 1.5, py: 1, fontSize: 12.25, color: "text.primary" }}>
                    <Box>{line.chargeTypeLabel || line.taxName || "-"}</Box>
                    <Box>{line.taxValue.toFixed(2)}</Box>
                    <Box>{line.taxPerc.toFixed(2)}%</Box>
                    <Box>{line.taxAmount.toFixed(2)}</Box>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: "center" }}>
                      <IconButton
                        type="button"
                        onClick={() => handleOpenTaxChargeTypeDialog(line)}
                        size="small"
                        sx={{ color: "text.secondary", "&:hover": { color: "primary.main" }, p: 0.25 }}
                        title="Edit charge type"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </IconButton>
                      <IconButton
                        type="button"
                        onClick={() => handleRemoveTaxLine(line.id)}
                        size="small"
                        sx={{ color: "text.secondary", "&:hover": { color: "error.main" }, p: 0.25 }}
                        title="Remove tax row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconButton>
                    </Stack>
                  </Box>
                ))
              ) : (
                <Box sx={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", px: 2, fontSize: 12.25, color: "text.disabled" }}>No tax rows added</Box>
              )}
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, borderTop: 1, borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1, fontSize: 12.25, fontWeight: 700, color: "text.primary" }}>
              <Box>-</Box>
              <Box>{taxSummary.taxable.toFixed(2)}</Box>
              <Box>-</Box>
              <Box>{taxSummary.tax.toFixed(2)}</Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "5.25px", p: 1.5 }}>
          <Typography component="h2" sx={{ mb: 1, fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>Bill</Typography>

          <Stack spacing={1} sx={{ fontSize: 12.25 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", border: "1px solid", borderColor: "divider", borderRadius: "3.5px", px: 1.5, py: 1 }}>
              <Box component="span" sx={{ color: "text.secondary" }}>Total Qty/Pcs</Box>
              <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{summary.totalQty.toFixed(2)}/{cartWithTotals.length}</Box>
            </Stack>

            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", border: "1px solid", borderColor: "divider", borderRadius: "3.5px", px: 1.5, py: 1 }}>
              <Box component="span" sx={{ color: "text.secondary" }}>Total Discount</Box>
              <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{formatMoney(summary.totalDiscount)}</Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", border: "1px solid", borderColor: "divider", borderRadius: "3.5px", px: 1.5, py: 1 }}>
              <Box component="span" sx={{ color: "text.secondary" }}>Addl Discount</Box>
              <TextField
                type="number"
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                value={addlDiscount}
                onChange={(e) => setAddlDiscount(e.target.value)}
                size="small"
                sx={{ width: 112, "& .MuiInputBase-input": { textAlign: "right", py: 0.75 } }}
              />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", border: "1px solid", borderColor: "divider", borderRadius: "3.5px", px: 1.5, py: 1 }}>
              <Box component="span" sx={{ color: "text.secondary" }}>Addl Charge</Box>
              <TextField
                type="number"
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                value={addlCharge}
                onChange={(e) => setAddlCharge(e.target.value)}
                size="small"
                sx={{ width: 112, "& .MuiInputBase-input": { textAlign: "right", py: 0.75 } }}
              />
            </Stack>
          </Stack>
        </Box>
      </Stack>

      <Stack spacing={1.5} sx={{ gridColumn: { xl: "span 9" }, minHeight: 0 }}>
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, px: 1.5, py: 1.25 }}>
          <Typography component="h2" sx={{ mb: 1, fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>Add Product</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(12, 1fr)" }, gap: 0.75, alignItems: "end" }}>
            <Box sx={{ gridColumn: { md: "span 4" } }}>
              <Typography component="label" sx={{ display: "block", mb: 0.5, fontSize: 11, fontWeight: 500, color: "text.secondary" }}>Barcode</Typography>
              <TextField
                type="text"
                value={addBarcode}
                onChange={(e) => setAddBarcode(e.target.value)}
                placeholder="Scan / enter barcode"
                size="small"
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
              />
            </Box>
            <Box sx={{ gridColumn: { md: "span 5" } }}>
              <Typography component="label" sx={{ display: "block", mb: 0.5, fontSize: 11, fontWeight: 500, color: "text.secondary" }}>Product (In Stock)</Typography>
              <TextField
                select
                value={addProductKey}
                onChange={(e) => setAddProductKey(e.target.value)}
                size="small"
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
              >
                <MenuItem value="">Select product</MenuItem>
                {productOptions.map((row) => (
                  <MenuItem key={row.value} value={row.value}>
                    {row.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ gridColumn: { md: "span 2" } }}>
              <Typography component="label" sx={{ display: "block", mb: 0.5, fontSize: 11, fontWeight: 500, color: "text.secondary" }}>Qty</Typography>
              <TextField
                type="number"
                slotProps={{ htmlInput: { min: 1 } }}
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                size="small"
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
              />
            </Box>
            <Box sx={{ gridColumn: { md: "span 1" } }}>
              <Button
                onClick={handleAddLine}
                className="glass-btn glass-btn-primary"
                fullWidth
                sx={{ display: "inline-flex", height: 32, alignItems: "center", justifyContent: "center" }}
                aria-label="Add product"
              >
                <PlusCircle className="w-3.5 h-3.5" />
              </Button>
            </Box>
          </Box>
          <Typography sx={{ mt: 0.75, fontSize: 11, color: "text.secondary" }}>{selectedStockHint}</Typography>
        </Box>

        <Stack sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, flex: 1, minHeight: 0, overflow: "hidden" }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
            <Typography component="h2" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.secondary" }}>Added Products</Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <Table sx={{ minWidth: 1048, width: "100%", tableLayout: "fixed", fontSize: 12.25 }}>
              <TableHead sx={{ position: "sticky", top: 0, zIndex: 10, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), color: "text.secondary" }}>
                <TableRow>
                  <TableCell sx={{ width: 112, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "left" }}>Barcode</TableCell>
                  <TableCell sx={{ width: 158, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "left" }}>Product</TableCell>
                  <TableCell sx={{ width: 62, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right" }}>Tax</TableCell>
                  <TableCell sx={{ width: 72, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right" }}>MRP</TableCell>
                  <TableCell sx={{ width: 72, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right" }}>Cost</TableCell>
                  <TableCell sx={{ width: 72, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right" }}>Price</TableCell>
                  <TableCell sx={{ width: 58, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "center" }}>Qty</TableCell>
                  <TableCell sx={{ width: 76, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right" }}>Discount</TableCell>
                  <TableCell sx={{ width: 64, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right" }}>A.D</TableCell>
                  <TableCell sx={{ width: 54, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right" }}>%</TableCell>
                  <TableCell sx={{ width: 86, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right" }}>Amount</TableCell>
                  <TableCell sx={{ width: 40, border: 1, borderColor: "divider", px: 0.5, py: 1, textAlign: "center" }}></TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.12 : 0.06) }}>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.5 }}>
                    <TextField
                      type="text"
                      value={itemFilterDraft.barcode}
                      onChange={(e) => handleItemFilterDraftChange("barcode", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Barcode"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 10.5, fontWeight: 400, py: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.5 }}>
                    <TextField
                      type="text"
                      value={itemFilterDraft.productName}
                      onChange={(e) => handleItemFilterDraftChange("productName", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Product"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { fontSize: 10.5, fontWeight: 400, py: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.5 }}>
                    <TextField
                      type="text"
                      value={itemFilterDraft.tax}
                      onChange={(e) => handleItemFilterDraftChange("tax", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Tax"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, fontWeight: 400, py: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.5 }}>
                    <TextField
                      type="text"
                      value={itemFilterDraft.mrp}
                      onChange={(e) => handleItemFilterDraftChange("mrp", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="MRP"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, fontWeight: 400, py: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.5 }}>
                    <TextField
                      type="text"
                      value={itemFilterDraft.cost}
                      onChange={(e) => handleItemFilterDraftChange("cost", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Cost"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, fontWeight: 400, py: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.5 }}>
                    <TextField
                      type="text"
                      value={itemFilterDraft.price}
                      onChange={(e) => handleItemFilterDraftChange("price", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Price"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, fontWeight: 400, py: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.5 }}>
                    <TextField
                      type="text"
                      value={itemFilterDraft.qty}
                      onChange={(e) => handleItemFilterDraftChange("qty", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Qty"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, fontWeight: 400, py: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.5 }}>
                    <TextField
                      type="text"
                      value={itemFilterDraft.discount}
                      onChange={(e) => handleItemFilterDraftChange("discount", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Discount"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, fontWeight: 400, py: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.5 }}>
                    <TextField
                      type="text"
                      value={itemFilterDraft.addlDiscount}
                      onChange={(e) => handleItemFilterDraftChange("addlDiscount", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="A.D"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, fontWeight: 400, py: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.5 }}>
                    <TextField
                      type="text"
                      value={itemFilterDraft.discountPerc}
                      onChange={(e) => handleItemFilterDraftChange("discountPerc", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="%"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, fontWeight: 400, py: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.5 }}>
                    <TextField
                      type="text"
                      value={itemFilterDraft.amount}
                      onChange={(e) => handleItemFilterDraftChange("amount", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Amount"
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, fontWeight: 400, py: 0.5 } }}
                    />
                  </TableCell>
                  <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.5, textAlign: "center", fontSize: 9, fontWeight: 400, color: "text.secondary" }}>Enter</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCartWithTotals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} sx={{ px: 1.5, py: 4, textAlign: "center", color: "text.disabled" }}>
                      {cartWithTotals.length === 0 ? "No products added yet" : "No products match current filters"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCartWithTotals.map((line) => (
                    <TableRow key={line.lineId} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                      <TableCell sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: 1, borderColor: "divider", px: 0.75, py: 0.75, fontFamily: "monospace", fontSize: 10.5 }}>{line.barcode || "-"}</TableCell>
                      <TableCell sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", border: 1, borderColor: "divider", px: 0.75, py: 0.75, fontSize: 10.5 }}>{line.productName}</TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 0.75, py: 0.75, textAlign: "right", fontSize: 10.5 }}>{line.tax.toFixed(2)}</TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 0.75, py: 0.75, textAlign: "right", fontSize: 10.5 }}>{formatMoney(line.mrp || 0)}</TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 0.75, py: 0.75, textAlign: "right", fontSize: 10.5 }}>{formatMoney(line.cost)}</TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 0.75, py: 0.75 }}>
                        <TextField
                          type="number"
                          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                          value={line.price}
                          onChange={(e) => handleLineValueChange(line.lineId, "price", e.target.value)}
                          size="small"
                          fullWidth
                          sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, py: 0.25 } }}
                        />
                      </TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 0.75, py: 0.75, textAlign: "center", fontSize: 10.5 }}>{line.qty}</TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>
                        <TextField
                          type="number"
                          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                          value={line.discount}
                          onChange={(e) => handleLineValueChange(line.lineId, "discount", e.target.value)}
                          size="small"
                          fullWidth
                          sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, py: 0.25 } }}
                        />
                      </TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>
                        <TextField
                          type="number"
                          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                          value={line.addlDiscount || 0}
                          onChange={(e) => handleLineValueChange(line.lineId, "addlDiscount", e.target.value)}
                          size="small"
                          fullWidth
                          sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, py: 0.25 } }}
                        />
                      </TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 1, py: 1, textAlign: "right" }}>
                        <TextField
                          type="number"
                          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                          value={line.discountPerc || 0}
                          onChange={(e) => handleLineValueChange(line.lineId, "discountPerc", e.target.value)}
                          size="small"
                          fullWidth
                          sx={{ "& .MuiInputBase-input": { textAlign: "right", fontSize: 10.5, py: 0.25 } }}
                        />
                      </TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 0.75, py: 0.75, textAlign: "right", fontSize: 10.5, fontWeight: 600 }}>{formatMoney(line.amount)}</TableCell>
                      <TableCell sx={{ border: 1, borderColor: "divider", px: 0.5, py: 0.75, textAlign: "center" }}>
                        <IconButton
                          type="button"
                          onClick={() => handleRemoveLine(line.lineId)}
                          size="small"
                          sx={{ color: "error.main", p: 0.25 }}
                          aria-label="Remove line"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ flexShrink: 0, overflowX: "auto", borderTop: 1, borderColor: "divider", bgcolor: "background.default" }}>
            <Table sx={{ minWidth: 1048, width: "100%", tableLayout: "fixed", fontSize: 12.25 }}>
              <TableBody>
                <TableRow sx={{ bgcolor: "background.default", fontSize: 12.25, fontWeight: 700, color: "text.secondary" }}>
                  <TableCell sx={{ width: 112, border: 1, borderColor: "divider", px: 0.75, py: 1 }}></TableCell>
                  <TableCell sx={{ width: 158, border: 1, borderColor: "divider", px: 0.75, py: 1 }}></TableCell>
                  <TableCell sx={{ width: 62, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right", color: "error.main" }}>{cartColumnTotals.tax.toFixed(2)}</TableCell>
                  <TableCell sx={{ width: 72, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right", color: "error.main" }}>{cartColumnTotals.mrp.toFixed(2)}</TableCell>
                  <TableCell sx={{ width: 72, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right", color: "error.main" }}>{cartColumnTotals.cost.toFixed(2)}</TableCell>
                  <TableCell sx={{ width: 72, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right", color: "error.main" }}>{cartColumnTotals.price.toFixed(2)}</TableCell>
                  <TableCell sx={{ width: 58, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "center", color: "error.main" }}>{cartColumnTotals.qty}</TableCell>
                  <TableCell sx={{ width: 76, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right", color: "error.main" }}>{cartColumnTotals.discount.toFixed(2)}</TableCell>
                  <TableCell sx={{ width: 64, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right", color: "error.main" }}>{cartColumnTotals.addlDiscount.toFixed(2)}</TableCell>
                  <TableCell sx={{ width: 54, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right", color: "error.main" }}>{cartColumnTotals.discountPerc.toFixed(2)}</TableCell>
                  <TableCell sx={{ width: 86, border: 1, borderColor: "divider", px: 0.75, py: 1, textAlign: "right", color: "error.main" }}>{cartColumnTotals.amount.toFixed(2)}</TableCell>
                  <TableCell sx={{ width: 40, border: 1, borderColor: "divider", px: 0.5, py: 1 }}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );

  const renderSearchPage = () => (
    <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2 }}>
      <FilterableDataTable
        rows={searchResults}
        columns={dealerInvoiceSearchColumns}
        loading={searching}
        loadingText="Searching..."
        emptyText="No dealer invoices found"
        searchPlaceholder="Search in dealer invoice fields..."
        showExport={false}
        tablePreferenceKey="sales.dealer_invoice.search"
        onRefresh={() => runDealerInvoiceSearch(null, searchPage, searchLimit)}
        refreshDisabled={searching}
        onExportRows={() => loadAllDealerInvoiceSearchRows()}
        enableServerSearch
        onServerSearch={handleServerSearch}
        page={searchPage}
        limit={searchLimit}
        totalPages={searchPagination.totalPages}
        totalRows={searchPagination.total}
        onPageChange={(p) => {
          setSearchPage(p);
          runDealerInvoiceSearch(null, p, searchLimit);
        }}
        onLimitChange={(value) => {
          setSearchLimit(value);
          setSearchPage(1);
          runDealerInvoiceSearch(null, 1, value);
        }}
        onFetchGroupSummaries={fetchDealerInvoiceGroupSummaries}
        onFetchGroupRows={fetchDealerInvoiceGroupRows}
        paginationMode="server"
        enableVirtualization
      />
    </Box>
  );

  return (
    <Box sx={{ height: "100vh", overflow: "hidden", bgcolor: "background.default", color: "text.primary" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: 2, py: 1, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton
            onClick={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
            sx={{ color: "text.secondary" }}
            aria-label={showSearchPage ? "Back to dealer invoice entry" : "Back to sales"}
          >
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <Typography component="h1" sx={{ fontSize: 12.25, fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
            <Button
              type="button"
              onClick={() => navigate("/sales")}
              sx={{ color: "primary.main", textTransform: "none", minWidth: "auto", p: 0, "&:hover": { textDecoration: "underline", bgcolor: "transparent" } }}
            >
              Sales
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">Dealer Invoice</Box>
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            onClick={handleSave}
            disabled={saving || showSearchPage}
            className="glass-btn glass-btn-success disabled:opacity-50"
            sx={{ display: "inline-flex", alignItems: "center" }}
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary"
            sx={{ display: "inline-flex", alignItems: "center" }}
            aria-label="Search"
          >
            <Search className="w-4 h-4 mr-1" />
            {showSearchPage ? "Back" : "Search"}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ p: 2, height: "calc(100vh - 53px)", overflow: "hidden" }}>
        {showSearchPage ? renderSearchPage() : renderEntryPage()}
        {loading && <Typography sx={{ fontSize: 10.5, color: "text.secondary", px: 0.5 }}>Loading master data...</Typography>}
      </Box>

      <TaxChargeTypeDialog
        open={taxChargeTypeDialog.open}
        value={taxChargeTypeDialog.value}
        onClose={() => setTaxChargeTypeDialog({ open: false, lineId: null, value: "" })}
        onConfirm={handleSaveTaxChargeType}
      />
    </Box>
  );
};

export default DealerInvoice;
