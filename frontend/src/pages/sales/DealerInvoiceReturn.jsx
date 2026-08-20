import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, PlusCircle, Save, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import FilterableDataTable from "../../components/FilterableDataTable";

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
});

const buildTaxRow = (line, taxes) => {
  const tax = taxes.find((row) => String(row.id) === String(line.taxTypeId));
  const taxPerc = Math.max(0, toNum(tax?.tax_percentage, 0));
  const taxValue = Math.max(0, toNum(line.taxValue, 0));
  const taxAmount = round2(taxValue * (taxPerc / 100));

  return {
    ...line,
    taxName: tax?.name || "",
    taxPerc,
    taxValue,
    taxAmount,
  };
};

const DealerInvoiceReturn = () => {
  const navigate = useNavigate();

  const [now, setNow] = useState(new Date());
  const [returnNo, setReturnNo] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [customerId, setCustomerId] = useState("");

  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [dealerSales, setDealerSales] = useState(true);

  const [addlDiscount, setAddlDiscount] = useState("0");
  const [addlCharge, setAddlCharge] = useState("0");
  const [taxLines, setTaxLines] = useState([]);
  const [taxDraft, setTaxDraft] = useState(createEmptyTaxLine);

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
    returnNo: "",
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

  const loadNextReturnNo = useCallback(async () => {
    try {
      const res = await api.get("/dealer-invoice-returns/next-return-no");
      setReturnNo(toNum(res.data?.data?.returnNo, 1));
    } catch {
      setReturnNo(1);
    }
  }, []);

  const loadMasterData = useCallback(async () => {
    try {
      const [customersRes, barcodesRes, productsRes, taxesRes] = await Promise.all([
        api.get("/customers").catch(() => ({ data: { data: [] } })),
        api.get("/barcodes").catch(() => ({ data: { data: [] } })),
        api.get("/products", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
        api.get("/taxes").catch(() => ({ data: { data: [] } })),
      ]);

      const customerRows = customersRes.data?.data || [];
      setCustomers(
        customerRows.map((row) => ({
          value: String(row.id),
          label: `${row.name || "Unnamed"}${row.mobile_no ? ` (${row.mobile_no})` : ""}`,
        }))
      );
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
        .filter((row) => row.barcode);

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
      toast.error("Failed to load dealer invoice return data");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.all([loadMasterData(), loadNextReturnNo()]);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadMasterData, loadNextReturnNo]);

  const selectedCustomer = useMemo(
    () => customers.find((row) => row.value === customerId) || null,
    [customers, customerId]
  );

  const selectedStockHint = useMemo(() => {
    const byBarcode = normalize(addBarcode);
    if (byBarcode) {
      const row = stockRows.find((s) => normalize(s.barcode) === byBarcode);
      if (!row) return "Barcode not found in current stock";
      return `Current stock for ${row.barcode}: ${Math.max(0, row.qty)} pcs`;
    }

    const byProduct = normalize(addProductKey);
    if (byProduct) {
      const total = stockRows
        .filter((s) => normalize(s.productName) === byProduct)
        .reduce((sum, s) => sum + Math.max(0, s.qty), 0);
      return `Current stock for selected product: ${total} pcs`;
    }

    return "Add by barcode or by selecting a product in stock";
  }, [addBarcode, addProductKey, stockRows]);

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
        const taxAmount = round2((subtotal * tax) / 100);
        const percentDiscountAmount = round2((subtotal * discountPerc) / 100);
        const totalLineDiscount = round2(discount + addlDiscount + percentDiscountAmount);
        const total = round2(subtotal + taxAmount - totalLineDiscount);
        return {
          ...line,
          mrp,
          subtotal,
          taxAmount,
          total,
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
          taxable: acc.taxable + row.taxValue,
          tax: acc.tax + row.taxAmount,
        }),
        { taxable: 0, tax: 0 }
      ),
    [taxRows]
  );

  const summary = useMemo(() => {
    const lineAmount = round2(cartWithTotals.reduce((sum, line) => sum + line.total, 0));
    const totalQty = cartWithTotals.reduce((sum, line) => sum + toNum(line.qty, 0), 0);
    const totalDiscount = round2(cartWithTotals.reduce((sum, line) => sum + line.totalLineDiscount, 0));
    const addlDiscountNum = Math.max(0, toNum(addlDiscount, 0));
    const addlChargeNum = Math.max(0, toNum(addlCharge, 0));
    const extraTax = round2(taxSummary.tax);
    const amount = Math.max(0, round2(lineAmount + extraTax - addlDiscountNum + addlChargeNum));

    return {
      totalQty,
      totalDiscount,
      addlDiscountNum,
      addlChargeNum,
      taxAmount: extraTax,
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
    } else {
      const candidates = stockRows
        .filter((row) => normalize(row.productName) === productQuery)
        .map((row) => ({ row }))
        .sort((a, b) => a.row.productName.localeCompare(b.row.productName));

      source = candidates[0]?.row || null;
      if (!source) {
        toast.error("Selected product not found");
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

  const handleTaxDraftChange = (key, value) => {
    setTaxDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddTaxLine = () => {
    if (!taxDraft.taxTypeId) {
      toast.error("Please select a tax");
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

  const handleItemFilterDraftChange = (field, value) => {
    setItemFilterDraft((prev) => ({ ...prev, [field]: value }));
  };

  const applyItemFilters = useCallback(() => {
    setItemFilters(itemFilterDraft);
  }, [itemFilterDraft]);

  const handleItemFilterKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyItemFilters();
      }
    },
    [applyItemFilters]
  );

  const handleRemoveLine = (lineId) => {
    setCart((prev) => prev.filter((line) => line.lineId !== lineId));
  };

  const handleResetEntry = () => {
    setCustomerId("");
    setDiscountEnabled(false);
    setDealerSales(true);
    setAddlDiscount("0");
    setAddlCharge("0");
    setAddBarcode("");
    setAddProductKey("");
    setAddQty("1");
    setCart([]);
    setTaxLines([]);
    setTaxDraft(createEmptyTaxLine());
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
      discountEnabled,
      dealerSales,
      addlDiscount: summary.addlDiscountNum,
      addlCharge: summary.addlChargeNum,
      taxLines: taxRows.map((row) => ({
        taxTypeId: row.taxTypeId,
        taxValue: row.taxValue,
        taxDiscount: 0,
        taxAmount: row.taxAmount,
      })),
      returnAt: now.toISOString(),
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
      const res = await api.post("/dealer-invoice-returns", payload);
      const savedReturnNo = res.data?.data?.return_no;
      toast.success(`Dealer invoice return saved successfully (Return #${savedReturnNo})`);
      handleResetEntry();
      await Promise.all([loadMasterData(), loadNextReturnNo()]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save dealer invoice return");
    } finally {
      setSaving(false);
    }
  };

  const runDealerInvoiceReturnSearch = useCallback(
    async (overrideFilters = null, pageOverride = 1, limitOverride = searchLimit) => {
      const filters = overrideFilters || searchFilters;
      setSearching(true);
      try {
        const params = { page: pageOverride, limit: limitOverride };
        if (String(filters.search || "").trim()) params.search = filters.search;
        if (String(filters.returnNo || "").trim()) params.returnNo = filters.returnNo;
        if (String(filters.customerName || "").trim()) params.customerName = filters.customerName;
        if (String(filters.product || "").trim()) params.product = filters.product;

        const res = await api.get("/dealer-invoice-returns", { params });
        setSearchResults(res.data?.data || []);
        const p = res.data?.pagination || {};
        const total = Number(p.total ?? res.data?.total ?? 0) || 0;
        const totalPages = Math.max(Number(p.totalPages ?? Math.ceil(total / Math.max(limitOverride, 1))) || 1, 1);
        setSearchPagination({ total, totalPages });
        setSearchPage(pageOverride);
      } catch {
        toast.error("Failed to search dealer invoice returns");
      } finally {
        setSearching(false);
      }
    },
    [searchFilters, searchLimit]
  );

  const loadAllDealerInvoiceReturnSearchRows = useCallback(
    async (overrideFilters = null) => {
      const filters = overrideFilters || searchFilters;
      const params = { all: "true" };
      if (String(filters.search || "").trim()) params.search = filters.search;
      if (String(filters.returnNo || "").trim()) params.returnNo = filters.returnNo;
      if (String(filters.customerName || "").trim()) params.customerName = filters.customerName;
      if (String(filters.product || "").trim()) params.product = filters.product;

      const res = await api.get("/dealer-invoice-returns", { params });
      return res.data?.data || [];
    },
    [searchFilters]
  );

  const openSearchPage = async () => {
    setShowSearchPage(true);
    setSearchPage(1);
    const empty = { search: "", returnNo: "", customerName: "", product: "" };
    setSearchFilters(empty);
    await runDealerInvoiceReturnSearch(empty, 1, searchLimit);
  };

  const handleServerSearch = useCallback(({ query }) => {
    setSearchFilters((prev) => {
      const nextFilters = { ...prev, search: query };
      runDealerInvoiceReturnSearch(nextFilters, 1, searchLimit);
      return nextFilters;
    });
    setSearchPage(1);
  }, [runDealerInvoiceReturnSearch, searchLimit]);

  const dealerInvoiceReturnSearchColumns = useMemo(
    () => [
      {
        key: "return_no",
        label: "Return No",
        valueGetter: (row) => row.return_no || "-",
      },
      {
        key: "return_at",
        label: "Date",
        valueGetter: (row) => row.return_at || "",
        render: (value) => (value ? new Date(value).toLocaleString() : "-"),
        searchValue: (row) => (row.return_at ? new Date(row.return_at).toLocaleString() : ""),
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
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-12">
      <div className="xl:col-span-3 h-full min-h-0 overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 shadow-sm space-y-2.5 text-xs">
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          <div className="rounded-sm border border-gray-200 dark:border-gray-700 px-2 py-1.5">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Return No</div>
            <div className="font-semibold text-[11px]">{returnNo}</div>
          </div>
          <div className="rounded-sm border border-gray-200 dark:border-gray-700 px-2 py-1.5">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Date</div>
            <div className="font-semibold text-[11px]">{now.toLocaleDateString()}</div>
          </div>
          <div className="rounded-sm border border-gray-200 dark:border-gray-700 px-2 py-1.5">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">Time</div>
            <div className="font-semibold text-[11px]">{now.toLocaleTimeString()}</div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Customer Name</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 text-xs focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select customer</option>
            {customers.map((row) => (
              <option key={row.value} value={row.value}>
                {row.label}
              </option>
            ))}
          </select>
          {selectedCustomer && (
            <p className="mt-1.5 rounded-sm border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 p-2 text-[11px] text-green-700 dark:text-green-400">
              Selected: {selectedCustomer.label}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={discountEnabled}
              onChange={(e) => setDiscountEnabled(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Discount
          </label>

          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={dealerSales}
              onChange={(e) => setDealerSales(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Dealer Sales
          </label>
        </div>

        <div className="rounded-md border border-gray-200 dark:border-gray-700 p-2">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,0.95fr)_30px] items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-400">
            <div>Type</div>
            <div>Cost</div>
            <div>Tax</div>
            <div>Amount</div>
            <div></div>
          </div>

          <div className="mt-1 mb-2.5 grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,0.95fr)_30px] items-center gap-1.5">
            <select
              value={taxDraft.taxTypeId}
              onChange={(e) => handleTaxDraftChange("taxTypeId", e.target.value)}
              className="min-w-0 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-[11px]"
            >
              <option value="">Select tax</option>
              {taxes.map((tax) => (
                <option key={tax.id} value={tax.id}>
                  {tax.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={taxDraft.taxValue}
              onChange={(e) => handleTaxDraftChange("taxValue", e.target.value)}
              placeholder="cost"
              className="min-w-0 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-1 text-[11px]"
            />
            <input
              type="text"
              value={taxDraft.taxTypeId ? `${taxDraftRow.taxPerc.toFixed(2)}%` : ""}
              readOnly
              placeholder="tax"
              className="min-w-0 w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 px-1.5 py-1 text-[11px]"
            />
            <input
              type="text"
              value={taxDraftRow.taxAmount ? taxDraftRow.taxAmount.toFixed(2) : ""}
              readOnly
              placeholder="amount"
              className="min-w-0 w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 px-1.5 py-1 text-[11px]"
            />
            <button
              type="button"
              onClick={handleAddTaxLine}
              className="glass-btn glass-btn-primary inline-flex h-7 w-7 items-center justify-center"
              title="Add tax line"
            >
              <PlusCircle className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="rounded border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_30px] gap-1.5 border-b dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
              <div>Type</div>
              <div>Cost</div>
              <div>Tax</div>
              <div>Amount</div>
              <div></div>
            </div>
            <div className="h-24 overflow-y-auto">
              {taxRows.length > 0 ? (
                taxRows.map((line) => (
                  <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_30px] items-center gap-1.5 border-b dark:border-gray-700 px-2 py-2 text-[11px] text-gray-800 dark:text-gray-100 last:border-b-0">
                    <div className="truncate">{line.taxName || "-"}</div>
                    <div>{line.taxValue.toFixed(2)}</div>
                    <div>{line.taxPerc.toFixed(2)}%</div>
                    <div>{line.taxAmount.toFixed(2)}</div>
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveTaxLine(line.id)}
                        className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                        title="Remove tax row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-sm text-gray-400 dark:text-gray-500">No tax rows added</div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-2 py-2 text-[11px] font-bold text-gray-800 dark:text-gray-100">
              <div>-</div>
              <div>{taxSummary.taxable.toFixed(2)}</div>
              <div>-</div>
              <div>{taxSummary.tax.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-gray-200 dark:border-gray-700 p-2.5">
          <h2 className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Bill</h2>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-sm border dark:border-gray-700 px-3 py-2">
              <span className="text-gray-600 dark:text-gray-300">Total Qty/Pcs</span>
              <span className="font-semibold">{summary.totalQty.toFixed(2)}/{cartWithTotals.length}</span>
            </div>

            <div className="flex items-center justify-between rounded-sm border dark:border-gray-700 px-3 py-2">
              <span className="text-gray-600 dark:text-gray-300">Total Discount</span>
              <span className="font-semibold">{formatMoney(summary.totalDiscount)}</span>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-sm border dark:border-gray-700 px-3 py-2">
              <span className="text-gray-600 dark:text-gray-300">Addl Discount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={addlDiscount}
                onChange={(e) => setAddlDiscount(e.target.value)}
                className="w-28 rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-right"
              />
            </div>

            <div className="flex items-center justify-between gap-2 rounded-sm border dark:border-gray-700 px-3 py-2">
              <span className="text-gray-600 dark:text-gray-300">Addl Charge</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={addlCharge}
                onChange={(e) => setAddlCharge(e.target.value)}
                className="w-28 rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-right"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="xl:col-span-9 flex min-h-0 flex-col space-y-3">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Add Product</h2>
          <div className="grid grid-cols-1 items-end gap-1.5 md:grid-cols-12">
            <div className="md:col-span-4">
              <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-300">Barcode</label>
              <input
                type="text"
                value={addBarcode}
                onChange={(e) => setAddBarcode(e.target.value)}
                placeholder="Scan / enter barcode"
                className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-5">
              <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-300">Product (In Stock)</label>
              <select
                value={addProductKey}
                onChange={(e) => setAddProductKey(e.target.value)}
                className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select product</option>
                {productOptions.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-300">Qty</label>
              <input
                type="number"
                min="1"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-1">
              <button
                onClick={handleAddLine}
                className="glass-btn glass-btn-primary inline-flex h-[32px] w-full items-center justify-center"
                aria-label="Add product"
              >
                <PlusCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-gray-600 dark:text-gray-300">{selectedStockHint}</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Added Products</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="min-w-[1048px] w-full table-fixed text-xs">
              <thead className="sticky top-0 z-10 bg-blue-50 dark:bg-blue-900/30 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="w-[112px] border dark:border-gray-700 px-1.5 py-2 text-left">Barcode</th>
                  <th className="w-[158px] border dark:border-gray-700 px-1.5 py-2 text-left">Product</th>
                  <th className="w-[62px] border dark:border-gray-700 px-1.5 py-2 text-right">Tax</th>
                  <th className="w-[72px] border dark:border-gray-700 px-1.5 py-2 text-right">MRP</th>
                  <th className="w-[72px] border dark:border-gray-700 px-1.5 py-2 text-right">Cost</th>
                  <th className="w-[72px] border dark:border-gray-700 px-1.5 py-2 text-right">Price</th>
                  <th className="w-[58px] border dark:border-gray-700 px-1.5 py-2 text-center">Qty</th>
                  <th className="w-[76px] border dark:border-gray-700 px-1.5 py-2 text-right">Discount</th>
                  <th className="w-[64px] border dark:border-gray-700 px-1.5 py-2 text-right">A.D</th>
                  <th className="w-[54px] border dark:border-gray-700 px-1.5 py-2 text-right">%</th>
                  <th className="w-[86px] border dark:border-gray-700 px-1.5 py-2 text-right">Amount</th>
                  <th className="w-[40px] border dark:border-gray-700 px-1 py-2 text-center"></th>
                </tr>
                <tr className="bg-sky-50 dark:bg-sky-900/20">
                  <th className="border dark:border-gray-700 px-1 py-1">
                    <input
                      type="text"
                      value={itemFilterDraft.barcode}
                      onChange={(e) => handleItemFilterDraftChange("barcode", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Barcode"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-1 text-[10px] font-normal"
                    />
                  </th>
                  <th className="border dark:border-gray-700 px-1 py-1">
                    <input
                      type="text"
                      value={itemFilterDraft.productName}
                      onChange={(e) => handleItemFilterDraftChange("productName", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Product"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-1 text-[10px] font-normal"
                    />
                  </th>
                  <th className="border dark:border-gray-700 px-1 py-1">
                    <input
                      type="text"
                      value={itemFilterDraft.tax}
                      onChange={(e) => handleItemFilterDraftChange("tax", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Tax"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-1 text-[10px] font-normal text-right"
                    />
                  </th>
                  <th className="border dark:border-gray-700 px-1 py-1">
                    <input
                      type="text"
                      value={itemFilterDraft.mrp}
                      onChange={(e) => handleItemFilterDraftChange("mrp", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="MRP"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-1 text-[10px] font-normal text-right"
                    />
                  </th>
                  <th className="border dark:border-gray-700 px-1 py-1">
                    <input
                      type="text"
                      value={itemFilterDraft.cost}
                      onChange={(e) => handleItemFilterDraftChange("cost", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Cost"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-1 text-[10px] font-normal text-right"
                    />
                  </th>
                  <th className="border dark:border-gray-700 px-1 py-1">
                    <input
                      type="text"
                      value={itemFilterDraft.price}
                      onChange={(e) => handleItemFilterDraftChange("price", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Price"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-1 text-[10px] font-normal text-right"
                    />
                  </th>
                  <th className="border dark:border-gray-700 px-1 py-1">
                    <input
                      type="text"
                      value={itemFilterDraft.qty}
                      onChange={(e) => handleItemFilterDraftChange("qty", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Qty"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-1 text-[10px] font-normal text-right"
                    />
                  </th>
                  <th className="border dark:border-gray-700 px-1 py-1">
                    <input
                      type="text"
                      value={itemFilterDraft.discount}
                      onChange={(e) => handleItemFilterDraftChange("discount", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Discount"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-1 text-[10px] font-normal text-right"
                    />
                  </th>
                  <th className="border dark:border-gray-700 px-1 py-1">
                    <input
                      type="text"
                      value={itemFilterDraft.addlDiscount}
                      onChange={(e) => handleItemFilterDraftChange("addlDiscount", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="A.D"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-1 text-[10px] font-normal text-right"
                    />
                  </th>
                  <th className="border dark:border-gray-700 px-1 py-1">
                    <input
                      type="text"
                      value={itemFilterDraft.discountPerc}
                      onChange={(e) => handleItemFilterDraftChange("discountPerc", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="%"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-1 text-[10px] font-normal text-right"
                    />
                  </th>
                  <th className="border dark:border-gray-700 px-1 py-1">
                    <input
                      type="text"
                      value={itemFilterDraft.amount}
                      onChange={(e) => handleItemFilterDraftChange("amount", e.target.value)}
                      onKeyDown={handleItemFilterKeyDown}
                      placeholder="Amount"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-1 text-[10px] font-normal text-right"
                    />
                  </th>
                  <th className="border dark:border-gray-700 px-1 py-1 text-center text-[10px] font-normal text-gray-500 dark:text-gray-400">Enter</th>
                </tr>
              </thead>
              <tbody>
                {filteredCartWithTotals.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-3 py-8 text-center text-gray-400 dark:text-gray-500">
                      {cartWithTotals.length === 0 ? "No products added yet" : "No products match current filters"}
                    </td>
                  </tr>
                ) : (
                  filteredCartWithTotals.map((line) => (
                    <tr key={line.lineId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="truncate border dark:border-gray-700 px-1.5 py-1.5 font-mono text-[10px]">{line.barcode || "-"}</td>
                      <td className="truncate border dark:border-gray-700 px-1.5 py-1.5 text-[10px]">{line.productName}</td>
                      <td className="border dark:border-gray-700 px-1.5 py-1.5 text-right text-[10px]">{line.tax.toFixed(2)}</td>
                      <td className="border dark:border-gray-700 px-1.5 py-1.5 text-right text-[10px]">{formatMoney(line.mrp || 0)}</td>
                      <td className="border dark:border-gray-700 px-1.5 py-1.5 text-right text-[10px]">{formatMoney(line.cost)}</td>
                      <td className="border dark:border-gray-700 px-1.5 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.price}
                          onChange={(e) => handleLineValueChange(line.lineId, "price", e.target.value)}
                          className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-0.5 text-right text-[10px]"
                        />
                      </td>
                      <td className="border dark:border-gray-700 px-1.5 py-1.5 text-center text-[10px]">{line.qty}</td>
                      <td className="border dark:border-gray-700 px-1.5 py-1.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.discount}
                          onChange={(e) => handleLineValueChange(line.lineId, "discount", e.target.value)}
                          className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-0.5 text-right text-[10px]"
                        />
                      </td>
                      <td className="border dark:border-gray-700 px-1.5 py-1.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.addlDiscount || 0}
                          onChange={(e) => handleLineValueChange(line.lineId, "addlDiscount", e.target.value)}
                          className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-0.5 text-right text-[10px]"
                        />
                      </td>
                      <td className="border dark:border-gray-700 px-1.5 py-1.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.discountPerc || 0}
                          onChange={(e) => handleLineValueChange(line.lineId, "discountPerc", e.target.value)}
                          className="w-full rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-0.5 text-right text-[10px]"
                        />
                      </td>
                      <td className="border dark:border-gray-700 px-1.5 py-1.5 text-right text-[10px] font-semibold">{formatMoney(line.amount)}</td>
                      <td className="border dark:border-gray-700 px-1 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.lineId)}
                          className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                          aria-label="Remove line"
                        >
                          <Trash2 className="inline h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="shrink-0 overflow-x-auto border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700">
            <table className="min-w-[1048px] w-full table-fixed text-xs">
              <tbody>
                <tr className="bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <td className="w-[112px] border dark:border-gray-700 px-1.5 py-2"></td>
                  <td className="w-[158px] border dark:border-gray-700 px-1.5 py-2"></td>
                  <td className="w-[62px] border dark:border-gray-700 px-1.5 py-2 text-right text-red-600 dark:text-red-400">{cartColumnTotals.tax.toFixed(2)}</td>
                  <td className="w-[72px] border dark:border-gray-700 px-1.5 py-2 text-right text-red-600 dark:text-red-400">{cartColumnTotals.mrp.toFixed(2)}</td>
                  <td className="w-[72px] border dark:border-gray-700 px-1.5 py-2 text-right text-red-600 dark:text-red-400">{cartColumnTotals.cost.toFixed(2)}</td>
                  <td className="w-[72px] border dark:border-gray-700 px-1.5 py-2 text-right text-red-600 dark:text-red-400">{cartColumnTotals.price.toFixed(2)}</td>
                  <td className="w-[58px] border dark:border-gray-700 px-1.5 py-2 text-center text-red-600 dark:text-red-400">{cartColumnTotals.qty}</td>
                  <td className="w-[76px] border dark:border-gray-700 px-1.5 py-2 text-right text-red-600 dark:text-red-400">{cartColumnTotals.discount.toFixed(2)}</td>
                  <td className="w-[64px] border dark:border-gray-700 px-1.5 py-2 text-right text-red-600 dark:text-red-400">{cartColumnTotals.addlDiscount.toFixed(2)}</td>
                  <td className="w-[54px] border dark:border-gray-700 px-1.5 py-2 text-right text-red-600 dark:text-red-400">{cartColumnTotals.discountPerc.toFixed(2)}</td>
                  <td className="w-[86px] border dark:border-gray-700 px-1.5 py-2 text-right text-red-600 dark:text-red-400">{cartColumnTotals.amount.toFixed(2)}</td>
                  <td className="w-[40px] border dark:border-gray-700 px-1 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchPage = () => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
      <FilterableDataTable
        rows={searchResults}
        columns={dealerInvoiceReturnSearchColumns}
        loading={searching}
        loadingText="Searching..."
        emptyText="No dealer invoice returns found"
        searchPlaceholder="Search in dealer invoice return fields..."
        showExport={false}
        tablePreferenceKey="sales.dealer_invoice_return.search"
        onRefresh={() => runDealerInvoiceReturnSearch(null, searchPage, searchLimit)}
        refreshDisabled={searching}
        onExportRows={() => loadAllDealerInvoiceReturnSearchRows()}
        enableServerSearch
        onServerSearch={handleServerSearch}
        page={searchPage}
        limit={searchLimit}
        totalPages={searchPagination.totalPages}
        totalRows={searchPagination.total}
        onPageChange={(p) => {
          setSearchPage(p);
          runDealerInvoiceReturnSearch(null, p, searchLimit);
        }}
        onLimitChange={(value) => {
          setSearchLimit(value);
          setSearchPage(1);
          runDealerInvoiceReturnSearch(null, 1, value);
        }}
        paginationMode="server"
      />
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <div className="flex justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : () => navigate("/sales")}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            aria-label={showSearchPage ? "Back to dealer invoice return entry" : "Back to sales"}
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
            <span>Dealer Invoice Return</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || showSearchPage}
            className="glass-btn glass-btn-success inline-flex items-center disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={showSearchPage ? () => setShowSearchPage(false) : openSearchPage}
            className="glass-btn glass-btn-primary inline-flex items-center"
            aria-label="Search"
          >
            <Search className="w-4 h-4 mr-1" />
            {showSearchPage ? "Back" : "Search"}
          </button>
        </div>
      </div>

      <div className="h-[calc(100vh-53px)] overflow-hidden p-4">
        {showSearchPage ? renderSearchPage() : renderEntryPage()}
        {loading && <p className="text-xs text-gray-500 dark:text-gray-400 px-1">Loading master data...</p>}
      </div>
    </div>
  );
};

export default DealerInvoiceReturn;
