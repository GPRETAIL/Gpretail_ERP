import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, PlusCircle, Save, Search } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Stack, Card, Typography, Button, TextField, MenuItem, Checkbox, IconButton, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import api from "../../api/axios";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import PageHeader from "../../components/PageHeader";
import { normalizeFormSignature } from "../../utils/formSignature";
import { handleEnterKeyNavigation } from "../../utils/enterToNextField";

const mapTaxOption = (t) => ({
  id: String(t.id),
  value: String(t.id),
  name: `${t.name} (${t.tax_percentage}%)`,
  label: `${t.name} (${t.tax_percentage}%)`,
});

/* ─── tiny inline helpers ─── */
const Label = ({ children, required }) => (
  <Typography component="span" sx={{ width: "40%", fontSize: 10.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5, flexShrink: 0 }}>
    {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}
    {children}
  </Typography>
);

const Field = ({ children }) => (
  <Stack direction="row" sx={{ alignItems: "center", mb: 1 }}>{children}</Stack>
);

const Input = ({ className: _className, ...props }) => (
  <TextField
    {...props}
    size="small"
    fullWidth
    sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5 } }}
  />
);

const Select = ({ options = [], placeholder, className: _className, ...props }) => (
  <TextField
    select
    {...props}
    size="small"
    fullWidth
    sx={{ "& .MuiInputBase-input": { fontSize: 10.5, py: 0.5 } }}
  >
    <MenuItem value="">{placeholder || `— select —`}</MenuItem>
    {options.map((o) => (
      <MenuItem key={o.value} value={o.value}>
        {o.label}
      </MenuItem>
    ))}
  </TextField>
);

const BUSINESS_MODES = [
  { value: "Lorry/Courier", label: "Lorry / Courier" },
  { value: "Courier", label: "Courier" },
  { value: "Lorry", label: "Lorry" },
  { value: "Charges", label: "Charges" },
  { value: "Other", label: "Other" },
];

const PAYMENT_MODES = [
  { value: "Cash", label: "Cash" },
  { value: "Cheque", label: "Cheque" },
  { value: "Multiple Cheques", label: "Multiple Cheques" },
  { value: "NEFT", label: "NEFT" },
];

const EMPTY_RATE = { cityId: "", cityName: "", perKg: "", perBox: "", perBundle: "" };

const EMPTY_FORM = {
  companyId: "",
  businessMode: "",
  name: "",
  contactPerson: "",
  contactNo: "",
  emailId: "",
  address: "",
  cityId: "",
  stateId: "",
  pan: "",
  gst: "",
  bankId: "",
  branch: "",
  bankAccountName: "",
  ifsc: "",
  accountNo: "",
  price: "",
  taxId: "",
  vehicles: "",
  loadingPerBox: "",
  loadingPerBundle: "",
  allowedPaymentMode: "",
  rcm: false,
  isActive: true,
};

const TransportForm = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isEdit = location.pathname.includes("/edit/");
  const isView = !!id && !isEdit;
  const isAdd = !id;
  const readOnly = isView;

  const [form, setForm] = useState(EMPTY_FORM);
  const [rates, setRates] = useState([]);
  const [rateRow, setRateRow] = useState(EMPTY_RATE);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const initialFormRef = useRef({ id: null, sig: null });

  const [cityOpts, setCityOpts] = useState([]);
  const [stateOpts, setStateOpts] = useState([]);
  const [bankOpts, setBankOpts] = useState([]);
  const [taxOpts, setTaxOpts] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [cities, states, banks, taxes] = await Promise.all([
          api.get("/configurations/city"),
          api.get("/configurations/state"),
          api.get("/configurations/bank"),
          api.get("/taxes"),
        ]);
        setCityOpts((cities.data?.data || []).map((c) => ({ value: String(c.id), label: c.name })));
        setStateOpts((states.data?.data || []).map((s) => ({ value: String(s.id), label: s.name })));
        setBankOpts((banks.data?.data || []).map((b) => ({ value: String(b.id), label: b.name })));
        setTaxOpts((taxes.data?.data || []).map(mapTaxOption));
      } catch {
        /* silently fail for dropdowns */
      }
    };
    load();
  }, []);

  const handleAsyncTaxSearch = async (query) => {
    const trimmed = String(query || "").trim();
    if (!trimmed) return [];
    try {
      const res = await api.get("/taxes", { params: { search: trimmed, limit: 50 } });
      const mapped = (res.data?.data || []).map(mapTaxOption);
      if (mapped.length) {
        setTaxOpts((prev) => {
          const existing = new Set(prev.map((t) => t.value));
          const newOnes = mapped.filter((t) => !existing.has(t.value));
          return newOnes.length ? [...prev, ...newOnes] : prev;
        });
      }
      return mapped;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const res = await api.get(`/transports/${id}`);
        const d = res.data.data;
        const loadedForm = {
          businessMode: d.business_mode || "",
          name: d.name || "",
          contactPerson: d.contact_person || "",
          contactNo: d.contact_no || "",
          emailId: d.email_id || "",
          address: d.address || "",
          cityId: d.city_id ? String(d.city_id) : "",
          stateId: d.state_id ? String(d.state_id) : "",
          pan: d.pan || "",
          gst: d.gst || "",
          bankId: d.bank_id ? String(d.bank_id) : "",
          branch: d.branch || "",
          bankAccountName: d.bank_account_name || "",
          ifsc: d.ifsc || "",
          accountNo: d.account_no || "",
          price: d.price || "",
          taxId: d.tax_id ? String(d.tax_id) : "",
          vehicles: d.vehicles || "",
          loadingPerBox: d.loading_per_box || "",
          loadingPerBundle: d.loading_per_bundle || "",
          allowedPaymentMode: d.allowed_payment_mode || "",
          rcm: d.rcm || false,
          isActive: d.is_active !== undefined ? d.is_active : true,
        };
        const loadedRates = (d.rates || []).map((r) => ({
          cityId: r.city_id ? String(r.city_id) : "",
          cityName: r.city_name || "",
          perKg: r.per_kg || "",
          perBox: r.per_box || "",
          perBundle: r.per_bundle || "",
        }));
        setForm(loadedForm);
        setRates(loadedRates);
        if (isEdit) {
          initialFormRef.current = {
            id,
            sig: normalizeFormSignature({ form: loadedForm, rates: loadedRates }),
          };
        }
      } catch {
        toast.error("Failed to load transport");
        navigate("/masters/transport");
      }
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleRateChange = (e) => {
    const { name, value } = e.target;
    setRateRow((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "cityId") {
        const found = cityOpts.find((c) => c.value === value);
        updated.cityName = found ? found.label : "";
      }
      return updated;
    });
  };

  const addRate = () => {
    if (!rateRow.cityId && !rateRow.cityName) {
      toast.warn("Select a city first");
      return;
    }
    setRates((prev) => [...prev, rateRow]);
    setRateRow(EMPTY_RATE);
  };

  const removeRate = (idx) => setRates((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.businessMode) { toast.warn("Business Mode is required"); return; }
    if (!form.name.trim()) { toast.warn("Name is required"); return; }
    if (isEdit && initialFormRef.current.id === id
        && normalizeFormSignature({ form, rates }) === initialFormRef.current.sig) {
      toast.info("No changes detected.");
      return;
    }
    try {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      const payload = { ...form, rates };
      if (isAdd) {
        await api.post("/transports", payload);
        toast.success("Transport created");
      } else {
        await api.put(`/transports/${id}`, payload);
        initialFormRef.current = {
          id,
          sig: normalizeFormSignature({ form, rates }),
        };
        toast.success("Transport updated");
      }
      navigate("/masters/transport");
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary" }}>
      <PageHeader
        title={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <Typography
              component="button"
              type="button"
              onClick={() => navigate("/masters")}
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: "primary.main",
                background: "none",
                border: "none",
                p: 0,
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Master
            </Typography>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>/</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Transport</Typography>
          </Stack>
        }
        onBack={() => navigate("/masters/transport")}
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Button
              onClick={() => { setForm(EMPTY_FORM); setRates([]); navigate("/masters/transport/new"); }}
              className="topbar-action-btn topbar-action-new"
              startIcon={<PlusCircle className="w-3 h-3" />}
              size="small"
            >
              New
            </Button>
            {!readOnly && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="glass-btn glass-btn-success"
                startIcon={<Save className="w-3 h-3" />}
                size="small"
              >
                Save
              </Button>
            )}
            <Button
              onClick={() => navigate("/masters/transport")}
              className="glass-btn glass-btn-primary"
              startIcon={<Search className="w-3 h-3" />}
              size="small"
            >
              Search
            </Button>
          </Stack>
        }
      />

      <Box
        sx={{
          p: 1.5,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 1.5,
          flex: 1,
          minHeight: 0,
        }}
        data-enter-scope="true"
        onKeyDownCapture={handleEnterKeyNavigation}
      >
        {/* ── LEFT PANEL ── */}
        <Card variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 0.5, height: { lg: "100%" } }}>
          <Field>
            <Label required>Business Mode</Label>
            <Select
              name="businessMode"
              value={form.businessMode}
              onChange={handleChange}
              disabled={readOnly}
              options={BUSINESS_MODES}
              placeholder="— select —"
            />
          </Field>

          <Field>
            <Label required>Name</Label>
            <Input name="name" value={form.name} onChange={handleChange} disabled={readOnly} />
          </Field>

          <Field>
            <Label>Contact Person</Label>
            <Input name="contactPerson" value={form.contactPerson} onChange={handleChange} disabled={readOnly} />
          </Field>

          <Field>
            <Label>Contact No / Email ID</Label>
            <Stack direction="row" sx={{ flex: 1, gap: 0.5 }}>
              <Input
                name="contactNo"
                value={form.contactNo}
                onChange={handleChange}
                disabled={readOnly}
                placeholder="Contact No"
              />
              <Input
                name="emailId"
                value={form.emailId}
                onChange={handleChange}
                disabled={readOnly}
                placeholder="Email ID"
              />
            </Stack>
          </Field>

          <Field>
            <Label>Address</Label>
            <TextField
              name="address"
              rows={3}
              multiline
              value={form.address}
              onChange={handleChange}
              disabled={readOnly}
              size="small"
              fullWidth
              sx={{ "& .MuiInputBase-input": { fontSize: 10.5 } }}
            />
          </Field>

          <Field>
            <Label>City / State</Label>
            <Stack direction="row" sx={{ flex: 1, gap: 0.5 }}>
              <Select
                name="cityId"
                value={form.cityId}
                onChange={handleChange}
                disabled={readOnly}
                options={cityOpts}
                placeholder="City"
              />
              <Select
                name="stateId"
                value={form.stateId}
                onChange={handleChange}
                disabled={readOnly}
                options={stateOpts}
                placeholder="State"
              />
            </Stack>
          </Field>

          <Field>
            <Label>PAN / GST</Label>
            <Stack direction="row" sx={{ flex: 1, gap: 0.5 }}>
              <Input name="pan" value={form.pan} onChange={handleChange} disabled={readOnly} placeholder="PAN" />
              <Input name="gst" value={form.gst} onChange={handleChange} disabled={readOnly} placeholder="GST" />
            </Stack>
          </Field>

          <Field>
            <Label>Bank / Branch</Label>
            <Stack direction="row" sx={{ flex: 1, gap: 0.5 }}>
              <Select
                name="bankId"
                value={form.bankId}
                onChange={handleChange}
                disabled={readOnly}
                options={bankOpts}
                placeholder="Bank"
              />
              <Input
                name="branch"
                value={form.branch}
                onChange={handleChange}
                disabled={readOnly}
                placeholder="Branch"
              />
            </Stack>
          </Field>

          <Field>
            <Label required>Bank Account Name</Label>
            <Input name="bankAccountName" value={form.bankAccountName} onChange={handleChange} disabled={readOnly} />
          </Field>

          <Field>
            <Label>IFSC / Account No</Label>
            <Stack direction="row" sx={{ flex: 1, gap: 0.5 }}>
              <Input name="ifsc" value={form.ifsc} onChange={handleChange} disabled={readOnly} placeholder="IFSC" />
              <Input name="accountNo" value={form.accountNo} onChange={handleChange} disabled={readOnly} placeholder="Account No" />
            </Stack>
          </Field>

          <Field>
            <Label>Price / Tax</Label>
            <Stack direction="row" sx={{ flex: 1, gap: 0.5 }}>
              <Input
                name="price"
                type="number"
                value={form.price}
                onChange={handleChange}
                disabled={readOnly}
                placeholder="Price"
              />
              <Box sx={{ flex: 1 }}>
                <AsyncSearchSelect
                  name="taxId"
                  value={form.taxId}
                  onChange={handleChange}
                  disabled={readOnly}
                  options={taxOpts}
                  onAsyncSearch={handleAsyncTaxSearch}
                  placeholder="Tax"
                  searchPlaceholder="Search tax..."
                />
              </Box>
            </Stack>
          </Field>

          <Field>
            <Label>Vehicles</Label>
            <Input name="vehicles" value={form.vehicles} onChange={handleChange} disabled={readOnly} />
          </Field>

          <Field>
            <Label>Loading Charges</Label>
            <Stack direction="row" sx={{ flex: 1, gap: 0.5, alignItems: "center" }}>
              <Typography component="span" sx={{ fontSize: 10.5, color: "text.secondary", whiteSpace: "nowrap" }}>Per Box</Typography>
              <Input
                name="loadingPerBox"
                type="number"
                value={form.loadingPerBox}
                onChange={handleChange}
                disabled={readOnly}
              />
              <Typography component="span" sx={{ fontSize: 10.5, color: "text.secondary", whiteSpace: "nowrap" }}>Per Bundle</Typography>
              <Input
                name="loadingPerBundle"
                type="number"
                value={form.loadingPerBundle}
                onChange={handleChange}
                disabled={readOnly}
              />
            </Stack>
          </Field>

          <Field>
            <Label>Allowed Payment Mode</Label>
            <Select
              name="allowedPaymentMode"
              value={form.allowedPaymentMode}
              onChange={handleChange}
              disabled={readOnly}
              options={PAYMENT_MODES}
              placeholder="— select —"
            />
          </Field>

          <Stack direction="row" sx={{ alignItems: "center", gap: 3, mt: 0.5, pl: "40%" }}>
            <Stack component="label" direction="row" sx={{ alignItems: "center", gap: 0.5, fontSize: 10.5, cursor: "pointer", userSelect: "none" }}>
              <Checkbox
                name="rcm"
                checked={form.rcm}
                onChange={handleChange}
                disabled={readOnly}
                size="small"
                sx={{ p: 0 }}
              />
              RCM
            </Stack>
            <Stack component="label" direction="row" sx={{ alignItems: "center", gap: 0.5, fontSize: 10.5, cursor: "pointer", userSelect: "none" }}>
              <Checkbox
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                disabled={readOnly}
                size="small"
                sx={{ p: 0 }}
              />
              Active
            </Stack>
          </Stack>
        </Card>

        {/* ── RIGHT PANEL — Rate Table ── */}
        <Card variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", height: { lg: "100%" } }}>
          <Typography component="h2" sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 1 }}>
            Transport Rates
          </Typography>

          {!readOnly && (
            <Stack direction="row" sx={{ gap: 0.5, mb: 1, alignItems: "flex-end" }}>
              <Stack sx={{ gap: 0.5, flex: 1 }}>
                <Typography component="span" sx={{ fontSize: 10.5, color: "text.secondary" }}>City</Typography>
                <Select
                  name="cityId"
                  value={rateRow.cityId}
                  onChange={handleRateChange}
                  options={cityOpts}
                  placeholder="City"
                />
              </Stack>
              <Stack sx={{ gap: 0.5, width: 80 }}>
                <Typography component="span" sx={{ fontSize: 10.5, color: "text.secondary" }}>Per Kg</Typography>
                <Input
                  name="perKg"
                  type="number"
                  value={rateRow.perKg}
                  onChange={handleRateChange}
                  placeholder="0"
                />
              </Stack>
              <Stack sx={{ gap: 0.5, width: 80 }}>
                <Typography component="span" sx={{ fontSize: 10.5, color: "text.secondary" }}>Per Box</Typography>
                <Input
                  name="perBox"
                  type="number"
                  value={rateRow.perBox}
                  onChange={handleRateChange}
                  placeholder="0"
                />
              </Stack>
              <Stack sx={{ gap: 0.5, width: 96 }}>
                <Typography component="span" sx={{ fontSize: 10.5, color: "text.secondary" }}>Per Bundle</Typography>
                <Input
                  name="perBundle"
                  type="number"
                  value={rateRow.perBundle}
                  onChange={handleRateChange}
                  placeholder="0"
                />
              </Stack>
              <IconButton
                onClick={addRate}
                className="glass-btn glass-btn-primary"
                sx={{ mb: 0.25, p: 0.75 }}
                title="Add rate"
              >
                <PlusCircle className="w-4 h-4" />
              </IconButton>
            </Stack>
          )}

          <Box sx={{ flex: 1, border: 1, borderColor: "divider", borderRadius: "3.5px", overflow: "auto" }}>
            <Table sx={{ width: "100%" }} size="small">
              <TableHead sx={{ bgcolor: "action.hover", position: "sticky", top: 0 }}>
                <TableRow>
                  <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>City</TableCell>
                  <TableCell align="right" sx={{ borderRight: 1, borderColor: "divider" }}>Per KG</TableCell>
                  <TableCell align="right" sx={{ borderRight: 1, borderColor: "divider" }}>Per Box</TableCell>
                  <TableCell align="right" sx={{ borderRight: readOnly ? 0 : 1, borderColor: "divider" }}>Per Bundle</TableCell>
                  {!readOnly && <TableCell align="center">Action</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {rates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={readOnly ? 4 : 5} sx={{ textAlign: "center", py: 3, color: "text.disabled" }}>
                      No rates added yet
                    </TableCell>
                  </TableRow>
                ) : (
                  rates.map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ borderRight: 1, borderColor: "divider" }}>{r.cityName || r.cityId || "—"}</TableCell>
                      <TableCell align="right" sx={{ borderRight: 1, borderColor: "divider" }}>{r.perKg || 0}</TableCell>
                      <TableCell align="right" sx={{ borderRight: 1, borderColor: "divider" }}>{r.perBox || 0}</TableCell>
                      <TableCell align="right" sx={{ borderRight: !readOnly ? 1 : 0, borderColor: "divider" }}>{r.perBundle || 0}</TableCell>
                      {!readOnly && (
                        <TableCell align="center">
                          <Button
                            onClick={() => removeRate(i)}
                            className="glass-btn glass-btn-danger"
                          >
                            Delete
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>

          <Typography sx={{ mt: 1, fontSize: 10.5, color: "text.disabled", textAlign: "right" }}>
            {rates.length === 1 ? "Showing 1 row" : `Showing ${rates.length} rows`}
          </Typography>
        </Card>
      </Box>
    </Box>
  );
};

export default TransportForm;
