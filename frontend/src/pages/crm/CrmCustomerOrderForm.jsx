import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, PlusCircle, Printer, Save, Search, Trash2, X } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { alpha } from "@mui/material/styles";
import { Box, Button, Checkbox, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import api from "../../api/axios";
import SearchableSelect from "../../components/SearchableSelect";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import { usePrintContext } from "../../context/PrintContext";

// The whole form is pinned to a single compact 10px baseline (was `text-[10px]` on the root
// plus per-element arbitrary overrides) -- applied explicitly per TextField since MUI's own
// input font-size doesn't inherit from an ancestor's fontSize the way a plain <input> would.
const compactFieldSx = { "& .MuiInputBase-input": { fontSize: 10, padding: "4px 6px" } };

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
  <Typography component="label" sx={{ fontSize: 10, fontWeight: 600, color: "text.secondary", mb: 0.25, display: "block", lineHeight: 1.2 }}>
    {required && <Box component="span" sx={{ mr: 0.25, color: "error.main" }}>*</Box>}
    {text}
  </Typography>
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
        api.get("/suppliers", { params: { limit: 300 } }).catch(() => ({ data: { data: [] } })),
        api.get("/customer-orders/stock-products").catch(() => ({ data: { data: [] } })),
        api.get("/products", { params: { limit: 300 } }).catch(() => ({ data: { data: [] } })),
        api.get("/brands", { params: { limit: 300 } }).catch(() => ({ data: { data: [] } })),
        api.get("/attributes/style").catch(() => ({ data: { data: [] } })),
        api.get("/sizes").catch(() => ({ data: { data: [] } })),
        api.get("/attributes/colour").catch(() => ({ data: { data: [] } })),
        api.get("/configurations/counter").catch(() => ({ data: { data: [] } })),
        api.get("/employees", { params: { limit: 300 } }).catch(() => ({ data: { data: [] } })),
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
        label: toText(row.name) || row.code || `EMP-${row.id}`,
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

  // Preloads above are capped batches -- these hit each resource's own ?search= endpoint so
  // AsyncSearchSelect can find anything beyond that initial batch.
  const handleAsyncSupplierSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/suppliers", { params: { search: query, limit: 50 } });
      const mapped = toSelectOptions(res.data?.data || [], "id", "name");
      if (mapped.length) {
        setOptions((prev) => {
          const existingIds = new Set(prev.suppliers.map((o) => o.value));
          return { ...prev, suppliers: [...prev.suppliers, ...mapped.filter((o) => !existingIds.has(o.value))] };
        });
      }
      return mapped;
    } catch {
      return [];
    }
  }, []);

  const handleAsyncProductSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/customer-orders/stock-products", { params: { search: query } });
      const mapped = toSelectOptions(res.data?.data || [], "id", "name");
      if (mapped.length) {
        setOptions((prev) => {
          const existingIds = new Set(prev.products.map((o) => o.value));
          return { ...prev, products: [...prev.products, ...mapped.filter((o) => !existingIds.has(o.value))] };
        });
      }
      return mapped;
    } catch {
      return [];
    }
  }, []);

  const handleAsyncBrandSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/brands", { params: { search: query, limit: 50 } });
      const mapped = toSelectOptions(res.data?.data || [], "id", "name");
      if (mapped.length) {
        setOptions((prev) => {
          const existingIds = new Set(prev.brands.map((o) => o.value));
          return { ...prev, brands: [...prev.brands, ...mapped.filter((o) => !existingIds.has(o.value))] };
        });
      }
      return mapped;
    } catch {
      return [];
    }
  }, []);

  const handleAsyncEmployeeSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/employees", { params: { search: query, limit: 50 } });
      const mapped = (res.data?.data || []).map((row) => ({
        value: String(row.id),
        label: toText(row.name) || row.code || `EMP-${row.id}`,
        raw: row,
      }));
      if (mapped.length) {
        setOptions((prev) => {
          const existingIds = new Set(prev.employees.map((o) => o.value));
          return { ...prev, employees: [...prev.employees, ...mapped.filter((o) => !existingIds.has(o.value))] };
        });
      }
      return mapped;
    } catch {
      return [];
    }
  }, []);

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
      <Box sx={{ height: "calc(100vh - 20px)", bgcolor: "background.default", color: "text.primary", p: 1 }}>
        <Box sx={{ bgcolor: "background.paper", borderRadius: "7px", border: "1px solid", borderColor: "divider", boxShadow: 1, p: 2, textAlign: "center", color: "text.secondary", fontSize: 11 }}>
          Loading customer order setup...
        </Box>
      </Box>
    );
  }

  return (
    <Box
      ref={formRootRef}
      onKeyDown={handleEnterToNextField}
      sx={{ height: "100%", minHeight: 0, bgcolor: "background.default", color: "text.primary", overflow: "hidden", display: "flex", flexDirection: "column", fontSize: 10 }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 0.5, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 13, fontWeight: 600 }}>
            <Button type="button" variant="text" onClick={() => navigate("/crm")} sx={{ minWidth: "auto", p: 0, fontSize: 13, fontWeight: 600 }}>
              CRM
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Button type="button" variant="text" onClick={() => navigate("/crm/customer-orders")} sx={{ minWidth: "auto", p: 0, fontSize: 13, fontWeight: 600 }}>
              Customer Orders
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span">New</Box>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", fontSize: "inherit", fontWeight: 500, color: "text.secondary" }}>
          <Box component="span" sx={{ color: "text.secondary" }}>Order No: <Box component="b">{orderNo}</Box></Box>
          <Button
            className="glass-btn glass-btn-success flex items-center"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={12} style={{marginRight: 4}} /> {saving ? "Saving..." : "Save"}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, p: 1, overflow: "hidden" }}>
        <Box sx={{ height: "100%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
          <Stack spacing={1} sx={{ minHeight: 0 }}>
            <Box sx={{ bgcolor: "background.paper", boxShadow: 1, borderRadius: "7px", px: 1.5, py: 1, border: "1px solid", borderColor: "divider", flexShrink: 0 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
                <Box>
                  <InputLabel text="Company" required />
                  <SearchableSelect
                    name="companyId"
                    value={form.companyId}
                    onChange={(e) => updateForm("companyId", e.target.value)}
                    options={options.companies}
                    placeholder="Select"
                  />
                </Box>
                <Box>
                  <InputLabel text="Location" required />
                  <SearchableSelect
                    name="locationId"
                    value={form.locationId}
                    onChange={(e) => updateForm("locationId", e.target.value)}
                    options={options.locations}
                    placeholder="Select"
                  />
                </Box>
                <Box>
                  <InputLabel text="Order Date" required />
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    sx={compactFieldSx}
                    value={form.orderDate}
                    onChange={(e) => {
                      updateForm("orderDate", e.target.value);
                      if (!paymentDraft.date) {
                        setPaymentDraft((prev) => ({ ...prev, date: `${e.target.value}T00:00` }));
                      }
                    }}
                  />
                </Box>
                <Box>
                  <InputLabel text="Delivery Date" />
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    sx={compactFieldSx}
                    value={form.deliveryDate}
                    onChange={(e) => updateForm("deliveryDate", e.target.value)}
                  />
                </Box>
              </Box>
            </Box>

            <Box sx={{ bgcolor: "background.paper", boxShadow: 1, borderRadius: "7px", px: 1.5, py: 1, border: "1px solid", borderColor: "divider", flexShrink: 0 }}>
              <Typography component="h2" sx={{ fontSize: 10.5, fontWeight: 700, color: "text.primary", mb: 1 }}>Customer</Typography>
              <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { md: "repeat(2, 1fr)" }, alignItems: "end" }}>
                <Box>
                  <InputLabel text="Mobile No" required />
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <TextField
                      type="text"
                      size="small"
                      fullWidth
                      sx={compactFieldSx}
                      value={form.customerMobile}
                      onChange={(e) => onManualCustomerMobileChange(e.target.value)}
                      placeholder="Enter mobile no"
                    />
                    <IconButton
                      size="small"
                      onClick={openCustomerDialog}
                      title="Search customer"
                      sx={{ border: "1px solid", borderColor: "divider", borderRadius: "4px", color: "primary.main" }}
                    >
                      <Search size={14} />
                    </IconButton>
                  </Stack>
                </Box>
                <Box>
                  <InputLabel text="Name" />
                  <TextField
                    type="text"
                    size="small"
                    fullWidth
                    sx={compactFieldSx}
                    value={form.customerName}
                    onChange={(e) => {
                      updateForm("customerName", e.target.value);
                      if (!form.customerId) setCustomerSelectionMode("manual-mobile");
                    }}
                    placeholder="Customer name"
                  />
                </Box>
                <Box>
                  <InputLabel text="Address" />
                  <TextField
                    multiline
                    rows={3}
                    size="small"
                    fullWidth
                    sx={compactFieldSx}
                    value={form.customerAddress}
                    onChange={(e) => {
                      updateForm("customerAddress", e.target.value);
                      if (!form.customerId) setCustomerSelectionMode("manual-mobile");
                    }}
                    placeholder="Address"
                  />
                </Box>
                <Box>
                  <InputLabel text="City" />
                  <SearchableSelect
                    name="cityId"
                    value={form.cityId}
                    onChange={(e) => updateForm("cityId", e.target.value)}
                    options={options.cities}
                    placeholder="Select"
                  />
                </Box>
              </Box>
            </Box>

            <Stack sx={{ bgcolor: "background.paper", boxShadow: 1, borderRadius: "7px", px: 1.5, py: 1, border: "1px solid", borderColor: "divider", minHeight: 0 }}>
              <Typography component="h2" sx={{ fontSize: 10.5, fontWeight: 700, color: "text.primary", mb: 1 }}>Communication</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, alignItems: "end" }}>
                <Box>
                  <InputLabel text="Date" />
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    sx={compactFieldSx}
                    value={form.communicationDate}
                    onChange={(e) => updateForm("communicationDate", e.target.value)}
                  />
                </Box>
                <Box>
                  <InputLabel text="Contact Person" />
                  <TextField
                    type="text"
                    size="small"
                    fullWidth
                    sx={compactFieldSx}
                    value={form.communicationPerson}
                    onChange={(e) => updateForm("communicationPerson", e.target.value)}
                    placeholder="Person"
                  />
                </Box>
                <Box>
                  <InputLabel text="Message" />
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <TextField
                      type="text"
                      size="small"
                      fullWidth
                      sx={compactFieldSx}
                      value={form.communicationMessage}
                      onChange={(e) => updateForm("communicationMessage", e.target.value)}
                      placeholder="Message"
                    />
                    <IconButton
                      size="small"
                      onClick={addCommunication}
                      title="Add communication"
                      sx={{ border: "1px solid", borderColor: "divider", borderRadius: "4px", color: "success.main" }}
                    >
                      <PlusCircle size={16} />
                    </IconButton>
                  </Stack>
                </Box>
              </Box>

              <Box sx={{ mt: 1, border: "1px solid", borderColor: "divider", borderRadius: "4px", overflow: "auto", flex: 1, minHeight: 0 }}>
                <Table size="small" sx={{ width: "100%", "& th, & td": { fontSize: 12.25 } }}>
                  <TableHead sx={{ bgcolor: "action.hover", position: "sticky", top: 0 }}>
                    <TableRow>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Date</TableCell>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Person</TableCell>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Note</TableCell>
                      <TableCell align="center" sx={{ px: 1, py: 0.75, width: 64 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {communications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ px: 1, py: 1, color: "text.secondary" }}>No communication entries</TableCell>
                      </TableRow>
                    ) : (
                      communications.map((row) => (
                        <TableRow key={row.id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.date || "--"}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.person || "--"}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.note || "--"}</TableCell>
                          <TableCell align="center" sx={{ px: 1, py: 0.75 }}>
                            <IconButton
                              size="small"
                              onClick={() => removeCommunication(row.id)}
                              title="Delete"
                              sx={{ color: "error.main" }}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          </Stack>

          <Stack sx={{ minHeight: 0 }}>
            <Stack sx={{ bgcolor: "background.paper", boxShadow: 1, borderRadius: "7px", px: 1.5, py: 1, border: "1px solid", borderColor: "divider", minHeight: 0 }}>
              <Typography component="h2" sx={{ fontSize: 10.5, fontWeight: 700, color: "text.primary", mb: 1 }}>Items</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, alignItems: "end" }}>
                <Box>
                  <InputLabel text="Supplier" />
                  <AsyncSearchSelect
                    name="supplierId"
                    value={form.supplierId}
                    onChange={(e) => updateForm("supplierId", e.target.value)}
                    options={options.suppliers}
                    onAsyncSearch={handleAsyncSupplierSearch}
                    placeholder="Select"
                  />
                </Box>

                <Box>
                  <InputLabel text="Product" required />
                  <AsyncSearchSelect
                    name="itemProductId"
                    value={itemDraft.productId}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, productId: e.target.value }))}
                    options={options.products}
                    onAsyncSearch={handleAsyncProductSearch}
                    placeholder="Select"
                  />
                </Box>

                <Box>
                  <InputLabel text="Brand" />
                  <AsyncSearchSelect
                    name="itemBrandId"
                    value={itemDraft.brandId}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, brandId: e.target.value }))}
                    options={options.brands}
                    onAsyncSearch={handleAsyncBrandSearch}
                    placeholder="Select"
                  />
                </Box>

                <Box>
                  <InputLabel text="Style" />
                  <SearchableSelect
                    name="itemStyleId"
                    value={itemDraft.styleId}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, styleId: e.target.value }))}
                    options={options.styles}
                    placeholder="Select"
                  />
                </Box>

                <Box>
                  <InputLabel text="Size" />
                  <SearchableSelect
                    name="itemSizeId"
                    value={itemDraft.sizeId}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, sizeId: e.target.value }))}
                    options={options.sizes}
                    placeholder="Select"
                  />
                </Box>

                <Box>
                  <InputLabel text="Colour" />
                  <SearchableSelect
                    name="itemColourId"
                    value={itemDraft.colourId}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, colourId: e.target.value }))}
                    options={options.colours}
                    placeholder="Select"
                  />
                </Box>

                <Box>
                  <InputLabel text="Design No" />
                  <TextField
                    type="text"
                    size="small"
                    fullWidth
                    sx={compactFieldSx}
                    value={itemDraft.designNo}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, designNo: e.target.value }))}
                    placeholder="Design"
                  />
                </Box>

                <Box>
                  <InputLabel text="Price" required />
                  <TextField
                    type="number"
                    size="small"
                    fullWidth
                    sx={compactFieldSx}
                    value={itemDraft.price}
                    onChange={(e) => setItemDraft((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </Box>

                <Box>
                  <InputLabel text="Qty" required />
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      sx={compactFieldSx}
                      value={itemDraft.qty}
                      onChange={(e) => setItemDraft((prev) => ({ ...prev, qty: e.target.value }))}
                      placeholder="0"
                    />
                    <IconButton
                      size="small"
                      onClick={addItem}
                      title="Add item"
                      sx={{ border: "1px solid", borderColor: "divider", borderRadius: "4px", color: "success.main" }}
                    >
                      <PlusCircle size={16} />
                    </IconButton>
                  </Stack>
                </Box>
              </Box>

              <Box sx={{ mt: 1, border: "1px solid", borderColor: "divider", borderRadius: "4px", overflow: "auto", flex: 1, minHeight: 0 }}>
                <Table size="small" sx={{ width: "100%", minWidth: 840, "& th, & td": { fontSize: 12.25 } }}>
                  <TableHead sx={{ bgcolor: "action.hover", position: "sticky", top: 0 }}>
                    <TableRow>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Product</TableCell>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Brand</TableCell>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Style</TableCell>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Size</TableCell>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Colour</TableCell>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Design</TableCell>
                      <TableCell align="right" sx={{ px: 1, py: 0.75 }}>Price</TableCell>
                      <TableCell align="right" sx={{ px: 1, py: 0.75 }}>Qty</TableCell>
                      <TableCell align="right" sx={{ px: 1, py: 0.75 }}>Amount</TableCell>
                      <TableCell align="center" sx={{ px: 1, py: 0.75, width: 64 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ px: 1, py: 1, color: "text.secondary" }}>No items added</TableCell>
                      </TableRow>
                    ) : (
                      items.map((row) => (
                        <TableRow key={row.id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.productName || "--"}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.brandName || "--"}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.styleName || "--"}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.sizeName || "--"}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.colourName || "--"}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.designNo || "--"}</TableCell>
                          <TableCell align="right" sx={{ px: 1, py: 0.75 }}>{formatMoney(row.price)}</TableCell>
                          <TableCell align="right" sx={{ px: 1, py: 0.75 }}>{Number(row.qty || 0).toFixed(3)}</TableCell>
                          <TableCell align="right" sx={{ px: 1, py: 0.75 }}>{formatMoney(row.amount)}</TableCell>
                          <TableCell align="center" sx={{ px: 1, py: 0.75 }}>
                            <IconButton
                              size="small"
                              onClick={() => removeItem(row.id)}
                              title="Delete"
                              sx={{ color: "error.main" }}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          </Stack>

          <Stack sx={{ minHeight: 0 }}>
            <Stack sx={{ bgcolor: "background.paper", boxShadow: 1, borderRadius: "7px", px: 1.5, py: 1, border: "1px solid", borderColor: "divider", minHeight: 0 }}>
              <Typography component="h2" sx={{ fontSize: 10.5, fontWeight: 700, color: "text.primary", mb: 1 }}>Payment Info</Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                <Box>
                  <InputLabel text="Counter" />
                  <SearchableSelect
                    name="counterId"
                    value={form.counterId}
                    onChange={(e) => updateForm("counterId", e.target.value)}
                    options={options.counters}
                    placeholder="Select"
                  />
                </Box>

                <Box>
                  <InputLabel text="Received By" />
                  <AsyncSearchSelect
                    name="receivedById"
                    value={form.receivedById}
                    onChange={(e) => updateForm("receivedById", e.target.value)}
                    options={options.employees}
                    onAsyncSearch={handleAsyncEmployeeSearch}
                    placeholder="Select"
                  />
                </Box>

                <Box sx={{ bgcolor: "action.hover", border: "1px solid", borderColor: "divider", borderRadius: "4px", px: 1, py: 0.75 }}>
                  <Box sx={{ color: "text.secondary" }}>Total Qty</Box>
                  <Box sx={{ fontWeight: 600, color: "text.primary" }}>{Number(itemTotals.totalQty).toFixed(3)}</Box>
                </Box>

                <Box sx={{ bgcolor: "action.hover", border: "1px solid", borderColor: "divider", borderRadius: "4px", px: 1, py: 0.75 }}>
                  <Box sx={{ color: "text.secondary" }}>Total Amt</Box>
                  <Box sx={{ fontWeight: 600, color: "text.primary" }}>{formatMoney(itemTotals.totalAmount)}</Box>
                </Box>

                <Box sx={{ bgcolor: "action.hover", border: "1px solid", borderColor: "divider", borderRadius: "4px", px: 1, py: 0.75 }}>
                  <Box sx={{ color: "text.secondary" }}>Paid</Box>
                  <Box sx={{ fontWeight: 600, color: "success.main" }}>{formatMoney(paidAmount)}</Box>
                </Box>

                <Box sx={{ bgcolor: "action.hover", border: "1px solid", borderColor: "divider", borderRadius: "4px", px: 1, py: 0.75 }}>
                  <Box sx={{ color: "text.secondary" }}>Balance</Box>
                  <Box sx={{ fontWeight: 600, color: balanceAmount <= 0 ? "primary.main" : "error.main" }}>
                    {formatMoney(balanceAmount)}
                  </Box>
                </Box>

                <Box>
                  <InputLabel text={`Date (${form.orderDate || "-"})`} />
                  <TextField
                    type="datetime-local"
                    size="small"
                    fullWidth
                    sx={compactFieldSx}
                    value={paymentDraft.date}
                    onChange={(e) => setPaymentDraft((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </Box>

                <Box>
                  <InputLabel text="Payment Mode" />
                  <SearchableSelect
                    name="paymentMode"
                    value={paymentDraft.paymentMode}
                    onChange={(e) => setPaymentDraft((prev) => ({ ...prev, paymentMode: e.target.value }))}
                    options={paymentModeOptions}
                    placeholder="Select"
                  />
                </Box>

                <Box>
                  <InputLabel text="Bank" />
                  <SearchableSelect
                    name="bankId"
                    value={paymentDraft.bankId}
                    onChange={(e) => setPaymentDraft((prev) => ({ ...prev, bankId: e.target.value }))}
                    options={options.banks}
                    placeholder="Select"
                  />
                </Box>

                <Box>
                  <InputLabel text="Bank Date" />
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    sx={compactFieldSx}
                    value={paymentDraft.bankDate}
                    onChange={(e) => setPaymentDraft((prev) => ({ ...prev, bankDate: e.target.value }))}
                  />
                </Box>

                <Box>
                  <InputLabel text="Amount" required />
                  <TextField
                    type="number"
                    size="small"
                    fullWidth
                    sx={compactFieldSx}
                    value={paymentDraft.amount}
                    onChange={(e) => setPaymentDraft((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </Box>

                <Box>
                  <InputLabel text="Remarks" />
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <TextField
                      type="text"
                      size="small"
                      fullWidth
                      sx={compactFieldSx}
                      value={paymentDraft.remarks}
                      onChange={(e) => setPaymentDraft((prev) => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Remarks"
                    />
                    <IconButton
                      size="small"
                      onClick={addPayment}
                      title="Add payment"
                      sx={{ border: "1px solid", borderColor: "divider", borderRadius: "4px", color: "success.main" }}
                    >
                      <PlusCircle size={16} />
                    </IconButton>
                  </Stack>
                </Box>
              </Box>

              <Box sx={{ mt: 1, border: "1px solid", borderColor: "divider", borderRadius: "4px", overflow: "auto", flex: 1, minHeight: 0 }}>
                <Table size="small" sx={{ width: "100%", minWidth: 700, "& th, & td": { fontSize: 12.25 } }}>
                  <TableHead sx={{ bgcolor: "action.hover", position: "sticky", top: 0 }}>
                    <TableRow>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Date</TableCell>
                      <TableCell align="right" sx={{ px: 1, py: 0.75 }}>Amount</TableCell>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Cashier</TableCell>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Mode</TableCell>
                      <TableCell align="center" sx={{ px: 1, py: 0.75 }}>Print</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ px: 1, py: 1, color: "text.secondary" }}>No payment entries</TableCell>
                      </TableRow>
                    ) : (
                      payments.map((row) => (
                        <TableRow key={row.id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.date || "--"}</TableCell>
                          <TableCell align="right" sx={{ px: 1, py: 0.75 }}>{formatMoney(row.amount)}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.cashier || "--"}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.paymentMode || "--"}</TableCell>
                          <TableCell align="center" sx={{ px: 1, py: 0.75 }}>
                            <IconButton
                              size="small"
                              onClick={() => removePayment(row.id)}
                              title="Delete"
                              sx={{ color: "error.main", mr: 0.5 }}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                            <Button
                              type="button"
                              onClick={() => printPaymentSlip(row)}
                              className="glass-btn glass-btn-primary"
                              title="Print"
                              sx={{ minWidth: "auto", p: 0.5 }}
                            >
                              <Printer size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>

              <Box sx={{ mt: 1 }}>
                <InputLabel text="Order Remarks" />
                <TextField
                  type="text"
                  size="small"
                  fullWidth
                  sx={compactFieldSx}
                  value={form.remarks}
                  onChange={(e) => updateForm("remarks", e.target.value)}
                  placeholder="Additional remarks"
                />
              </Box>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {customerDialog.open && (
        <Box sx={{ position: "fixed", inset: 0, zIndex: 120, bgcolor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
          <Box sx={{ width: "100%", maxWidth: 896, bgcolor: "background.paper", borderRadius: "5.25px", boxShadow: 8, border: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1 }}>
              <Typography component="h3" sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>Search / Select Customer</Typography>
              <Button type="button" onClick={closeCustomerDialog} className="glass-btn glass-btn-secondary">
                <X size={16} />
              </Button>
            </Stack>

            <Stack spacing={1.5} sx={{ p: 2 }}>
              <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { md: "repeat(4, 1fr)" }, alignItems: "end" }}>
                <Box>
                  <InputLabel text="Name" />
                  <TextField
                    type="text"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }}
                    value={customerDialog.name}
                    onChange={(e) => setCustomerDialog((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </Box>
                <Box>
                  <InputLabel text="Contact No" />
                  <TextField
                    type="text"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }}
                    value={customerDialog.contactNo}
                    onChange={(e) => setCustomerDialog((prev) => ({ ...prev, contactNo: e.target.value }))}
                  />
                </Box>
                <Box>
                  <InputLabel text="Area" />
                  <TextField
                    type="text"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }}
                    value={customerDialog.area}
                    onChange={(e) => setCustomerDialog((prev) => ({ ...prev, area: e.target.value }))}
                  />
                </Box>
                <Box>
                  <Button
                    type="button"
                    onClick={searchCustomers}
                    className="glass-btn glass-btn-primary"
                    fullWidth
                    disabled={customerDialog.loading}
                  >
                    {customerDialog.loading ? "Searching..." : "Search"}
                  </Button>
                </Box>
              </Box>

              <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "4px", maxHeight: 288, overflow: "auto" }}>
                <Table size="small" sx={{ width: "100%", "& th, & td": { fontSize: 12.25 } }}>
                  <TableHead sx={{ bgcolor: "action.hover", position: "sticky", top: 0 }}>
                    <TableRow>
                      <TableCell sx={{ px: 1, py: 0.75, width: 40 }} />
                      <TableCell sx={{ px: 1, py: 0.75 }}>Name</TableCell>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Area</TableCell>
                      <TableCell sx={{ px: 1, py: 0.75 }}>Mobile</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerDialog.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ px: 1, py: 1.5, color: "text.secondary" }}>No matched customers</TableCell>
                      </TableRow>
                    ) : (
                      customerDialog.rows.map((row) => (
                        <TableRow key={row.id} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                          <TableCell align="center" sx={{ px: 1, py: 0.75 }}>
                            <Checkbox
                              size="small"
                              checked={String(customerDialog.selectedId) === String(row.id)}
                              onChange={() =>
                                setCustomerDialog((prev) => ({
                                  ...prev,
                                  selectedId: String(prev.selectedId) === String(row.id) ? "" : String(row.id),
                                }))
                              }
                              sx={{ p: 0 }}
                            />
                          </TableCell>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.name || "--"}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.area || "--"}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.75 }}>{row.mobile || "--"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", px: 2, py: 1.5, borderTop: 1, borderColor: "divider" }}>
              <Button
                type="button"
                onClick={createCustomerFromDialog}
                className="glass-btn glass-btn-success"
              >
                Create
              </Button>
              <Button
                type="button"
                onClick={selectCustomerFromDialog}
                className="glass-btn glass-btn-primary"
              >
                Select
              </Button>
            </Stack>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CrmCustomerOrderForm;
