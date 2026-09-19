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
import { Box, Stack, Typography, IconButton, Button, TextField, MenuItem, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 1 * 1024 * 1024;
const INDIGO = "#6366f1";
const INDIGO_HOVER = "#4f46e5";
const visuallyHiddenSx = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0 };

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

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setError("");
    setSupplierId("");
    setSupplierOptions([]);
    setProductOptions({});
    setSelectedProducts({});
  };

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
      setError("The free OCR provider accepts files up to 1 MB. Compress the invoice before uploading.");
      return;
    }

    setFile(candidate);
  };

  const processInvoice = async () => {
    if (!file || processing) return;

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
      if (!payload?.success) {
        throw new Error(payload?.message || "Invoice processing failed");
      }

      setResult(payload);

      const supplierName = payload.invoice?.supplier?.name;
      if (supplierName) {
        try {
          const supplierResponse = await api.get("/suppliers", {
            params: { search: supplierName, limit: 10 },
          });
          setSupplierOptions(supplierResponse.data?.data || []);
        } catch {
          setSupplierOptions([]);
        }
      }

      const items = payload.invoice?.items || [];
      const options = {};
      await Promise.all(
        items.map(async (item, index) => {
          if (!item.description) return;
          try {
            const productResponse = await api.get("/products", {
              params: { search: item.description, dropdown: true, limit: 10 },
            });
            options[index] = productResponse.data?.data || [];
          } catch {
            options[index] = [];
          }
        }),
      );
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
      const tax = Number(result.invoice?.tax?.cgst || 0)
        + Number(result.invoice?.tax?.sgst || 0)
        + Number(result.invoice?.tax?.igst || 0);

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
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Purchase invoice creation failed");
      }

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
    <Box component="section" sx={{ minHeight: "100%", bgcolor: "background.default", p: { xs: 2, md: 3 }, pb: 4 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "center" }, justifyContent: { md: "space-between" }, mb: 2.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
          <IconButton
            type="button"
            onClick={() => navigate("/warehouse")}
            aria-label="Back to Warehouse"
            sx={{ height: 36, width: 36, flexShrink: 0, border: "1px solid", borderColor: "divider", borderRadius: "7px", bgcolor: "background.paper", color: "text.secondary" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Sparkles className="w-5 h-5" style={{ color: INDIGO, flexShrink: 0 }} />
              <Typography component="h1" sx={{ fontSize: { xs: 17.5, md: 21 }, fontWeight: 600, color: "text.primary" }}>Invoice AI</Typography>
            </Stack>
            <Typography sx={{ mt: 0.5, fontSize: 12.25, color: "text.secondary" }}>Upload, extract, review and create a warehouse purchase invoice.</Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={0.75}
          sx={{ flexShrink: 0, alignItems: "center", borderRadius: 999, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", px: 1.5, py: 0.75, fontSize: 10.5, color: hasResult ? "success.main" : "text.secondary" }}
        >
          {hasResult ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
          <Box component="span">{hasResult ? "OCR completed" : "OCR API ready"}</Box>
        </Stack>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 360px" }, alignItems: "start", gap: 2.5 }}>
        <Box sx={{ overflow: "hidden", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", boxShadow: 1 }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2.5, py: 2 }}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} sx={{ lg: { alignItems: "center", justifyContent: "space-between" } }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography component="h2" sx={{ fontWeight: 600, color: "text.primary" }}>Invoice Document</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 12.25, color: "text.secondary" }}>PDF, JPG, PNG or WEBP · Maximum 1 MB on free OCR tier</Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", lg: "auto" }, flexShrink: 0 }}>
                {file && (
                  <Button
                    type="button"
                    onClick={clearFile}
                    variant="outlined"
                    color="inherit"
                    sx={{ minHeight: 40, borderRadius: "7px", fontSize: 12.25, fontWeight: 500 }}
                  >
                    Clear
                  </Button>
                )}
                {file && !hasResult && (
                  <Button
                    type="button"
                    onClick={processInvoice}
                    disabled={processing}
                    startIcon={processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    sx={{ minHeight: 40, borderRadius: "7px", fontSize: 12.25, fontWeight: 600, bgcolor: INDIGO, color: "#fff", boxShadow: 1, "&:hover": { bgcolor: INDIGO_HOVER } }}
                  >
                    {processing ? "Processing..." : "Process Invoice with OCR"}
                  </Button>
                )}
              </Stack>
            </Stack>

            {file && !hasResult && (
              <Box sx={(theme) => ({ mt: 1.5, borderRadius: "10.5px", border: "1px solid", borderColor: alpha(INDIGO, theme.palette.mode === "dark" ? 0.4 : 0.2), bgcolor: alpha(INDIGO, theme.palette.mode === "dark" ? 0.12 : 0.06), p: 1.5 })}>
                <Button
                  type="button"
                  onClick={processInvoice}
                  disabled={processing}
                  fullWidth
                  startIcon={processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  sx={{ minHeight: 48, borderRadius: "7px", fontSize: 12.25, fontWeight: 600, bgcolor: INDIGO, color: "#fff", boxShadow: 2, "&:hover": { bgcolor: INDIGO_HOVER } }}
                >
                  {processing ? "Processing invoice..." : "Process Invoice with OCR"}
                </Button>
              </Box>
            )}
          </Box>

          <Box sx={{ p: 2.5 }}>
            {!file ? (
              <Box
                component="label"
                htmlFor="warehouse-new-page-file"
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files?.[0]); }}
                sx={(theme) => ({
                  display: "flex",
                  minHeight: 300,
                  cursor: "pointer",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "10.5px",
                  border: "2px dashed",
                  borderColor: dragging ? INDIGO : "divider",
                  bgcolor: dragging ? alpha(INDIGO, theme.palette.mode === "dark" ? 0.16 : 0.06) : "transparent",
                  transition: "all 0.15s",
                  "&:hover": { borderColor: dragging ? INDIGO : alpha(INDIGO, 0.5) },
                })}
              >
                <Box sx={{ display: "flex", height: 56, width: 56, alignItems: "center", justifyContent: "center", borderRadius: "10.5px", bgcolor: (theme) => alpha(INDIGO, theme.palette.mode === "dark" ? 0.2 : 0.08) }}>
                  <UploadCloud className="w-7 h-7" style={{ color: INDIGO }} />
                </Box>
                <Typography sx={{ mt: 2.5, fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Drop invoice here or browse files</Typography>
                <Box component="span" sx={{ mt: 2.5, display: "inline-flex", alignItems: "center", borderRadius: "7px", bgcolor: INDIGO, px: 2, py: 1, fontSize: 12.25, fontWeight: 500, color: "#fff" }}>Choose File</Box>
                <Box component="input" id="warehouse-new-page-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => selectFile(event.target.files?.[0])} sx={visuallyHiddenSx} />
              </Box>
            ) : (
              <Box sx={{ overflow: "hidden", borderRadius: "10.5px", border: "1px solid", borderColor: "divider" }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                    <Box sx={{ display: "flex", height: 36, width: 36, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "7px", bgcolor: (theme) => alpha(INDIGO, theme.palette.mode === "dark" ? 0.2 : 0.08) }}>
                      {isImage ? <ImageIcon className="w-4 h-4" style={{ color: INDIGO }} /> : <FileText className="w-4 h-4" style={{ color: INDIGO }} />}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</Typography>
                      <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</Typography>
                    </Box>
                  </Stack>
                  <IconButton type="button" onClick={clearFile} aria-label="Remove file" sx={{ flexShrink: 0, color: "text.secondary" }}>
                    <X className="w-4 h-4" />
                  </IconButton>
                </Stack>

                {isImage ? (
                  <Box sx={{ display: "flex", minHeight: 260, maxHeight: 520, alignItems: "center", justifyContent: "center", bgcolor: "action.hover", p: 2.5 }}>
                    <Box component="img" src={previewUrl} alt="Selected invoice preview" sx={{ maxHeight: 480, maxWidth: "100%", borderRadius: "7px", objectFit: "contain", boxShadow: 1 }} />
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", minHeight: 260, flexDirection: "column", alignItems: "center", justifyContent: "center", bgcolor: "action.hover", textAlign: "center" }}>
                    <FileText className="w-12 h-12" style={{ color: "#9ca3af" }} />
                    <Typography sx={{ mt: 1.5, fontSize: 12.25, fontWeight: 500, color: "text.secondary" }}>PDF ready for OCR</Typography>
                  </Box>
                )}
              </Box>
            )}

            {hasResult && (
              <Stack spacing={2.5} sx={{ mt: 2.5 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 1.5 }}>
                  <Field label="Supplier" value={result.invoice.supplier?.name} />
                  <Field label="GSTIN" value={result.invoice.supplier?.gstin} />
                  <Field label="Invoice No." value={result.invoice.invoice?.number} />
                  <Field label="Invoice Date" value={result.invoice.invoice?.date} />
                  <Field label="Subtotal" value={result.invoice.totals?.subtotal} />
                  <Field label="Grand Total" value={result.invoice.totals?.grand_total} />
                </Box>

                <Box sx={{ overflow: "hidden", borderRadius: "7px", border: "1px solid", borderColor: "divider" }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5 }}>
                    <Typography component="h3" sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Supplier & Product Mapping</Typography>
                    <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>Required before posting</Typography>
                  </Stack>
                  <Stack spacing={2} sx={{ p: 2 }}>
                    <Box>
                      <Typography component="label" sx={{ fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>Supplier</Typography>
                      <TextField select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} size="small" fullWidth sx={{ mt: 0.5 }}>
                        <MenuItem value="">Select supplier</MenuItem>
                        {supplierOptions.map((supplier) => (
                          <MenuItem key={supplier.id} value={supplier.id}>{supplier.name}</MenuItem>
                        ))}
                      </TextField>
                    </Box>
                    <Box sx={{ overflowX: "auto" }}>
                      <Table size="small" sx={{ fontSize: 12.25 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontSize: 10.5, color: "text.secondary", py: 1 }}>OCR Description</TableCell>
                            <TableCell sx={{ fontSize: 10.5, color: "text.secondary", py: 1 }}>Qty</TableCell>
                            <TableCell sx={{ fontSize: 10.5, color: "text.secondary", py: 1 }}>Rate</TableCell>
                            <TableCell sx={{ fontSize: 10.5, color: "text.secondary", py: 1 }}>Product</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(result.invoice.items || []).map((item, index) => (
                            <TableRow key={index}>
                              <TableCell sx={{ minWidth: 220, py: 1.5 }}>
                                <TextField value={item.description || ""} onChange={(e) => updateItem(index, "description", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
                              </TableCell>
                              <TableCell sx={{ py: 1.5 }}>
                                <TextField type="number" value={item.quantity ?? ""} onChange={(e) => updateItem(index, "quantity", e.target.value)} size="small" sx={{ width: 80, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
                              </TableCell>
                              <TableCell sx={{ py: 1.5 }}>
                                <TextField type="number" value={item.rate ?? ""} onChange={(e) => updateItem(index, "rate", e.target.value)} size="small" sx={{ width: 96, "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }} />
                              </TableCell>
                              <TableCell sx={{ minWidth: 240, py: 1.5 }}>
                                <TextField
                                  select
                                  value={selectedProducts[index] || ""}
                                  onChange={(e) => setSelectedProducts((current) => ({ ...current, [index]: e.target.value }))}
                                  size="small"
                                  fullWidth
                                  sx={{ "& .MuiInputBase-input": { fontSize: 12.25, py: 0.75 } }}
                                >
                                  <MenuItem value="">Select product</MenuItem>
                                  {(productOptions[index] || []).map((product) => (
                                    <MenuItem key={product.id} value={product.id}>
                                      {product.name}{product.code ? ` (${product.code})` : ""}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </Stack>
                </Box>

                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ md: { alignItems: "center", justifyContent: "space-between" }, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", p: 2 }}>
                  <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
                    OCR provider: <Box component="strong">OCR.space</Box> · Validation: <Box component="strong">{result.validation?.status || "review_required"}</Box>
                  </Typography>
                  <Button
                    type="button"
                    onClick={savePurchaseInvoice}
                    disabled={saving}
                    startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    sx={{ borderRadius: "7px", fontSize: 12.25, fontWeight: 600, px: 2.5, py: 1.25, bgcolor: "success.main", color: "success.contrastText", "&:hover": { bgcolor: "success.dark" } }}
                  >
                    {saving ? "Creating..." : "Create Purchase Invoice"}
                  </Button>
                </Stack>
              </Stack>
            )}

            {error && (
              <Stack direction="row" spacing={1} sx={(theme) => ({ mt: 2, alignItems: "flex-start", borderRadius: "7px", border: "1px solid", borderColor: alpha(theme.palette.error.main, 0.3), bgcolor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.16 : 0.08), px: 1.5, py: 1.25, fontSize: 12.25, color: "error.main" })}>
                <Info className="w-4 h-4" style={{ marginTop: 2, flexShrink: 0 }} />
                <Box component="span">{error}</Box>
              </Stack>
            )}
          </Box>
        </Box>

        <Stack component="aside" spacing={2.5}>
          <Box sx={{ borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Sparkles className="w-4 h-4" style={{ color: INDIGO }} />
              <Typography component="h2" sx={{ fontWeight: 600, color: "text.primary" }}>Processing Pipeline</Typography>
            </Stack>
            <Stack spacing={2} sx={{ mt: 2.5 }}>
              {[
                ["01", "Upload", "React → Laravel"],
                ["02", "OCR.space", "Hosted OCR extracts invoice text and table rows"],
                ["03", "Invoice Parser", "Header, tax and line items"],
                ["04", "Review", "Supplier and product mapping"],
                ["05", "Purchase Invoice", "Laravel writes MariaDB and stock"],
              ].map(([number, title, description], index, rows) => (
                <Stack key={number} direction="row" spacing={1.5}>
                  <Stack sx={{ alignItems: "center" }}>
                    <Box
                      component="span"
                      sx={(theme) => ({
                        display: "flex",
                        height: 28,
                        width: 28,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        bgcolor: alpha(INDIGO, theme.palette.mode === "dark" ? 0.2 : 0.08),
                        fontSize: 11,
                        fontWeight: 600,
                        color: theme.palette.mode === "dark" ? "#a5b4fc" : INDIGO_HOVER,
                      })}
                    >
                      {number}
                    </Box>
                    {index < rows.length - 1 && <Box component="span" sx={{ mt: 0.5, minHeight: 20, width: "1px", flex: 1, bgcolor: "divider" }} />}
                  </Stack>
                  <Box sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 12.25, fontWeight: 500, color: "text.primary" }}>{title}</Typography>
                    <Typography sx={{ mt: 0.25, fontSize: 10.5, color: "text.secondary" }}>{description}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box sx={(theme) => ({ borderRadius: "10.5px", border: "1px solid", borderColor: alpha(INDIGO, theme.palette.mode === "dark" ? 0.4 : 0.2), bgcolor: alpha(INDIGO, theme.palette.mode === "dark" ? 0.12 : 0.06), p: 2.5 })}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
              <CheckCircle2 className="w-5 h-5" style={{ marginTop: 2, flexShrink: 0, color: INDIGO_HOVER }} />
              <Box>
                <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: (theme) => (theme.palette.mode === "dark" ? "#c7d2fe" : "#312e81") }}>Hostinger-compatible architecture</Typography>
                <Typography sx={{ mt: 0.75, fontSize: 10.5, lineHeight: 1.6, color: (theme) => alpha(theme.palette.mode === "dark" ? "#c7d2fe" : "#3730a3", 0.8) }}>
                  Hostinger runs React, Laravel and MariaDB. Laravel calls the hosted OCR API; no VPS, Docker or Python runtime is required.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

const Field = ({ label, value }) => (
  <Box sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", p: 1.5 }}>
    <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary" }}>{label}</Typography>
    <Typography sx={{ mt: 0.5, fontSize: 12.25, fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || "—"}</Typography>
  </Box>
);

export default NewPage;
