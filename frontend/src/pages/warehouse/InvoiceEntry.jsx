import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Search, Save, Plus, Printer, X, Pencil, Check } from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import SearchableSelect from "../../components/SearchableSelect";
import PageSkeleton from "../../components/PageSkeleton";
import { usePrintContext } from "../../context/PrintContext";
import { getMasterLookups } from "../../utils/lookupCache";

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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 master-responsive">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/warehouse")}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
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
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-800 dark:text-gray-100">
              Invoice{isViewMode ? " (View)" : pageMode === "edit" ? " (Edit)" : ""}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/warehouse/invoice/search")}
            className="glass-btn glass-btn-primary inline-flex items-center"
          >
            <Search className="w-4 h-4 mr-1" /> Search
          </button>
          <button
            className="glass-btn glass-btn-primary inline-flex items-center"
            onClick={handlePrintInvoice}
          >
            <Printer className="w-4 h-4 mr-1" /> Print
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden px-1.5 pb-1 pt-0.5">
        <div className="flex h-full flex-col gap-1.5 xl:flex-row xl:items-stretch">
          {/* LEFT SIDE */}
          <div className="min-w-0 flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col min-h-0 overflow-hidden">
            {/* Top Form */}
            <div className="p-1.5 shrink-0">
              {!hasLinkedTransportEntry && !selectedInvoiceId && (
                <div className="mb-2 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  This invoice must be linked to a transport entry. Open it from Warehouse Dashboard,
                  Transport Receipt, or with a `transport_entry_id` in the URL.
                </div>
              )}
              <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 lg:grid-cols-3">
                <div className="flex items-center gap-1">
                  <label className="w-28 shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <span className="text-red-500">*</span> Company
                  </label>
                  {hasLinkedTransportEntry ? (
                    <input
                      type="text"
                      value={formData.companyName}
                      readOnly
                      className="w-full border border-gray-300 dark:border-gray-600 px-1.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
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
                </div>
                <div className="flex items-center gap-1" ref={supplierRef}>
                  <label className="w-28 shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <span className="text-red-500">*</span> Supplier
                  </label>
                  {hasLinkedTransportEntry ? (
                    <input
                      type="text"
                      value={formData.supplierName}
                      readOnly
                      className="w-full border border-gray-300 dark:border-gray-600 px-1.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                    />
                  ) : (
                    <SearchableSelect
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleSupplierSelect}
                      options={suppliers.map((s) => ({ label: s.name, value: String(s.id) }))}
                      placeholder="Select Supplier"
                    />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <label className="w-28 shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <span className="text-red-500">*</span> Entry Date
                  </label>
                  <input
                    ref={entryDateRef}
                    type="date"
                    name="entryDate"
                    value={formData.entryDate}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="w-28 shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <span className="text-red-500">*</span> Invoice Date
                  </label>
                  <input
                    type="date"
                    name="invoiceDate"
                    value={formData.invoiceDate}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="w-28 shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <span className="text-red-500">*</span> Invoice No
                  </label>
                  <input
                    type="text"
                    name="invoiceNo"
                    value={formData.invoiceNo}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-28 shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300">Flags</span>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" name="interstate" checked={formData.interstate} onChange={handleFormChange} className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-blue-600" />
                      Interstate
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" name="creditNote" checked={formData.creditNote} onChange={handleFormChange} className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-blue-600" />
                      Credit Note
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Type/Amount/Discount Entry Row */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-1.5 py-1 shrink-0">
              <div className="flex items-end gap-1.5">
                <div className="w-36 shrink-0">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Type</label>
                  <div className="[&_button]:h-[30px] [&_button]:px-2 [&_button]:text-sm">
                    <SearchableSelect
                      name="type"
                      value={currentItem.type}
                      onChange={handleItemChange}
                      options={TYPE_OPTIONS}
                      placeholder="Select type"
                      showEmptyOption={false}
                    />
                  </div>
                </div>
                <div className="w-28 shrink-0">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Amount On</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="amountOn"
                    value={currentItem.amountOn}
                    onChange={handleItemChange}
                    className="w-full h-[30px] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 text-sm text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="w-16 shrink-0">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Dist %</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="disPerc"
                    value={currentItem.disPerc}
                    onChange={handleItemChange}
                    className="w-full h-[30px] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 text-sm text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div className="w-20 shrink-0">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Discount</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="discount"
                    value={currentItem.discount}
                    onChange={handleItemChange}
                    className="w-full h-[30px] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 text-sm text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div className="w-44 shrink-0">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Tax</label>
                  <div className="[&_button]:h-[30px] [&_button]:px-2 [&_button]:text-sm">
                    <SearchableSelect
                      name="taxId"
                      value={currentItem.taxId}
                      onChange={handleItemChange}
                      options={taxes.map((t) => ({ label: `${t.name} ${t.tax_percentage}%`, value: String(t.id) }))}
                      placeholder="None"
                    />
                  </div>
                </div>
                <div className="w-28 shrink-0">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">T-Value</label>
                  <input
                    type="text"
                    value={`${Number(currentItem.taxValue || 0).toFixed(2)} @ ${parseFloat(currentItem.taxPerc) || 0}%`}
                    readOnly
                    className="w-full h-[30px] border border-gray-300 dark:border-gray-600 px-2 text-sm text-right bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                </div>
                <div className="w-28 shrink-0">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Nett Amount</label>
                  <input
                    type="text"
                    value={Number(currentItem.netAmount || 0).toFixed(2)}
                    readOnly
                    className="w-full h-[30px] border border-gray-300 dark:border-gray-600 px-2 text-sm text-right bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                </div>
                <button
                  onClick={handleAddItem}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddItem(); } }}
                  className="glass-btn glass-btn-primary shrink-0 inline-flex items-center justify-center h-[30px] whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="border-t border-gray-200 dark:border-gray-700 flex-1 min-h-0 overflow-hidden">
              <div className="overflow-x-auto h-full">
                <div className="min-w-[860px] h-full flex flex-col">
                  <div className="flex bg-gray-50 dark:bg-gray-700 text-[10px] font-semibold text-gray-600 dark:text-gray-300 border-b dark:border-gray-700 shrink-0">
                    <div className="px-1.5 py-1 w-24 border-r dark:border-gray-700">Type</div>
                    <div className="px-1.5 py-1 flex-1 border-r dark:border-gray-700 text-right">Amount</div>
                    <div className="px-1.5 py-1 w-16 border-r dark:border-gray-700 text-right">Dist %</div>
                    <div className="px-1.5 py-1 w-24 border-r dark:border-gray-700 text-right">Discount</div>
                    <div className="px-1.5 py-1 w-32 border-r dark:border-gray-700">Tax</div>
                    <div className="px-1.5 py-1 w-24 border-r dark:border-gray-700 text-right">T-Value</div>
                    <div className="px-1.5 py-1 w-28 border-r dark:border-gray-700 text-right">Nett Amt</div>
                    <div className="px-1.5 py-1 w-12 text-center">Del</div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {items.length === 0 ? (
                      <div className="h-full" />
                    ) : (
                      items.map((item, index) => (
                        <div key={item.id} className="flex text-[10px] text-gray-800 dark:text-gray-100 border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <div className="px-1.5 py-1 w-24 border-r dark:border-gray-700 truncate">{item.type}</div>
                          <div className="px-1.5 py-1 flex-1 border-r dark:border-gray-700 text-right">{parseFloat(item.amountOn).toFixed(2)}</div>
                          <div className="px-1.5 py-1 w-16 border-r dark:border-gray-700 text-right">{item.disPerc || 0}%</div>
                          <div className="px-1.5 py-1 w-24 border-r dark:border-gray-700 text-right">{(parseFloat(item.discount) || 0).toFixed(2)}</div>
                          <div className="px-1.5 py-1 w-32 border-r dark:border-gray-700 truncate">{item.taxLabel || "-"}</div>
                          <div className="px-1.5 py-1 w-24 border-r dark:border-gray-700 text-right">
                            {getTaxValue(item).toFixed(2)} @ {parseFloat(item.taxPerc) || 0}%
                          </div>
                          <div className="px-1.5 py-1 w-28 border-r dark:border-gray-700 text-right font-medium">{Number(item.netAmount || 0).toFixed(2)}</div>
                          <div className="px-1.5 py-1 w-12 text-center">
                            <button onClick={() => handleRemoveItem(index)} className="glass-btn glass-btn-danger">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bill Info Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-1.5 shrink-0">
              <div className="border border-gray-200 dark:border-gray-700 p-1.5">
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="flex items-end gap-1.5 shrink-0">
                    <div className="w-[80px]">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Bill Value</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={billInfo.billValue}
                        onChange={(e) => setBillInfo((p) => ({ ...p, billValue: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-1.5 py-0.5 text-xs text-right"
                      />
                    </div>
                    <div className="w-[70px]">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Expense %</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={billInfo.expensePerc}
                        onChange={(e) => setBillInfo((p) => ({ ...p, expensePerc: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-1.5 py-0.5 text-xs text-right"
                      />
                    </div>
                    <div className="w-[80px]">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Expense ₹</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={billInfo.expenseAmt}
                        onChange={(e) => setBillInfo((p) => ({ ...p, expenseAmt: parseFloat(e.target.value) || 0 }))}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-1.5 py-0.5 text-xs text-right"
                      />
                    </div>
                    <div className="w-[60px]">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Pieces</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={billInfo.pieces}
                        readOnly={hasLinkedTransportEntry}
                        onChange={(e) => !hasLinkedTransportEntry && setBillInfo((p) => ({ ...p, pieces: parseInt(e.target.value) || 0 }))}
                        className={`w-full border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 text-xs text-right ${hasLinkedTransportEntry ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400" : "dark:bg-gray-700 dark:text-gray-100"}`}
                      />
                    </div>
                    <div className="w-[60px]">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5">Bundles</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={billInfo.bundles}
                        readOnly={hasLinkedTransportEntry}
                        onChange={(e) => !hasLinkedTransportEntry && setBillInfo((p) => ({ ...p, bundles: parseInt(e.target.value) || 0 }))}
                        className={`w-full border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 text-xs text-right ${hasLinkedTransportEntry ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400" : "dark:bg-gray-700 dark:text-gray-100"}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] shrink-0">
                    {[
                      { name: "taxIncluded", label: "Tax Included On Price" },
                      { name: "discountOnTotal", label: "Discount on Total Value" },
                      { name: "tds", label: "TDS" },
                      { name: "internalVendor", label: "Internal Vendor" },
                      { name: "rcm", label: "RCM" },
                      { name: "agentCommission", label: "Agent Commission" },
                    ].map((cb) => (
                      <label key={cb.name} className="flex items-center gap-1 leading-4 cursor-pointer whitespace-nowrap">
                        <input type="checkbox" name={cb.name} checked={checkboxes[cb.name]} onChange={handleCheckboxChange} className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-blue-600" />
                        {cb.label}
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleAddInvoice}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); handleAddInvoice(); } }}
                    disabled={!hasLinkedTransportEntry}
                    className={`glass-btn glass-btn-primary shrink-0 self-start lg:self-center whitespace-nowrap ${
                      !hasLinkedTransportEntry ? "cursor-not-allowed opacity-60" : ""
                    }`}
                  >
                    {editingInvoiceIndex !== null ? "Update Invoice" : "Add Invoice"}
                  </button>
                </div>
              </div>
            </div>

            {/* Invoice Summary Table */}
            <div className="border-t border-gray-200 dark:border-gray-700 flex-1 min-h-0 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead>
                    <tr className="bg-blue-50 dark:bg-blue-900/30 text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase">
                      <th className="px-2 py-1 text-left">Company</th>
                      <th className="px-2 py-1 text-left">Invoice No</th>
                      <th className="px-2 py-1 text-left">Date</th>
                      <th className="px-2 py-1 text-right">Expense %/Expense</th>
                      <th className="px-2 py-1 text-right">Bundles/Pieces</th>
                      <th className="px-2 py-1 text-right">Tax</th>
                      <th className="px-2 py-1 text-right">Total</th>
                      <th className="px-2 py-1 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-6 text-gray-400 dark:text-gray-500 text-xs">
                          No invoices added yet. Fill the form and click "Add Invoice".
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 text-xs text-gray-800 dark:text-gray-100">
                          <td className="px-2 py-1">{inv.companyName || "-"}</td>
                          <td className="px-2 py-1">{inv.invoiceNo}</td>
                          <td className="px-2 py-1">{inv.invoiceDate}</td>
                          <td className="px-2 py-1 text-right">
                            {(parseFloat(inv.billInfo?.expensePerc) || 0)}/{(parseFloat(inv.billInfo?.expenseAmt) || 0)}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {parseInt(inv.billInfo?.bundles, 10) || 0}/{parseInt(inv.billInfo?.pieces, 10) || 0}
                          </td>
                          <td className="px-2 py-1 text-right">{Number(inv.totals?.taxCharges || 0).toFixed(2)}</td>
                          <td className="px-2 py-1 text-right font-medium">{Number(inv.totals?.netAmount || 0).toFixed(2)}</td>
                          <td className="px-2 py-1 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleEditInvoice(index)} className="glass-btn glass-btn-primary" title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleRemoveInvoice(index)} className="glass-btn glass-btn-danger" title="Delete">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inverse Calculation Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-1.5 shrink-0">
              <div className="flex items-end gap-1.5">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 self-center whitespace-nowrap">Inverse Calc</span>
                <div className="w-32 shrink-0">
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">Tax</label>
                  <select
                    value={inverseCalc.taxId}
                    onChange={(e) => handleInverseCalcChange("taxId", e.target.value)}
                    className="w-full h-[30px] border border-gray-300 dark:border-gray-600 px-1.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Tax</option>
                    {taxes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} {t.tax_percentage}%</option>
                    ))}
                  </select>
                </div>
                <div className="w-20 shrink-0">
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">Tax Value</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inverseCalc.taxValue}
                    onChange={(e) => handleInverseCalcChange("taxValue", e.target.value)}
                    placeholder="Tax Value"
                    className="w-full h-[30px] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-1.5 text-xs text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="w-24 shrink-0">
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">Bill Value</label>
                  <input
                    type="text"
                    value={inverseCalc.billValue.toFixed(2)}
                    readOnly
                    placeholder="Bill Value"
                    className="w-full h-[30px] border border-gray-300 dark:border-gray-600 px-1.5 text-xs text-right bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                </div>
                <div className="w-16 shrink-0">
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">Disc %</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inverseCalc.discPerc}
                    onChange={(e) => handleInverseCalcChange("discPerc", e.target.value)}
                    placeholder="Disc %"
                    className="w-full h-[30px] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-1.5 text-xs text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="w-24 shrink-0">
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-300 mb-0.5">Discount</label>
                  <input
                    type="text"
                    value={inverseCalc.discountValue.toFixed(2)}
                    readOnly
                    className="w-full h-[30px] border border-gray-300 dark:border-gray-600 px-1.5 text-xs text-right bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                </div>
                <button
                  onClick={handleInverseAdd}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInverseAdd(); } }}
                  className="glass-btn glass-btn-primary shrink-0 inline-flex items-center justify-center h-[30px] whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Calculation Summary */}
          <div className="w-full xl:w-72 xl:flex-shrink-0 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
            <div className="p-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">LR No</span>
                <input
                  type="text"
                  value={formData.lrNo}
                  readOnly
                  disabled={!hasLinkedTransportEntry}
                  placeholder={hasLinkedTransportEntry ? "" : "-"}
                  className={`w-40 border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 ${
                    hasLinkedTransportEntry ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"
                  }`}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">LR Expense</span>
                <div className="w-40 relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lrExpenseEditing ? lrExpenseDraft : formData.lrExpense}
                    readOnly={!lrExpenseEditing}
                    onChange={(e) => lrExpenseEditing && setLrExpenseDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (!lrExpenseEditing) return;
                      if (e.key === "Enter") { e.preventDefault(); setFormData((p) => ({ ...p, lrExpense: lrExpenseDraft })); setLrExpenseEditing(false); }
                      if (e.key === "Escape") { e.preventDefault(); setLrExpenseDraft(""); setLrExpenseEditing(false); }
                    }}
                    className={`w-full border border-gray-300 dark:border-gray-600 dark:text-gray-100 pr-14 pl-2 py-1 text-xs ${lrExpenseEditing ? "text-left focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700" : "text-right bg-gray-50 dark:bg-gray-700"}`}
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {lrExpenseEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { setFormData((p) => ({ ...p, lrExpense: lrExpenseDraft })); setLrExpenseEditing(false); }}
                          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                          title="Confirm"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFormData((p) => ({ ...p, lrExpense: "" })); setLrExpenseDraft(""); setLrExpenseEditing(false); }}
                          className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                          title="Clear & Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setLrExpenseDraft(formData.lrExpense || ""); setLrExpenseEditing(true); }}
                        className="p-0.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">Base Amount</span>
                <input type="text" value={totals.baseAmount.toFixed(2)} readOnly className="w-40 border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm text-right bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">Discount</span>
                <input type="text" value={totals.discount.toFixed(2)} readOnly className="w-40 border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm text-right bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">Pcs Discount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={totals.pcsDiscount}
                  onChange={(e) => handlePcsDiscountChange(e.target.value)}
                  className="w-40 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 text-sm text-right focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">Tax Charges</span>
                <input type="text" value={totals.taxCharges.toFixed(2)} readOnly className="w-40 border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm text-right bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400" />
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">Gross Amount</span>
                <input type="text" value={totals.grossAmount.toFixed(2)} readOnly className="w-40 border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm text-right bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">Rounding</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={totals.rounding}
                  onChange={(e) => handleRoundingChange(e.target.value)}
                  className="w-40 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 text-sm text-right focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <hr className="border-gray-200 dark:border-gray-700" />

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Net Amount</span>
                <input type="text" value={totals.netAmount.toFixed(2)} readOnly className="w-40 border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm text-right bg-blue-50 dark:bg-blue-900/30 font-semibold text-blue-700 dark:text-blue-400" />
              </div>

              <div className="pt-1.5 space-y-1.5 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <label className="w-16 shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300">PO Type</label>
                  <input
                    type="text"
                    value={poType}
                    onChange={(e) => setPoType(e.target.value)}
                    placeholder="Enter PO Type"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-16 shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300">PO No</label>
                  <input
                    type="text"
                    value={poNo}
                    onChange={(e) => setPoNo(e.target.value)}
                    placeholder="Enter PO No"
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div
        className="shrink-0 flex-none h-auto flex flex-wrap items-center justify-end gap-2 px-4 py-1.5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
        style={{ flex: "0 0 auto", overflow: "visible" }}
      >
        {!isViewMode && (
          <>
            <button
              onClick={handleSaveAndNext}
              disabled={!hasLinkedTransportEntry}
              className={`glass-btn glass-btn-primary ${!hasLinkedTransportEntry ? "cursor-not-allowed opacity-60" : ""}`}
            >
              Save & Next
            </button>
            <button
              onClick={handleSave}
              disabled={!hasLinkedTransportEntry}
              className={`glass-btn glass-btn-success ${!hasLinkedTransportEntry ? "cursor-not-allowed opacity-60" : ""}`}
            >
              Save
            </button>
            <button
              onClick={handleClear}
              className="glass-btn glass-btn-secondary"
            >
              Clear
            </button>
          </>
        )}
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

export default InvoiceEntry;
