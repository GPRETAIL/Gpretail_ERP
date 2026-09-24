import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Search, Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import PageSkeleton from "../../components/PageSkeleton";
import Breadcrumbs from "../../components/Breadcrumbs";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import { Box, Stack, Typography, TextField, IconButton, Button, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";
import { muiFieldSx } from "../../theme/formControlSizes";

const SKY = "#0284c7";
const SKY_HOVER = "#0369a1";

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

const buildIssueRowFromEntry = (entry) => ({
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

const TransportIssueEntry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transportEntryId = searchParams.get("transport_entry_id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const [transportEntry, setTransportEntry] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({});
  const [issueItems, setIssueItems] = useState([]);
  const [form, setForm] = useState({
    bookingOffice: "None",
    issueNumber: "",
    companyName: "",
    collectedById: "",
    issueDate: today,
    fromLocation: "None",
    receivingLocation: "None",
    lrNumber: "",
    entryNumber: "",
    noOfBundles: 0,
    noOfBoxes: 0,
    noOfPieces: 0,
    freightCharge: 0,
    weight: 0,
    count: 0,
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
        let nextIssueNumber = entry?.issue_no || "";

        if (!nextIssueNumber) {
          try {
            const issueNoRes = await api.get("/transport-entries/next-issue-number", {
              params: { company_id: entry?.company_id || undefined },
            });
            nextIssueNumber = issueNoRes.data?.next_no || "";
          } catch {
            nextIssueNumber = "";
          }
        }

        const defaultRow = entry ? buildIssueRowFromEntry(entry) : null;
        const persistedRows = Array.isArray(entry?.issue_items) ? entry.issue_items : [];
        const nextIssueItems = persistedRows.length > 0 ? persistedRows : (defaultRow ? [defaultRow] : []);

        setTransportEntry(entry);
        setEmployees(employeeRows.map(mapEmployeeOption));
        setIssueItems(nextIssueItems);
        setForm({
          bookingOffice: toDisplay(entry?.transport?.name),
          issueNumber: nextIssueNumber ? String(nextIssueNumber) : "",
          companyName: entry?.company?.name || "-",
          collectedById: entry?.issue_collected_by_id ? String(entry.issue_collected_by_id) : "",
          issueDate: entry?.issue_date || today,
          fromLocation: toDisplay(entry?.fromCity?.name),
          receivingLocation: toDisplay(entry?.receivingCity?.name || entry?.auto_transfer_location),
          lrNumber: entry?.lr_no || "",
          entryNumber: entry?.lr_entry_no ? String(entry.lr_entry_no) : "",
          noOfBundles: toNumber(entry?.no_of_bundles),
          noOfBoxes: toNumber(entry?.no_of_boxes),
          noOfPieces: toNumber(entry?.no_of_pieces),
          freightCharge: entry?.freight_charge ? 1 : 0,
          weight: toNumber(entry?.charged_weight || entry?.actual_wgt),
          count: defaultRow ? 1 : 0,
        });
      } catch (error) {
        console.error("Failed to load transport issue context:", error);
        showToast("error", "Failed to load transport issue");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transportEntryId]);

  const filteredRows = useMemo(() => {
    return issueItems.filter((row) =>
      columns.every((column) => {
        const query = String(filters[column.key] || "").trim().toLowerCase();
        if (!query) return true;
        const rawValue =
          column.key === "lrDate" ? formatDate(row[column.key]) : String(row[column.key] ?? "");
        return rawValue.toLowerCase().includes(query);
      })
    );
  }, [filters, issueItems]);

  const handleFieldChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const ensureCurrentRowAdded = (source) => {
    if (!transportEntry) return;
    const currentRow = buildIssueRowFromEntry(transportEntry);

    if (source === "lr" && form.lrNumber && form.lrNumber !== currentRow.lrNo) {
      showToast("warning", "LR number does not match the selected transport entry");
      return;
    }
    if (source === "entry" && form.entryNumber && String(form.entryNumber) !== String(currentRow.entryNo)) {
      showToast("warning", "Entry number does not match the selected transport entry");
      return;
    }

    setIssueItems((prev) => {
      if (prev.some((row) => String(row.transportEntryId) === String(currentRow.transportEntryId))) {
        return prev;
      }
      return [...prev, currentRow];
    });
  };

  const handleRemoveRow = (rowId) => {
    setIssueItems((prev) => prev.filter((row) => String(row.transportEntryId) !== String(rowId)));
  };

  const persistIssue = async (moveNext = false) => {
    if (!transportEntryId) {
      showToast("error", "Transport entry is required");
      return;
    }
    if (issueItems.length === 0) {
      showToast("warning", "Add at least one row before saving issue");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/transport-entries/${transportEntryId}`, {
        issueNo: form.issueNumber,
        issueDate: form.issueDate,
        issueCollectedById: form.collectedById,
        issueItems,
        status: "issue_generated",
      });
      showToast("success", moveNext ? "Issue saved" : "Issue saved successfully");
      if (moveNext) {
        navigate(`/warehouse/transport-receipt?transport_entry_id=${transportEntryId}`);
      }
    } catch (error) {
      console.error("Failed to save transport issue:", error);
      showToast("error", error.response?.data?.message || "Failed to save issue");
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
            <ArrowLeft size={16} />
          </IconButton>
          <Breadcrumbs
            sx={{ fontSize: 12.25, fontWeight: 600 }}
            items={[
              { label: "Warehouse", onClick: () => navigate("/warehouse") },
              { label: "Transport Issue" },
            ]}
          />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ fontSize: 12.25 }}>
          <Button onClick={() => persistIssue(false)} disabled={saving} className="glass-btn glass-btn-success" startIcon={<Save size={16} />} sx={{ opacity: saving ? 0.5 : 1 }}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button onClick={() => persistIssue(true)} disabled={saving} className="glass-btn glass-btn-primary" startIcon={<Save size={16} />} sx={{ opacity: saving ? 0.5 : 1 }}>
            Save & Next
          </Button>
          <Button onClick={() => navigate("/warehouse/transport-issue/search")} className="glass-btn glass-btn-primary" startIcon={<Search size={16} />}>
            Search
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flex: 1, p: 2, overflow: "hidden" }}>
        <Box sx={{ width: "34rem", maxWidth: "36%", minWidth: 320, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "7px", boxShadow: 1, p: 2, overflowY: "auto" }}>
          <Stack spacing={2} sx={{ fontSize: 12.25 }}>
            <Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: "text.secondary", textTransform: "uppercase" }}>Booking Office</Typography>
              <Typography sx={{ mt: 0.5, fontSize: 21, fontWeight: 600, color: "error.main" }}>{form.bookingOffice}</Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: "text.secondary", textTransform: "uppercase" }}>Company</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 21, fontWeight: 600, color: "error.main" }}>{form.companyName}</Typography>
              </Box>
              <Box component="label" sx={{ display: "block" }}>
                <Typography component="span" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
                  <Box component="span" sx={{ color: "error.main" }}>*</Box> Issue Number
                </Typography>
                <TextField value={form.issueNumber} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={[muiFieldSx, { "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }]} />
              </Box>
            </Box>

            <Box>
              <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
                <Box component="span" sx={{ color: "error.main" }}>*</Box> Collected By
              </Typography>
              <AsyncSearchSelect
                name="collectedById"
                value={form.collectedById}
                onChange={(e) => handleFieldChange("collectedById", e.target.value)}
                options={employees}
                onAsyncSearch={handleAsyncEmployeeSearch}
                placeholder="Employee"
                searchPlaceholder="Search employees..."
              />
            </Box>

            <Box>
              <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
                <Box component="span" sx={{ color: "error.main" }}>*</Box> Issue Date
              </Typography>
              <TextField
                type="date"
                value={form.issueDate}
                onChange={(e) => handleFieldChange("issueDate", e.target.value)}
                size="small"
                fullWidth
                sx={muiFieldSx}
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: "text.secondary", textTransform: "uppercase" }}>From Location</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 21, fontWeight: 600, color: "error.main" }}>{form.fromLocation}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: "text.secondary", textTransform: "uppercase" }}>Receiving Location</Typography>
                <Typography sx={{ mt: 0.5, fontSize: 21, fontWeight: 600, color: "error.main" }}>{form.receivingLocation}</Typography>
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
              <Box>
                <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
                  <Box component="span" sx={{ color: "error.main" }}>*</Box> LR Number
                </Typography>
                <Stack direction="row">
                  <TextField
                    value={form.lrNumber}
                    onChange={(e) => handleFieldChange("lrNumber", e.target.value)}
                    size="small"
                    fullWidth
                    sx={[muiFieldSx, { "& .MuiOutlinedInput-root": { borderTopRightRadius: 0, borderBottomRightRadius: 0 } }]}
                  />
                  <IconButton
                    type="button"
                    onClick={() => ensureCurrentRowAdded("lr")}
                    sx={{ px: 1.5, py: 1, bgcolor: SKY, color: "#fff", borderRadius: 0, borderTopRightRadius: "1.75px", borderBottomRightRadius: "1.75px", "&:hover": { bgcolor: SKY_HOVER } }}
                  >
                    <Plus size={16} />
                  </IconButton>
                </Stack>
              </Box>
              <Box>
                <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
                  <Box component="span" sx={{ color: "error.main" }}>*</Box> Entry Number
                </Typography>
                <Stack direction="row">
                  <TextField
                    value={form.entryNumber}
                    onChange={(e) => handleFieldChange("entryNumber", e.target.value)}
                    size="small"
                    fullWidth
                    sx={[muiFieldSx, { "& .MuiOutlinedInput-root": { borderTopRightRadius: 0, borderBottomRightRadius: 0 } }]}
                  />
                  <IconButton
                    type="button"
                    onClick={() => ensureCurrentRowAdded("entry")}
                    sx={{ px: 1.5, py: 1, bgcolor: SKY, color: "#fff", borderRadius: 0, borderTopRightRadius: "1.75px", borderBottomRightRadius: "1.75px", "&:hover": { bgcolor: SKY_HOVER } }}
                  >
                    <Plus size={16} />
                  </IconButton>
                </Stack>
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
              <Metric label="No Of Bundles" value={form.noOfBundles} />
              <Metric label="No Of Boxes" value={form.noOfBoxes} />
              <Metric label="No Of Pieces" value={form.noOfPieces} />
              <Metric label="Fright Charge" value={form.freightCharge} />
              <Metric label="Weight" value={form.weight} />
              <Metric label="Count" value={issueItems.length} />
            </Box>
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
                  <TableCell sx={{ border: "1px solid", borderColor: "divider", fontSize: 10.5, fontWeight: 600, color: "text.secondary", textAlign: "center" }}>Action</TableCell>
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
                  <TableCell sx={{ border: "1px solid", borderColor: "divider" }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} sx={{ px: 2, py: 6, textAlign: "center", color: "text.disabled" }}>
                      No issue rows found.
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
                      <TableCell sx={{ border: "1px solid", borderColor: "divider", textAlign: "center" }}>
                        <Button
                          type="button"
                          onClick={() => handleRemoveRow(row.transportEntryId)}
                          sx={{ borderRadius: "3.5px", bgcolor: SKY, color: "#fff", fontSize: 10.5, px: 1.5, py: 0.5, minWidth: "auto", "&:hover": { bgcolor: SKY_HOVER } }}
                        >
                          Remove
                        </Button>
                      </TableCell>
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
    <TextField value={value} slotProps={{ input: { readOnly: true } }} size="small" fullWidth sx={[muiFieldSx, { "& .MuiOutlinedInput-root": { bgcolor: "action.hover" } }]} />
  </Box>
);

export default TransportIssueEntry;
