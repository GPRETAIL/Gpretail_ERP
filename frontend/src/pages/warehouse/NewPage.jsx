import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  Save,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import api from "../../api/axios";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const NewPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [supplierId, setSupplierId] = useState("");
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [productOptions, setProductOptions] = useState({});
  const [selectedProducts, setSelectedProducts] = useState({});

  const previewUrl = useMemo(() => {
    if (!file || !file.type.startsWith("image/")) return "";
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectFile = (candidate) => {
    setError("");
    setResult(null);
    setSupplierId("");
    setSupplierOptions([]);
    setProductOptions({});
    setSelectedProducts({});
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError("Please select a PDF, JPG, PNG, or WEBP file.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setError("File size must be 15 MB or smaller.");
      return;
    }
    setFile(candidate);
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setError("");
  };

  const processInvoice = async () => {
    if (!file) return;
    setProcessing(true);
    setError("");
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await api.post("/v1/invoice-ai/extract", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180000,
      });
      const payload = response.data;
      if (!payload?.success) throw new Error(payload?.message || "Invoice processing failed");
      setResult(payload);

      const supplierName = payload.invoice?.supplier?.name;
      if (supplierName) {
        const supplierResponse = await api.get("/suppliers", { params: { search: supplierName, limit: 10 } });
        setSupplierOptions(supplierResponse.data?.data || []);
      }

      const items = payload.invoice?.items || [];
      const options = {};
      await Promise.all(items.map(async (item, index) => {
        if (!item.description) return;
        try {
          const productResponse = await api.get("/products", {
            params: { search: item.description, dropdown: true, limit: 10 },
          });
          options[index] = productResponse.data?.data || [];
        } catch {
          options[index] = [];
        }
      }));
      setProductOptions(options);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to process invoice");
    } finally {
      setProcessing(false);
    }
  };

  const updateItem = (index, field, value) => {
    setResult((current) => {
      if (!current) return current;
      const items = [...(current.invoice?.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...current, invoice: { ...current.invoice, items } };
    });
  };

  const savePurchaseInvoice = async () => {
    if (!result) return;
    const items = result.invoice?.items || [];
    if (!supplierId) {
      setError("Select the supplier before creating the purchase invoice.");
      return;
    }
    if (!items.length) {
      setError("No invoice line items were extracted. Review the invoice manually before posting.");
      return;
    }
    const missing = items.findIndex((_, index) => !selectedProducts[index]);
    if (missing >= 0) {
      setError(`Select a product for line ${missing + 1} before creating the purchase invoice.`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const subtotal = Number(result.invoice?.totals?.subtotal || 0);
      const tax = Number(result.invoice?.tax?.cgst || 0) + Number(result.invoice?.tax?.sgst || 0) + Number(result.invoice?.tax?.igst || 0);
      const payload = {
        supplier_id: Number(supplierId),
        invoice_date: result.invoice?.invoice?.date || undefined,
        supplier_invoice_no: result.invoice?.invoice?.number || undefined,
        status: "APPROVED",
        notes: "Created from Invoice AI extraction; verify OCR fields before final posting.",
        items: items.map((item, index) => {
          const quantity = Number(item.quantity || 1);
          const rate = Number(item.rate || 0);
          const base = Number(item.amount || quantity * rate);
          const taxAmount = subtotal > 0 ? (base / subtotal) * tax : 0;
          return {
            product_id: Number(selectedProducts[index]),
            quantity,
            rate,
            tax_amount: Number(taxAmount.toFixed(2)),
            discount: Number(item.discount || 0),
          };
        }),
      };
      const response = await api.post("/invoices", payload);
      if (!response.data?.success) throw new Error(response.data?.message || "Purchase invoice creation failed");
      navigate("/warehouse/invoice");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to create purchase invoice");
    } finally {
      setSaving(false);
    }
  };

  const isImage = Boolean(file?.type?.startsWith("image/"));
  const hasResult = Boolean(result?.invoice);

  return (
    <section className="p-4 md:p-6 space-y-5 min-h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/warehouse")} className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition" aria-label="Back to Warehouse">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">Invoice AI</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload, extract, review and create a warehouse purchase invoice.</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs ${hasResult ? "text-emerald-600" : "text-gray-500"}`}>
          {hasResult ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          {hasResult ? "OCR completed" : "PaddleOCR ready"}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
            <div><h2 className="font-semibold text-gray-900 dark:text-white">Invoice Document</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">PDF, JPG, PNG or WEBP · Maximum 15 MB</p></div>
            {file && <button type="button" onClick={clearFile} className="text-xs text-gray-500 hover:text-red-600">Clear</button>}
          </div>
          <div className="p-5">
            {!file ? (
              <label htmlFor="warehouse-new-page-file" onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files?.[0]); }} className={`flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${dragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" : "border-gray-300 dark:border-gray-600 hover:border-indigo-400"}`}>
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center"><UploadCloud className="w-7 h-7 text-indigo-500" /></div>
                <p className="mt-5 text-sm font-semibold text-gray-800 dark:text-gray-100">Drop invoice here or browse files</p>
                <span className="mt-5 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Choose File</span>
                <input id="warehouse-new-page-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} />
              </label>
            ) : (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 min-w-0"><div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">{isImage ? <ImageIcon className="w-4 h-4 text-indigo-500" /> : <FileText className="w-4 h-4 text-indigo-500" />}</div><div className="min-w-0"><p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div></div>
                  <button type="button" onClick={clearFile} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Remove file"><X className="w-4 h-4" /></button>
                </div>
                {isImage ? <div className="min-h-[260px] max-h-[480px] p-5 flex items-center justify-center bg-gray-100 dark:bg-gray-950"><img src={previewUrl} alt="Selected invoice preview" className="max-h-[440px] max-w-full object-contain rounded-lg shadow-sm" /></div> : <div className="min-h-[260px] flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-900/50"><FileText className="w-12 h-12 text-gray-400" /><p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-200">PDF ready for OCR</p></div>}
              </div>
            )}

            {file && !hasResult && <button type="button" onClick={processInvoice} disabled={processing} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing invoice...</> : <><Sparkles className="w-4 h-4" /> Process Invoice with PaddleOCR</>}</button>}

            {hasResult && (
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Supplier" value={result.invoice.supplier?.name} />
                  <Field label="GSTIN" value={result.invoice.supplier?.gstin} />
                  <Field label="Invoice No." value={result.invoice.invoice?.number} />
                  <Field label="Invoice Date" value={result.invoice.invoice?.date} />
                  <Field label="Subtotal" value={result.invoice.totals?.subtotal} />
                  <Field label="Grand Total" value={result.invoice.totals?.grand_total} />
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"><h3 className="text-sm font-semibold text-gray-900 dark:text-white">Supplier & Product Mapping</h3><span className="text-xs text-gray-500">Required before posting</span></div>
                  <div className="p-4 space-y-4">
                    <div><label className="text-xs font-medium text-gray-600 dark:text-gray-300">Supplier</label><select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"><option value="">Select supplier</option>{supplierOptions.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
                    <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700"><th className="py-2 pr-3">OCR Description</th><th className="py-2 pr-3">Qty</th><th className="py-2 pr-3">Rate</th><th className="py-2 pr-3">Product</th></tr></thead><tbody>{(result.invoice.items || []).map((item, index) => <tr key={index} className="border-b last:border-0 border-gray-100 dark:border-gray-700"><td className="py-3 pr-3 min-w-[220px]"><input value={item.description || ""} onChange={(e) => updateItem(index, "description", e.target.value)} className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm" /></td><td className="py-3 pr-3"><input type="number" value={item.quantity ?? ""} onChange={(e) => updateItem(index, "quantity", e.target.value)} className="w-20 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm" /></td><td className="py-3 pr-3"><input type="number" value={item.rate ?? ""} onChange={(e) => updateItem(index, "rate", e.target.value)} className="w-24 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm" /></td><td className="py-3 min-w-[240px]"><select value={selectedProducts[index] || ""} onChange={(e) => setSelectedProducts((current) => ({ ...current, [index]: e.target.value }))} className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm"><option value="">Select product</option>{(productOptions[index] || []).map((product) => <option key={product.id} value={product.id}>{product.name} {product.code ? `(${product.code})` : ""}</option>)}</select></td></tr>)}</tbody></table></div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4"><div className="text-xs text-gray-500">OCR confidence: <strong>{result.confidence != null ? `${(Number(result.confidence) * 100).toFixed(1)}%` : "N/A"}</strong> · Validation: <strong>{result.validation?.status || "review_required"}</strong></div><button type="button" onClick={savePurchaseInvoice} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? "Creating..." : "Create Purchase Invoice"}</button></div>
              </div>
            )}

            {error && <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2.5 text-sm text-red-700 dark:text-red-300"><Info className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span></div>}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5"><div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" /><h2 className="font-semibold text-gray-900 dark:text-white">Processing Pipeline</h2></div><div className="mt-5 space-y-4">{[["01", "Upload", "React → Laravel"],["02", "PaddleOCR", "OCR server extracts text and layout"],["03", "Invoice Parser", "Header, tax and line items"],["04", "Review", "Supplier and product mapping"],["05", "Purchase Invoice", "Laravel writes MariaDB and stock"]].map(([number, title, description], index, rows) => <div key={number} className="flex gap-3"><div className="flex flex-col items-center"><span className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 text-[11px] font-semibold flex items-center justify-center">{number}</span>{index < rows.length - 1 && <span className="w-px flex-1 min-h-5 bg-gray-200 dark:bg-gray-700 mt-1" />}</div><div className="pb-2"><p className="text-sm font-medium text-gray-800 dark:text-gray-100">{title}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p></div></div>)}</div></div>
          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/70 dark:bg-indigo-950/20 p-5"><div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" /><div><p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Hostinger-safe architecture</p><p className="mt-1.5 text-xs leading-5 text-indigo-800/80 dark:text-indigo-300/80">Hostinger runs React, Laravel and MariaDB. The separate OCR server runs Python + FastAPI + PaddleOCR. Laravel is the only service that writes ERP data.</p></div></div></div>
        </aside>
      </div>
    </section>
  );
};

const Field = ({ label, value }) => <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3"><p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 text-sm font-medium text-gray-900 dark:text-white truncate">{value || "—"}</p></div>;

export default NewPage;
