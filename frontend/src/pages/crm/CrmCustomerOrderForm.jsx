import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, PlusCircle, Printer, Save, Search, Trash2, X } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import SearchableSelect from "../../components/SearchableSelect";
import { usePrintContext } from "../../context/PrintContext";

const PAYMENT_MODES = ["Inter bank transfer", "Cheque/DD", "Cash", "Card", "UPI"];

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
};

const formatMoney = (value) => Number(value || 0).toFixed(2);

const toSelectOptions = (rows, idKey = "id", labelKey = "name") =>
  (rows || []).map((row) => ({
    value: String(row[idKey]),
    label: row[labelKey] || "-",
    raw: row,
  }));

const formatDateTimeLocal = (input = null) => {
  const date = input ? new Date(input) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const initialForm = {
  companyId: "",
  locationId: "",
  orderDate: new Date().toISOString().slice(0, 10),
  deliveryDate: "",
  customerId: "",
  customerMobile: "",
  customerName: "",
  customerAddress: "",
  cityId: "",
  communicationDate: new Date().toISOString().slice(0, 10),
  communicationMessage: "",
  communicationPerson: "",
  supplierId: "",
  counterId: "",
  receivedById: "",
  remarks: "",
};

const initialItemDraft = {
  productId: "",
  brandId: "",
  styleId: "",
  sizeId: "",
  colourId: "",
  designNo: "",
  price: "",
  qty: "",
};

const initialPaymentDraft = {
  date: formatDateTimeLocal(),
  paymentMode: "Cash",
  bankId: "",
  bankDate: "",
  amount: "",
  remarks: "",
};

const initialCustomerDialog = {
  open: false,
  name: "",
  contactNo: "",
  area: "",
  rows: [],
  loading: false,
  selectedId: "",
};

const InputLabel = ({ text, required = false }) => (
  <label className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5 block leading-tight">
    {required && <span className="text-red-500 dark:text-red-400 mr-0.5">*</span>}
    {text}
  </label>
);

const CrmCustomerOrderForm = () => {
  const navigate = useNavigate();
  const { printHtml } = usePrintContext();
  const formRootRef = useRef(null);
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const copyId = searchParams.get("copy");
  const isEdit = Boolean(id);
  const sourceOrderId = id || copyId;

  const [form, setForm] = useState(() => ({
    ...initialForm,
    companyId: localStorage.getItem("activeStoreId") || "",
  }));
  const [orderNo, setOrderNo] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [loadingSource, setLoadingSource] = useState(Boolean(sourceOrderId));
  const [customerSelectionMode, setCustomerSelectionMode] = useState("manual-mobile");

  const [communications, setCommunications] = useState([]);
  const [itemDraft, setItemDraft] = useState(initialItemDraft);
  const [items, setItems] = useState([]);
  const [paymentDraft, setPaymentDraft] = useState(initialPaymentDraft);
  const [payments, setPayments] = useState([]);

  const [customerDialog, setCustomerDialog] = useState(initialCustomerDialog);

  const [options, setOptions] = useState({
    companies: [],
    locations: [],
    cities: [],
    suppliers: [],
    products: [],
    brands: [],
    styles: [],
    sizes: [],
    colours: [],
    counters: [],
    employees: [],
    banks: [],
  });

  const getLabelByValue = useCallback((rows, value) => {
    const found = (rows || []).find((opt) => String(opt.value) === String(value || ""));
    return found?.label || "";
  }, []);

  const loadMasterData = useCallback(async () => {
    try {
      setLoadingMasters(true);

      const [
        companyRes,
        locationRes,
        cityRes,
        supplierRes,
        stockProductsRes,
        productRes,
        brandRes,
        styleRes,
        sizeRes,
        colourRes,
        counterRes,
        employeeRes,
        bankRes,
        nextOrderNoRes,
      ] = await Promise.all([
        api.get("/companies", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
        api.get("/configurations/location").catch(() => ({ data: { data: [] } })),
        api.get("/configurations/city").catch(() => ({ data: { data: [] } })),
        api.get("/suppliers", { params: { all: "true" } }).catch(() => ({ data: { data: [] } })),
        api.get("/customer-orders/stock-products").catch(() => ({ data: { data: [] } })),
        api.get("/products", { params: { all: "true" } }).catch(() => ({ data: { data: [] } })),
        api.get("/brands", { params: { all: "true" } }).catch(() => ({ data: { data: [] } })),
        api.get("/attributes/style").catch(() => ({ data: { data: [] } })),
        api.get("/sizes").catch(() => ({ data: { data: [] } })),
        api.get("/attributes/colour").catch(() => ({ data: { data: [] } })),
        api.get("/configurations/counter").catch(() => ({ data: { data: [] } })),
        api.get("/employees", { params: { all: "true" } }).catch(() => ({ data: { data: [] } })),
        api.get("/configurations/bank").catch(() => ({ data: { data: [] } })),
        api.get("/customer-orders/next-order-no").catch(() => ({ data: { data: { orderNo: 1 } } })),
      ]);

      const companies = toSelectOptions(companyRes.data?.data || [], "id", "name");
      const locations = toSelectOptions(locationRes.data?.data || [], "id", "name");
      const cities = toSelectOptions(cityRes.data?.data || [], "id", "name");
      const suppliers = toSelectOptions(supplierRes.data?.data || [], "id", "name");
      const allProducts = toSelectOptions(productRes.data?.data || [], "id", "name");
      const stockProducts = toSelectOptions(stockProductsRes.data?.data || [], "id", "name");
      const products = stockProducts.length > 0 ? stockProducts : allProducts;
      const brands = toSelectOptions(brandRes.data?.data || [], "id", "name");
      const styles = toSelectOptions(styleRes.data?.data || [], "id", "name");
      const sizes = (sizeRes.data?.data || []).map((row) => ({
        value: String(row.id),
        label: row.size_name || "-",
        raw: row,
      }));
      const colours = toSelectOptions(colourRes.data?.data || [], "id", "name");
      const counters = toSelectOptions(counterRes.data?.data || [], "id", "name");
      const employees = (employeeRes.data?.data || []).map((row) => ({
        value: String(row.id),
        label: `${toText(row.name)} ${toText(row.surname)}`.trim() || row.employee_code || `EMP-${row.id}`,
        raw: row,
      }));
      const banks = toSelectOptions(bankRes.data?.data || [], "id", "name");

      setOptions({
        companies,
        locations,
        cities,
        suppliers,
        products,
        brands,
        styles,
        sizes,
        colours,
        counters,
        employees,
        banks,
      });

      setOrderNo(toNum(nextOrderNoRes.data?.data?.orderNo, 1));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load customer order master data");
    } finally {
      setLoadingMasters(false);
    }
  }, []);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    if (!sourceOrderId) return;
    (async () => {
      setLoadingSource(true);
      try {
        const res = await api.get(`/customer-orders/${sourceOrderId}`);
        const o = res.data?.data;
        if (!o) {
          toast.error("Order not found");
          return;
        }

        setForm((prev) => ({
          ...prev,
          locationId: o.location_id ? String(o.location_id) : "",
          orderDate: isEdit ? String(o.order_date || "").slice(0, 10) : prev.orderDate,
          deliveryDate: String(o.delivery_date || "").slice(0, 10),
          customerId: o.customer_id ? String(o.customer_id) : "",
          customerMobile: o.customer?.phone || "",
          customerName: o.customer?.name || "",
          customerAddress: o.customer?.address || "",
          cityId: o.city_id ? String(o.city_id) : "",
          supplierId: o.supplier_id ? String(o.supplier_id) : "",
          counterId: o.counter_id ? String(o.counter_id) : "",
          receivedById: o.salesman_id ? String(o.salesman_id) : "",
          remarks: o.notes || "",
        }));
        setCustomerSelectionMode(o.customer_id ? "existing" : "manual-mobile");

        setItems(
          (o.items || []).map((it) => ({
            id: `${Date.now()}-${Math.random()}`,
            productId: it.product_id ? String(it.product_id) : "",
            productName: it.product_name || it.product?.name || "",
            brandId: it.brand_id ? String(it.brand_id) : "",
            brandName: it.brand_name || "",
            styleId: it.style_id ? String(it.style_id) : "",
            styleName: it.style_name || "",
            sizeId: it.size_id ? String(it.size_id) : "",
            sizeName: it.size_name || "",
            colourId: it.colour_id ? String(it.colour_id) : "",
            colourName: it.colour_name || "",
            designNo: it.design_no || "",
            price: it.price != null ? String(it.price) : "",
            qty: it.quantity != null ? String(it.quantity) : "",
            amount: Number((toNum(it.quantity, 0) * toNum(it.price, 0)).toFixed(2)),
          }))
        );

        // A duplicate is a fresh, unpaid order - only edit mode carries the
        // original payments/communications forward.
        setPayments(
          isEdit
            ? (o.payments || []).map((p) => ({ id: `${Date.now()}-${Math.random()}`, ...p }))
            : []
        );
        setCommunications(
          isEdit
            ? (o.communications || []).map((c) => ({
                id: `${Date.now()}-${Math.random()}`,
                date: String(c.communication_date || "").slice(0, 10),
                person: c.communication_person || "",
                note: c.communication_message || "",
              }))
            : []
        );
      } catch (err) {
        toast.error(err?.response?.data?.message || `Failed to load order for ${isEdit ? "editing" : "duplicating"}`);
      } finally {
        setLoadingSource(false);
      }
    })();
  }, [sourceOrderId, isEdit]);

  const itemTotals = useMemo(() => {
    const totalQty = items.reduce((sum, row) => sum + Math.max(0, toNum(row.qty, 0)), 0);
    const totalAmount = items.reduce((sum, row) => sum + Math.max(0, toNum(row.amount, 0)), 0);
    return { totalQty, totalAmount };
  }, [items]);

  const paidAmount = useMemo(
    () => payments.reduce((sum, row) => sum + Math.max(0, toNum(row.amount, 0)), 0),
    [payments]
  );

  const balanceAmount = useMemo(() => itemTotals.totalAmount - paidAmount, [itemTotals, paidAmount]);
  const paymentModeOptions = useMemo(
    () => PAYMENT_MODES.map((mode) => ({ value: mode, label: mode })),
    []
  );

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onManualCustomerMobileChange = (value) => {
    setForm((prev) => ({ ...prev, customerMobile: value, customerId: "" }));
    setCustomerSelectionMode("manual-mobile");
  };

  const openCustomerDialog = () => {
    setCustomerDialog({
      ...initialCustomerDialog,
      open: true,
      name: form.customerName,
      contactNo: form.customerMobile,
      area: form.customerAddress,
    });
  };

  const closeCustomerDialog = () => setCustomerDialog(initialCustomerDialog);

  const searchCustomers = async () => {
    try {
      setCustomerDialog((prev) => ({ ...prev, loading: true }));
      const params = {};
      if (toText(customerDialog.name)) params.name = customerDialog.name;
      if (toText(customerDialog.contactNo)) params.contactNo = customerDialog.contactNo;
      if (toText(customerDialog.area)) params.area = customerDialog.area;

      const res = await api.get("/customer-orders/customer-search", { params });
      const rows = res.data?.data || [];
      setCustomerDialog((prev) => ({
        ...prev,
        rows,
        selectedId: rows.length === 1 ? String(rows[0].id) : "",
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to search customers");
    } finally {
      setCustomerDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const applySelectedCustomer = (customerRow) => {
    if (!customerRow) return;
    setForm((prev) => ({
      ...prev,
      customerId: String(customerRow.id),
      customerName: toText(customerRow.name),
      customerMobile: toText(customerRow.mobile),
      customerAddress: toText(customerRow.address || customerRow.area),
      cityId: customerRow.cityId ? String(customerRow.cityId) : prev.cityId,
    }));
    setCustomerSelectionMode("selected");
    closeCustomerDialog();
  };

  const selectCustomerFromDialog = () => {
    const selected = customerDialog.rows.find((row) => String(row.id) === String(customerDialog.selectedId));
    if (!selected) {
      toast.error("Please select a customer first");
      return;
    }
    applySelectedCustomer(selected);
  };

  const createCustomerFromDialog = async () => {
    try {
      const payload = {
        name: customerDialog.name,
        contactNo: customerDialog.contactNo,
        area: customerDialog.area,
        cityId: form.cityId || null,
      };
      const res = await api.post("/customer-orders/customer-quick-create", payload);
      const row = res.data?.data;
      if (!row) {
        toast.error("Could not create customer");
        return;
      }
      applySelectedCustomer({
        id: row.id,
        name: row.name,
        mobile: row.mobile,
        area: row.address,
        address: row.address,
        cityId: row.cityId,
      });
      toast.success("Customer created and selected");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create customer");
    }
  };

  const addCommunication = () => {
    const date = toText(form.communicationDate);
    const person = toText(form.communicationPerson);
    const note = toText(form.communicationMessage);

    if (!date && !person && !note) {
      toast.error("Enter communication details before adding");
      return;
    }

    setCommunications((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        date,
        person,
        note,
      },
    ]);

    setForm((prev) => ({
      ...prev,
      communicationPerson: "",
      communicationMessage: "",
    }));
  };

  const removeCommunication = (id) => {
    setCommunications((prev) => prev.filter((row) => row.id !== id));
  };

  const buildItemKey = (row) => [row.productId].join("|");

  const handleEnterToNextField = useCallback((event) => {
    if (event.key !== "Enter") return;
    if (event.target?.closest?.("[data-enter-ignore='true']")) return;

    const tag = String(event.target?.tagName || "").toLowerCase();
    if (!["input", "select", "textarea"].includes(tag)) return;

    event.preventDefault();

    const root = formRootRef.current;
    if (!root) return;

    const focusables = Array.from(
      root.querySelectorAll("input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled])")
    ).filter((el) => el.offsetParent !== null);

    const index = focusables.indexOf(event.target);
    if (index < 0) return;

    const next = focusables[index + 1] || focusables[0];
    if (next) next.focus();
  }, []);

  const addItem = async () => {
    const qty = Math.max(0, toNum(itemDraft.qty, 0));
    const price = Math.max(0, toNum(itemDraft.price, 0));

    if (!itemDraft.productId) {
      toast.error("Please select product");
      return;
    }
    if (qty <= 0) {
      toast.error("Quantity should be greater than 0");
      return;
    }

    try {
      const productName = getLabelByValue(options.products, itemDraft.productId);
      const sizeName = getLabelByValue(options.sizes, itemDraft.sizeId);

      const params = {
        productName,
      };

      const res = await api.get("/customer-orders/stock-availability", { params });
      const availableQty = toNum(res.data?.data?.availableQty, 0);

      const draftRow = {
        ...itemDraft,
        qty,
        price,
        productName,
        brandName: getLabelByValue(options.brands, itemDraft.brandId),
        styleName: getLabelByValue(options.styles, itemDraft.styleId),
        sizeName,
        colourName: getLabelByValue(options.colours, itemDraft.colourId),
      };

      const key = buildItemKey(draftRow);
      const alreadyUsed = items
        .filter((row) => buildItemKey(row) === key)
        .reduce((sum, row) => sum + Math.max(0, toNum(row.qty, 0)), 0);

      if (alreadyUsed + qty > availableQty) {
        toast.error(`Quantity exceeds available stock (${availableQty}). Already used: ${alreadyUsed}`);
        return;
      }

      setItems((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          ...draftRow,
          amount: Number((qty * price).toFixed(2)),
          availableQty,
        },
      ]);

      setItemDraft(initialItemDraft);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to validate item stock");
    }
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((row) => row.id !== id));
  };

  const addPayment = () => {
    const amount = Math.max(0, toNum(paymentDraft.amount, 0));
    if (amount <= 0) {
      toast.error("Payment amount should be greater than 0");
      return;
    }

    const receivedByLabel = getLabelByValue(options.employees, form.receivedById);

    setPayments((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        date: paymentDraft.date,
        amount,
        paymentMode: paymentDraft.paymentMode,
        bankId: paymentDraft.bankId,
        bankName: getLabelByValue(options.banks, paymentDraft.bankId),
        bankDate: paymentDraft.bankDate,
        remarks: paymentDraft.remarks,
        receivedById: form.receivedById,
        cashier: receivedByLabel,
      },
    ]);

    setPaymentDraft((prev) => ({
      ...initialPaymentDraft,
      date: prev.date || formatDateTimeLocal(),
      paymentMode: prev.paymentMode || "Cash",
    }));
  };

  const removePayment = (id) => {
    setPayments((prev) => prev.filter((row) => row.id !== id));
  };

  const printPaymentSlip = (paymentRow) => {
    const productRows = items
      .map(
        (item) => `
      <tr>
        <td>${item.productName || "-"}</td>
        <td style="text-align:right">${Number(item.price || 0).toFixed(2)}</td>
        <td style="text-align:right">${Number(item.qty || 0).toFixed(3)}</td>
        <td style="text-align:right">${Number(item.amount || 0).toFixed(2)}</td>
      </tr>`
      )
      .join("");

    const html = `
      <html>
      <head>
        <title>Customer Order #${orderNo}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; }
          h2 { margin: 0 0 8px 0; }
          .meta { margin-bottom: 8px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
          th, td { border: 1px solid #ddd; padding: 6px; }
          th { background: #f4f4f4; text-align: left; }
          .totals { margin-top: 10px; text-align: right; font-size: 13px; }
        </style>
      </head>
      <body>
        <h2>Customer Order Receipt</h2>
        <div class="meta">Order No: <b>${orderNo}</b></div>
        <div class="meta">Order Date: <b>${form.orderDate || "-"}</b></div>
        <div class="meta">Customer: <b>${form.customerName || "-"}</b> (${form.customerMobile || "-"})</div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:right">Qty</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>${productRows}</tbody>
        </table>
        <div class="totals">
          <div>Total Qty: <b>${itemTotals.totalQty}</b></div>
          <div>Total Amount: <b>${formatMoney(itemTotals.totalAmount)}</b></div>
          <div>Paid Now: <b>${formatMoney(paymentRow.amount)}</b></div>
          <div>Paid Total: <b>${formatMoney(paidAmount)}</b></div>
          <div>Balance: <b>${formatMoney(balanceAmount)}</b></div>
        </div>
      </body>
      </html>
    `;

    printHtml(html, {
      label: `CustomerOrder-${orderNo}`,
      docType: "crm_receipt",
      companyId: Number(form.companyId || 0) || undefined,
      copies: 1,
    });
  };

  const handleSave = async () => {
    if (!form.orderDate) {
      toast.error("Order date is required");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }
    if (payments.length === 0) {
      toast.error("Please add at least one payment entry");
      return;
    }
    if (paidAmount < itemTotals.totalAmount) {
      toast.error("Paid amount should not be less than total");
      return;
    }
    if (!form.customerMobile && !form.customerId) {
      toast.error("Customer mobile is required");
      return;
    }

    const payload = {
      companyId: form.companyId || null,
      locationId: form.locationId || null,
      orderDate: form.orderDate,
      deliveryDate: form.deliveryDate || null,
      customerId: form.customerId || null,
      customerSelectionMode,
      customerMobile: form.customerMobile || null,
      customerName: form.customerName || null,
      customerAddress: form.customerAddress || null,
      cityId: form.cityId || null,
      communicationDate: form.communicationDate || null,
      communicationMessage: form.communicationMessage || null,
      communications: communications.map((row) => ({
        date: row.date,
        person: row.person,
        note: row.note,
      })),
      supplierId: form.supplierId || null,
      counterId: form.counterId || null,
      receivedById: form.receivedById || null,
      remarks: form.remarks || null,
      items: items.map((row) => ({
        productId: row.productId || null,
        productName: row.productName || null,
        brandId: row.brandId || null,
        brandName: row.brandName || null,
        styleId: row.styleId || null,
        styleName: row.styleName || null,
        sizeId: row.sizeId || null,
        sizeName: row.sizeName || null,
        colourId: row.colourId || null,
        colourName: row.colourName || null,
        designNo: row.designNo || null,
        price: toNum(row.price, 0),
        qty: toNum(row.qty, 0),
      })),
      payments: payments.map((row) => ({
        date: row.date,
        amount: toNum(row.amount, 0),
        paymentMode: row.paymentMode || null,
        bankId: row.bankId || null,
        bankDate: row.bankDate || null,
        remarks: row.remarks || null,
        receivedById: row.receivedById || null,
      })),
    };

    setSaving(true);
    try {
      const res = isEdit
        ? await api.put(`/customer-orders/${id}`, payload)
        : await api.post("/customer-orders", payload);
      toast.success(res.data?.message || "Customer order saved successfully");
      navigate("/crm/customer-orders");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save customer order");
    } finally {
      setSaving(false);
    }
  };

  if (loadingMasters || loadingSource) {
    return (
      <div className="h-[calc(100vh-20px)] bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow p-4 text-center text-gray-500 dark:text-gray-400 text-[11px]">
          Loading customer order setup...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={formRootRef}
      onKeyDown={handleEnterToNextField}
      className="h-full min-h-0 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 overflow-hidden flex flex-col text-[10px] [&_input]:text-[10px] [&_select]:text-[10px] [&_textarea]:text-[10px] [&_button]:text-[10px]"
    >
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
            <button
              type="button"
              onClick={() => navigate("/crm/customer-orders")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Customer Orders
            </button>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span>New</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-medium text-gray-700 dark:text-gray-300">
          <span className="text-gray-600 dark:text-gray-400">Order No: <b>{orderNo}</b></span>
          <button
            className="glass-btn glass-btn-success flex items-center disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-3 h-3 mr-1" /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-2 overflow-hidden">
        <div className="h-full grid grid-cols-3 gap-2">
          <div className="min-h-0 flex flex-col gap-2">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <InputLabel text="Company" required />
                  <SearchableSelect
                    name="companyId"
                    value={form.companyId}
                    onChange={(e) => updateForm("companyId", e.target.value)}
                    options={options.companies}
                    placeholder="Select"
                  />
                </div>
                <div>
                  <InputLabel text="Location" required />
                  <SearchableSelect
                    name="locationId"
                    value={form.locationId}
                    onChange={(e) => updateForm("locationId", e.target.value)}
                    options={options.locations}
                    placeholder="Select"
                  />
                </div>
                <div>
                  <InputLabel text="Order Date" required />
                  <input
                    type="date"
                    value={form.orderDate}
                    onChange={(e) => {
                      updateForm("orderDate", e.target.value);
                      if (!paymentDraft.date) {
                        setPaymentDraft((prev) => ({ ...prev, date: `${e.target.value}T00:00` }));
                      }
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                  />
                </div>
                <div>
                  <InputLabel text="Delivery Date" />
                  <input
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => updateForm("deliveryDate", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 shrink-0">
              <h2 className="text-xs font-bold mb-2 text-gray-800 dark:text-gray-100">Customer</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                <div>
                  <InputLabel text="Mobile No" required />
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={form.customerMobile}
                      onChange={(e) => onManualCustomerMobileChange(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                      placeholder="Enter mobile no"
                    />
                    <button
                      type="button"
                      onClick={openCustomerDialog}
                      className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      title="Search customer"
                    >
                      <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </button>
                  </div>
                </div>
                <div>
                  <InputLabel text="Name" />
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) => {
                      updateForm("customerName", e.target.value);
                      if (!form.customerId) setCustomerSelectionMode("manual-mobile");
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <InputLabel text="Address" />
                  <textarea
                    value={form.customerAddress}
                    onChange={(e) => {
                      updateForm("customerAddress", e.target.value);
                      if (!form.customerId) setCustomerSelectionMode("manual-mobile");
                    }}
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                    placeholder="Address"
                  />
                </div>
                <div>
                  <InputLabel text="City" />
                  <SearchableSelect
                    name="cityId"
                    value={form.cityId}
                    onChange={(e) => updateForm("cityId", e.target.value)}
                    options={options.cities}
                    placeholder="Select"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 min-h-0 flex flex-col">
              <h2 className="text-xs font-bold mb-2 text-gray-800 dark:text-gray-100">Communication</h2>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <InputLabel text="Date" />
                  <input
                    type="date"
                    value={form.communicationDate}
                    onChange={(e) => updateForm("communicationDate", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                  />
                </div>
                <div>
                  <InputLabel text="Contact Person" />
                  <input
                    type="text"
                    value={form.communicationPerson}
                    onChange={(e) => updateForm("communicationPerson", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                    placeholder="Person"
                  />
                </div>
                <div>
                  <InputLabel text="Message" />
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={form.communicationMessage}
                      onChange={(e) => updateForm("communicationMessage", e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                      placeholder="Message"
                    />
                    <button
                      type="button"
                      onClick={addCommunication}
                      className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      title="Add communication"
                    >
                      <PlusCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-sm overflow-auto flex-1 min-h-0">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Date</th>
                      <th className="px-2 py-1.5 text-left">Person</th>
                      <th className="px-2 py-1.5 text-left">Note</th>
                      <th className="px-2 py-1.5 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communications.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-2 py-2 text-center text-gray-500 dark:text-gray-400">No communication entries</td>
                      </tr>
                    ) : (
                      communications.map((row) => (
                        <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-2 py-1.5">{row.date || "--"}</td>
                          <td className="px-2 py-1.5">{row.person || "--"}</td>
                          <td className="px-2 py-1.5">{row.note || "--"}</td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeCommunication(row.id)}
                              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex flex-col gap-2">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 min-h-0 flex flex-col">
              <h2 className="text-xs font-bold mb-2 text-gray-800 dark:text-gray-100">Items</h2>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <InputLabel text="Supplier" />
                  <SearchableSelect
                    name="supplierId"
                    value={form.supplierId}
                    onChange={(e) => updateForm("supplierId", e.target.value)}
                    options={options.suppliers}
                    placeholder="Select"
                  />
                </div>

                <div>
                  <InputLabel text="Product" required />
                  <SearchableSelect
                    name="itemProductId"
                    value={itemDraft.productId}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, productId: e.target.value }))}
                    options={options.products}
                    placeholder="Select"
                  />
                </div>

                <div>
                  <InputLabel text="Brand" />
                  <SearchableSelect
                    name="itemBrandId"
                    value={itemDraft.brandId}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, brandId: e.target.value }))}
                    options={options.brands}
                    placeholder="Select"
                  />
                </div>

                <div>
                  <InputLabel text="Style" />
                  <SearchableSelect
                    name="itemStyleId"
                    value={itemDraft.styleId}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, styleId: e.target.value }))}
                    options={options.styles}
                    placeholder="Select"
                  />
                </div>

                <div>
                  <InputLabel text="Size" />
                  <SearchableSelect
                    name="itemSizeId"
                    value={itemDraft.sizeId}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, sizeId: e.target.value }))}
                    options={options.sizes}
                    placeholder="Select"
                  />
                </div>

                <div>
                  <InputLabel text="Colour" />
                  <SearchableSelect
                    name="itemColourId"
                    value={itemDraft.colourId}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, colourId: e.target.value }))}
                    options={options.colours}
                    placeholder="Select"
                  />
                </div>

                <div>
                  <InputLabel text="Design No" />
                  <input
                    type="text"
                    value={itemDraft.designNo}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, designNo: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                    placeholder="Design"
                  />
                </div>

                <div>
                  <InputLabel text="Price" required />
                  <input
                    type="number"
                    value={itemDraft.price}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <InputLabel text="Qty" required />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={itemDraft.qty}
                      onChange={(e) => setItemDraft((prev) => ({ ...prev, qty: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={addItem}
                      className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      title="Add item"
                    >
                      <PlusCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-sm overflow-auto flex-1 min-h-0">
                <table className="w-full text-xs min-w-[840px]">
                  <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Product</th>
                      <th className="px-2 py-1.5 text-left">Brand</th>
                      <th className="px-2 py-1.5 text-left">Style</th>
                      <th className="px-2 py-1.5 text-left">Size</th>
                      <th className="px-2 py-1.5 text-left">Colour</th>
                      <th className="px-2 py-1.5 text-left">Design</th>
                      <th className="px-2 py-1.5 text-right">Price</th>
                      <th className="px-2 py-1.5 text-right">Qty</th>
                      <th className="px-2 py-1.5 text-right">Amount</th>
                      <th className="px-2 py-1.5 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-2 py-2 text-center text-gray-500 dark:text-gray-400">No items added</td>
                      </tr>
                    ) : (
                      items.map((row) => (
                        <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-2 py-1.5">{row.productName || "--"}</td>
                          <td className="px-2 py-1.5">{row.brandName || "--"}</td>
                          <td className="px-2 py-1.5">{row.styleName || "--"}</td>
                          <td className="px-2 py-1.5">{row.sizeName || "--"}</td>
                          <td className="px-2 py-1.5">{row.colourName || "--"}</td>
                          <td className="px-2 py-1.5">{row.designNo || "--"}</td>
                          <td className="px-2 py-1.5 text-right">{formatMoney(row.price)}</td>
                          <td className="px-2 py-1.5 text-right">{Number(row.qty || 0).toFixed(3)}</td>
                          <td className="px-2 py-1.5 text-right">{formatMoney(row.amount)}</td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(row.id)}
                              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex flex-col gap-2">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 min-h-0 flex flex-col">
              <h2 className="text-xs font-bold mb-2 text-gray-800 dark:text-gray-100">Payment Info</h2>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <InputLabel text="Counter" />
                  <SearchableSelect
                    name="counterId"
                    value={form.counterId}
                    onChange={(e) => updateForm("counterId", e.target.value)}
                    options={options.counters}
                    placeholder="Select"
                  />
                </div>

                <div>
                  <InputLabel text="Received By" />
                  <SearchableSelect
                    name="receivedById"
                    value={form.receivedById}
                    onChange={(e) => updateForm("receivedById", e.target.value)}
                    options={options.employees}
                    placeholder="Select"
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-sm px-2 py-1.5">
                  <div className="text-gray-500 dark:text-gray-400">Total Qty</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-100">{Number(itemTotals.totalQty).toFixed(3)}</div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-sm px-2 py-1.5">
                  <div className="text-gray-500 dark:text-gray-400">Total Amt</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-100">{formatMoney(itemTotals.totalAmount)}</div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-sm px-2 py-1.5">
                  <div className="text-gray-500 dark:text-gray-400">Paid</div>
                  <div className="font-semibold text-green-700 dark:text-green-400">{formatMoney(paidAmount)}</div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-sm px-2 py-1.5">
                  <div className="text-gray-500 dark:text-gray-400">Balance</div>
                  <div className={`font-semibold ${balanceAmount <= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"}`}>
                    {formatMoney(balanceAmount)}
                  </div>
                </div>

                <div>
                  <InputLabel text={`Date (${form.orderDate || "-"})`} />
                  <input
                    type="datetime-local"
                    value={paymentDraft.date}
                    onChange={(e) => setPaymentDraft((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                  />
                </div>

                <div>
                  <InputLabel text="Payment Mode" />
                  <SearchableSelect
                    name="paymentMode"
                    value={paymentDraft.paymentMode}
                    onChange={(e) => setPaymentDraft((prev) => ({ ...prev, paymentMode: e.target.value }))}
                    options={paymentModeOptions}
                    placeholder="Select"
                  />
                </div>

                <div>
                  <InputLabel text="Bank" />
                  <SearchableSelect
                    name="bankId"
                    value={paymentDraft.bankId}
                    onChange={(e) => setPaymentDraft((prev) => ({ ...prev, bankId: e.target.value }))}
                    options={options.banks}
                    placeholder="Select"
                  />
                </div>

                <div>
                  <InputLabel text="Bank Date" />
                  <input
                    type="date"
                    value={paymentDraft.bankDate}
                    onChange={(e) => setPaymentDraft((prev) => ({ ...prev, bankDate: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                  />
                </div>

                <div>
                  <InputLabel text="Amount" required />
                  <input
                    type="number"
                    value={paymentDraft.amount}
                    onChange={(e) => setPaymentDraft((prev) => ({ ...prev, amount: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <InputLabel text="Remarks" />
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={paymentDraft.remarks}
                      onChange={(e) => setPaymentDraft((prev) => ({ ...prev, remarks: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                      placeholder="Remarks"
                    />
                    <button
                      type="button"
                      onClick={addPayment}
                      className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      title="Add payment"
                    >
                      <PlusCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-sm overflow-auto flex-1 min-h-0">
                <table className="w-full text-xs min-w-[700px]">
                  <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Date</th>
                      <th className="px-2 py-1.5 text-right">Amount</th>
                      <th className="px-2 py-1.5 text-left">Cashier</th>
                      <th className="px-2 py-1.5 text-left">Mode</th>
                      <th className="px-2 py-1.5 text-center">Print</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-2 py-2 text-center text-gray-500 dark:text-gray-400">No payment entries</td>
                      </tr>
                    ) : (
                      payments.map((row) => (
                        <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-2 py-1.5">{row.date || "--"}</td>
                          <td className="px-2 py-1.5 text-right">{formatMoney(row.amount)}</td>
                          <td className="px-2 py-1.5">{row.cashier || "--"}</td>
                          <td className="px-2 py-1.5">{row.paymentMode || "--"}</td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removePayment(row.id)}
                              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mr-2"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                            <button
                              type="button"
                              onClick={() => printPaymentSlip(row)}
                              className="glass-btn glass-btn-primary"
                              title="Print"
                            >
                              <Printer className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-2">
                <InputLabel text="Order Remarks" />
                <input
                  type="text"
                  value={form.remarks}
                  onChange={(e) => updateForm("remarks", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-1.5 py-1"
                  placeholder="Additional remarks"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {customerDialog.open && (
        <div className="fixed inset-0 z-[120] bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-md shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Search / Select Customer</h3>
              <button type="button" onClick={closeCustomerDialog} className="glass-btn glass-btn-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <InputLabel text="Name" />
                  <input
                    type="text"
                    value={customerDialog.name}
                    onChange={(e) => setCustomerDialog((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <InputLabel text="Contact No" />
                  <input
                    type="text"
                    value={customerDialog.contactNo}
                    onChange={(e) => setCustomerDialog((prev) => ({ ...prev, contactNo: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <InputLabel text="Area" />
                  <input
                    type="text"
                    value={customerDialog.area}
                    onChange={(e) => setCustomerDialog((prev) => ({ ...prev, area: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={searchCustomers}
                    className="glass-btn glass-btn-primary w-full disabled:opacity-50"
                    disabled={customerDialog.loading}
                  >
                    {customerDialog.loading ? "Searching..." : "Search"}
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-sm max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 w-10" />
                      <th className="px-2 py-1.5 text-left">Name</th>
                      <th className="px-2 py-1.5 text-left">Area</th>
                      <th className="px-2 py-1.5 text-left">Mobile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerDialog.rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-2 py-3 text-center text-gray-500 dark:text-gray-400">No matched customers</td>
                      </tr>
                    ) : (
                      customerDialog.rows.map((row) => (
                        <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={String(customerDialog.selectedId) === String(row.id)}
                              onChange={() =>
                                setCustomerDialog((prev) => ({
                                  ...prev,
                                  selectedId: String(prev.selectedId) === String(row.id) ? "" : String(row.id),
                                }))
                              }
                              className="w-3.5 h-3.5 accent-blue-600 dark:accent-blue-400"
                            />
                          </td>
                          <td className="px-2 py-1.5">{row.name || "--"}</td>
                          <td className="px-2 py-1.5">{row.area || "--"}</td>
                          <td className="px-2 py-1.5">{row.mobile || "--"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={createCustomerFromDialog}
                className="glass-btn glass-btn-success"
              >
                Create
              </button>
              <button
                type="button"
                onClick={selectCustomerFromDialog}
                className="glass-btn glass-btn-primary"
              >
                Select
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CrmCustomerOrderForm;
