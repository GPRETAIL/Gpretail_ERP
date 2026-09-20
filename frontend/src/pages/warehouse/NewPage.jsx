import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Package,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Sparkles,
  Tag,
  Truck,
  UploadCloud,
  X,
} from "lucide-react";
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Tabs,
  Tab,
  Alert,
  Divider,
  Switch,
  FormControlLabel,
  InputAdornment,
  LinearProgress,
  CircularProgress,
  alpha,
} from "@mui/material";
import api from "../../api/axios";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const INDIGO = "#6366f1";
const INDIGO_HOVER = "#4f46e5";

export default function NewPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Step 1: Upload state
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractStep, setExtractStep] = useState("");
  const [error, setError] = useState("");

  // Step 2: Extracted & Reviewed Form State
  const [activeTab, setActiveTab] = useState("invoice");
  const [rawExtraction, setRawExtraction] = useState(null);

  // Supplier & Invoice Header
  const [supplier, setSupplier] = useState({ id: "", name: "", gstin: "", phone: "", address: "" });
  const [supplierList, setSupplierList] = useState([]);
  const [invoice, setInvoice] = useState({
    invoice_no: "",
    supplier_invoice_no: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    subtotal: 0,
    tax_amount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    round_off: 0,
    grand_total: 0,
    notes: "Auto-inwarded via Invoice AI",
  });

  // Transport Details
  const [transport, setTransport] = useState({
    transport_id: "",
    transport_name: "",
    lr_no: "",
    lr_date: new Date().toISOString().split("T")[0],
    vehicle_no: "",
    eway_bill_no: "",
    packages_count: 1,
    weight_kg: 0,
    freight_charges: 0,
  });
  const [transportList, setTransportList] = useState([]);

  // Products & Line Items
  const [items, setItems] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [taxes, setTaxes] = useState([]);

  // Barcode Generation Options
  const [generateBarcodes, setGenerateBarcodes] = useState(true);
  const [barcodeCodeType, setBarcodeCodeType] = useState("barcode");

  // Step 3: Execution State
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  // Document preview URL
  const previewUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Preload initial lookups (Suppliers, Transports, Categories, Brands, Taxes)
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [supRes, trpRes, catRes, brdRes, taxRes] = await Promise.allSettled([
          api.get("/suppliers", { params: { limit: 100 } }),
          api.get("/transports", { params: { limit: 100 } }),
          api.get("/categories", { params: { limit: 100 } }),
          api.get("/brands", { params: { limit: 100 } }),
          api.get("/taxes", { params: { limit: 100 } }),
        ]);

        if (supRes.status === "fulfilled") {
          setSupplierList(supRes.value.data?.data || []);
        }
        if (trpRes.status === "fulfilled") {
          setTransportList(trpRes.value.data?.data || []);
        }
        if (catRes.status === "fulfilled") {
          setCategories(catRes.value.data?.data || []);
        }
        if (brdRes.status === "fulfilled") {
          setBrands(brdRes.value.data?.data || []);
        }
        if (taxRes.status === "fulfilled") {
          setTaxes(taxRes.value.data?.data || []);
        }
      } catch (err) {
        console.warn("Could not pre-load some master lookups:", err);
      }
    };
    loadLookups();
  }, []);

  const handleFileSelect = (selectedFile) => {
    setError("");
    setRawExtraction(null);
    setExecutionResult(null);

    if (!selectedFile) return;

    const name = (selectedFile.name || "").toLowerCase();
    const isExtMatch = /\.(pdf|jpg|jpeg|png|webp)$/i.test(name);
    const isMimeMatch = selectedFile.type
      ? selectedFile.type.startsWith("image/") || selectedFile.type === "application/pdf"
      : false;

    if (!isExtMatch && !isMimeMatch) {
      setError("Please select a valid PDF, JPG, PNG, or WEBP invoice file.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("The file exceeds the 15 MB limit. Please compress or select a smaller invoice file.");
      return;
    }

    setFile(selectedFile);
  };

  // Trigger OCR & AI Extraction with Live Progress
  const handleExtract = async () => {
    if (!file || extracting) return;
    setExtracting(true);
    setExtractProgress(5);
    setError("");
    setExecutionResult(null);

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    const steps = isImage
      ? [
          { progress: 10, msg: "📷 Detecting image orientation & auto-rotating via EXIF..." },
          { progress: 22, msg: "🔍 Resizing image to optimal resolution for AI vision..." },
          { progress: 38, msg: "🤖 Sending to Gemini Vision — reading supplier, GSTIN & address..." },
          { progress: 55, msg: "📋 Scanning item table — extracting descriptions, HSN, qty, rate..." },
          { progress: 70, msg: "🔖 Reading stamps, handwritten LR no. & transport details..." },
          { progress: 82, msg: "💰 Cross-checking GST breakdown, CGST/SGST & grand total..." },
          { progress: 90, msg: "✅ Verifying extracted data & preparing review workspace..." },
        ]
      : [
          { progress: 15, msg: "📄 Uploading invoice PDF for AI analysis..." },
          { progress: 35, msg: "🤖 Extracting supplier details, GSTIN & invoice header..." },
          { progress: 60, msg: "📋 Parsing line item table — HSN codes, rates & quantities..." },
          { progress: 80, msg: "💰 Calculating tax breakdown, CGST/SGST & grand total..." },
          { progress: 90, msg: "✅ Verifying data & preparing review workspace..." },
        ];

    let stepIdx = 0;
    setExtractStep(steps[0].msg);

    let progressTimer = null;
    try {
      progressTimer = setInterval(() => {
        if (stepIdx < steps.length - 1) {
          stepIdx++;
          setExtractProgress(steps[stepIdx].progress);
          setExtractStep(steps[stepIdx].msg);
        }
      }, 900);

      const fd = new FormData();
      fd.append("file", file);

      const response = await api.post("/v1/invoice-ai/extract", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180000,
      });

      if (progressTimer) clearInterval(progressTimer);
      setExtractProgress(100);
      setExtractStep("Extraction complete! Preparing review workspace...");

      const resData = response.data;
      if (!resData?.success) {
        throw new Error(resData?.message || "Invoice extraction failed.");
      }

      setRawExtraction(resData);
      const invData = resData.invoice || {};

      // 1. Map Supplier
      const extSup = invData.supplier || {};
      let matchedSupplierId = "";
      if (extSup.gstin || extSup.name) {
        const found = supplierList.find(
          (s) =>
            (extSup.gstin && s.gstin && s.gstin.toLowerCase() === extSup.gstin.toLowerCase()) ||
            (extSup.name && s.name && s.name.toLowerCase().includes(extSup.name.toLowerCase()))
        );
        if (found) {
          matchedSupplierId = found.id;
        }
      }

      setSupplier({
        id: matchedSupplierId,
        name: extSup.name || "",
        gstin: extSup.gstin || "",
        phone: extSup.phone || "",
        address: extSup.address || "",
      });

      // 2. Map Invoice Details
      const extInv = invData.invoice || {};
      const extTotals = invData.totals || {};
      const extTax = invData.tax || {};

      const subtotalVal = Number(extTotals.subtotal || 0);
      const cgstVal = Number(extTax.cgst || 0);
      const sgstVal = Number(extTax.sgst || 0);
      const igstVal = Number(extTax.igst || 0);
      const totalTaxVal = cgstVal + sgstVal + igstVal;
      const roundOffVal = Number(extTax.round_off || 0);
      const grandTotalVal = Number(extTotals.grand_total || subtotalVal + totalTaxVal + roundOffVal);

      setInvoice({
        invoice_no: extInv.number || "",
        supplier_invoice_no: extInv.number || "",
        invoice_date: extInv.date || new Date().toISOString().split("T")[0],
        due_date: extInv.due_date || "",
        subtotal: subtotalVal,
        tax_amount: totalTaxVal,
        cgst: cgstVal,
        sgst: sgstVal,
        igst: igstVal,
        round_off: roundOffVal,
        grand_total: grandTotalVal,
        notes: "Auto-inwarded via Invoice AI Extraction",
      });

      // 3. Map Transport Details
      const extTrp = invData.transport || {};
      let matchedTransportId = "";
      if (extTrp.name) {
        const foundTrp = transportList.find(
          (t) => t.name && t.name.toLowerCase().includes(extTrp.name.toLowerCase())
        );
        if (foundTrp) {
          matchedTransportId = foundTrp.id;
        }
      }

      setTransport({
        transport_id: matchedTransportId,
        transport_name: extTrp.name || "",
        lr_no: extTrp.lr_no || "",
        lr_date: extTrp.lr_date || extInv.date || new Date().toISOString().split("T")[0],
        vehicle_no: extTrp.vehicle_no || "",
        eway_bill_no: extTrp.eway_bill_no || "",
        packages_count: extTrp.packages_count || 1,
        weight_kg: extTrp.weight_kg || 0,
        freight_charges: extTrp.freight_charges || 0,
      });

      // 4. Map Line Items and query product matches
      const rawItems = Array.isArray(invData.items) ? invData.items : [];
      const mappedItems = await Promise.all(
        rawItems.map(async (item, idx) => {
          const desc = String(item.description || "").trim();
          let matchedProduct = null;

          if (desc) {
            try {
              const pSearch = await api.get("/products", {
                params: { search: desc.substring(0, 30), dropdown: true, limit: 5 },
              });
              const options = pSearch.data?.data || [];
              if (options.length > 0) {
                // Check if exact match or pick first close candidate
                matchedProduct = options[0];
              }
            } catch (err) {
              console.warn("Product search failed for item:", desc, err);
            }
          }

          const qty = Number(item.quantity || 1);
          const rate = Number(item.rate || 0);
          const taxPct = Number(item.tax_percent || 5);
          const lineTax = (qty * rate * taxPct) / 100;
          const lineTotal = qty * rate + lineTax;
          const mrp = Number(item.mrp || rate * 1.35);
          const selling = Number(item.selling_price || rate * 1.25);

          return {
            id: `line-${idx}`,
            description: desc || `Item #${idx + 1}`,
            hsn: item.hsn || "",
            quantity: qty,
            unit: item.unit || "Pcs",
            rate: rate,
            tax_percent: taxPct,
            tax_amount: lineTax,
            discount: Number(item.discount || 0),
            amount: lineTotal,
            selling_price: selling,
            mrp: mrp,
            product_id: matchedProduct ? matchedProduct.id : "",
            is_new_product: !matchedProduct,
            new_product_data: {
              name: desc || `Product ${idx + 1}`,
              code: "",
              sku: "",
              category_id: categories[0]?.id || "",
              brand_id: brands[0]?.id || "",
              tax_id: taxes[0]?.id || "",
              unit: item.unit || "Pcs",
              hsn_code: item.hsn || "",
              cost_price: rate,
              selling_price: selling,
              mrp: mrp,
            },
          };
        })
      );

      setItems(mappedItems);
    } catch (err) {
      console.error("Extraction error:", err);
      setError(err.response?.data?.message || err.message || "Failed to extract invoice data.");
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      setExtracting(false);
    }
  };

  // Line items updater
  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };

      // Recalculate amount if rate or quantity changes
      if (field === "rate" || field === "quantity" || field === "tax_percent" || field === "discount") {
        const q = Number(field === "quantity" ? value : target.quantity || 1);
        const r = Number(field === "rate" ? value : target.rate || 0);
        const tp = Number(field === "tax_percent" ? value : target.tax_percent || 0);
        const d = Number(field === "discount" ? value : target.discount || 0);
        const taxAmt = (q * r * tp) / 100;
        target.tax_amount = taxAmt;
        target.amount = q * r + taxAmt - d;
      }

      copy[index] = target;
      return copy;
    });
  };

  // Toggle New Product vs Existing Product for a line item
  const toggleNewProduct = (index, isNew) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        is_new_product: isNew,
        product_id: isNew ? "" : copy[index].product_id,
      };
      return copy;
    });
  };

  // Update nested new_product_data
  const updateNewProductField = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        new_product_data: {
          ...copy[index].new_product_data,
          [field]: value,
        },
      };
      return copy;
    });
  };

  // Recalculate invoice totals based on item rows
  const recalculateTotalsFromItems = () => {
    let sub = 0;
    let tax = 0;
    items.forEach((it) => {
      const q = Number(it.quantity || 0);
      const r = Number(it.rate || 0);
      const t = Number(it.tax_amount || 0);
      sub += q * r;
      tax += t;
    });
    const round = Number(invoice.round_off || 0);
    setInvoice((prev) => ({
      ...prev,
      subtotal: Number(sub.toFixed(2)),
      tax_amount: Number(tax.toFixed(2)),
      grand_total: Number((sub + tax + round).toFixed(2)),
    }));
  };

  // Execute complete Purchase Inwarding Flow
  const handleExecutePurchaseFlow = async () => {
    setError("");

    if (!supplier.name && !supplier.id) {
      setError("Please specify or select a supplier.");
      setActiveTab("invoice");
      return;
    }
    if (!invoice.invoice_no) {
      setError("Please specify an invoice number.");
      setActiveTab("invoice");
      return;
    }
    if (!items.length) {
      setError("At least one invoice line item is required.");
      setActiveTab("items");
      return;
    }

    // Verify all items have either a product_id or is_new_product
    const unresolvedIndex = items.findIndex((it) => !it.is_new_product && !it.product_id);
    if (unresolvedIndex >= 0) {
      setError(
        `Line ${unresolvedIndex + 1} ("${items[unresolvedIndex].description}") has no product assigned. Choose an existing product or mark as New Product.`
      );
      setActiveTab("items");
      return;
    }

    setExecuting(true);
    try {
      const payload = {
        supplier: {
          id: supplier.id || undefined,
          name: supplier.name,
          gstin: supplier.gstin,
          phone: supplier.phone,
          address: supplier.address,
        },
        invoice: {
          invoice_no: invoice.invoice_no,
          supplier_invoice_no: invoice.supplier_invoice_no || invoice.invoice_no,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date || undefined,
          subtotal: Number(invoice.subtotal),
          tax_amount: Number(invoice.tax_amount),
          cgst: Number(invoice.cgst),
          sgst: Number(invoice.sgst),
          igst: Number(invoice.igst),
          round_off: Number(invoice.round_off),
          grand_total: Number(invoice.grand_total),
          notes: invoice.notes,
        },
        transport: {
          transport_id: transport.transport_id || undefined,
          transport_name: transport.transport_name,
          lr_no: transport.lr_no,
          lr_date: transport.lr_date,
          vehicle_no: transport.vehicle_no,
          eway_bill_no: transport.eway_bill_no,
          packages_count: Number(transport.packages_count || 1),
          weight_kg: Number(transport.weight_kg || 0),
          freight_charges: Number(transport.freight_charges || 0),
        },
        items: items.map((it) => ({
          description: it.description,
          product_id: it.is_new_product ? undefined : Number(it.product_id),
          is_new_product: Boolean(it.is_new_product),
          new_product_data: it.is_new_product
            ? {
                name: it.new_product_data?.name || it.description,
                code: it.new_product_data?.code || undefined,
                sku: it.new_product_data?.sku || undefined,
                category_id: it.new_product_data?.category_id || undefined,
                brand_id: it.new_product_data?.brand_id || undefined,
                tax_id: it.new_product_data?.tax_id || undefined,
                unit: it.new_product_data?.unit || it.unit || "Pcs",
                hsn_code: it.new_product_data?.hsn_code || it.hsn || undefined,
                cost_price: Number(it.rate || 0),
                selling_price: Number(it.selling_price || it.rate * 1.25),
                mrp: Number(it.mrp || it.rate * 1.35),
              }
            : undefined,
          quantity: Number(it.quantity),
          rate: Number(it.rate),
          unit: it.unit || "Pcs",
          hsn: it.hsn,
          tax_percent: Number(it.tax_percent || 0),
          tax_amount: Number(it.tax_amount || 0),
          discount: Number(it.discount || 0),
          amount: Number(it.amount),
          selling_price: Number(it.selling_price),
          mrp: Number(it.mrp),
        })),
        generate_barcodes: Boolean(generateBarcodes),
        code_type: barcodeCodeType,
      };

      const response = await api.post("/v1/invoice-ai/process-flow", payload);
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Purchase flow execution failed.");
      }

      setExecutionResult(response.data.data);
    } catch (err) {
      console.error("Execution error:", err);
      setError(err.response?.data?.message || err.message || "Failed to create purchase entry flow.");
    } finally {
      setExecuting(false);
    }
  };

  const handleLoadSample = async () => {
    setError("");
    setExecutionResult(null);

    // Load actual sample invoice image file into state for preview
    try {
      const resp = await fetch("/sample_invoice.jpg");
      if (resp.ok) {
        const blob = await resp.blob();
        const sampleFile = new File([blob], "yogeshwara_textiles_invoice_YT328.jpg", { type: "image/jpeg" });
        setFile(sampleFile);
      }
    } catch (e) {
      console.warn("Could not load sample preview image:", e);
    }

    setSupplier({
      id: "",
      name: "YOGESHWARA TEXTILES",
      gstin: "29AZSPM9566G1ZD",
      phone: "9686900610, 7019338782",
      address: "NO.1 GROUND FLOOR, NAGASHREE COMPLEX, M T STREET, CHICKPET CROSS, BANGALORE - 560053",
    });

    setInvoice({
      invoice_no: "YT328",
      supplier_invoice_no: "YT328",
      invoice_date: "2025-09-16",
      due_date: "2025-10-16",
      subtotal: 99745,
      tax_amount: 4987.26,
      cgst: 2493.63,
      sgst: 2493.63,
      igst: 0,
      round_off: -0.26,
      grand_total: 104732,
      notes: "Auto-inwarded: Yogeshwara Textiles Tax Invoice #YT328",
    });

    setTransport({
      transport_id: "",
      transport_name: "VEERABADRA TRANSPORT",
      lr_no: "SRVS",
      lr_date: "2025-09-16",
      vehicle_no: "",
      eway_bill_no: "112214406782",
      packages_count: 3,
      weight_kg: 0,
      freight_charges: 0,
    });

    const sampleItems = [
      { name: "SIBURi QUEEN", hsn: "540784", qty: 30, rate: 260, amount: 7800, sp: 349, mrp: 449 },
      { name: "Kundan", hsn: "540784", qty: 10, rate: 260, amount: 2600, sp: 349, mrp: 449 },
      { name: "White Rose", hsn: "540784", qty: 24, rate: 260, amount: 6240, sp: 349, mrp: 449 },
      { name: "CRYSTAL", hsn: "540784", qty: 101, rate: 245, amount: 24745, sp: 329, mrp: 399 },
      { name: "Jack Pot", hsn: "540784", qty: 87, rate: 210, amount: 18270, sp: 279, mrp: 349 },
      { name: "RICH LOOK (ASTA JARI)", hsn: "540784", qty: 46, rate: 250, amount: 11500, sp: 329, mrp: 399 },
      { name: "Sparkle", hsn: "540784", qty: 79, rate: 210, amount: 16590, sp: 279, mrp: 349 },
      { name: "Copper Star", hsn: "540784", qty: 24, rate: 500, amount: 12000, sp: 649, mrp: 799 },
    ];

    setItems(
      sampleItems.map((it, idx) => {
        const taxVal = (it.amount * 5) / 100;
        return {
          id: `line-${idx}`,
          description: it.name,
          hsn: it.hsn,
          quantity: it.qty,
          unit: "Pcs",
          rate: it.rate,
          tax_percent: 5,
          tax_amount: taxVal,
          discount: 0,
          amount: it.amount,
          selling_price: it.sp,
          mrp: it.mrp,
          product_id: catalogProducts[idx]?.id || "",
          is_new_product: !catalogProducts[idx],
          new_product_data: {
            name: it.name,
            code: "",
            sku: "",
            category_id: categories[0]?.id || "",
            brand_id: brands[0]?.id || "",
            tax_id: taxes[0]?.id || "",
            unit: "Pcs",
            hsn_code: it.hsn,
            cost_price: it.rate,
            selling_price: it.sp,
            mrp: it.mrp,
          },
        };
      })
    );

    setRawExtraction({
      success: true,
      ocr_engine: "in_app_builtin_engine",
      parser_status: "pixel_perfect_ai",
      text: "TAX INVOICE: YOGESHWARA TEXTILES YT328 (Bangalore)",
    });
  };

  const handleReset = () => {
    setFile(null);
    setRawExtraction(null);
    setExecutionResult(null);
    setError("");
    setSupplier({ id: "", name: "", gstin: "", phone: "", address: "" });
    setInvoice({
      invoice_no: "",
      supplier_invoice_no: "",
      invoice_date: new Date().toISOString().split("T")[0],
      due_date: "",
      subtotal: 0,
      tax_amount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      round_off: 0,
      grand_total: 0,
      notes: "Auto-inwarded via Invoice AI",
    });
    setTransport({
      transport_id: "",
      transport_name: "",
      lr_no: "",
      lr_date: new Date().toISOString().split("T")[0],
      vehicle_no: "",
      eway_bill_no: "",
      packages_count: 1,
      weight_kg: 0,
      freight_charges: 0,
    });
    setItems([]);
  };

  const isImage = Boolean(file?.type?.startsWith("image/"));
  const hasExtracted = Boolean(rawExtraction);

  return (
    <Box
      component="section"
      sx={{
        minHeight: "100%",
        bgcolor: "background.default",
        p: { xs: 1.5, sm: 2, md: 3 },
        pb: { xs: 5, md: 6 },
      }}
    >
      {/* Top Navigation Bar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          mb: { xs: 2, md: 2.5 },
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
          <IconButton
            onClick={() => navigate("/warehouse")}
            aria-label="Back to Warehouse"
            sx={{
              height: { xs: 34, sm: 38 },
              width: { xs: 34, sm: 38 },
              flexShrink: 0,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "8px",
              bgcolor: "background.paper",
            }}
          >
            <ArrowLeft size={16} />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Sparkles size={18} style={{ color: INDIGO, flexShrink: 0 }} />
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: 16, sm: 18, md: 22 },
                  fontWeight: 700,
                  color: "text.primary",
                  lineHeight: 1.25,
                }}
              >
                AI Purchase Invoice Inwarding
              </Typography>
            </Stack>
            <Typography
              sx={{
                mt: 0.25,
                fontSize: { xs: 11, sm: 12.5 },
                color: "text.secondary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: { xs: "nowrap", sm: "normal" },
              }}
            >
              Extract invoice → Manual review & product check → Automated Transport, Invoice & Inventory Entry → Barcode Generation
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            alignSelf: { xs: "flex-end", sm: "center" },
            flexShrink: 0,
          }}
        >
          {hasExtracted && (
            <Button
              onClick={handleReset}
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<RotateCcw size={14} />}
              sx={{ borderRadius: "8px", textTransform: "none", fontSize: { xs: 11, sm: 12 } }}
            >
              Start Over
            </Button>
          )}
          <Chip
            icon={hasExtracted ? <CheckCircle2 size={14} /> : <Sparkles size={14} />}
            label={hasExtracted ? "Extracted & Ready for Review" : "AI Ready"}
            color={hasExtracted ? "success" : "default"}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 600, fontSize: { xs: 10.5, sm: 11 } }}
          />
        </Stack>
      </Stack>

      {/* Error Banner */}
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2.5, borderRadius: "8px" }}>
          {error}
        </Alert>
      )}

      {/* SUCCESS SCREEN (Phase 4: Complete Inwarding Hub) */}
      {executionResult && (
        <Card variant="outlined" sx={{ mb: 3, borderRadius: "12px", borderColor: "success.main", boxShadow: 2, overflow: "hidden" }}>
          <Box sx={{ bgcolor: (theme) => alpha(theme.palette.success.main, 0.1), p: { xs: 2, sm: 3 }, borderBottom: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <CheckCircle2 size={32} style={{ color: "#10b981", flexShrink: 0 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "success.dark", fontSize: { xs: 15, sm: 18 } }}>
                  Purchase Inwarding Flow Successfully Created!
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, fontSize: { xs: 12, sm: 13 } }}>
                  Transport Entry, Purchase Invoice, Products, Inventory Entry, and Barcodes have all been registered cleanly.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
              <Box sx={{ p: 2, borderRadius: "8px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                  <Truck size={16} style={{ color: INDIGO }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", color: "text.secondary" }}>
                    Transport Entry
                  </Typography>
                </Stack>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  LR #{executionResult.transport_entry?.lr_no || "—"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  ID: {executionResult.transport_entry?.id} · {executionResult.transport_entry?.packages_count} Pkgs
                </Typography>
              </Box>

              <Box sx={{ p: 2, borderRadius: "8px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                  <Receipt size={16} style={{ color: "#10b981" }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", color: "text.secondary" }}>
                    Purchase Invoice
                  </Typography>
                </Stack>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {executionResult.purchase_invoice?.invoice_no || "—"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Total: ₹{Number(executionResult.purchase_invoice?.grand_total || 0).toLocaleString("en-IN")}
                </Typography>
              </Box>

              <Box sx={{ p: 2, borderRadius: "8px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                  <Package size={16} style={{ color: "#f59e0b" }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", color: "text.secondary" }}>
                    Inventory Entry
                  </Typography>
                </Stack>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {executionResult.inventory_entry?.entry_no || "—"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {executionResult.total_items_processed} Items Processed
                </Typography>
              </Box>

              <Box sx={{ p: 2, borderRadius: "8px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                  <Tag size={16} style={{ color: "#8b5cf6" }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", color: "text.secondary" }}>
                    Barcodes Ready
                  </Typography>
                </Stack>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {executionResult.barcodes_count} Barcodes
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Labels generated
                </Typography>
              </Box>
            </Box>

            {/* Quick Action Navigation Buttons */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button
                variant="contained"
                onClick={() =>
                  navigate(
                    `/warehouse/barcode?transport_entry_id=${executionResult.transport_entry?.id || ""}`
                  )
                }
                startIcon={<Printer size={16} />}
                sx={{
                  bgcolor: INDIGO,
                  "&:hover": { bgcolor: INDIGO_HOVER },
                  borderRadius: "8px",
                  fontWeight: 600,
                  textTransform: "none",
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                Print Barcode Labels Now
              </Button>

              <Button
                variant="outlined"
                onClick={() =>
                  navigate(`/warehouse/invoice?invoice_id=${executionResult.purchase_invoice?.id || ""}`)
                }
                startIcon={<Receipt size={16} />}
                sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 500, width: { xs: "100%", sm: "auto" } }}
              >
                View Purchase Invoice
              </Button>

              <Button
                variant="outlined"
                onClick={() =>
                  navigate(`/warehouse/inventory-entry?id=${executionResult.inventory_entry?.id || ""}`)
                }
                startIcon={<Package size={16} />}
                sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 500, width: { xs: "100%", sm: "auto" } }}
              >
                View Inventory Entry
              </Button>

              <Button
                variant="outlined"
                color="inherit"
                onClick={handleReset}
                startIcon={<UploadCloud size={16} />}
                sx={{ borderRadius: "8px", textTransform: "none", width: { xs: "100%", sm: "auto" } }}
              >
                Inward Another Invoice
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* MAIN WORKSPACE */}
      {!executionResult && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: hasExtracted ? "350px 1fr" : "1fr",
              lg: hasExtracted ? "390px 1fr" : "1fr",
              xl: hasExtracted ? "440px 1fr" : "1fr",
            },
            gap: { xs: 2, md: 2.5 },
            alignItems: "start",
          }}
        >
          {/* LEFT PANEL: UPLOAD & DOCUMENT PREVIEW */}
          <Card variant="outlined" sx={{ borderRadius: "12px", overflow: "hidden" }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2.5, py: 1.75, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <FileText size={16} style={{ color: INDIGO }} />
                <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>Invoice Document</Typography>
              </Stack>
              {file && (
                <IconButton size="small" onClick={() => setFile(null)} aria-label="Remove invoice">
                  <X size={16} />
                </IconButton>
              )}
            </Box>

            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <input
                ref={fileInputRef}
                id="invoice-upload-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                onChange={(e) => {
                  handleFileSelect(e.target.files?.[0]);
                  e.target.value = "";
                }}
                style={{ display: "none" }}
              />

              {!file && !hasExtracted ? (
                <Box>
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      handleFileSelect(e.dataTransfer.files?.[0]);
                    }}
                    sx={{
                      display: "flex",
                      minHeight: { xs: 200, sm: 260 },
                      cursor: "pointer",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "10px",
                      border: "2px dashed",
                      borderColor: dragging ? INDIGO : "divider",
                      bgcolor: dragging ? alpha(INDIGO, 0.08) : "action.hover",
                      transition: "all 0.15s",
                      p: { xs: 2, sm: 3 },
                      textAlign: "center",
                      outline: "none",
                      "&:hover": { borderColor: INDIGO, bgcolor: alpha(INDIGO, 0.04) },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        height: { xs: 48, sm: 56 },
                        width: { xs: 48, sm: 56 },
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "12px",
                        bgcolor: (theme) => alpha(INDIGO, 0.1),
                        mb: 2,
                      }}
                    >
                      <UploadCloud size={28} style={{ color: INDIGO }} />
                    </Box>
                    <Typography sx={{ fontSize: { xs: 13, sm: 14 }, fontWeight: 600, color: "text.primary" }}>
                      Drop purchase invoice here or browse
                    </Typography>
                    <Typography sx={{ mt: 0.5, fontSize: 11.5, color: "text.secondary" }}>
                      PDF, JPG, PNG or WEBP (Up to 15 MB)
                    </Typography>

                    <Button
                      variant="contained"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      sx={{
                        mt: 2,
                        bgcolor: INDIGO,
                        "&:hover": { bgcolor: INDIGO_HOVER },
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: "8px",
                      }}
                    >
                      Browse Invoice File
                    </Button>
                  </Box>

                  {/* Sample Verification Quick Loader */}
                  <Box sx={{ mt: 2, textAlign: "center" }}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={handleLoadSample}
                      startIcon={<Sparkles size={14} />}
                      sx={{
                        textTransform: "none",
                        fontSize: 12,
                        color: INDIGO,
                        fontWeight: 600,
                        "&:hover": { bgcolor: alpha(INDIGO, 0.08) },
                      }}
                    >
                      Test with Sample Purchase Invoice Data
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: "8px", mb: 2 }}>
                    {isImage ? <ImageIcon size={20} style={{ color: INDIGO }} /> : <FileText size={20} style={{ color: INDIGO }} />}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {file?.name || "Sample Invoice Loaded"}
                      </Typography>
                      <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
                        {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Demo Verification"}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ textTransform: "none", fontSize: 11.5, color: INDIGO, fontWeight: 600 }}
                    >
                      Change File
                    </Button>
                  </Stack>

                  {/* PROMINENT TOP ACTION: Proceed to Extract Button */}
                  {!hasExtracted && !extracting && file && (
                    <Box
                      sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: "10px",
                        bgcolor: (theme) => alpha(INDIGO, 0.08),
                        border: "1px solid",
                        borderColor: alpha(INDIGO, 0.3),
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { sm: "center" },
                        justifyContent: "space-between",
                        gap: 1.5,
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "text.primary" }}>
                          Invoice Ready for Analysis
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                          Extracts GSTIN, supplier, carrier, LR, line items & taxes automatically.
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        onClick={handleExtract}
                        startIcon={<Sparkles size={16} />}
                        sx={{
                          bgcolor: INDIGO,
                          "&:hover": { bgcolor: INDIGO_HOVER },
                          fontWeight: 700,
                          textTransform: "none",
                          borderRadius: "8px",
                          px: 2.5,
                          py: 1,
                          boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
                          flexShrink: 0,
                          width: { xs: "100%", sm: "auto" },
                        }}
                      >
                        Proceed to Extract Invoice
                      </Button>
                    </Box>
                  )}

                  {/* LIVE EXTRACTION PROGRESS CARD */}
                  {extracting && (
                    <Card
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        mb: 2,
                        borderRadius: "10px",
                        bgcolor: (theme) => alpha(INDIGO, 0.06),
                        borderColor: alpha(INDIGO, 0.35),
                        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.12)",
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <CircularProgress size={18} sx={{ color: INDIGO }} />
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "text.primary" }}>
                            Analyzing Purchase Invoice...
                          </Typography>
                        </Stack>
                        <Chip
                          label={`${extractProgress}%`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor: INDIGO,
                            color: "#fff",
                            fontSize: 11,
                          }}
                        />
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={extractProgress}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: alpha(INDIGO, 0.15),
                          "& .MuiLinearProgress-bar": {
                            bgcolor: INDIGO,
                            borderRadius: 4,
                          },
                          mb: 1.5,
                        }}
                      />

                      <Typography sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
                        {extractStep}
                      </Typography>
                    </Card>
                  )}

                  {/* Document Viewer Preview */}
                  {file && isImage ? (
                    <Box
                      sx={{
                        display: "flex",
                        maxHeight: { xs: 260, sm: 380, md: 480 },
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "action.hover",
                        borderRadius: "8px",
                        overflow: "hidden",
                        p: 1.5,
                      }}
                    >
                      <Box
                        component="img"
                        src={previewUrl}
                        alt="Invoice Preview"
                        sx={{ maxHeight: { xs: 240, sm: 360, md: 440 }, maxWidth: "100%", objectFit: "contain", borderRadius: "4px" }}
                      />
                    </Box>
                  ) : file ? (
                    <Box
                      sx={{
                        minHeight: { xs: 280, sm: 360, md: 440 },
                        height: { xs: 300, sm: 380, md: 440 },
                        bgcolor: "action.hover",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <iframe
                        src={previewUrl}
                        title="Invoice PDF Preview"
                        style={{ width: "100%", height: "100%", border: "none" }}
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        minHeight: 240,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "action.hover",
                        borderRadius: "8px",
                        p: 3,
                      }}
                    >
                      <Receipt size={44} style={{ color: INDIGO, marginBottom: 8 }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        Sample Verification Mode
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.5, textAlign: "center" }}>
                        Extracted fields populated across all review tabs for verification.
                      </Typography>
                    </Box>
                  )}

                  {!hasExtracted && file && !extracting && (
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleExtract}
                      disabled={extracting}
                      startIcon={<Sparkles size={16} />}
                      sx={{
                        mt: 2,
                        py: 1.25,
                        bgcolor: INDIGO,
                        "&:hover": { bgcolor: INDIGO_HOVER },
                        fontWeight: 600,
                        textTransform: "none",
                      }}
                    >
                      Extract Invoice Details
                    </Button>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* RIGHT PANEL: INTERACTIVE REVIEW & VERIFICATION TABS */}
          {hasExtracted && (
            <Card variant="outlined" sx={{ borderRadius: "12px", overflow: "hidden" }}>
              <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
                <Tabs
                  value={activeTab}
                  onChange={(e, val) => setActiveTab(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, fontSize: 12.5, minHeight: 48 } }}
                >
                  <Tab
                    value="invoice"
                    icon={<Receipt size={16} />}
                    iconPosition="start"
                    label="1. Supplier & Invoice"
                  />
                  <Tab
                    value="transport"
                    icon={<Truck size={16} />}
                    iconPosition="start"
                    label="2. Transport & Logistics"
                  />
                  <Tab
                    value="items"
                    icon={<Package size={16} />}
                    iconPosition="start"
                    label={`3. Line Items (${items.length})`}
                  />
                  <Tab
                    value="barcode"
                    icon={<Tag size={16} />}
                    iconPosition="start"
                    label="4. Barcode Setup"
                  />
                </Tabs>
              </Box>

              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                {/* TAB 1: SUPPLIER & INVOICE DETAILS */}
                {activeTab === "invoice" && (
                  <Stack spacing={2.5}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                      Supplier Information
                    </Typography>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          Select Existing Supplier (or type new)
                        </Typography>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={supplier.id}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = supplierList.find((s) => String(s.id) === String(val));
                            if (found) {
                              setSupplier({
                                id: found.id,
                                name: found.name,
                                gstin: found.gstin || "",
                                phone: found.phone || "",
                                address: found.address || "",
                              });
                            } else {
                              setSupplier((prev) => ({ ...prev, id: "" }));
                            }
                          }}
                          sx={{ mt: 0.5 }}
                        >
                          <MenuItem value="">-- Pick from Master Database --</MenuItem>
                          {supplierList.map((sup) => (
                            <MenuItem key={sup.id} value={sup.id}>
                              {sup.name} {sup.gstin ? `(${sup.gstin})` : ""}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>

                      <TextField
                        label="Supplier Name"
                        size="small"
                        value={supplier.name}
                        onChange={(e) => setSupplier((prev) => ({ ...prev, name: e.target.value }))}
                        fullWidth
                      />

                      <TextField
                        label="GSTIN"
                        size="small"
                        value={supplier.gstin}
                        onChange={(e) => setSupplier((prev) => ({ ...prev, gstin: e.target.value }))}
                        fullWidth
                      />

                      <TextField
                        label="Phone"
                        size="small"
                        value={supplier.phone}
                        onChange={(e) => setSupplier((prev) => ({ ...prev, phone: e.target.value }))}
                        fullWidth
                      />

                      <TextField
                        label="Supplier Address"
                        size="small"
                        value={supplier.address}
                        onChange={(e) => setSupplier((prev) => ({ ...prev, address: e.target.value }))}
                        fullWidth
                        sx={{ gridColumn: { sm: "span 2" } }}
                      />
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                      Invoice Header & Financial Totals
                    </Typography>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 2 }}>
                      <TextField
                        label="Invoice No."
                        size="small"
                        value={invoice.invoice_no}
                        onChange={(e) => setInvoice((prev) => ({ ...prev, invoice_no: e.target.value }))}
                        fullWidth
                        required
                      />

                      <TextField
                        label="Supplier Ref/Invoice No."
                        size="small"
                        value={invoice.supplier_invoice_no}
                        onChange={(e) =>
                          setInvoice((prev) => ({ ...prev, supplier_invoice_no: e.target.value }))
                        }
                        fullWidth
                      />

                      <TextField
                        label="Invoice Date"
                        type="date"
                        size="small"
                        value={invoice.invoice_date}
                        onChange={(e) => setInvoice((prev) => ({ ...prev, invoice_date: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />

                      <TextField
                        label="Subtotal (₹)"
                        type="number"
                        size="small"
                        value={invoice.subtotal}
                        onChange={(e) => setInvoice((prev) => ({ ...prev, subtotal: Number(e.target.value) }))}
                        fullWidth
                      />

                      <TextField
                        label="Tax Amount (₹)"
                        type="number"
                        size="small"
                        value={invoice.tax_amount}
                        onChange={(e) => setInvoice((prev) => ({ ...prev, tax_amount: Number(e.target.value) }))}
                        fullWidth
                      />

                      <TextField
                        label="Grand Total (₹)"
                        type="number"
                        size="small"
                        value={invoice.grand_total}
                        onChange={(e) => setInvoice((prev) => ({ ...prev, grand_total: Number(e.target.value) }))}
                        fullWidth
                        sx={{ fontWeight: 700 }}
                      />

                      <TextField
                        label="CGST (₹)"
                        type="number"
                        size="small"
                        value={invoice.cgst}
                        onChange={(e) => setInvoice((prev) => ({ ...prev, cgst: Number(e.target.value) }))}
                        fullWidth
                      />

                      <TextField
                        label="SGST (₹)"
                        type="number"
                        size="small"
                        value={invoice.sgst}
                        onChange={(e) => setInvoice((prev) => ({ ...prev, sgst: Number(e.target.value) }))}
                        fullWidth
                      />

                      <TextField
                        label="IGST (₹)"
                        type="number"
                        size="small"
                        value={invoice.igst}
                        onChange={(e) => setInvoice((prev) => ({ ...prev, igst: Number(e.target.value) }))}
                        fullWidth
                      />
                    </Box>
                  </Stack>
                )}

                {/* TAB 2: TRANSPORT & LOGISTICS */}
                {activeTab === "transport" && (
                  <Stack spacing={2.5}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                      Transport & Logistics Details (Feeds into Transport Entry)
                    </Typography>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          Transporter Master (or type new name)
                        </Typography>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={transport.transport_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            const found = transportList.find((t) => String(t.id) === String(val));
                            if (found) {
                              setTransport((prev) => ({
                                ...prev,
                                transport_id: found.id,
                                transport_name: found.name,
                              }));
                            } else {
                              setTransport((prev) => ({ ...prev, transport_id: "" }));
                            }
                          }}
                          sx={{ mt: 0.5 }}
                        >
                          <MenuItem value="">-- Select from Master Database --</MenuItem>
                          {transportList.map((t) => (
                            <MenuItem key={t.id} value={t.id}>
                              {t.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>

                      <TextField
                        label="Transporter Name"
                        size="small"
                        value={transport.transport_name}
                        onChange={(e) => setTransport((prev) => ({ ...prev, transport_name: e.target.value }))}
                        fullWidth
                      />

                      <TextField
                        label="LR / Docket / Bilty No."
                        size="small"
                        value={transport.lr_no}
                        onChange={(e) => setTransport((prev) => ({ ...prev, lr_no: e.target.value }))}
                        fullWidth
                        placeholder="Leave blank to auto-generate"
                      />

                      <TextField
                        label="LR Date"
                        type="date"
                        size="small"
                        value={transport.lr_date}
                        onChange={(e) => setTransport((prev) => ({ ...prev, lr_date: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                      />

                      <TextField
                        label="Vehicle Number"
                        size="small"
                        value={transport.vehicle_no}
                        onChange={(e) => setTransport((prev) => ({ ...prev, vehicle_no: e.target.value }))}
                        placeholder="e.g. TN-01-AB-1234"
                        fullWidth
                      />

                      <TextField
                        label="E-Way Bill Number"
                        size="small"
                        value={transport.eway_bill_no}
                        onChange={(e) => setTransport((prev) => ({ ...prev, eway_bill_no: e.target.value }))}
                        placeholder="12 digit number"
                        fullWidth
                      />

                      <TextField
                        label="No. of Packages / Bundles"
                        type="number"
                        size="small"
                        value={transport.packages_count}
                        onChange={(e) =>
                          setTransport((prev) => ({ ...prev, packages_count: Number(e.target.value) }))
                        }
                        fullWidth
                      />

                      <TextField
                        label="Weight (Kg)"
                        type="number"
                        size="small"
                        value={transport.weight_kg}
                        onChange={(e) => setTransport((prev) => ({ ...prev, weight_kg: Number(e.target.value) }))}
                        fullWidth
                      />

                      <TextField
                        label="Freight Charges (₹)"
                        type="number"
                        size="small"
                        value={transport.freight_charges}
                        onChange={(e) =>
                          setTransport((prev) => ({ ...prev, freight_charges: Number(e.target.value) }))
                        }
                        fullWidth
                      />
                    </Box>
                  </Stack>
                )}

                {/* TAB 3: PRODUCTS & INVENTORY ITEMS (CORE MATCHING WORKSPACE) */}
                {activeTab === "items" && (
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      sx={{
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "space-between",
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                          Extracted Line Items & Product Mapping
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          Verify matched products or toggle "New Product" to register them in the master catalog.
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={recalculateTotalsFromItems}
                        startIcon={<RotateCcw size={14} />}
                        sx={{ textTransform: "none", fontSize: 11.5, flexShrink: 0 }}
                      >
                        Recalculate Totals
                      </Button>
                    </Stack>

                    <Box sx={{ overflowX: "auto", border: "1px solid", borderColor: "divider", borderRadius: "8px", WebkitOverflowScrolling: "touch" }}>
                      <Table size="small" sx={{ minWidth: 720 }}>
                        <TableHead sx={{ bgcolor: "action.hover" }}>
                          <TableRow>
                            <TableCell sx={{ fontSize: 11, fontWeight: 700, width: 40 }}>#</TableCell>
                            <TableCell sx={{ fontSize: 11, fontWeight: 700, minWidth: 200 }}>
                              Description (OCR)
                            </TableCell>
                            <TableCell sx={{ fontSize: 11, fontWeight: 700, width: 90 }}>Qty</TableCell>
                            <TableCell sx={{ fontSize: 11, fontWeight: 700, width: 110 }}>Rate (₹)</TableCell>
                            <TableCell sx={{ fontSize: 11, fontWeight: 700, width: 90 }}>Tax %</TableCell>
                            <TableCell sx={{ fontSize: 11, fontWeight: 700, width: 120 }}>Total (₹)</TableCell>
                            <TableCell sx={{ fontSize: 11, fontWeight: 700, minWidth: 260 }}>
                              Product Assignment (Existing vs New)
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {items.map((item, index) => (
                            <TableRow key={item.id} hover>
                              <TableCell sx={{ fontSize: 11 }}>{index + 1}</TableCell>

                              {/* Description */}
                              <TableCell>
                                <TextField
                                  size="small"
                                  fullWidth
                                  value={item.description}
                                  onChange={(e) => updateItem(index, "description", e.target.value)}
                                  sx={{ "& .MuiInputBase-input": { fontSize: 11.5, py: 0.5 } }}
                                />
                                {item.hsn && (
                                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: 10 }}>
                                    HSN: {item.hsn}
                                  </Typography>
                                )}
                              </TableCell>

                              {/* Quantity */}
                              <TableCell>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                  sx={{ width: 80, "& .MuiInputBase-input": { fontSize: 11.5, py: 0.5 } }}
                                />
                              </TableCell>

                              {/* Rate */}
                              <TableCell>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={item.rate}
                                  onChange={(e) => updateItem(index, "rate", e.target.value)}
                                  sx={{ width: 100, "& .MuiInputBase-input": { fontSize: 11.5, py: 0.5 } }}
                                />
                              </TableCell>

                              {/* Tax % */}
                              <TableCell>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={item.tax_percent}
                                  onChange={(e) => updateItem(index, "tax_percent", e.target.value)}
                                  sx={{ width: 80, "& .MuiInputBase-input": { fontSize: 11.5, py: 0.5 } }}
                                />
                              </TableCell>

                              {/* Line Total */}
                              <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>
                                ₹{Number(item.amount || 0).toFixed(2)}
                              </TableCell>

                              {/* Product Matching & New Product Setup */}
                              <TableCell>
                                <Stack spacing={1}>
                                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                    <Chip
                                      size="small"
                                      label={item.is_new_product ? "New Product" : "Existing"}
                                      color={item.is_new_product ? "warning" : "success"}
                                      variant={item.is_new_product ? "filled" : "outlined"}
                                      sx={{ fontSize: 10, height: 20 }}
                                    />
                                    <FormControlLabel
                                      control={
                                        <Switch
                                          size="small"
                                          checked={item.is_new_product}
                                          onChange={(e) => toggleNewProduct(index, e.target.checked)}
                                        />
                                      }
                                      label={
                                        <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                                          Create as New
                                        </Typography>
                                      }
                                      sx={{ m: 0 }}
                                    />
                                  </Stack>

                                  {!item.is_new_product ? (
                                    <TextField
                                      select
                                      size="small"
                                      fullWidth
                                      value={item.product_id || ""}
                                      onChange={(e) => updateItem(index, "product_id", e.target.value)}
                                      sx={{ "& .MuiInputBase-input": { fontSize: 11.5, py: 0.5 } }}
                                    >
                                      <MenuItem value="">-- Select Existing Product --</MenuItem>
                                      {/* Preloaded catalog options */}
                                      {item.product_id && (
                                        <MenuItem value={item.product_id}>
                                          Assigned Product (#{item.product_id})
                                        </MenuItem>
                                      )}
                                      {categories.map((c) => (
                                        <MenuItem key={c.id} value={c.id}>
                                          {c.name}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                  ) : (
                                    <Box
                                      sx={{
                                        p: 1.5,
                                        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                                        borderRadius: "6px",
                                        border: "1px dashed",
                                        borderColor: "warning.main",
                                      }}
                                    >
                                      <Stack spacing={1}>
                                        <TextField
                                          label="New Product Name"
                                          size="small"
                                          value={item.new_product_data?.name || ""}
                                          onChange={(e) => updateNewProductField(index, "name", e.target.value)}
                                          sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                                        />

                                        <Stack direction="row" spacing={1}>
                                          <TextField
                                            label="Selling Price (₹)"
                                            type="number"
                                            size="small"
                                            value={item.selling_price}
                                            onChange={(e) => {
                                              updateItem(index, "selling_price", Number(e.target.value));
                                              updateNewProductField(index, "selling_price", Number(e.target.value));
                                            }}
                                            sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                                          />
                                          <TextField
                                            label="MRP (₹)"
                                            type="number"
                                            size="small"
                                            value={item.mrp}
                                            onChange={(e) => {
                                              updateItem(index, "mrp", Number(e.target.value));
                                              updateNewProductField(index, "mrp", Number(e.target.value));
                                            }}
                                            sx={{ "& .MuiInputBase-input": { fontSize: 11, py: 0.5 } }}
                                          />
                                        </Stack>
                                      </Stack>
                                    </Box>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </Stack>
                )}

                {/* TAB 4: BARCODE CONFIGURATION */}
                {activeTab === "barcode" && (
                  <Stack spacing={2.5}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                      Barcode Generation Parameters
                    </Typography>

                    <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: "8px", bgcolor: "action.hover" }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={generateBarcodes}
                            onChange={(e) => setGenerateBarcodes(e.target.checked)}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                              Generate Barcodes Automatically
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              Automatically creates stickers and inventory barcodes for all items upon flow approval.
                            </Typography>
                          </Box>
                        }
                      />

                      {generateBarcodes && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 1, display: "block" }}>
                            Barcode Type
                          </Typography>
                          <TextField
                            select
                            size="small"
                            value={barcodeCodeType}
                            onChange={(e) => setBarcodeCodeType(e.target.value)}
                            sx={{ width: 220 }}
                          >
                            <MenuItem value="barcode">Standard Barcode (Code128)</MenuItem>
                            <MenuItem value="code">Product Code Label</MenuItem>
                          </TextField>
                        </Box>
                      )}
                    </Box>
                  </Stack>
                )}

                {/* Action Footer */}
                <Divider sx={{ my: 3 }} />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{
                    alignItems: { xs: "stretch", sm: "center" },
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Review Summary:
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                      {items.length} Items · Grand Total: ₹{Number(invoice.grand_total || 0).toLocaleString("en-IN")}
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleExecutePurchaseFlow}
                    disabled={executing}
                    startIcon={executing ? <CircularProgress size={18} color="inherit" /> : <CheckCircle2 size={18} />}
                    sx={{
                      bgcolor: "success.main",
                      "&:hover": { bgcolor: "success.dark" },
                      fontWeight: 700,
                      px: 3,
                      py: 1.25,
                      borderRadius: "8px",
                      textTransform: "none",
                      fontSize: 13.5,
                      boxShadow: 2,
                      width: { xs: "100%", sm: "auto" },
                    }}
                  >
                    {executing ? "Processing Purchase Flow..." : "Approve & Create Purchase Entry Flow"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
}
