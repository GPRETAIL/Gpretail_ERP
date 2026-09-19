import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import PageSkeleton from "../../components/PageSkeleton";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import { Box, Stack, Typography, TextField, IconButton, Button, Checkbox, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";

const SKY = "#0284c7";

const today = new Date().toISOString().split("T")[0];

const mapEmployeeOption = (employee) => ({
  value: String(employee.id),
  label: employee.name,
});

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const toDisplay = (value, fallback = "None") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const toCurrency = (value) => toNumber(value).toFixed(2);

const buildInvoiceNavigationState = (entry) => ({
  fromTransportEntry: true,
  companyId: entry.company_id,
  companyName: entry.company?.name || "",
  supplierId: entry.supplier_id,
  supplierName: entry.supplier?.name || "",
  lrEntryNo: entry.lr_entry_no,
  lrNo: entry.lr_no,
  transportEntryId: entry.id,
  pieces: entry.no_of_pieces || 0,
  bundles: entry.no_of_bundles || 0,
});

const buildReceiptRowFromEntry = (entry) => ({
  transportEntryId: entry.id,
  supplierName: entry.supplier?.name || "-",
  fromLocation: entry.fromCity?.name || entry.auto_transfer_location || "-",
  entryNo: entry.lr_entry_no || "-",
  lrNo: entry.lr_no || "-",
  lrDate: entry.lr_date || "",
  noOfBundle: toNumber(entry.no_of_bundles),
  noOfBoxes: toNumber(entry.no_of_boxes),
  noOfPieces: toNumber(entry.no_of_pieces),
  weight: toNumber(entry.charged_weight || entry.actual_wgt),
  amount: toNumber(entry.goods_value),
});

const columns = [
  { key: "supplierName", label: "Supplier Name" },
  { key: "fromLocation", label: "From Location" },
  { key: "entryNo", label: "Entry No" },
  { key: "lrNo", label: "LR No" },
  { key: "lrDate", label: "LR Date" },
  { key: "noOfBundle", label: "No of Bundle", align: "right" },
  { key: "noOfBoxes", label: "No of Boxes", align: "right" },
  { key: "noOfPieces", label: "No of Pieces", align: "right" },
  { key: "weight", label: "Weight", align: "right" },
  { key: "amount", label: "Amount", align: "right" },
];

const TransportReceipt = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transportEntryId = searchParams.get("transport_entry_id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [transportEntry, setTransportEntry] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({});
  const [receiptItems, setReceiptItems] = useState([]);
  const [form, setForm] = useState({
    bookingOffice: "None",
    receiptNumber: "",
    receivedOn: today,
    issueNumber: "",
    issueDate: "",
    receivedById: "",
    companyName: "",
    securityInwardNo: "",
    securityInwardDate: today,
    bundles: 0,
    boxes: 0,
    weight: 0,
    freight: 0,
    loadingChargeAmount: 0,
    loadingChargePaid: false,
    freightChargeAmount: 0,
    freightChargePaid: false,
    otherCharges: 0,
    totalCharges: 0,
  });

  const showToast = (type, message) => setToast({ open: true, type, message });

  const handleAsyncEmployeeSearch = async (term) => {
    try {
      const res = await api.get("/employees", { params: { search: term, limit: 50 } });
      const rows = res.data?.data || [];
      const mapped = rows.map(mapEmployeeOption);
      setEmployees((prev) => {
        const existingIds = new Set(prev.map((e) => e.value));
        return [...prev, ...mapped.filter((e) => !existingIds.has(e.value))];
      });
      return mapped;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (!transportEntryId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [entryRes, employeesRes] = await Promise.all([
          api.get(`/transport-entries/${transportEntryId}`),
          api.get("/employees").catch(() => ({ data: { data: [] } })),
        ]);

        const entry = entryRes.data?.data || null;
        const employeeRows = employeesRes.data?.data || [];
        let nextReceiptNumber = entry?.receipt_no || "";

        if (!nextReceiptNumber) {
          try {
            const receiptNoRes = await api.get("/transport-entries/next-receipt-number", {
              params: { company_id: entry?.company_id || undefined },
            });
            nextReceiptNumber = receiptNoRes.data?.next_no || "";
          } catch {
            nextReceiptNumber = "";
          }
        }
        const defaultRow = entry ? buildReceiptRowFromEntry(entry) : null;
        const persistedRows = Array.isArray(entry?.receipt_items) ? entry.receipt_items : [];
        const nextRows = persistedRows.length > 0 ? persistedRows : (defaultRow ? [defaultRow] : []);
        const loadingChargeAmount = toNumber(entry?.receipt_loading_charge_amount);
        const freightChargeAmount = toNumber(entry?.receipt_freight_charge_amount);
        const otherCharges = toNumber(entry?.receipt_other_charges);

        setTransportEntry(entry);
        setEmployees(employeeRows.map(mapEmployeeOption));
        setReceiptItems(nextRows);
        setForm({
          bookingOffice: toDisplay(entry?.transport?.name),
          receiptNumber: nextReceiptNumber ? String(nextReceiptNumber) : "",
          receivedOn: entry?.receipt_date || today,
          issueNumber: entry?.issue_no ? String(entry.issue_no) : "",
          issueDate: entry?.issue_date || "",
          receivedById: entry?.receipt_received_by_id ? String(entry.receipt_received_by_id) : "",
          companyName: entry?.company?.name || "-",
          securityInwardNo: entry?.receipt_security_inward_no || "",
          securityInwardDate: entry?.receipt_security_inward_date || today,
          bundles: toNumber(entry?.receipt_bundles ?? entry?.no_of_bundles),
          boxes: toNumber(entry?.receipt_boxes ?? entry?.no_of_boxes),
          weight: toNumber(entry?.receipt_weight ?? entry?.charged_weight ?? entry?.actual_wgt),
          freight: toNumber(entry?.receipt_freight),
          loadingChargeAmount,
          loadingChargePaid: Boolean(entry?.receipt_loading_charge_paid),
          freightChargeAmount,
          freightChargePaid: Boolean(entry?.receipt_freight_charge_paid),
          otherCharges,
          totalCharges: toNumber(entry?.receipt_total_charges ?? loadingChargeAmount + freightChargeAmount + otherCharges),
        });
      } catch (error) {
        console.error("Failed to load transport receipt context:", error);
        showToast("error", "Failed to load receipt page");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transportEntryId]);

  const filteredRows = useMemo(() => {
    return receiptItems.filter((row) =>
      columns.every((column) => {
        const query = String(filters[column.key] || "").trim().toLowerCase();
        if (!query) return true;
        const rawValue =
          column.key === "lrDate" ? formatDate(row[column.key]) : String(row[column.key] ?? "");
        return rawValue.toLowerCase().includes(query);
      })
    );
  }, [filters, receiptItems]);

  useEffect(() => {
    setForm((prev) => {
      const totalCharges =
        toNumber(prev.loadingChargeAmount) +
        toNumber(prev.freightChargeAmount) +
        toNumber(prev.otherCharges);
      if (toNumber(prev.totalCharges) === totalCharges) return prev;
      return { ...prev, totalCharges };
    });
  }, [form.loadingChargeAmount, form.freightChargeAmount, form.otherCharges]);

  const handleFieldChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const persistReceipt = async (moveNext = false) => {
    if (!transportEntryId) {
      showToast("error", "Transport entry is required");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/transport-entries/${transportEntryId}`, {
        receiptNo: form.receiptNumber || null,
        receiptDate: form.receivedOn,
        receiptReceivedById: form.receivedById || null,
        receiptSecurityInwardNo: form.securityInwardNo,
        receiptSecurityInwardDate: form.securityInwardDate,
        receiptBundles: form.bundles,
        receiptBoxes: form.boxes,
        receiptWeight: form.weight,
        receiptFreight: form.freight,
        receiptLoadingChargeAmount: form.loadingChargeAmount,
        receiptLoadingChargePaid: form.loadingChargePaid,
        receiptFreightChargeAmount: form.freightChargeAmount,
        receiptFreightChargePaid: form.freightChargePaid,
        receiptOtherCharges: form.otherCharges,
        receiptTotalCharges: form.totalCharges,
        receiptItems,
        status: "receipt_generated",
      });

      showToast("success", moveNext ? "Receipt saved" : "Receipt saved successfully");

      if (moveNext && transportEntry) {
        navigate("/warehouse/invoice", { state: buildInvoiceNavigationState(transportEntry) });
      }
    } catch (error) {
      console.error("Failed to save transport receipt:", error);
      showToast("error", error.response?.data?.message || "Failed to save receipt");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSkeleton variant="table" rows={8} cols={8} />;
  }

  if (!transportEntryId || !transportEntry) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: 3 }}>
        <Box sx={{ borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 3, fontSize: 12.25, color: "text.secondary" }}>
          Open this page from a lorry transport entry.
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.25, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ color: "text.secondary" }}>
            <ArrowLeft className="w-4 h-4" />
          </IconButton>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", fontSize: 12.25, fontWeight: 600 }}>
            <Button type="button" variant="text" onClick={() => navigate("/warehouse")} sx={{ minWidth: "auto", p: 0, fontSize: 12.25, fontWeight: 600 }}>
              Warehouse
            </Button>
            <Box component="span" sx={{ color: "text.disabled" }}>/</Box>
            <Box component="span" sx={{ color: "text.primary" }}>Transport Receipt</Box>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ fontSize: 12.25 }}>
          <Button onClick={() => persistReceipt(false)} disabled={saving} className="glass-btn glass-btn-success" startIcon={<Save className="w-4 h-4" />} sx={{ opacity: saving ? 0.5 : 1 }}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button onClick={() => persistReceipt(true)} disabled={saving} className="glass-btn glass-btn-primary" startIcon={<Save className="w-4 h-4" />} sx={{ opacity: saving ? 0.5 : 1 }}>
            Save & Next
          </Button>
          <Button onClick={() => navigate("/warehouse/transport-issue/search")} className="glass-btn glass-btn-primary" startIcon={<Search className="w-4 h-4" />}>
            Search
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flex: 1, p: 2, overflow: "hidden" }}>
        <Box sx={{ width: "30rem", maxWidth: "34%", minWidth: 300, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2, overflowY: "auto" }}>
          <Stack spacing={2} sx={{ fontSize: 12.25 }}>
            <Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: "text.secondary", textTransform: "uppercase" }}>Booking Office</Typography>
              <Typography sx={{ mt: 0.5, fontSize: 21, fontWeight: 600, color: "error.main" }}>{form.bookingOffice}</Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
              <Box component="label" sx={{ display: "block" }}>
                <Typography component="span" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>Receipt Number</Typography>
                <TextField value={form.receiptNumber} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25 }, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }} />
              </Box>
              <Box component="label" sx={{ display: "block" }}>
                <Typography component="span" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>Received On</Typography>
                <TextField type="date" value={form.receivedOn} onChange={(e) => handleFieldChange("receivedOn", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }} />
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
              <Metric label="Issue Date" value={form.issueDate ? formatDate(form.issueDate) : "-"} />
              <Metric label="Issue No" value={form.issueNumber || "-"} />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
              <Box>
                <Typography component="label" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>Received By</Typography>
                <AsyncSearchSelect
                  name="receivedById"
                  value={form.receivedById}
                  onChange={(e) => handleFieldChange("receivedById", e.target.value)}
                  options={employees}
                  onAsyncSearch={handleAsyncEmployeeSearch}
                  placeholder="Employee"
                  searchPlaceholder="Search employees..."
                />
              </Box>
              <Metric label="Company" value={form.companyName} />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
              <Box component="label" sx={{ display: "block" }}>
                <Typography component="span" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>Security Inward No</Typography>
                <TextField value={form.securityInwardNo} onChange={(e) => handleFieldChange("securityInwardNo", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }} />
              </Box>
              <Box component="label" sx={{ display: "block" }}>
                <Typography component="span" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>Security Inward Date</Typography>
                <TextField type="date" value={form.securityInwardDate} onChange={(e) => handleFieldChange("securityInwardDate", e.target.value)} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25 } }} />
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
              <EditableMetric label="Bundles" value={form.bundles} onChange={(value) => handleFieldChange("bundles", value)} />
              <EditableMetric label="Boxes" value={form.boxes} onChange={(value) => handleFieldChange("boxes", value)} />
              <EditableMetric label="Weight" value={form.weight} onChange={(value) => handleFieldChange("weight", value)} />
              <EditableMetric label="Freight" value={form.freight} onChange={(value) => handleFieldChange("freight", value)} />
            </Box>

            <Stack spacing={1.5} sx={{ borderRadius: "3.5px", border: "1px solid", borderColor: "divider", p: 1.5 }}>
              <ChargeRow
                label="Loading Charge"
                amount={form.loadingChargeAmount}
                paid={form.loadingChargePaid}
                onAmountChange={(value) => handleFieldChange("loadingChargeAmount", value)}
                onPaidChange={(checked) => handleFieldChange("loadingChargePaid", checked)}
              />
              <ChargeRow
                label="Freight Charge"
                amount={form.freightChargeAmount}
                paid={form.freightChargePaid}
                onAmountChange={(value) => handleFieldChange("freightChargeAmount", value)}
                onPaidChange={(checked) => handleFieldChange("freightChargePaid", checked)}
              />
              <Box component="label" sx={{ display: "block" }}>
                <Typography component="span" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>Other Charges</Typography>
                <TextField
                  type="number"
                  slotProps={{ htmlInput: { step: "0.01" } }}
                  value={form.otherCharges}
                  onChange={(e) => handleFieldChange("otherCharges", e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ "& .MuiInputBase-input": { fontSize: 12.25, textAlign: "right" } }}
                />
              </Box>
              <Metric label="Total Charges" value={toCurrency(form.totalCharges)} />
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <Box sx={{ overflow: "auto" }}>
            <Table sx={{ minWidth: 1050 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      sx={{ border: "1px solid", borderColor: "divider", fontSize: 10.5, fontWeight: 600, color: "text.secondary", textAlign: column.align === "right" ? "right" : "left" }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow sx={(theme) => ({ bgcolor: alpha(SKY, theme.palette.mode === "dark" ? 0.16 : 0.1) })}>
                  {columns.map((column) => (
                    <TableCell key={column.key} sx={{ border: "1px solid", borderColor: "divider", p: 0.5 }}>
                      <TextField
                        value={filters[column.key] || ""}
                        onChange={(e) => setFilters((prev) => ({ ...prev, [column.key]: e.target.value }))}
                        size="small"
                        fullWidth
                        sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5, px: 1 } }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} sx={{ px: 2, py: 6, textAlign: "center", color: "text.disabled" }}>
                      No receipt rows found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.transportEntryId} sx={{ "&:hover": { bgcolor: "action.hover" }, color: "text.primary" }}>
                      {columns.map((column) => {
                        const value =
                          column.key === "lrDate"
                            ? formatDate(row[column.key])
                            : column.align === "right"
                              ? toNumber(row[column.key]).toFixed(2)
                              : row[column.key];
                        return (
                          <TableCell
                            key={column.key}
                            sx={{ border: "1px solid", borderColor: "divider", fontSize: 12.25, textAlign: column.align === "right" ? "right" : "left" }}
                          >
                            {value}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </Box>
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

const Metric = ({ label, value }) => (
  <Box>
    <Typography sx={{ fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>{label}</Typography>
    <TextField value={value} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={{ "& .MuiInputBase-input": { fontSize: 12.25 }, "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }} />
  </Box>
);

const EditableMetric = ({ label, value, onChange }) => (
  <Box component="label" sx={{ display: "block" }}>
    <Typography component="span" sx={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>{label}</Typography>
    <TextField
      type="number"
      slotProps={{ htmlInput: { step: "0.01" } }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
      sx={{ "& .MuiInputBase-input": { fontSize: 12.25, textAlign: "right" } }}
    />
  </Box>
);

const ChargeRow = ({ label, amount, paid, onAmountChange, onPaidChange }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 120px 72px", alignItems: "flex-end", gap: 1.5 }}>
    <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>{label}</Typography>
    <Box component="label" sx={{ display: "block" }}>
      <Typography component="span" sx={{ display: "block", fontSize: 9, color: "text.secondary", mb: 0.5 }}>Amount</Typography>
      <TextField
        type="number"
        slotProps={{ htmlInput: { step: "0.01" } }}
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        size="small"
        fullWidth
        sx={{ "& .MuiInputBase-input": { fontSize: 12.25, textAlign: "right" } }}
      />
    </Box>
    <Stack component="label" direction="row" spacing={0.75} sx={{ alignItems: "center", pb: 1, fontSize: 10.5, fontWeight: 500, color: "text.secondary" }}>
      <Checkbox
        checked={paid}
        onChange={(e) => onPaidChange(e.target.checked)}
        size="small"
        sx={{ p: 0 }}
      />
      Paid
    </Stack>
  </Box>
);

export default TransportReceipt;
