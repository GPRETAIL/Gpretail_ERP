import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Search, Save, Plus, Printer, X, Pencil, Check } from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import SearchableSelect from "../../components/SearchableSelect";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import PageSkeleton from "../../components/PageSkeleton";
import { usePrintContext } from "../../context/PrintContext";
import { getMasterLookups } from "../../utils/lookupCache";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, Checkbox, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

const invoiceFieldLabelSx = { width: 112, flexShrink: 0, fontSize: 10.5, fontWeight: 500, color: "text.secondary" };
const invoiceControlSx = { "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5 } };

const TYPE_OPTIONS = [
  { label: "Charge Type", disabled: true },
  { divider: true },
  { label: "Base Amount", value: "Amount" },

  { label: "Taxes", disabled: true },
  { divider: true },
  { label: "Tax", value: "Tax" },
  { label: "Cess", value: "Cess" },
  { label: "TCS", value: "TCS" },

  { label: "Discounts", disabled: true },
  { divider: true },
  { label: "Discount", value: "Discount" },
  { label: "Discount on Discount", value: "OnDiscount" },
  { label: "Agent Discount", value: "Agnt Discount" },
  { label: "Agent Commission", value: "Agnt Comm" },

  { label: "Charges", disabled: true },
  { divider: true },
  { label: "Service Charge", value: "Service" },
  { label: "Courier Charge", value: "Courier" },
  { label: "Packing Charge", value: "Packing" },
  { label: "Freight Charge", value: "Fright" },
  { label: "Insurance", value: "Insurance" },

  { label: "Other", disabled: true },
  { divider: true },
  { label: "Rounding Adjustment", value: "Rounding" },
  { label: "Job Work Charge", value: "Job Work" },
];

const InvoiceEntry = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { printHtml } = usePrintContext();
  const [searchParams] = useSearchParams();
  const transportData = location.state || {};
  const fromTransportEntry = transportData.fromTransportEntry === true;
  const normalizeInvoiceId = (value) => {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (!raw || raw === "null" || raw === "undefined") return null;
    return raw;
  };
  const transportEntryIdFromQuery = normalizeInvoiceId(searchParams.get("transport_entry_id"));
  const initialTransportEntryId = normalizeInvoiceId(
    transportData.transportEntryId ?? transportEntryIdFromQuery
  );

  const pageMode = transportData.mode || searchParams.get("mode") || null; // "view" or "edit"
  const isViewMode = pageMode === "view";
  const selectedInvoiceId = normalizeInvoiceId(
    transportData.invoiceId ?? searchParams.get("invoice_id")
  );

  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const showToast = (type, message) => setToast({ open: true, type, message });

  // Refs for auto-focus after dropdown selection
  const supplierRef = useRef(null);
  const entryDateRef = useRef(null);

  const [taxes, setTaxes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // /lookups only preloads the first 100 of each (suppliers/taxes commonly hold 100k+ rows in this
  // deployment) -- these hit each resource's own ?search= endpoint so the dropdown can find
  // anything beyond that initial batch.
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
      return results;
    } catch {
      return [];
    }
  }, []);

  const handleAsyncTaxSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/taxes", { params: { search: query, limit: 50 } });
      // Pre-formatted to the same "Name X%" label the preloaded list below already uses -- raw
      // API objects here would show without the rate suffix, an inconsistency depending on
      // whether a tax came from the initial preload or a search.
      const results = (Array.isArray(res.data?.data) ? res.data.data : []).map((t) => ({
        id: t.id,
        name: `${t.name} ${t.tax_percentage ?? t.rate ?? 0}%`,
      }));
      if (results.length) {
        setTaxes((prev) => {
          const existingIds = new Set((prev || []).map((t) => String(t.id)));
          const newItems = results.filter((t) => !existingIds.has(String(t.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results;
    } catch {
      return [];
    }
  }, []);

  const buildLrDisplay = (lrEntryNo, lrNo) => {
    const left = lrEntryNo === null || lrEntryNo === undefined || String(lrEntryNo).trim() === ""
      ? ""
      : String(lrEntryNo).trim();
    const right = lrNo === null || lrNo === undefined || String(lrNo).trim() === ""
      ? ""
      : String(lrNo).trim();
    if (left && right) return `${left} / ${right}`;
    return left || right || "";
  };

  const lrDisplay = fromTransportEntry
    ? buildLrDisplay(transportData.lrEntryNo, transportData.lrNo)
    : "";

  const pickFirstId = (...values) => {
    for (const value of values) {
      if (value === null || value === undefined) continue;
      const normalized = String(value).trim();
      if (normalized !== "") return normalized;
    }
    return "";
  };

  const getNameById = (rows, id) =>
    rows.find((row) => String(row.id) === String(id))?.name || "";

  const mapApiInvoiceToLocal = useCallback(
    (inv) => ({
      id: inv.id,
      companyId: String(inv.company_id ?? inv.company?.id ?? ""),
      company: String(inv.company_id ?? inv.company?.id ?? ""),
      companyName: inv.company?.name || "",
      supplierId: String(inv.supplier_id ?? inv.supplier?.id ?? ""),
      supplier: String(inv.supplier_id ?? inv.supplier?.id ?? ""),
      supplierName: inv.supplier?.name || "",
      entryDate: inv.entry_date || "",
      invoiceDate: inv.invoice_date || "",
      interstate: inv.interstate || false,
      creditNote: inv.credit_note || false,
      invoiceNo: inv.invoice_no || "",
      lrNo: buildLrDisplay(inv.lr_entry_no, inv.lr_no) || lrDisplay,
      lrExpense: inv.lr_expense || "",
      transportEntryId: inv.transport_entry_id || null,
      items: (inv.items || []).map((item) => ({
        type: item.type || "Amount",
        amountOn: Number(item.amount_on) || 0,
        disPerc: Number(item.dis_perc) || 0,
        discount: Number(item.discount) || 0,
        taxId: item.tax_id ? String(item.tax_id) : "",
        taxPerc: Number(item.tax_perc ?? item.tax?.tax_percentage) || 0,
        taxLabel: item.tax?.name || "",
        taxValue: Number(item.tax_value) || 0,
        netAmount: Number(item.net_amount) || 0,
      })),
      billInfo: {
        billValue: Number(inv.bill_value) || 0,
        expensePerc: Number(inv.expense_perc) || 0,
        expenseAmt: Number(inv.expense_amt) || 0,
        pieces: Number(inv.pieces) || 0,
        bundles: Number(inv.bundles) || 0,
      },
      checkboxes: {
        taxIncluded: inv.tax_included || false,
        discountOnTotal: inv.discount_on_total || false,
        tds: inv.tds || false,
        internalVendor: inv.internal_vendor || false,
        rcm: inv.rcm || false,
        agentCommission: inv.agent_commission || false,
      },
      totals: {
        baseAmount: Number(inv.base_amount) || 0,
        discount: Number(inv.discount) || 0,
        pcsDiscount: Number(inv.pcs_discount) || 0,
        taxCharges: Number(inv.tax_charges) || 0,
        grossAmount: Number(inv.gross_amount) || 0,
        rounding: Number(inv.rounding) || 0,
        netAmount: Number(inv.net_amount) || 0,
      },
      poType: inv.po_type || "",
      poNo: inv.po_no || "",
    }),
    [lrDisplay]
  );

  // Main form
  const [formData, setFormData] = useState({
    company: fromTransportEntry ? pickFirstId(transportData.companyId) : "",
    companyName: fromTransportEntry ? transportData.companyName || "" : "",
    supplier: fromTransportEntry ? pickFirstId(transportData.supplierId) : "",
    supplierName: fromTransportEntry ? transportData.supplierName || "" : "",
    entryDate: new Date().toISOString().substring(0, 10),
    invoiceDate: new Date().toISOString().substring(0, 10),
    interstate: false,
    creditNote: false,
    invoiceNo: "",
    lrNo: lrDisplay,
    lrExpense: "",
    transportEntryId: initialTransportEntryId || null,
  });

  // Item entry row
  const [currentItem, setCurrentItem] = useState({
    type: "Amount",
    amountOn: "",
    disPerc: "",
    discount: 0,
    taxId: "",
    taxPerc: 0,
    taxLabel: "",
    taxValue: 0,
    netAmount: 0,
  });

  // Items added for current invoice
  const [items, setItems] = useState([]);

  // Bill info
  const [billInfo, setBillInfo] = useState({
    billValue: 0,
    expensePerc: 0,
    expenseAmt: 0,
    pieces: fromTransportEntry ? transportData.pieces || 0 : 0,
    bundles: fromTransportEntry ? transportData.bundles || 0 : 0,
  });

  // LR Expense inline edit
  const [lrExpenseEditing, setLrExpenseEditing] = useState(false);
  const [lrExpenseDraft, setLrExpenseDraft] = useState("");

  const [checkboxes, setCheckboxes] = useState({
    taxIncluded: false,
    discountOnTotal: false,
    tds: false,
    internalVendor: false,
    rcm: false,
    agentCommission: false,
  });

  // Right side totals
  const [totals, setTotals] = useState({
    baseAmount: 0,
    discount: 0,
    pcsDiscount: 0,
    taxCharges: 0,
    grossAmount: 0,
    rounding: 0,
    netAmount: 0,
  });

  // Inverse Calculation
  const [inverseCalc, setInverseCalc] = useState({
    taxId: "",
    taxPerc: 0,
    taxLabel: "",
    taxValue: "",
    billValue: 0,
    discPerc: "",
    discountValue: 0,
  });

  // PO fields
  const [poType, setPoType] = useState("");
  const [poNo, setPoNo] = useState("");

  // Saved invoices list (added via Add Invoice)
  const [invoices, setInvoices] = useState([]);
  const [editingInvoiceIndex, setEditingInvoiceIndex] = useState(null);
  const hasLinkedTransportEntry = Boolean(formData.transportEntryId || initialTransportEntryId);

  const loadInvoiceIntoEditor = useCallback((invoiceRecord) => {
    if (!invoiceRecord || typeof invoiceRecord !== "object") return;

    const normalizedInvoice = {
      ...invoiceRecord,
      items: Array.isArray(invoiceRecord.items) ? invoiceRecord.items : [],
      billInfo: {
        billValue: Number(invoiceRecord.billInfo?.billValue) || 0,
        expensePerc: Number(invoiceRecord.billInfo?.expensePerc) || 0,
        expenseAmt: Number(invoiceRecord.billInfo?.expenseAmt) || 0,
        pieces: Number(invoiceRecord.billInfo?.pieces) || 0,
        bundles: Number(invoiceRecord.billInfo?.bundles) || 0,
      },
      checkboxes: {
        taxIncluded: Boolean(invoiceRecord.checkboxes?.taxIncluded),
        discountOnTotal: Boolean(invoiceRecord.checkboxes?.discountOnTotal),
        tds: Boolean(invoiceRecord.checkboxes?.tds),
        internalVendor: Boolean(invoiceRecord.checkboxes?.internalVendor),
        rcm: Boolean(invoiceRecord.checkboxes?.rcm),
        agentCommission: Boolean(invoiceRecord.checkboxes?.agentCommission),
      },
      totals: {
        baseAmount: Number(invoiceRecord.totals?.baseAmount) || 0,
        discount: Number(invoiceRecord.totals?.discount) || 0,
        pcsDiscount: Number(invoiceRecord.totals?.pcsDiscount) || 0,
        taxCharges: Number(invoiceRecord.totals?.taxCharges) || 0,
        grossAmount: Number(invoiceRecord.totals?.grossAmount) || 0,
        rounding: Number(invoiceRecord.totals?.rounding) || 0,
        netAmount: Number(invoiceRecord.totals?.netAmount) || 0,
      },
    };

    setInvoices([normalizedInvoice]);
    setEditingInvoiceIndex(0);
    setFormData((prev) => ({
      ...prev,
      company: pickFirstId(normalizedInvoice.companyId, prev.company),
      companyName: normalizedInvoice.companyName || prev.companyName,
      supplier: pickFirstId(normalizedInvoice.supplierId, prev.supplier),
      supplierName: normalizedInvoice.supplierName || prev.supplierName,
      entryDate: normalizedInvoice.entryDate || prev.entryDate,
      invoiceDate: normalizedInvoice.invoiceDate || prev.invoiceDate,
      interstate: Boolean(normalizedInvoice.interstate),
      creditNote: Boolean(normalizedInvoice.creditNote),
      invoiceNo: normalizedInvoice.invoiceNo || "",
      lrNo: normalizedInvoice.lrNo || prev.lrNo,
      lrExpense: normalizedInvoice.lrExpense || "",
      transportEntryId: normalizedInvoice.transportEntryId || prev.transportEntryId || null,
    }));
    setItems(normalizedInvoice.items);
    setBillInfo(normalizedInvoice.billInfo);
    setCheckboxes(normalizedInvoice.checkboxes);
    setTotals(normalizedInvoice.totals);
    setPoType(normalizedInvoice.poType || "");
    setPoNo(normalizedInvoice.poNo || "");
  }, []);

  // Fetch taxes, companies, suppliers on mount via cached consolidated lookups
  useEffect(() => {
    const load = async () => {
      try {
        const lookups = await getMasterLookups("invoice_entry");
        setTaxes(lookups.taxes || []);
        setCompanies(lookups.companies || []);
        setSuppliers(lookups.suppliers || []);
      } catch (err) {
        console.error("Failed to load dropdown data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Recover transport-linked context from either navigation state or URL query.
  useEffect(() => {
    if (initialTransportEntryId && !selectedInvoiceId) {
      api.get(`/transport-entries/${initialTransportEntryId}`)
        .then((res) => {
          const te = res.data.data;
          if (te) {
            setBillInfo((prev) => ({
              ...prev,
              pieces: te.no_of_pieces || 0,
              bundles: te.no_of_bundles || 0,
            }));
            // Recover IDs when navigation state does not include them (e.g. dashboard list payload).
            setFormData((prev) => ({
              ...prev,
              transportEntryId: prev.transportEntryId || String(te.id),
              company: pickFirstId(prev.company, te.company_id),
              supplier: pickFirstId(prev.supplier, te.supplier_id),
              companyName: prev.companyName || te.company?.name || "",
              supplierName: prev.supplierName || te.supplier?.name || "",
              lrNo: prev.lrNo || buildLrDisplay(te.lr_entry_no, te.lr_no),
            }));
          }
        })
        .catch(() => {});
    }
  }, [initialTransportEntryId, selectedInvoiceId]);

  // Load one selected invoice when coming from Invoice Search page
  useEffect(() => {
    if (!selectedInvoiceId) return;
    const loadSelectedInvoice = async () => {
      try {
        const res = await api.get(`/invoices/${selectedInvoiceId}`);
        const invoice = res.data?.data;
        if (!invoice) return;
        loadInvoiceIntoEditor(mapApiInvoiceToLocal(invoice));
      } catch (err) {
        console.error("Failed to load selected invoice:", err);
        showToast("error", "Failed to load selected invoice");
      }
    };
    loadSelectedInvoice();
  }, [selectedInvoiceId, mapApiInvoiceToLocal, loadInvoiceIntoEditor]);

  // Load existing invoices when opening from dashboard in view/edit mode
  useEffect(() => {
    if (!pageMode || !initialTransportEntryId || selectedInvoiceId) return;
    const loadInvoices = async () => {
      try {
        const res = await api.get("/invoices", {
          params: { transport_entry_id: initialTransportEntryId, all: "true" },
        });
        const data = res.data.data || res.data || [];
        if (data.length > 0) {
          const mapped = data.map(mapApiInvoiceToLocal);
          setInvoices(mapped);
        }
      } catch (err) {
        console.error("Failed to load existing invoices:", err);
      }
    };
    loadInvoices();
  }, [pageMode, initialTransportEntryId, selectedInvoiceId, mapApiInvoiceToLocal]);

  // Recalculate totals when items change
  const recalcTotals = useCallback((itemsList, pcsDiscount, rounding) => {
    let baseAmount = 0;
    let discountTotal = 0;
    let taxCharges = 0;

    for (const item of itemsList) {
      baseAmount += parseFloat(item.amountOn) || 0;
      discountTotal += parseFloat(item.discount) || 0;
      taxCharges += ((parseFloat(item.amountOn) || 0) - (parseFloat(item.discount) || 0)) * ((parseFloat(item.taxPerc) || 0) / 100);
    }

    const afterDiscount = baseAmount - discountTotal - (parseFloat(pcsDiscount) || 0);
    const grossAmount = afterDiscount + taxCharges;
    const netAmount = grossAmount + (parseFloat(rounding) || 0);

    setTotals({
      baseAmount: Math.round(baseAmount * 100) / 100,
      discount: Math.round(discountTotal * 100) / 100,
      pcsDiscount: parseFloat(pcsDiscount) || 0,
      taxCharges: Math.round(taxCharges * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100,
      rounding: parseFloat(rounding) || 0,
      netAmount: Math.round(netAmount * 100) / 100,
    });
  }, []);

  useEffect(() => {
    recalcTotals(items, totals.pcsDiscount, totals.rounding);
  }, [items]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setCheckboxes((prev) => ({ ...prev, [name]: checked }));
  };

  const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
  const getTaxValue = (item) => {
    const storedTax = parseFloat(item.taxValue);
    if (Number.isFinite(storedTax)) return storedTax;
    const amountOn = parseFloat(item.amountOn) || 0;
    const discount = parseFloat(item.discount) || 0;
    const taxPerc = parseFloat(item.taxPerc) || 0;
    return round2(Math.max(0, amountOn - discount) * (taxPerc / 100));
  };

  const recalcCurrentItemValues = (item, changedField) => {
    const amountOn = parseFloat(item.amountOn) || 0;
    const taxPerc = parseFloat(item.taxPerc) || 0;
    let disPerc = parseFloat(item.disPerc) || 0;
    let discount = parseFloat(item.discount) || 0;

    if (changedField === "discount") {
      discount = Math.max(0, discount);
      if (amountOn > 0) {
        discount = Math.min(discount, amountOn);
        disPerc = (discount / amountOn) * 100;
      } else {
        discount = 0;
        disPerc = 0;
      }
    } else {
      disPerc = Math.max(0, disPerc);
      discount = amountOn * (disPerc / 100);
    }

    discount = round2(discount);
    disPerc = round2(disPerc);

    const afterDiscount = Math.max(0, amountOn - discount);
    const taxAmt = afterDiscount * (taxPerc / 100);

    return {
      ...item,
      disPerc,
      discount,
      taxValue: round2(taxAmt),
      netAmount: round2(afterDiscount + taxAmt),
    };
  };

  // Item entry handlers
  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "taxId") {
        const tax = taxes.find((t) => t.id === parseInt(value));
        if (tax) {
          updated.taxPerc = parseFloat(tax.tax_percentage) || 0;
          updated.taxLabel = `${tax.name} ${tax.tax_percentage}%`;
        } else {
          updated.taxPerc = 0;
          updated.taxLabel = "";
        }
      }

      return recalcCurrentItemValues(updated, name === "discount" ? "discount" : "disPerc");
    });
  };

  const handleAddItem = () => {
    const amountOn = parseFloat(currentItem.amountOn) || 0;
    if (amountOn <= 0) {
      showToast("warning", "Amount must be greater than 0");
      return;
    }
    setItems((prev) => [...prev, { ...currentItem, id: Date.now() }]);
    setCurrentItem({
      type: "Amount", amountOn: "", disPerc: "", discount: 0,
      taxId: "", taxPerc: 0, taxLabel: "", taxValue: 0, netAmount: 0,
    });
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Invoice — validates and adds to the invoices summary table
  const handleAddInvoice = () => {
    const resolvedCompanyId = pickFirstId(formData.company, transportData.companyId);
    const resolvedSupplierId = pickFirstId(formData.supplier, transportData.supplierId);
    const editingInvoice = editingInvoiceIndex !== null ? invoices[editingInvoiceIndex] : null;
    const resolvedTransportEntryId = pickFirstId(
      editingInvoice?.transportEntryId,
      formData.transportEntryId,
      initialTransportEntryId
    );

    if (!resolvedTransportEntryId) {
      showToast(
        "error",
        "Transport Entry is required. Open this page from Warehouse Dashboard or with a transport_entry_id."
      );
      return;
    }

    // Validate required fields
    if (!resolvedCompanyId) {
      showToast("error", "Company is required");
      return;
    }
    if (!resolvedSupplierId) {
      showToast("error", "Supplier is required");
      return;
    }
    if (!formData.invoiceNo.trim()) {
      showToast("error", "Invoice No is required");
      return;
    }
    if (!formData.entryDate) {
      showToast("error", "Entry Date is required");
      return;
    }
    if (!formData.invoiceDate) {
      showToast("error", "Invoice Date is required");
      return;
    }
    // Entry date >= Invoice date
    if (formData.entryDate < formData.invoiceDate) {
      showToast("error", "Entry Date must be same or after Invoice Date");
      return;
    }
    if (items.length === 0) {
      showToast("error", "Add at least one item before adding invoice");
      return;
    }
    if ((parseFloat(billInfo.billValue) || 0) <= 0) {
      showToast("error", "Bill Value is required");
      return;
    }

    const invoiceData = {
      id: editingInvoice?.id,
      companyId: resolvedCompanyId,
      companyName:
        formData.companyName ||
        transportData.companyName ||
        getNameById(companies, resolvedCompanyId),
      supplierId: resolvedSupplierId,
      supplierName:
        formData.supplierName ||
        transportData.supplierName ||
        getNameById(suppliers, resolvedSupplierId),
      invoiceNo: formData.invoiceNo,
      entryDate: formData.entryDate,
      invoiceDate: formData.invoiceDate,
      lrExpense: formData.lrExpense,
      interstate: formData.interstate,
      creditNote: formData.creditNote,
      transportEntryId: resolvedTransportEntryId,
      items: [...items],
      billInfo: { ...billInfo },
      checkboxes: { ...checkboxes },
      totals: { ...totals },
      poType,
      poNo,
    };

    if (editingInvoiceIndex !== null) {
      setInvoices((prev) => prev.map((inv, i) => (i === editingInvoiceIndex ? invoiceData : inv)));
      setEditingInvoiceIndex(null);
      showToast("success", "Invoice updated");
    } else {
      setInvoices((prev) => [...prev, invoiceData]);
      showToast("success", "Invoice added to list");
    }

    // Reset item-level form
    setItems([]);
    setFormData((prev) => ({ ...prev, invoiceNo: "", lrExpense: "" }));
    setTotals({ baseAmount: 0, discount: 0, pcsDiscount: 0, taxCharges: 0, grossAmount: 0, rounding: 0, netAmount: 0 });
    setBillInfo((prev) => ({ ...prev, billValue: 0, expensePerc: 0, expenseAmt: 0 }));
    setPoType("");
    setPoNo("");
  };

  const handleEditInvoice = (index) => {
    const inv = invoices[index];
    if (!inv) return;
    setFormData((prev) => ({
      ...prev,
      company: pickFirstId(inv.companyId, prev.company),
      companyName: inv.companyName || prev.companyName,
      supplier: pickFirstId(inv.supplierId, prev.supplier),
      supplierName: inv.supplierName || prev.supplierName,
      invoiceNo: inv.invoiceNo,
      entryDate: inv.entryDate,
      invoiceDate: inv.invoiceDate,
      lrNo: inv.lrNo || prev.lrNo,
      lrExpense: inv.lrExpense,
      interstate: inv.interstate,
      creditNote: inv.creditNote,
      transportEntryId: inv.transportEntryId || prev.transportEntryId || null,
    }));
    setItems(Array.isArray(inv.items) ? inv.items : []);
    setBillInfo(inv.billInfo || {
      billValue: 0,
      expensePerc: 0,
      expenseAmt: 0,
      pieces: 0,
      bundles: 0,
    });
    setCheckboxes(inv.checkboxes || {
      taxIncluded: false,
      discountOnTotal: false,
      tds: false,
      internalVendor: false,
      rcm: false,
      agentCommission: false,
    });
    setTotals(inv.totals || {
      baseAmount: 0,
      discount: 0,
      pcsDiscount: 0,
      taxCharges: 0,
      grossAmount: 0,
      rounding: 0,
      netAmount: 0,
    });
    setPoType(inv.poType || "");
    setPoNo(inv.poNo || "");
    setEditingInvoiceIndex(index);
  };

  const handleRemoveInvoice = (index) => {
    setInvoices((prev) => prev.filter((_, i) => i !== index));
  };

  // Save all invoices to backend
  const handleSave = async () => {
    if (invoices.length === 0) {
      showToast("warning", "No invoices to save. Add at least one invoice first.");
      return;
    }

    try {
      for (const inv of invoices) {
        const payloadCompanyId = pickFirstId(
          inv.companyId,
          inv.company,
          formData.company,
          transportData.companyId
        );
        const payloadSupplierId = pickFirstId(
          inv.supplierId,
          inv.supplier,
          formData.supplier,
          transportData.supplierId
        );

        if (!payloadCompanyId || !payloadSupplierId) {
          showToast(
            "error",
            `Missing company/supplier for invoice "${inv.invoiceNo || "-"}". Please edit and add again.`
          );
          return false;
        }

        const payloadTransportEntryId = pickFirstId(
          inv.transportEntryId,
          formData.transportEntryId,
          initialTransportEntryId
        );

        if (!payloadTransportEntryId) {
          showToast(
            "error",
            `Missing transport entry for invoice "${inv.invoiceNo || "-"}". Open this page from Warehouse Dashboard or with a transport_entry_id.`
          );
          return false;
        }

        const payload = {
          transportEntryId: payloadTransportEntryId,
          companyId: payloadCompanyId,
          companyName:
            inv.companyName
            || formData.companyName
            || transportData.companyName
            || getNameById(companies, payloadCompanyId)
            || "",
          supplierId: payloadSupplierId,
          supplierName:
            inv.supplierName
            || formData.supplierName
            || transportData.supplierName
            || getNameById(suppliers, payloadSupplierId)
            || "",
          invoiceNo: inv.invoiceNo,
          entryDate: inv.entryDate,
          invoiceDate: inv.invoiceDate,
          lrEntryNo: transportData.lrEntryNo || null,
          lrNo: transportData.lrNo || null,
          lrExpense: inv.lrExpense || 0,
          interstate: inv.interstate,
          creditNote: inv.creditNote,
          billValue: inv.billInfo.billValue || 0,
          expensePerc: inv.billInfo.expensePerc || 0,
          expenseAmt: inv.billInfo.expenseAmt || 0,
          pieces: inv.billInfo.pieces || 0,
          bundles: inv.billInfo.bundles || 0,
          taxIncluded: inv.checkboxes.taxIncluded,
          discountOnTotal: inv.checkboxes.discountOnTotal,
          tds: inv.checkboxes.tds,
          internalVendor: inv.checkboxes.internalVendor,
          rcm: inv.checkboxes.rcm,
          agentCommission: inv.checkboxes.agentCommission,
          baseAmount: inv.totals.baseAmount,
          discount: inv.totals.discount,
          pcsDiscount: inv.totals.pcsDiscount,
          taxCharges: inv.totals.taxCharges,
          grossAmount: inv.totals.grossAmount,
          rounding: inv.totals.rounding,
          netAmount: inv.totals.netAmount,
          poType: inv.poType || null,
          poNo: inv.poNo || null,
          items: inv.items.map((item) => ({
            type: item.type,
            amountOn: item.amountOn,
            disPerc: item.disPerc,
            discount: item.discount,
            taxId: item.taxId || null,
            taxPerc: item.taxPerc,
            netAmount: item.netAmount,
          })),
        };

        if (inv.id) {
          await api.put(`/invoices/${inv.id}`, payload);
        } else {
          await api.post("/invoices", payload);
        }
      }
      showToast("success", "All invoices saved successfully!");
      return true;
    } catch (err) {
      console.error("Save failed:", err);
      showToast("error", err.response?.data?.message || "Failed to save invoices");
      return false;
    }
  };

  const handleSaveAndNext = async () => {
    const ok = await handleSave();
    if (ok) {
      const nextTransportEntryId = pickFirstId(formData.transportEntryId, initialTransportEntryId);
      navigate(`/warehouse/inventory-entry?transport_entry_id=${nextTransportEntryId}`);
    }
  };

  const handleClear = () => {
    const resolvedCompanyId = pickFirstId(formData.company, transportData.companyId);
    const resolvedSupplierId = pickFirstId(formData.supplier, transportData.supplierId);

    setFormData({
      company: hasLinkedTransportEntry ? resolvedCompanyId : "",
      companyName: hasLinkedTransportEntry
        ? (formData.companyName || transportData.companyName || getNameById(companies, resolvedCompanyId))
        : "",
      supplier: hasLinkedTransportEntry ? resolvedSupplierId : "",
      supplierName: hasLinkedTransportEntry
        ? (formData.supplierName || transportData.supplierName || getNameById(suppliers, resolvedSupplierId))
        : "",
      entryDate: new Date().toISOString().substring(0, 10),
      invoiceDate: new Date().toISOString().substring(0, 10),
      interstate: false,
      creditNote: false,
      invoiceNo: "",
      lrNo: hasLinkedTransportEntry ? (formData.lrNo || lrDisplay) : "",
      lrExpense: "",
      transportEntryId: initialTransportEntryId || null,
    });
    setCurrentItem({
      type: "Amount",
      amountOn: "",
      disPerc: "",
      discount: 0,
      taxId: "",
      taxPerc: 0,
      taxLabel: "",
      taxValue: 0,
      netAmount: 0,
    });
    setItems([]);
    setBillInfo({
      billValue: 0,
      expensePerc: 0,
      expenseAmt: 0,
      pieces: hasLinkedTransportEntry ? billInfo.pieces || transportData.pieces || 0 : 0,
      bundles: hasLinkedTransportEntry ? billInfo.bundles || transportData.bundles || 0 : 0,
    });
    setCheckboxes({
      taxIncluded: false,
      discountOnTotal: false,
      tds: false,
      internalVendor: false,
      rcm: false,
      agentCommission: false,
    });
    setTotals({ baseAmount: 0, discount: 0, pcsDiscount: 0, taxCharges: 0, grossAmount: 0, rounding: 0, netAmount: 0 });
    setInverseCalc({
      taxId: "",
      taxPerc: 0,
      taxLabel: "",
      taxValue: "",
      billValue: 0,
      discPerc: "",
      discountValue: 0,
    });
    setPoType("");
    setPoNo("");
    setEditingInvoiceIndex(null);
  };

  const handlePcsDiscountChange = (val) => {
    const v = parseFloat(val) || 0;
    recalcTotals(items, v, totals.rounding);
  };

  const handleRoundingChange = (val) => {
    const v = parseFloat(val) || 0;
    recalcTotals(items, totals.pcsDiscount, v);
  };

  // Inverse Calculation handlers
  const handleInverseCalcChange = (field, value) => {
    setInverseCalc((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "taxId") {
        const tax = taxes.find((t) => t.id === parseInt(value));
        if (tax) {
          updated.taxPerc = parseFloat(tax.tax_percentage) || 0;
          updated.taxLabel = `${tax.name} ${tax.tax_percentage}%`;
        } else {
          updated.taxPerc = 0;
          updated.taxLabel = "";
        }
      }

      // Recalculate bill value: taxValue * 100 / taxPerc
      const taxVal = parseFloat(updated.taxValue) || 0;
      const taxPerc = parseFloat(updated.taxPerc) || 0;
      updated.billValue = taxPerc > 0 ? round2((taxVal * 100) / taxPerc) : 0;

      // Recalculate discount value: billValue * discPerc / (100 - discPerc)
      const discPerc = parseFloat(updated.discPerc) || 0;
      updated.discountValue = discPerc > 0 && discPerc < 100
        ? round2((updated.billValue * discPerc) / (100 - discPerc))
        : 0;

      return updated;
    });
  };

  const handleInverseAdd = () => {
    if (!inverseCalc.taxId) {
      showToast("warning", "Select a tax for inverse calculation");
      return;
    }
    const taxVal = parseFloat(inverseCalc.taxValue) || 0;
    if (taxVal <= 0) {
      showToast("warning", "Tax value must be greater than 0");
      return;
    }

    const billValue = inverseCalc.billValue;
    const discPerc = parseFloat(inverseCalc.discPerc) || 0;
    const discount = inverseCalc.discountValue;
    const amountOn = round2(billValue);
    const afterDiscount = Math.max(0, amountOn - discount);
    const taxAmt = round2(afterDiscount * (inverseCalc.taxPerc / 100));

    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "Amount",
        amountOn,
        disPerc: discPerc,
        discount: discount,
        taxId: inverseCalc.taxId,
        taxPerc: inverseCalc.taxPerc,
        taxLabel: inverseCalc.taxLabel,
        taxValue: taxAmt,
        netAmount: round2(afterDiscount + taxAmt),
      },
    ]);

    setInverseCalc({
      taxId: "",
      taxPerc: 0,
      taxLabel: "",
      taxValue: "",
      billValue: 0,
      discPerc: "",
      discountValue: 0,
    });
  };

  // Auto-focus handlers for company/supplier selection
  const handleCompanySelect = (e) => {
    handleFormChange(e);
    setTimeout(() => {
      const trigger = supplierRef.current?.querySelector("[data-searchable-select-trigger]");
      if (trigger) trigger.focus();
    }, 50);
  };

  const handleSupplierSelect = (e) => {
    handleFormChange(e);
    setTimeout(() => {
      if (entryDateRef.current) {
        entryDateRef.current.focus();
        if (
          entryDateRef.current instanceof HTMLInputElement &&
          ["date", "datetime-local", "month", "time", "week"].includes(entryDateRef.current.type)
        ) {
          try {
            if (typeof entryDateRef.current.showPicker === "function") entryDateRef.current.showPicker();
            else entryDateRef.current.click();
          } catch {
            // ignore browser-level picker restrictions
          }
        }
      }
    }, 50);
  };

  const getInvoiceForPrint = () => {
    if (invoices.length > 0) {
      if (editingInvoiceIndex !== null && invoices[editingInvoiceIndex]) {
        return invoices[editingInvoiceIndex];
      }
      return invoices[0];
    }

    if (items.length === 0) return null;

    return {
      companyId: formData.company || "",
      companyName:
        formData.companyName || getNameById(companies, formData.company) || "",
      supplierId: formData.supplier || "",
      supplierName:
        formData.supplierName || getNameById(suppliers, formData.supplier) || "",
      entryDate: formData.entryDate,
      invoiceDate: formData.invoiceDate,
      invoiceNo: formData.invoiceNo,
      lrNo: formData.lrNo,
      lrExpense: formData.lrExpense,
      items,
      totals,
    };
  };

  const buildInvoicePrintHtml = (inv) => {
    const rowsHtml = (inv.items || [])
      .map((item, idx) => {
        const amountOn = Number(item.amountOn) || 0;
        const discount = Number(item.discount) || 0;
        const taxPerc = Number(item.taxPerc) || 0;
        const taxValue = Number(getTaxValue(item)) || 0;
        const netAmount = Number(item.netAmount) || 0;

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${item.type || "-"}</td>
            <td class="num">${amountOn.toFixed(2)}</td>
            <td class="num">${discount.toFixed(2)}</td>
            <td class="num">${taxPerc.toFixed(2)}%</td>
            <td class="num">${taxValue.toFixed(2)}</td>
            <td class="num">${netAmount.toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    const netAmount = Number(inv.totals?.netAmount) || 0;
    const taxCharges = Number(inv.totals?.taxCharges) || 0;
    const discount = Number(inv.totals?.discount) || 0;

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice ${inv.invoiceNo || ""}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 14px; }
            .head { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
            .meta { margin-bottom: 8px; line-height: 1.45; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background: #f5f5f5; }
            .num { text-align: right; }
            .totals { margin-top: 10px; width: 320px; margin-left: auto; }
            .totals td { border: 1px solid #ddd; padding: 6px; }
            .totals td:first-child { background: #f8f8f8; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="title">Warehouse Invoice</div>
          <div class="meta">
            <div><strong>Company:</strong> ${inv.companyName || "-"}</div>
            <div><strong>Supplier:</strong> ${inv.supplierName || "-"}</div>
            <div><strong>Invoice No:</strong> ${inv.invoiceNo || "-"}</div>
            <div><strong>Invoice Date:</strong> ${inv.invoiceDate || "-"}</div>
            <div><strong>Entry Date:</strong> ${inv.entryDate || "-"}</div>
            <div><strong>LR No:</strong> ${inv.lrNo || "-"}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th class="num">Amount</th>
                <th class="num">Discount</th>
                <th class="num">Tax %</th>
                <th class="num">Tax Value</th>
                <th class="num">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <table class="totals">
            <tbody>
              <tr><td>Discount</td><td class="num">${discount.toFixed(2)}</td></tr>
              <tr><td>Tax Charges</td><td class="num">${taxCharges.toFixed(2)}</td></tr>
              <tr><td>Net Amount</td><td class="num"><strong>${netAmount.toFixed(2)}</strong></td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const handlePrintInvoice = () => {
    const inv = getInvoiceForPrint();
    if (!inv) {
      showToast("warning", "No invoice data available to print");
      return;
    }

    const html = buildInvoicePrintHtml(inv);

    printHtml(html, {
      label: `Invoice-${inv.invoiceNo || "print"}`,
      copies: 1,
      docType: "warehouse_invoice",
      companyId: Number(inv.companyId || formData.company || 0) || undefined,
      receiptData: {
        storeName: inv.companyName || "",
        storeAddress: "",
        storePhone: "",
        billNo: inv.invoiceNo || "",
        cashierName: "",
        dateTime: inv.invoiceDate || new Date().toISOString(),
        items: (inv.items || []).map((it) => ({
          name: it.productName || it.name || "",
          code: it.productCode || it.sku || "",
          qty: Number(it.quantity || it.qty || 0),
          unit: it.unit || "Nos",
          rate: Number(it.rate || it.price || 0),
          amount: Number(it.amount || it.total || 0),
        })),
        subTotal: Number(inv.totals?.netAmount || inv.totals?.subTotal || 0),
        discountAmount: Number(inv.totals?.discountAmount || 0),
        taxPercent: 0,
        taxAmount: Number(inv.totals?.taxAmount || 0),
        total: Number(inv.totals?.grandTotal || inv.totals?.total || 0),
        paidAmount: 0,
        changeAmount: 0,
        paymentMethod: "",
        footerNote: "",
      },
    });
  };

  if (loading) {
    return <PageSkeleton variant="form" rows={10} />;
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }} className="master-responsive">
      {/* Header Bar */}
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 0.75, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <IconButton onClick={() => navigate("/warehouse")} sx={{ color: "text.secondary" }}>
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 12.25, fontWeight: 600 }}>
            <Button type="button" variant="text" onClick={() => navigate("/warehouse")} sx={{ minWidth: "auto", p: 0, fontSize: 12.25, fontWeight: 600 }}>
              Warehouse
            </Button>
            <Box component="span" sx={{ color: "text.secondary" }}>/</Box>
            <Box component="span" sx={{ color: "text.primary" }}>
              Invoice{isViewMode ? " (View)" : pageMode === "edit" ? " (Edit)" : ""}
            </Box>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button onClick={() => navigate("/warehouse/invoice/search")} className="glass-btn glass-btn-primary" startIcon={<Search className="w-4 h-4" />}>
            Search
          </Button>
          <Button className="glass-btn glass-btn-primary" onClick={handlePrintInvoice} startIcon={<Printer className="w-4 h-4" />}>
            Print
          </Button>
        </Stack>
      </Stack>

      {/* Main Content */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", px: 0.75, pb: 0.5, pt: 0.25 }}>
        <Stack direction={{ xs: "column", xl: "row" }} spacing={0.75} sx={{ height: "100%", xl: { alignItems: "stretch" } }}>
          {/* LEFT SIDE */}
          <Box sx={{ minWidth: 0, flex: 1, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {/* Top Form */}
            <Box sx={{ p: 0.75, flexShrink: 0 }}>
              {!hasLinkedTransportEntry && !selectedInvoiceId && (
                <Box sx={(theme) => ({ mb: 1, borderRadius: "3.5px", border: "1px solid", borderColor: alpha(theme.palette.warning.main, 0.4), bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.1), px: 1.5, py: 1, fontSize: 10.5, color: "warning.main" })}>
                  This invoice must be linked to a transport entry. Open it from Warehouse Dashboard,
                  Transport Receipt, or with a `transport_entry_id` in the URL.
                </Box>
              )}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, columnGap: 1.5, rowGap: 0.75 }}>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <Typography component="label" sx={invoiceFieldLabelSx}>
                    <Box component="span" sx={{ color: "error.main" }}>*</Box> Company
                  </Typography>
                  {hasLinkedTransportEntry ? (
                    <TextField
                      value={formData.companyName}
                      slotProps={{ input: { readOnly: true } }}
                      size="small"
                      fullWidth
                      sx={{ ...invoiceControlSx, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }}
                    />
                  ) : (
                    <SearchableSelect
                      name="company"
                      value={formData.company}
                      onChange={handleCompanySelect}
                      options={companies.map((c) => ({ label: c.name, value: String(c.id) }))}
                      placeholder="Select Company"
                    />
                  )}
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }} ref={supplierRef}>
                  <Typography component="label" sx={invoiceFieldLabelSx}>
                    <Box component="span" sx={{ color: "error.main" }}>*</Box> Supplier
                  </Typography>
                  {hasLinkedTransportEntry ? (
                    <TextField
                      value={formData.supplierName}
                      slotProps={{ input: { readOnly: true } }}
                      size="small"
                      fullWidth
                      sx={{ ...invoiceControlSx, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }}
                    />
                  ) : (
                    <AsyncSearchSelect
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleSupplierSelect}
                      options={suppliers}
                      onAsyncSearch={handleAsyncSupplierSearch}
                      placeholder="Select Supplier"
                      searchPlaceholder="Search supplier..."
                    />
                  )}
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <Typography component="label" sx={invoiceFieldLabelSx}>
                    <Box component="span" sx={{ color: "error.main" }}>*</Box> Entry Date
                  </Typography>
                  <TextField
                    inputRef={entryDateRef}
                    type="date"
                    name="entryDate"
                    value={formData.entryDate}
                    onChange={handleFormChange}
                    size="small"
                    fullWidth
                    sx={invoiceControlSx}
                  />
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <Typography component="label" sx={invoiceFieldLabelSx}>
                    <Box component="span" sx={{ color: "error.main" }}>*</Box> Invoice Date
                  </Typography>
                  <TextField
                    type="date"
                    name="invoiceDate"
                    value={formData.invoiceDate}
                    onChange={handleFormChange}
                    size="small"
                    fullWidth
                    sx={invoiceControlSx}
                  />
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <Typography component="label" sx={invoiceFieldLabelSx}>
                    <Box component="span" sx={{ color: "error.main" }}>*</Box> Invoice No
                  </Typography>
                  <TextField
                    name="invoiceNo"
                    value={formData.invoiceNo}
                    onChange={handleFormChange}
                    size="small"
                    fullWidth
                    sx={invoiceControlSx}
                  />
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <Typography component="span" sx={invoiceFieldLabelSx}>Flags</Typography>
                  <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", alignItems: "center", fontSize: 10.5 }}>
                    <Stack component="label" direction="row" spacing={0.5} sx={{ alignItems: "center", cursor: "pointer" }}>
                      <Checkbox name="interstate" checked={formData.interstate} onChange={handleFormChange} size="small" sx={{ p: 0 }} />
                      <Box component="span">Interstate</Box>
                    </Stack>
                    <Stack component="label" direction="row" spacing={0.5} sx={{ alignItems: "center", cursor: "pointer" }}>
                      <Checkbox name="creditNote" checked={formData.creditNote} onChange={handleFormChange} size="small" sx={{ p: 0 }} />
                      <Box component="span">Credit Note</Box>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
            </Box>

            {/* Type/Amount/Discount Entry Row */}
            <Box sx={{ borderTop: 1, borderColor: "divider", px: 0.75, py: 0.5, flexShrink: 0 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "flex-end" }}>
                <Box sx={{ width: 144, flexShrink: 0 }}>
                  <Typography sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Type</Typography>
                  <Box sx={{ "& button": { height: 30, px: 1, fontSize: 12.25 } }}>
                    <SearchableSelect
                      name="type"
                      value={currentItem.type}
                      onChange={handleItemChange}
                      options={TYPE_OPTIONS}
                      placeholder="Select type"
                      showEmptyOption={false}
                    />
                  </Box>
                </Box>
                <Box sx={{ width: 112, flexShrink: 0 }}>
                  <Typography sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Amount On</Typography>
                  <TextField
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                    name="amountOn"
                    value={currentItem.amountOn}
                    onChange={handleItemChange}
                    placeholder="0.00"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1, textAlign: "right" } }}
                  />
                </Box>
                <Box sx={{ width: 64, flexShrink: 0 }}>
                  <Typography sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Dist %</Typography>
                  <TextField
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                    name="disPerc"
                    value={currentItem.disPerc}
                    onChange={handleItemChange}
                    placeholder="0"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1, textAlign: "right" } }}
                  />
                </Box>
                <Box sx={{ width: 80, flexShrink: 0 }}>
                  <Typography sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Discount</Typography>
                  <TextField
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                    name="discount"
                    value={currentItem.discount}
                    onChange={handleItemChange}
                    placeholder="0"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1, textAlign: "right" } }}
                  />
                </Box>
                <Box sx={{ width: 176, flexShrink: 0 }}>
                  <Typography sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Tax</Typography>
                  <Box sx={{ "& button": { height: 30, px: 1, fontSize: 12.25 } }}>
                    <AsyncSearchSelect
                      name="taxId"
                      value={currentItem.taxId}
                      onChange={handleItemChange}
                      options={taxes.map((t) => ({ id: t.id, name: `${t.name} ${t.tax_percentage}%` }))}
                      onAsyncSearch={handleAsyncTaxSearch}
                      placeholder="None"
                      searchPlaceholder="Search tax..."
                    />
                  </Box>
                </Box>
                <Box sx={{ width: 112, flexShrink: 0 }}>
                  <Typography sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>T-Value</Typography>
                  <TextField
                    value={`${Number(currentItem.taxValue || 0).toFixed(2)} @ ${parseFloat(currentItem.taxPerc) || 0}%`}
                    slotProps={{ input: { readOnly: true } }}
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1, textAlign: "right" }, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }}
                  />
                </Box>
                <Box sx={{ width: 112, flexShrink: 0 }}>
                  <Typography sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Nett Amount</Typography>
                  <TextField
                    value={Number(currentItem.netAmount || 0).toFixed(2)}
                    slotProps={{ input: { readOnly: true } }}
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1, textAlign: "right" }, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }}
                  />
                </Box>
                <Button
                  onClick={handleAddItem}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddItem(); } }}
                  className="glass-btn glass-btn-primary"
                  startIcon={<Plus className="w-4 h-4" />}
                  sx={{ flexShrink: 0, height: 30, whiteSpace: "nowrap" }}
                >
                  Add
                </Button>
              </Stack>
            </Box>

            {/* Items Table */}
            <Box sx={{ borderTop: 1, borderColor: "divider", flex: 1, minHeight: 0, overflow: "hidden" }}>
              <Box sx={{ overflowX: "auto", height: "100%" }}>
                <Box sx={{ minWidth: 860, height: "100%", display: "flex", flexDirection: "column" }}>
                  <Stack direction="row" sx={{ bgcolor: "action.hover", fontSize: 9, fontWeight: 600, color: "text.secondary", borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
                    <Box sx={{ px: 0.75, py: 0.5, width: 96, borderRight: 1, borderColor: "divider" }}>Type</Box>
                    <Box sx={{ px: 0.75, py: 0.5, flex: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Amount</Box>
                    <Box sx={{ px: 0.75, py: 0.5, width: 64, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Dist %</Box>
                    <Box sx={{ px: 0.75, py: 0.5, width: 96, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Discount</Box>
                    <Box sx={{ px: 0.75, py: 0.5, width: 128, borderRight: 1, borderColor: "divider" }}>Tax</Box>
                    <Box sx={{ px: 0.75, py: 0.5, width: 96, borderRight: 1, borderColor: "divider", textAlign: "right" }}>T-Value</Box>
                    <Box sx={{ px: 0.75, py: 0.5, width: 112, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Nett Amt</Box>
                    <Box sx={{ px: 0.75, py: 0.5, width: 48, textAlign: "center" }}>Del</Box>
                  </Stack>
                  <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                    {items.length === 0 ? (
                      <Box sx={{ height: "100%" }} />
                    ) : (
                      items.map((item, index) => (
                        <Stack key={item.id} direction="row" sx={{ fontSize: 9, color: "text.primary", borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 }, "&:hover": { bgcolor: "action.hover" } }}>
                          <Box sx={{ px: 0.75, py: 0.5, width: 96, borderRight: 1, borderColor: "divider", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.type}</Box>
                          <Box sx={{ px: 0.75, py: 0.5, flex: 1, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{parseFloat(item.amountOn).toFixed(2)}</Box>
                          <Box sx={{ px: 0.75, py: 0.5, width: 64, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.disPerc || 0}%</Box>
                          <Box sx={{ px: 0.75, py: 0.5, width: 96, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{(parseFloat(item.discount) || 0).toFixed(2)}</Box>
                          <Box sx={{ px: 0.75, py: 0.5, width: 128, borderRight: 1, borderColor: "divider", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.taxLabel || "-"}</Box>
                          <Box sx={{ px: 0.75, py: 0.5, width: 96, borderRight: 1, borderColor: "divider", textAlign: "right" }}>
                            {getTaxValue(item).toFixed(2)} @ {parseFloat(item.taxPerc) || 0}%
                          </Box>
                          <Box sx={{ px: 0.75, py: 0.5, width: 112, borderRight: 1, borderColor: "divider", textAlign: "right", fontWeight: 500 }}>{Number(item.netAmount || 0).toFixed(2)}</Box>
                          <Box sx={{ px: 0.75, py: 0.5, width: 48, textAlign: "center" }}>
                            <IconButton onClick={() => handleRemoveItem(index)} className="glass-btn glass-btn-danger" size="small" sx={{ p: 0.25 }}>
                              <X className="w-3 h-3" />
                            </IconButton>
                          </Box>
                        </Stack>
                      ))
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Bill Info Section */}
            <Box sx={{ borderTop: 1, borderColor: "divider", p: 0.75, flexShrink: 0 }}>
              <Box sx={{ border: "1px solid", borderColor: "divider", p: 0.75 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end", flexWrap: "wrap" }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: "flex-end", flexShrink: 0 }}>
                    <Box sx={{ width: 80 }}>
                      <Typography sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Bill Value</Typography>
                      <TextField
                        slotProps={{ htmlInput: { inputMode: "decimal" } }}
                        value={billInfo.billValue}
                        onChange={(e) => setBillInfo((p) => ({ ...p, billValue: parseFloat(e.target.value) || 0 }))}
                        size="small"
                        fullWidth
                        sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5, textAlign: "right" } }}
                      />
                    </Box>
                    <Box sx={{ width: 70 }}>
                      <Typography sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Expense %</Typography>
                      <TextField
                        slotProps={{ htmlInput: { inputMode: "decimal" } }}
                        value={billInfo.expensePerc}
                        onChange={(e) => setBillInfo((p) => ({ ...p, expensePerc: parseFloat(e.target.value) || 0 }))}
                        size="small"
                        fullWidth
                        sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5, textAlign: "right" } }}
                      />
                    </Box>
                    <Box sx={{ width: 80 }}>
                      <Typography sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Expense ₹</Typography>
                      <TextField
                        slotProps={{ htmlInput: { inputMode: "decimal" } }}
                        value={billInfo.expenseAmt}
                        onChange={(e) => setBillInfo((p) => ({ ...p, expenseAmt: parseFloat(e.target.value) || 0 }))}
                        size="small"
                        fullWidth
                        sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5, textAlign: "right" } }}
                      />
                    </Box>
                    <Box sx={{ width: 60 }}>
                      <Typography sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Pieces</Typography>
                      <TextField
                        slotProps={{ htmlInput: { inputMode: "numeric" }, input: { readOnly: hasLinkedTransportEntry } }}
                        value={billInfo.pieces}
                        onChange={(e) => !hasLinkedTransportEntry && setBillInfo((p) => ({ ...p, pieces: parseInt(e.target.value) || 0 }))}
                        size="small"
                        fullWidth
                        sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5, textAlign: "right" }, "& .MuiOutlinedInput-root": hasLinkedTransportEntry ? { bgcolor: "action.hover" } : undefined }}
                      />
                    </Box>
                    <Box sx={{ width: 60 }}>
                      <Typography sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Bundles</Typography>
                      <TextField
                        slotProps={{ htmlInput: { inputMode: "numeric" }, input: { readOnly: hasLinkedTransportEntry } }}
                        value={billInfo.bundles}
                        onChange={(e) => !hasLinkedTransportEntry && setBillInfo((p) => ({ ...p, bundles: parseInt(e.target.value) || 0 }))}
                        size="small"
                        fullWidth
                        sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5, textAlign: "right" }, "& .MuiOutlinedInput-root": hasLinkedTransportEntry ? { bgcolor: "action.hover" } : undefined }}
                      />
                    </Box>
                  </Stack>

                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: 1.5, rowGap: 0.25, fontSize: 9.5, flexShrink: 0 }}>
                    {[
                      { name: "taxIncluded", label: "Tax Included On Price" },
                      { name: "discountOnTotal", label: "Discount on Total Value" },
                      { name: "tds", label: "TDS" },
                      { name: "internalVendor", label: "Internal Vendor" },
                      { name: "rcm", label: "RCM" },
                      { name: "agentCommission", label: "Agent Commission" },
                    ].map((cb) => (
                      <Stack component="label" key={cb.name} direction="row" spacing={0.5} sx={{ alignItems: "center", lineHeight: 1.2, cursor: "pointer", whiteSpace: "nowrap" }}>
                        <Checkbox name={cb.name} checked={checkboxes[cb.name]} onChange={handleCheckboxChange} size="small" sx={{ p: 0 }} />
                        {cb.label}
                      </Stack>
                    ))}
                  </Box>
                  <Button
                    onClick={handleAddInvoice}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleAddInvoice(); } }}
                    disabled={!hasLinkedTransportEntry}
                    className="glass-btn glass-btn-primary"
                    sx={{ flexShrink: 0, alignSelf: { xs: "flex-start", lg: "center" }, whiteSpace: "nowrap", opacity: !hasLinkedTransportEntry ? 0.6 : 1 }}
                  >
                    {editingInvoiceIndex !== null ? "Update Invoice" : "Add Invoice"}
                  </Button>
                </Stack>
              </Box>
            </Box>

            {/* Invoice Summary Table */}
            <Box sx={{ borderTop: 1, borderColor: "divider", flex: 1, minHeight: 0, overflowY: "auto" }}>
              <Box sx={{ overflowX: "auto" }}>
                <Table sx={{ minWidth: 860 }}>
                  <TableHead>
                    <TableRow sx={(theme) => ({ bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), fontSize: 9, fontWeight: 600, color: "text.secondary", textTransform: "uppercase" })}>
                      <TableCell sx={{ px: 1, py: 0.5, textAlign: "left" }}>Company</TableCell>
                      <TableCell sx={{ px: 1, py: 0.5, textAlign: "left" }}>Invoice No</TableCell>
                      <TableCell sx={{ px: 1, py: 0.5, textAlign: "left" }}>Date</TableCell>
                      <TableCell sx={{ px: 1, py: 0.5, textAlign: "right" }}>Expense %/Expense</TableCell>
                      <TableCell sx={{ px: 1, py: 0.5, textAlign: "right" }}>Bundles/Pieces</TableCell>
                      <TableCell sx={{ px: 1, py: 0.5, textAlign: "right" }}>Tax</TableCell>
                      <TableCell sx={{ px: 1, py: 0.5, textAlign: "right" }}>Total</TableCell>
                      <TableCell sx={{ px: 1, py: 0.5, textAlign: "center", width: 64 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ textAlign: "center", py: 3, color: "text.disabled", fontSize: 10.5 }}>
                          No invoices added yet. Fill the form and click "Add Invoice".
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((inv, index) => (
                        <TableRow key={index} sx={{ "&:hover": { bgcolor: "action.hover" }, fontSize: 10.5, color: "text.primary" }}>
                          <TableCell sx={{ px: 1, py: 0.5 }}>{inv.companyName || "-"}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.5 }}>{inv.invoiceNo}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.5 }}>{inv.invoiceDate}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.5, textAlign: "right" }}>
                            {(parseFloat(inv.billInfo?.expensePerc) || 0)}/{(parseFloat(inv.billInfo?.expenseAmt) || 0)}
                          </TableCell>
                          <TableCell sx={{ px: 1, py: 0.5, textAlign: "right" }}>
                            {parseInt(inv.billInfo?.bundles, 10) || 0}/{parseInt(inv.billInfo?.pieces, 10) || 0}
                          </TableCell>
                          <TableCell sx={{ px: 1, py: 0.5, textAlign: "right" }}>{Number(inv.totals?.taxCharges || 0).toFixed(2)}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.5, textAlign: "right", fontWeight: 500 }}>{Number(inv.totals?.netAmount || 0).toFixed(2)}</TableCell>
                          <TableCell sx={{ px: 1, py: 0.5, textAlign: "center" }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
                              <IconButton onClick={() => handleEditInvoice(index)} className="glass-btn glass-btn-primary" title="Edit" size="small" sx={{ p: 0.25 }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </IconButton>
                              <IconButton onClick={() => handleRemoveInvoice(index)} className="glass-btn glass-btn-danger" title="Delete" size="small" sx={{ p: 0.25 }}>
                                <X className="w-3.5 h-3.5" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Box>

            {/* Inverse Calculation Section */}
            <Box sx={{ borderTop: 1, borderColor: "divider", p: 0.75, flexShrink: 0 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: "flex-end" }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: "text.secondary", alignSelf: "center", whiteSpace: "nowrap" }}>Inverse Calc</Typography>
                <Box sx={{ width: 128, flexShrink: 0 }}>
                  <Typography sx={{ display: "block", fontSize: 9, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Tax</Typography>
                  <TextField
                    select
                    value={inverseCalc.taxId}
                    onChange={(e) => handleInverseCalcChange("taxId", e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1 } }}
                  >
                    <MenuItem value="">Select Tax</MenuItem>
                    {taxes.map((t) => (
                      <MenuItem key={t.id} value={t.id}>{t.name} {t.tax_percentage}%</MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box sx={{ width: 80, flexShrink: 0 }}>
                  <Typography sx={{ display: "block", fontSize: 9, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Tax Value</Typography>
                  <TextField
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                    value={inverseCalc.taxValue}
                    onChange={(e) => handleInverseCalcChange("taxValue", e.target.value)}
                    placeholder="Tax Value"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1, textAlign: "right" } }}
                  />
                </Box>
                <Box sx={{ width: 96, flexShrink: 0 }}>
                  <Typography sx={{ display: "block", fontSize: 9, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Bill Value</Typography>
                  <TextField
                    value={inverseCalc.billValue.toFixed(2)}
                    slotProps={{ input: { readOnly: true } }}
                    placeholder="Bill Value"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1, textAlign: "right" }, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }}
                  />
                </Box>
                <Box sx={{ width: 64, flexShrink: 0 }}>
                  <Typography sx={{ display: "block", fontSize: 9, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Disc %</Typography>
                  <TextField
                    slotProps={{ htmlInput: { inputMode: "decimal" } }}
                    value={inverseCalc.discPerc}
                    onChange={(e) => handleInverseCalcChange("discPerc", e.target.value)}
                    placeholder="Disc %"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1, textAlign: "right" } }}
                  />
                </Box>
                <Box sx={{ width: 96, flexShrink: 0 }}>
                  <Typography sx={{ display: "block", fontSize: 9, fontWeight: 500, color: "text.secondary", mb: 0.25 }}>Discount</Typography>
                  <TextField
                    value={inverseCalc.discountValue.toFixed(2)}
                    slotProps={{ input: { readOnly: true } }}
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 1, textAlign: "right" }, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }}
                  />
                </Box>
                <Button
                  onClick={handleInverseAdd}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInverseAdd(); } }}
                  className="glass-btn glass-btn-primary"
                  startIcon={<Plus className="w-3.5 h-3.5" />}
                  sx={{ flexShrink: 0, height: 30, whiteSpace: "nowrap" }}
                >
                  Add
                </Button>
              </Stack>
            </Box>
          </Box>

          {/* RIGHT SIDE - Calculation Summary */}
          <Box sx={{ width: { xs: "100%", xl: 288 }, flexShrink: { xl: 0 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", overflowY: "auto" }}>
            <Stack spacing={0.75} sx={{ p: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>LR No</Typography>
                <TextField
                  value={formData.lrNo}
                  slotProps={{ input: { readOnly: true } }}
                  disabled={!hasLinkedTransportEntry}
                  placeholder={hasLinkedTransportEntry ? "" : "-"}
                  size="small"
                  sx={{ width: 160, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 }, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }}
                />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>LR Expense</Typography>
                <Box sx={{ width: 160, position: "relative" }}>
                  <TextField
                    slotProps={{ htmlInput: { inputMode: "decimal" }, input: { readOnly: !lrExpenseEditing } }}
                    value={lrExpenseEditing ? lrExpenseDraft : formData.lrExpense}
                    onChange={(e) => lrExpenseEditing && setLrExpenseDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (!lrExpenseEditing) return;
                      if (e.key === "Enter") { e.preventDefault(); setFormData((p) => ({ ...p, lrExpense: lrExpenseDraft })); setLrExpenseEditing(false); }
                      if (e.key === "Escape") { e.preventDefault(); setLrExpenseDraft(""); setLrExpenseEditing(false); }
                    }}
                    size="small"
                    fullWidth
                    sx={{
                      "& .MuiInputBase-input": { fontSize: 10.5, py: 0.75, pr: 6, textAlign: lrExpenseEditing ? "left" : "right" },
                      "& .MuiOutlinedInput-root": { bgcolor: lrExpenseEditing ? "background.paper" : "action.hover" },
                    }}
                  />
                  <Stack direction="row" spacing={0.25} sx={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", alignItems: "center" }}>
                    {lrExpenseEditing ? (
                      <>
                        <IconButton
                          type="button"
                          onClick={() => { setFormData((p) => ({ ...p, lrExpense: lrExpenseDraft })); setLrExpenseEditing(false); }}
                          title="Confirm"
                          size="small"
                          sx={{ p: 0.25, color: "success.main" }}
                        >
                          <Check className="w-3 h-3" />
                        </IconButton>
                        <IconButton
                          type="button"
                          onClick={() => { setFormData((p) => ({ ...p, lrExpense: "" })); setLrExpenseDraft(""); setLrExpenseEditing(false); }}
                          title="Clear & Cancel"
                          size="small"
                          sx={{ p: 0.25, color: "error.main" }}
                        >
                          <X className="w-3 h-3" />
                        </IconButton>
                      </>
                    ) : (
                      <IconButton
                        type="button"
                        onClick={() => { setLrExpenseDraft(formData.lrExpense || ""); setLrExpenseEditing(true); }}
                        title="Edit"
                        size="small"
                        sx={{ p: 0.25, color: "text.disabled", "&:hover": { color: "primary.main" } }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              </Stack>

              <Box component="hr" sx={{ border: 0, borderTop: 1, borderColor: "divider", m: 0 }} />

              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>Base Amount</Typography>
                <TextField value={totals.baseAmount.toFixed(2)} slotProps={{ input: { readOnly: true } }} size="small" sx={{ width: 160, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, textAlign: "right" }, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }} />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>Discount</Typography>
                <TextField value={totals.discount.toFixed(2)} slotProps={{ input: { readOnly: true } }} size="small" sx={{ width: 160, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, textAlign: "right" }, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }} />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>Pcs Discount</Typography>
                <TextField
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                  value={totals.pcsDiscount}
                  onChange={(e) => handlePcsDiscountChange(e.target.value)}
                  size="small"
                  sx={{ width: 160, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, textAlign: "right" } }}
                />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>Tax Charges</Typography>
                <TextField value={totals.taxCharges.toFixed(2)} slotProps={{ input: { readOnly: true } }} size="small" sx={{ width: 160, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, textAlign: "right" }, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }} />
              </Stack>

              <Box component="hr" sx={{ border: 0, borderTop: 1, borderColor: "divider", m: 0 }} />

              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>Gross Amount</Typography>
                <TextField value={totals.grossAmount.toFixed(2)} slotProps={{ input: { readOnly: true } }} size="small" sx={{ width: 160, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, textAlign: "right" }, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }} />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12.25, color: "text.secondary" }}>Rounding</Typography>
                <TextField
                  slotProps={{ htmlInput: { inputMode: "decimal" } }}
                  value={totals.rounding}
                  onChange={(e) => handleRoundingChange(e.target.value)}
                  size="small"
                  sx={{ width: 160, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75, textAlign: "right" } }}
                />
              </Stack>

              <Box component="hr" sx={{ border: 0, borderTop: 1, borderColor: "divider", m: 0 }} />

              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "primary.main" }}>Net Amount</Typography>
                <TextField
                  value={totals.netAmount.toFixed(2)}
                  slotProps={{ input: { readOnly: true } }}
                  size="small"
                  sx={(theme) => ({
                    width: 160,
                    "& .MuiInputBase-input": { fontSize: 12.25, py: 1, textAlign: "right", fontWeight: 600, color: theme.palette.primary.main },
                    "& .MuiOutlinedInput-root": { bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) },
                  })}
                />
              </Stack>

              <Stack spacing={0.75} sx={{ pt: 0.75, borderTop: 1, borderColor: "divider" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography component="label" sx={{ width: 64, flexShrink: 0, fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>PO Type</Typography>
                  <TextField
                    value={poType}
                    onChange={(e) => setPoType(e.target.value)}
                    placeholder="Enter PO Type"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                  />
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography component="label" sx={{ width: 64, flexShrink: 0, fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>PO No</Typography>
                  <TextField
                    value={poNo}
                    onChange={(e) => setPoNo(e.target.value)}
                    placeholder="Enter PO No"
                    size="small"
                    fullWidth
                    sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                  />
                </Stack>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Footer Action Buttons */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ flexShrink: 0, flex: "0 0 auto", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", px: 2, py: 0.75, bgcolor: "background.paper", borderTop: 1, borderColor: "divider", overflow: "visible" }}
      >
        {!isViewMode && (
          <>
            <Button
              onClick={handleSaveAndNext}
              disabled={!hasLinkedTransportEntry}
              className="glass-btn glass-btn-primary"
              sx={{ opacity: !hasLinkedTransportEntry ? 0.6 : 1 }}
            >
              Save & Next
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasLinkedTransportEntry}
              className="glass-btn glass-btn-success"
              sx={{ opacity: !hasLinkedTransportEntry ? 0.6 : 1 }}
            >
              Save
            </Button>
            <Button
              onClick={handleClear}
              className="glass-btn glass-btn-secondary"
            >
              Clear
            </Button>
          </>
        )}
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

export default InvoiceEntry;
